# Media Workflow

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

Keep source links and production notes outside the learner-facing lesson unless they improve recall.
