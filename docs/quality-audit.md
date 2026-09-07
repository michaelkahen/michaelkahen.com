# Portfolio quality audit — 2026-09-07

## Direction

Preserved the factory theme, original SVG artwork, static architecture, and
interactive demos. Visible personal copy stays first person; third-person
search descriptions are confined to metadata. No resume PDF changes.

## Implemented

- Replaced height-driven shrinking with readable desktop sizing and a scrolling
  card layout for narrow or short viewports. Removed truncated machine labels.
- Standardized spacing, panel titles, action sizes, and reading text; increased
  contrast in project specifications and the active resume navigation icon.
- Improved mobile navigation, full-width project selectors and actions, tablet
  contact-card balance, and safe-area support.
- Made CPU listings, pipeline diagrams, and inspector panels keyboard-scrollable.
  Matched editor/gutter typography, prevented mobile input focus zoom with 16px
  text, and prevented mobile toolbar/workspace/footer overlap.
- Honored reduced-motion preferences, persisted explicit overrides, and followed
  system changes until a visitor makes a choice. Suspended background demos.
- Synchronized ecosystem pause state with its actual controls. Visitors can
  explicitly resume the demo without enabling all ambient effects. A paused
  ecosystem no longer runs an idle animation loop.
- Kept the skip link on the current route and improved clipboard fallback focus
  and error handling. Prevented delayed route focus from targeting an old view.
- Improved search/social descriptions and refreshed structured-data and sitemap
  modification dates. Retained canonical, robots, social artwork, and schema.
- Versioned frontend assets to avoid stale CSS/JS after deployment; retained the
  existing, consistent resume PDF version.
- Added printable portfolio content and exposed both projects without JavaScript.

## Verification

- `node --test tests/*.test.js`: 34 tests, including real-controller tests using a
  minimal DOM fixture for routing, focus, preferences, and background lifecycle.
- Critical HTML + CSS + controller: 28,523 bytes gzip, below the 30 KiB budget.
- Chromium route/overflow checks at 320×740, 390×844, 768×1024, 1024×768,
  1280×577, 1366×768, and 1440×900. No page-level horizontal overflow found.
- Axe-core 4.10.3 WCAG A/AA automated checks across all six routes at 320×740,
  1280×577, and 1440×900: no violations in the audited states after fixes.
- Browser console, page-error, and network QA passed.
- Verified actual CPU single-step advancement and ecosystem resume advancement.
- Verified mobile editor and gutter both use 16px text / 26.4px line height.
- Generated a print PDF and checked extracted content: profile, both projects,
  resume, and contact are present.
- `git diff --check` and session blocking diagnostics pass.

## Boundaries

This is local verification, not a deployed-site audit. Viewport emulation is not
physical-device testing; a final Safari/iPhone smoke test remains advisable.
Automated accessibility checks do not replace a full screen-reader audit.

Hash views intentionally remain one canonical page, rather than separate indexed
project pages. Dedicated URLs would be a separate routing/content architecture
change. Search engines choose their own snippets; metadata cannot guarantee
rankings or exact search-result text. Hosting-specific headers and live cache
behavior should be checked after deployment.
