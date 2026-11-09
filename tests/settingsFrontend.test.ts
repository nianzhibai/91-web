import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { act, fireEvent, render, within } from "./helpers/dom";
import { ToastProvider } from "../src/components/ToastContext";

registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
  return nextLoad(url, context);
} });
Object.defineProperty(globalThis, "Window", { configurable: true, value: window.Window });
window.scrollTo = () => {};
window.Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
window.Range.prototype.getBoundingClientRect = () => new window.DOMRect();
const { SettingsPage } = await import("../src/admin/SettingsPage");

async function openSettings(path: string) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(createElement(MemoryRouter, { initialEntries: [path] },
      createElement(ToastProvider, null, createElement(SettingsPage))));
  });
  return view;
}

test("frontend repository uses the shared YAML save flow and source editor", async t => {
  let content = 'frontend:\n  repository: "https://github.com/owner/web"\n';
  const writes: { path: string; body: unknown }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      writes.push({ path: input, body: init.body });
      content = String(init.body);
      return Response.json({ version: "v2", restartRequired: false, settings: { previewEnabled: true, telegramEnabled: false } });
    }
    if (input.endsWith("config.yaml")) return new Response(content, { headers: { ETag: '"v1"' } });
    return Response.json({ active: "", installed: [] });
  });
  const view = await openSettings("/admin/settings?section=frontend");
  assert.ok(view.getByRole("tab", { name: "前端配置", selected: true }));
  assert.ok(view.getByRole("button", { name: "源码编辑" }));
  assert.equal((view.getByLabelText("前端仓库") as HTMLInputElement).value, "https://github.com/owner/web");
  fireEvent.change(view.getByLabelText("前端仓库"), { target: { value: "https://github.com/community/web" } });
  assert.equal(view.getByRole("button", { name: "安装并启用" }).hasAttribute("disabled"), true);
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "源码编辑" })); });
  assert.ok(view.container.querySelector("#config-source-form"));
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "可视化编辑" })); });
  assert.equal((view.getByLabelText("前端仓库") as HTMLInputElement).value, "https://github.com/community/web");
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "预览并保存配置" })); });
  const dialog = view.getByRole("dialog");
  assert.match(dialog.textContent || "", /https:\/\/github.com\/community\/web/);
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "确认保存" })); });
  assert.deepEqual(writes, [{ path: "/admin/api/config.yaml", body: 'frontend:\n  repository: "https://github.com/community/web"\n' }]);
  assert.equal(view.getByRole("button", { name: "安装并启用" }).hasAttribute("disabled"), false, view.container.textContent || "");
  assert.equal(view.container.querySelector("form form"), null);
});

test("invalid frontend repository cannot be saved or installed", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => input.endsWith("config.yaml")
    ? new Response('{}\n', { headers: { ETag: '"v1"' } })
    : Response.json({ active: "", installed: [] }));
  const view = await openSettings("/admin/settings?section=frontend");
  fireEvent.change(view.getByLabelText("前端仓库"), { target: { value: "owner/web" } });
  assert.equal(view.getByRole("button", { name: "预览并保存配置" }).hasAttribute("disabled"), true);
  assert.equal(view.getByRole("button", { name: "安装并启用" }).hasAttribute("disabled"), true);
});

test("visiting frontend configuration preserves other unsaved YAML fields", async t => {
  t.mock.method(globalThis, "fetch", async (input: string) => input.endsWith("config.yaml")
    ? new Response('nightly:\n  start_time: "01:00"\n', { headers: { ETag: '"v1"' } })
    : Response.json({ active: "", installed: [] }));
  const view = await openSettings("/admin/settings");
  fireEvent.change(view.getByLabelText("启动时间"), { target: { value: "02:30" } });
  await act(async () => { fireEvent.click(view.getByRole("tab", { name: "前端配置" })); });
  assert.ok(view.getByLabelText("前端仓库"));
  await act(async () => { fireEvent.click(view.getByRole("tab", { name: "定时任务" })); });
  assert.equal((view.getByLabelText("启动时间") as HTMLInputElement).value, "02:30");
  assert.equal(view.getByRole("button", { name: "预览并保存配置" }).hasAttribute("disabled"), false);
});
