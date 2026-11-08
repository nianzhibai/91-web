import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { act, fireEvent, render } from "./helpers/dom";
import { ToastProvider } from "../src/components/ToastContext";

// Styles are exercised by layout tests; this suite mounts the actual page flow.
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
  return nextLoad(url, context);
} });
const { SettingsPage } = await import("../src/admin/SettingsPage");

async function openSettings(path: string) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(createElement(MemoryRouter, { initialEntries: [path] },
      createElement(ToastProvider, null, createElement(SettingsPage))));
  });
  return view;
}

test("frontend settings load and submit without reading or saving YAML", async t => {
  const calls: { path: string; method: string }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init?: RequestInit) => {
    calls.push({ path: input, method: init?.method || "GET" });
    if (input.endsWith("config.yaml")) return new Response("YAML unavailable", { status: 503 });
    if (input.endsWith("/install")) return Response.json({ name: "91-web", version: "1.2.0" }, { status: 201 });
    return Response.json({ active: "", installed: [] });
  });
  const view = await openSettings("/admin/settings?section=frontend");
  assert.ok(view.getByLabelText("前端仓库"));
  assert.equal(view.queryByRole("button", { name: "源码编辑" }), null);
  assert.equal(view.queryByRole("button", { name: "预览并保存配置" }), null);
  fireEvent.change(view.getByLabelText("发布版本"), { target: { value: "v1.2.0" } });
  await act(async () => { fireEvent.submit(view.getByRole("form", { name: "安装前端版本" })); });
  assert.ok(calls.every(call => call.path.startsWith("/admin/api/frontend")));
  assert.deepEqual(calls.filter(call => call.method !== "GET"), [{ path: "/admin/api/frontend/install", method: "POST" }]);
  assert.equal(view.container.querySelector("form form"), null);
});

test("a YAML read failure leaves navigation to frontend management available", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => input.endsWith("config.yaml")
    ? new Response("YAML unavailable", { status: 503 })
    : Response.json({ active: "", installed: [] }));
  const view = await openSettings("/admin/settings");
  assert.ok(view.getByText("配置加载失败"));
  await act(async () => { fireEvent.click(view.getByRole("tab", { name: "前端版本" })); });
  assert.ok(view.getByLabelText("前端仓库"));
  assert.equal(view.queryByText("配置加载失败"), null);
});

test("visiting frontend management preserves unsaved YAML edits", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => input.endsWith("config.yaml")
    ? new Response('nightly:\n  start_time: "01:00"\n', { headers: { ETag: '"v1"' } })
    : Response.json({ active: "", installed: [] }));
  const view = await openSettings("/admin/settings");
  fireEvent.change(view.getByLabelText("启动时间"), { target: { value: "02:30" } });
  await act(async () => { fireEvent.click(view.getByRole("tab", { name: "前端版本" })); });
  assert.ok(view.getByLabelText("前端仓库"));
  await act(async () => { fireEvent.click(view.getByRole("tab", { name: "定时任务" })); });
  assert.equal((view.getByLabelText("启动时间") as HTMLInputElement).value, "02:30");
  assert.equal(view.getByRole("button", { name: "预览并保存配置" }).hasAttribute("disabled"), false);
});
