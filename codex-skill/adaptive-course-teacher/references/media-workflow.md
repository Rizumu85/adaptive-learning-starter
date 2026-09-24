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

1. **Choose the image boundary.** For a photograph, crop to the actual photograph rectangle, removing scan margins, binding edges, and unrelated page numbers. Keep pale sky and other light photographic content. For an illustration on paper, include the complete intended silhouette, including detached details such as birds or leaves.
2. **Choose whether transparency is appropriate.** A photograph usually stays opaque. For paper-backed artwork, remove verified paper background with a conservative mask, starting from the outer background. Do not globally turn every white or near-white pixel transparent: eyes, highlights, water, pale objects, and enclosed details can be part of the artwork. Background connected to the edge can still contain light artwork; inspect the mask rather than trusting connectivity alone. Refine ambiguous areas manually or retain them when their identity is uncertain.
3. **Export a derived file.** Preserve the original and its colored artwork pixels. Save transparency as an alpha-enabled PNG or WebP; crop surplus transparent padding without clipping the outline. Do not redraw the source with AI and present it as the original. Keep an opaque photo in a suitable image format without inventing transparent content.
4. **Place it in HTML.** Use a relative image path and concise meaningful alternative text. Put the image beside the relevant passage or exercise. To blend a cutout into the page, remove the image wrapper's white background, border, and shadow where they would recreate a rectangular card; alpha pixels alone do not remove a wrapper background. Use `object-fit` for layout only, not as a substitute for actually removing scan margins.
5. **Set the display scale.** Show the image at a modest size supported by the source resolution. Smaller display can make scan limitations less apparent; it does not restore missing detail. Preserve aspect ratio. Align neighboring pages or a continuous spread by meaningful content, scale, and baseline, not merely by equal CSS box heights; do not invent missing artwork to join them.
6. **Inspect the result.** Check the mask on a contrasting background and then on the lesson's actual background. Look for white fringes, missing light details, clipped silhouettes, stretched content, incorrect page alignment, and unnecessary captions. Verify desktop and narrow layouts plus local and hosted asset paths when supported.

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
