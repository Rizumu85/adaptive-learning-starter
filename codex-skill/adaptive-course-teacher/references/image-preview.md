# Offline Image Preview: Integration Contract

Use when an authorized HTML artifact contains illustrations, screenshots, scans, or diagrams that the learner needs to inspect. Reuse an existing equivalent viewer if present; otherwise install this bundle. Do not turn decorative images, icons, or unrelated links into previews. This is a reusable component, not permission to generate more HTML or publish source assets.

## Fast Path

For preview-only integration into an existing page, this is the only additional skill reference needed; keep obeying project rules. Creating or redesigning the reading page still uses the usual media/design workflow. Do not inspect the minified bundle, rebuild it, install npm packages, or redesign the viewer for ordinary integration.

1. Run the bundled installer (replace both paths):

```sh
node "<skill>/scripts/install-image-preview.cjs" --project "<project>"
```

It copies four offline runtime/license files to `assets/image-preview/`. Identical reruns are safe; different existing files are rejected. Inspect changes before explicitly using `--force`. `--asset-dir` accepts another project-relative directory. It does not edit HTML.

2. Add these tags after project styles; adjust paths for nested pages:

```html
<link rel="stylesheet" href="assets/image-preview/image-preview.css">
<script defer src="assets/image-preview/image-preview.js"></script>
```

3. Wrap each inspectable image in a real full-resolution link, or mark its existing link:

```html
<a href="images/detail.webp" data-image-preview data-preview-group="chapter">
  <img src="images/detail.webp" alt="Describe what this illustration shows" loading="lazy">
</a>
```

Keep existing image dimensions, captions, provenance, and source order. Do not nest links. Keep the original available resolution; enlarging a thumbnail cannot recover detail. `data-preview-group` limits previous/next navigation; ungrouped marked images form one group. Optional `data-preview-caption` overrides the caption. Newly inserted marked links also work. Use `lang="zh-CN"` for Chinese controls; other document languages currently get English controls.

## Included Behavior

- Native modal dialog with focus containment, accessible icon controls, captions and image count.
- Return button and Escape close it without changing the reading scroll position; focus returns to the clicked image.
- Zoom buttons, wheel zoom, drag-to-pan, touch pinch, double-click zoom, fit/reset, and previous/next within the group. Fit is 100%; maximum is 8 times fit, not eight times original pixels.
- Loading and failure states; disabled controls at boundaries; zoom resets on image change or viewport resize.
- Local `file://` works with no CDN, framework, server, telemetry, or runtime installation. Real image links remain usable if JavaScript is unavailable.

## Fit the Project

Classes are namespaced `al-`; ordinary page typography is untouched. The viewer inherits `--paper`/`--canvas`, `--surface-muted`, `--ink`, `--line`, `--muted`, and `--accent` when present, with standalone defaults. For other token systems, map these on `:root`: `--preview-paper`, `--preview-stage`, `--preview-ink`, `--preview-line`, `--preview-muted`, `--preview-accent`, and optionally `--preview-hover`. Match the project's palette rather than imposing the sample book's colors. Preserve 44px control targets, modest corners, and visible focus. No animation is needed.

## Verify Before Delivery

Open the real page locally at desktop and 390px/320px mobile widths. Test opening a mid-page image, zoom/pan/reset, group boundaries, a long caption, return with unchanged scroll, and keyboard focus/Escape. Check pinch on a touch-capable test device or report it unverified. Test a missing image and close during loading. Confirm all four local files are delivered, no broken paths, no horizontal toolbar overflow, and the browser console has no unexpected errors. Keep licenses with redistributed runtime files; this package grants no rights to the displayed images.

## Maintainers Only

Editable source is `assets/image-preview/viewer.ts`; installer source is `scripts/install-image-preview.ts`. Only for implementation changes: in `assets/image-preview`, run `npm ci`, `npm run check`, `npm run build`. Commit generated JS, installer CJS, lockfile and licenses; never copy `node_modules` into a learning project. Keep Panzoom attached to the full-size canvas, not the centered image, so pointer-centered zoom does not jump. From the starter repository root, use Node 24+ to run `node --test tests/install-image-preview.test.ts` after changing the installer.
