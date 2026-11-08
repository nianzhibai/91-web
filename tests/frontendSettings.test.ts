import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act, fireEvent, render, within } from "./helpers/dom";
import { FrontendSettingsSection } from "../src/admin/settings/FrontendSettingsSection";

test("installing a frontend does not activate it and a rejected switch keeps the page usable", async t => {
  t.mock.method(window, "scrollTo", () => {});
  const release = { formatVersion: 1, name: "community-web", version: "1.2.0", apiMin: "1.0.0", apiMaxExclusive: "2.0.0", sha256: "digest", contentHash: "tree", installedAt: "2026-01-01T00:00:00Z" };
  let installed = false;
  const writes: { path: string; body: unknown }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init?: RequestInit) => {
    if (!init?.method || init.method === "GET") return Response.json({ active: "", installed: installed ? [release] : [] });
    writes.push({ path: input, body: JSON.parse(String(init.body)) });
    if (input.endsWith("/install")) { installed = true; return Response.json(release, { status: 201 }); }
    return Response.json({ error: "该前端与当前 API 不兼容", code: "conflict" }, { status: 409 });
  });
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(createElement(FrontendSettingsSection)); });
  fireEvent.change(view.getByLabelText("前端仓库"), { target: { value: "community/web" } });
  fireEvent.change(view.getByLabelText("发布版本"), { target: { value: "v1.2.0" } });
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "安装版本" })); });
  assert.deepEqual(writes, [{ path: "/admin/api/frontend/install", body: { repository: "community/web", version: "v1.2.0" } }]);
  fireEvent.click(view.getByRole("button", { name: "启用", exact: true }));
  assert.equal(writes.length, 1);
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "切换并打开首页" })); });
  assert.deepEqual(writes[1], { path: "/admin/api/frontend/active", body: { id: "community-web@1.2.0" } });
  const dialog = view.getByRole("dialog");
  assert.match(within(dialog).getByRole("alert").textContent || "", /该前端与当前 API 不兼容/);
  assert.equal(within(dialog).getByRole("button", { name: "切换并打开首页" }).hasAttribute("disabled"), false);
  fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));
  assert.equal(view.queryByRole("dialog"), null);
});

test("a delayed initial response cannot hide a newly installed frontend", async t => {
  const release = { name: "community-web", version: "1.2.0" };
  let resolveInitial!: (response: Response) => void;
  let reads = 0;
  t.mock.method(globalThis, "fetch", async (_input: string, init?: RequestInit) => {
    if (init?.method === "POST") return Response.json(release, { status: 201 });
    if (++reads === 1) return new Promise<Response>(resolve => { resolveInitial = resolve; });
    return Response.json({ active: "", installed: [release] });
  });
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(createElement(FrontendSettingsSection)); });
  fireEvent.change(view.getByLabelText("发布版本"), { target: { value: "v1.2.0" } });
  await act(async () => { fireEvent.submit(view.getByRole("form", { name: "安装前端版本" })); });
  assert.ok(view.getByRole("button", { name: "启用", exact: true }));
  await act(async () => { resolveInitial(Response.json({ active: "", installed: [] })); });
  assert.ok(view.getByRole("button", { name: "启用", exact: true }));
  assert.equal(view.queryByRole("alert"), null);
});

test("a failed post-install refresh preserves success and retrying only reads status", async t => {
  const release = { name: "community-web", version: "1.2.0" };
  let reads = 0;
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (_input: string, init?: RequestInit) => {
    if (init?.method === "POST") { writes++; return Response.json(release, { status: 201 }); }
    reads++;
    if (reads === 2) return Response.json({ error: "版本列表暂时不可用" }, { status: 503 });
    return Response.json({ active: "", installed: reads > 2 ? [release] : [] });
  });
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(createElement(FrontendSettingsSection)); });
  fireEvent.change(view.getByLabelText("发布版本"), { target: { value: "v1.2.0" } });
  await act(async () => { fireEvent.submit(view.getByRole("form", { name: "安装前端版本" })); });
  assert.match(view.getByRole("status").textContent || "", /已安装/);
  assert.match(view.getByRole("alert").textContent || "", /版本列表暂时不可用/);
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "刷新", exact: true })); });
  assert.equal(writes, 1);
  assert.ok(view.getByRole("button", { name: "启用", exact: true }));
  assert.equal(view.queryByRole("alert"), null);
});

test("repeated submits send one installation request", async t => {
  let complete!: (response: Response) => void;
  let writes = 0;
  t.mock.method(globalThis, "fetch", async (_input: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      writes++;
      return new Promise<Response>(resolve => { complete = resolve; });
    }
    return Response.json({ active: "", installed: [] });
  });
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(createElement(FrontendSettingsSection)); });
  fireEvent.change(view.getByLabelText("发布版本"), { target: { value: "v1.2.0" } });
  await act(async () => {
    const form = view.getByRole("form", { name: "安装前端版本" });
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
  assert.equal(writes, 1);
  await act(async () => { complete(Response.json({ name: "community-web", version: "1.2.0" }, { status: 201 })); });
});
