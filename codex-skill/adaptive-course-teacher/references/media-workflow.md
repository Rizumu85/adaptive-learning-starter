# Media Workflow

## Source and Rights

When hosting lessons with local assets, read `private-delivery.md` for build inclusion, access checks, and deployment verification.

- Confirm that the learner may use the source before downloading, transforming, or extracting it.
- Keep paid, login-protected, copyrighted, or personally licensed source files in ignored local paths unless redistribution is explicitly allowed.
- Record enough provenance to identify the source page, timestamp, or file without exposing private paths or credentials.
- Do not substitute a visually similar font, illustration, voice, or model and present it as the requested original.
- Keep generated and transformed assets distinguishable from source material.

## Choose the Smallest Useful Medium

| Learning obstacle | Preferred medium |
| --- | --- |
| Where is the option? | Static screenshot |
| What changes during a short operation? | Animated WebP |
| How do two fixed states differ? | Static comparison |
| What changes when one variable moves? | Interactive HTML |
| How does a 3D orientation or hierarchy behave? | Focused interactive 3D |

## Screenshot

Capture only the interface context needed to locate the control. Include enough surrounding UI to distinguish same-named options in different editors or property tabs. Crop per image; never reuse fixed crop parameters without checking the new content.

## Source Crops and Transparent Cutouts

Reuse a relevant source illustration beside the explanation it supports. Prefer the original local PDF or page image over a screenshot of a viewer, which can add scaling blur, rounded corners, and interface margins. Inspect the source before choosing a crop; record printed page, PDF page index when different, and crop bounds in production notes.

0. **At scale, find the figures before choosing boxes.** A scanned book with a hundred or more drawings is not cropped by hand one box at a time. Find candidates automatically (mask the OCR text lines, running head and folio, dilate the remaining ink and take the connected blocks; shrink into a printed frame when the block's four sides are straight dark lines), lay them out on contact sheets and look at every sheet; write the alt text while looking, since this is the only time each figure is seen whole. When the same drawing exists in a cleaner edition, map the box there with feature matching and confirm each match on a side-by-side sheet. The automatic box is then refined by rules, not by eye: it never crosses the page's running-head or footer rule (measure those rows once per edition and clamp every box inside them), it is trimmed off any OCR text line it overlaps at the top or bottom, and it grows outward in small steps while ink still touches its edge, so a toe or a hand drawn to the page margin is not cut. Hand-set boxes go in an overrides file that the generator applies last, so regenerating the record never loses them.
1. **Choose the image boundary.** For a photograph, crop to the actual photograph rectangle, removing scan margins, binding edges, and unrelated page numbers. Keep pale sky and other light photographic content. For an illustration on paper, include the complete intended silhouette, including detached details such as birds or leaves.
2. **Remove the paper by default.** Anything drawn or printed on paper (line art, pencil, ink, diagrams, comics on a white or tinted page) becomes transparent: `transparent: true` in the crop record and a conservative mask, starting from the outer background, so the drawing sits on the reader's page instead of in a paper-coloured box. Keep a crop opaque only when it is a photograph or a fully painted picture whose background is part of the image, and write that reason on the crop entry. Agents have skipped this step on first delivery in several books; the crop audit's `paper` check catches what is left. Do not globally turn every white or near-white pixel transparent: eyes, highlights, water, pale objects, and enclosed details can be part of the artwork. Background connected to the edge can still contain light artwork; inspect the mask rather than trusting connectivity alone. Refine ambiguous areas manually or retain them when their identity is uncertain. Set the paper threshold per crop, not per book: measure the luminance of the crop's border pixels first, using a low percentile rather than the minimum so ink that reaches the edge does not count (a clean scan reads 250–255, a greyish one 220–235), and start the transparency ramp below that paper value, or the paper stays as a grey box. Compute the edge-connected paper region with a connected-components call (OpenCV `connectedComponents`, SciPy `ndimage.label`), not a pixel-by-pixel flood fill in Python: the latter took about fifteen seconds per figure and half an hour for one chapter's recut.
3. **Export a derived file.** Preserve the original and its colored artwork pixels. Save the final crop that pages use as lossless WebP (`lossless=True, exact=True` in Pillow): the same pixels and alpha as PNG at about two thirds of the size, and hosting can copy it without re-encoding. Do not keep a PNG copy of the same crop. When the source itself is JPEG (an image-only EPUB, a JPEG scan, a photo), lossless WebP only preserves the JPEG's artifacts at roughly three times its size; use high-quality lossy WebP instead (quality about 90–92 for full images, lower for display copies and thumbnails). Intermediate files (QA overlays, contact sheets, measurement renders) may stay PNG. Lossless WebP is 8-bit and at most 16383 px per side, which covers book crops; use PNG only when a crop exceeds that. Crop surplus transparent padding without clipping the outline. Do not redraw the source with AI and present it as the original. Keep an opaque photo in a suitable image format without inventing transparent content.
4. **Place it in HTML.** Use a relative image path and concise meaningful alternative text. Put the image beside the relevant passage or exercise. To blend a cutout into the page, remove the image wrapper's white background, border, and shadow where they would recreate a rectangular card; alpha pixels alone do not remove a wrapper background. Use `object-fit` for layout only, not as a substitute for actually removing scan margins.
5. **Set the display scale.** Size a figure by how big it is in the book, not by the width of the column. A figure that spans most of the printed page may span the reading column; one that took a third of the page shows at about a third to a half of the column, centered. With a crop record, start from `bounds` width / `unit` × column width (at most about 1.2 times that), then clamp: never wider than the column, never wider than the image's own pixels, and never taller than about 80% of the window (`max-height: 80vh; width: auto`), so the reader sees the whole figure without scrolling past it. Small, low-information figures (a single label, a simple diagram, an icon-like drawing) stay small; a reader should not scroll through a screen of picture to take in one line of information. Full-page plates and artworks follow the same height limit, and the image preview gives the full size. Show the image at a modest size supported by the source resolution. Smaller display can make scan limitations less apparent; it does not restore missing detail. Preserve aspect ratio. Align neighboring pages or a continuous spread by meaningful content, scale, and baseline, not merely by equal CSS box heights; do not invent missing artwork to join them.
6. **Run the crop audit when there are more than a handful of crops.** `python <skill>/assets/crop-audit/crop_audit.py local-reading/crops.json --sheets work/qa/crop-audit` checks every crop in the crop record against its page and flags only the ones worth a look: a printed line or line of text crossing the crop edge (something cut off, or a sliver of body text brought in), two crops in the same group whose outputs both show ink from the area they share (a fragment of the neighbouring figure), and outputs with almost no drawing (a box in the wrong place), and fully opaque outputs whose outer edge is almost all paper (a drawing whose paper was never removed, the most often missed step). It writes a review sheet per flagged crop (the page around it, the box in teal, suspected cuts in red) and never changes a crop. Fix what is real in `crops.json` and recut; for a cut that is deliberate, add it to that crop's `audit_ok` so it is not reported again. A project made before the crop record existed can call `audit(figures, unit, sheets)` from a short adapter instead. Crop coordinates are where weaker models fail most, so this check matters most when a smaller model chose them; it narrows the visual review, it does not replace it.
7. **Inspect the result.** Check the mask on a contrasting background and then on the lesson's actual background. Look for white fringes, missing light details, clipped silhouettes, stretched content, incorrect page alignment, and unnecessary captions. Verify desktop and narrow layouts plus local and hosted asset paths when supported.

### Crop Record

Every project that cuts figures from pages keeps one record of them, `crops.json`, beside the pages that use them (for a book, in `local-reading/`). The cutting script reads the boxes from it, the audit checks against it, and a later session can recut or review any crop without reading the code that first made it. Do not keep crop boxes only inside a script, in pixel units of one particular render, or as output paths without the box that produced them.

```json
{
  "unit": 1000,
  "pages": "../work/pages/p{page:04}.png",
  "source": "sources/private/book.pdf",
  "crops": [
    {"id": "ch01-fig03", "page": 12, "printed": 10, "bounds": [120, 340, 880, 720],
     "exclude": [[120, 690, 400, 720]], "transparent": true,
     "output": "images/ch01-fig03.webp", "group": "chapter-01", "audit_ok": []}
  ]
}
```

- `unit`: the page width that coordinates are measured against (1000 means the left edge is 0 and the right edge 1000, whatever the render resolution). Keep 1000 unless a project already uses another value. The same scale applies vertically: y is measured in page widths too, so a portrait page's bottom edge is at its height/width × 1000 (about 1414 for A4, usually 1250–1500 in books), never at 1000. Coordinates normalized to the page height look right near the top and cut figures off more the lower they sit; this happened in one book's batch of candidate boxes. When converting boxes from another tool (OCR, a detector, an earlier script), check which scale it used and multiply y by height/width when it was the page height. The crop audit reports boxes past the page (`outside`) and a record whose boxes all stop at 1000 on taller pages (`scale`).
- `pages`: where the page images are, relative to this file, with `{page}` filled from each crop. When figures are cut from two editions, `pages` maps each edition to its pattern (`{"en": "...", "zh": "..."}`) and every crop names its `edition`. `source` names the original PDF or EPUB they are rendered from (a local path that stays out of Git). Page renders are intermediate files and can be regenerated.
- Each crop: `id` (stable, also the file name), `page` (page index in the source; add `printed` when the printed folio differs), `bounds` `[x0, y0, x1, y1]`, optional `exclude` (boxes removed on purpose: a neighbouring figure, a caption, a line of body text), `transparent` (false for photos and tinted backgrounds kept as they are), `output` (relative to this file), optional `group` (the page or chapter the crop appears in; the audit compares overlaps only within one group), optional `audit_ok` (audit findings reviewed and kept on purpose, such as `"clipped:bottom"` for a full-page photo stopped above the page number, or `"paper"` for a photograph with a pale border).
- Fields a project needs beyond these (captions, alt text, mask thresholds, reviewed foreground regions) may sit on the same crop entry. When a project splits its data into several files, still write `crops.json` as the one place the boxes live, or generate it from those files and keep it current.
- Change a box in `crops.json`, recut from it, and rerun the audit; never edit an output image by hand. When `crops.json` is generated (step 0), make the change in the overrides file and regenerate, so the next run keeps it. When a figure's top or bottom edge is reported as clipped and the ink it crosses is the page's running-head or footer rule, the box has crossed the rule: move the edge inside it (see step 0's clamp) rather than accepting the finding, because the rule otherwise prints as a black line above the drawing. Accept with `audit_ok` only cuts that are deliberate (a few pixels of a stroke that reaches the page margin, a photo trimmed above its caption).
- The record fixes what every crop must leave behind, not how to cut. Choose the cutting method, mask settings, and what counts as one figure from the book in front of you. When a book does not fit the fields, extend the record rather than bend the content or skip it, and write one line in the project's `NOTES.md` saying what was added and why. Examples: a spread joined from two pages gets `"page": [72, 73]` with `bounds` per page as `"parts"`; a whole page used as it is (an image-only EPUB page, a full-page plate) gets `"whole_page": true` and no box; a figure outlined by hand keeps its polygon beside the box. The audit checks what it can (it needs a page image and a box) and skips the rest; list the entries it cannot check in the note, so their review is not forgotten.

Store original scans and derived crops in the project's appropriate ignored material directories when required by their rights. Record the extraction steps so the assets can be regenerated. Source-specific crop coordinates belong in that course project, not in this general skill. A public template may demonstrate the technique with original or redistributable images rather than shipping the learner's textbook pages.

## Animated WebP

Work from a source the learner is authorized to use.

Use these settings as starting points for suitable projects. Keep temporary material in a topic-specific scratch folder. Reuse or obtain a local source before repeated extraction; confirm the start, end, and crop with still frames first. Choose the crop and output location for each operation, not from a previous lesson. Keep licensed source footage and captures out of public contributions.

1. Identify the shortest interval that shows one operation.
2. Crop for that clip's content. Keep the cursor, target control, and visible result.
3. Export directly to animated WebP. Do not create a GIF intermediate.
4. Prefer 10-15 fps, a practical width of 720-1100 px, and a short loop.
5. Verify that the final WebP animates in the learner's note application.

Example FFmpeg shape; replace every value for the actual clip:

```powershell
ffmpeg -ss 00:00:10.2 -i source.mp4 -t 3.8 `
  -vf "crop=w:h:x:y,fps=12,scale=960:-2:flags=lanczos" `
  -an -loop 0 -c:v libwebp_anim -quality 82 -compression_level 6 output.webp
```

## Interactive HTML

- Teach one relationship per step.
- Show the concrete result before naming the formal concept.
- Change one variable and provide immediate visible feedback.
- Use local dependencies and support direct `file://` opening.
- Verify desktop and mobile layout, interactions, nonblank canvas pixels, and reduced motion.

Read `interactive-courseware.md` for TypeScript delivery, saved state, synchronized narration, rich pointer input, source-image alignment, and the full verification matrix.

Keep source links and production notes outside the learner-facing lesson unless they improve recall.
