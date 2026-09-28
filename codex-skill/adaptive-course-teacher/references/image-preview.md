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

- Native modal dialog with focus containment, accessible controls, caption and image count. Controls: `← 返回` at top left, count at top right; caption and a control capsule (previous · zoom out · scale · zoom in · next) at the bottom. The scale button shows the zoom level and returns to fit.
- Motion (critically damped spring, response 0.3 s, the same feel as the reader chrome): the paper backdrop fades in while the full-resolution picture settles in from 96% size; closing reverses it. Do not enlarge the page thumbnail into place: book scans are often low resolution and the zoom reads as forced. Paging slides pictures sideways. Motion starts from the picture's current position, so a half-pulled close continues smoothly.
- At fit size, dragging sideways pages (with resistance at the first and last picture) and pulling down closes; a short or slow drag springs back. Zoomed drags pan instead.
- Return, Escape and pull-down close without moving the page, even after paging to other pictures; focus returns to the link that opened the preview.
- Zoom buttons, wheel zoom, touch pinch, double-click zoom and drag-to-pan. Fit is 100%; maximum is 8 times fit, not eight times original pixels.
- Loading (shown only after 300 ms) and failure states; disabled controls at boundaries; zoom refits on viewport resize. `prefers-reduced-motion` replaces flights and slides with short fades.
- Local `file://` works with no CDN, framework, server, telemetry, or runtime installation. Real image links remain usable if JavaScript is unavailable.

## Fit the Project

Classes are namespaced `al-`; ordinary page typography is untouched. The look is paper, not glass: a solid paper backdrop, the picture resting on it with a faint print shadow, and a paper capsule with a hairline border. It inherits `--paper`/`--canvas`, `--ink`, `--line`, `--muted`, and `--accent` when present, with standalone defaults, and uses the `UIOption` interface font when the page defines it (the reader chrome does). For other token systems, map these on `:root`: `--preview-paper`, `--preview-ink`, `--preview-line`, `--preview-muted`, `--preview-accent`, and optionally `--preview-font`. Match the project's palette rather than imposing the sample book's colors. Keep 44px control targets and visible keyboard focus. Do not add glass, blur, heavy shadows, or bordered hover states.

## Verify Before Delivery

Open the real page locally at desktop and 390px/320px mobile widths. Test opening a mid-page image, zoom/pan/fit, group boundaries, a long caption, pull-down and sideways drags including short ones that spring back, unchanged page scroll after closing (also after paging), and keyboard focus/Escape. Check pinch on a touch-capable test device or report it unverified. Test a missing image and close during loading. Confirm all four local files are delivered, no broken paths, no horizontal toolbar overflow, and the browser console has no unexpected errors. Keep licenses with redistributed runtime files; this package grants no rights to the displayed images.

## Maintainers Only

Editable source is `assets/image-preview/viewer.ts`; installer source is `scripts/install-image-preview.ts`. Only for implementation changes: in `assets/image-preview`, run `npm ci`, `npm run check`, `npm run build`. Commit generated JS, installer CJS, lockfile and licenses; never copy `node_modules` into a learning project. Keep Panzoom attached to the full-size canvas, not the centered image, so pointer-centered zoom does not jump. From the starter repository root, use Node 24+ to run `node --test tests/install-image-preview.test.ts` after changing the installer.
