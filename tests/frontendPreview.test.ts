import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { preview } from "vite";

test("preview serves root page routes, versioned assets and unchanged backend paths", async t => {
  const output = mkdtempSync(join(tmpdir(), "91-web-preview-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  const manifest = JSON.parse(readFileSync(new URL("../frontend-package.json", import.meta.url), "utf8"));
  const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  const assetBase = `/_frontend/${manifest.name}/${version}/`;
  const html = `<html><script src="${assetBase}assets/app.js"></script></html>`;
  mkdirSync(join(output, "assets"));
  writeFileSync(join(output, "index.html"), html);
  writeFileSync(join(output, "icon.png"), "site icon");
  writeFileSync(join(output, "assets/app.js"), "console.log('versioned asset')");

  const backend = createServer((request, response) => {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ path: request.url, method: request.method, range: request.headers.range, cookie: request.headers.cookie }));
  });
  await new Promise<void>(resolve => backend.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve, reject) => backend.close(error => error ? reject(error) : resolve())));
  const backendAddress = backend.address();
  assert.ok(backendAddress && typeof backendAddress !== "string");
  const proxy = Object.fromEntries(["/api", "/admin/api", "/p", "/peer"].map(path => [path, { target: `http://127.0.0.1:${backendAddress.port}` }]));
  const server = await preview({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    logLevel: "silent",
    build: { outDir: output },
    preview: { host: "127.0.0.1", port: 0, strictPort: false, proxy },
  });
  t.after(() => server.close());
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  for (const path of ["/", "/login", "/admin/settings?section=frontend", "/video/demo", "/share"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await fetch(base + path, { method, redirect: "manual", headers: { Accept: "text/html" } });
      assert.equal(response.status, 200, `${method} ${path}`);
      assert.equal(response.headers.get("Location"), null);
      assert.equal(await response.text(), method === "HEAD" ? "" : html);
    }
  }
  for (const path of ["/icon.png", `${assetBase}icon.png`, `${assetBase}assets/app.js?cache=1`]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), path.includes("app.js") ? "console.log('versioned asset')" : "site icon");
    if (path.includes("app.js")) assert.match(response.headers.get("Cache-Control") || "", /immutable/);
  }
  for (const path of ["/assets/missing.js", "/assets/missing", "/missing.png", `${assetBase}missing`, `${assetBase}index.html`, "/_frontend/unknown/1.0.0/assets/app.js"]) {
    const response = await fetch(base + path, { headers: { Accept: "text/html" } });
    assert.equal(response.status, 404, path);
  }
  for (const path of ["/api/missing?q=1", "/admin/api/missing", "/p/missing", "/peer/missing"]) {
    const response = await fetch(base + path, { headers: { Accept: "text/html", Range: "bytes=0-9", Cookie: "session=test" } });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { path, method: "GET", range: "bytes=0-9", cookie: "session=test" });
  }
  const post = await fetch(base + "/login", { method: "POST" });
  assert.equal(post.status, 404);
});
