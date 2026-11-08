import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
test("Vite dev and preview proxies use the launcher's backend port", () => {
  for (const port of ["", "19292"]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import createConfig from './vite.config.ts';
      const config = createConfig({ command: 'serve', mode: 'production', isPreview: true });
      process.stdout.write(JSON.stringify({server: config.server, preview: config.preview}));
    `], { cwd: root, env: { ...process.env, BACKEND_PORT: port }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(result.stdout);
    for (const mode of ["server", "preview"]) {
      assert.equal(config[mode].strictPort, true);
      for (const path of ["/api", "/admin/api", "/peer", "/p"]) {
        assert.equal(config[mode].proxy[path].target, `http://127.0.0.1:${port || "9192"}`);
      }
    }
  }
});
