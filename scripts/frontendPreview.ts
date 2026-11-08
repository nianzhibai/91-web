import { statSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { Plugin } from "vite";

/** Preview the same root page routes and versioned assets served by Go. */
export function frontendPreview(assetBase: string): Plugin {
  return {
    name: "frontend-preview",
    configurePreviewServer(server) {
      const directory = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? "/";
        let pathname: string;
        try {
          pathname = decodeURIComponent(url.split("?")[0]);
        } catch {
          response.writeHead(400).end();
          return;
        }

        // Let Vite's proxy handle backend requests without rewriting their URLs.
        if (/^\/(?:api|admin\/api|p|peer)(?:\/|$)/.test(pathname)) {
          next();
          return;
        }

        const versioned = pathname.startsWith("/_frontend/");
        if (versioned) {
          if (!url.startsWith(assetBase)) {
            response.writeHead(404).end();
            return;
          }
          request.url = url.slice(assetBase.length - 1);
          pathname = pathname.slice(assetBase.length - 1);
        }

        if (request.method !== "GET" && request.method !== "HEAD"
          || pathname.includes("\\") || pathname.includes("\0") || pathname.split("/").includes("..")) {
          response.writeHead(404).end();
          return;
        }

        if (versioned || pathname.startsWith("/assets/") || extname(pathname)) {
          let fileExists = false;
          try { fileExists = statSync(resolve(directory, "." + pathname)).isFile(); }
          catch { /* Missing assets must not fall through to the SPA document. */ }
          if (!fileExists || versioned && pathname === "/index.html") {
            response.writeHead(404).end();
            return;
          }
        }
        next();
      });
    },
  };
}
