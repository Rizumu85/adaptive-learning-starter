# Media Workflow

## Source and Rights

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

When extracting an illustration or diagram from a scan, preserve the original colored pixels. Remove only verified paper-colored margin connected to the outer edge, export the removed area as transparency, and inspect fine outlines after the operation. Do not use an AI redraw as a cleaner replacement for source evidence.

When two crops come from adjacent pages or one continuous spread, align their meaningful content to a shared baseline and scale before adding independent captions.

## Animated WebP

Work from a source the learner is authorized to use.

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
