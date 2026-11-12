import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const videoGridSource = readFileSync(
  new URL("../src/components/VideoGrid.tsx", import.meta.url),
  "utf8"
);
const videoCardCss = readFileSync(
  new URL("../src/styles/video-card.css", import.meta.url),
  "utf8"
);

function ruleBody(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Expected CSS rule for ${selector}`);
  return match[1];
}

test("video skeleton mirrors thumbnail, title, and metadata structure", () => {
  assert.match(videoGridSource, /className="skeleton-card__thumb"/);
  assert.match(videoGridSource, /className="skeleton-card__title"/);
  assert.match(videoGridSource, /className="skeleton-card__meta"/);
  assert.match(videoGridSource, /className="video-grid-loading"/);

  const skeleton = ruleBody(videoCardCss, ".skeleton-card");
  const thumb = ruleBody(videoCardCss, ".skeleton-card__thumb");

  assert.match(skeleton, /--skeleton-shimmer-base\s*:/);
  // Skeleton geometry follows the card: a 16:9 rounded thumbnail on no frame.
  assert.match(thumb, /aspect-ratio\s*:\s*16 \/ 9/);
  assert.match(thumb, /border-radius\s*:\s*var\(--radius-md\)/);
  assert.match(ruleBody(videoCardCss, ".thumb-frame"), /aspect-ratio\s*:\s*16 \/ 9/);
  assert.match(
    videoCardCss,
    /\.skeleton-card__title\s*\{\s*margin-top:[^}]*width:\s*92%;[^}]*height:\s*1lh;[^}]*border-radius:\s*var\(--radius-xs\)/s
  );
  assert.match(
    videoCardCss,
    /\.skeleton-card__meta\s*\{\s*margin-top:\s*8px;[^}]*width:\s*64%;[^}]*height:\s*12px;[^}]*border-radius:\s*var\(--radius-xs\)/s
  );
  assert.match(skeleton, /background\s*:\s*transparent/);
  assert.match(skeleton, /--skeleton-shimmer-base\s*:\s*var\(--bg-skeleton\)/);
  assert.match(skeleton, /--skeleton-shimmer-highlight\s*:\s*var\(--bg-elevated\)/);
  assert.doesNotMatch(videoCardCss, /is-compact/);
});
