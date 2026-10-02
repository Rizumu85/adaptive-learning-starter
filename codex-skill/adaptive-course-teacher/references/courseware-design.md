# Paper Courseware Starter

Use this as an initial visual language, not an identity that every learner must keep. Design each page as an educator and an interface designer at once: before styling anything, make the reading order obvious and put each explanation where the eye already is.

## Learning Structure

- Reading lesson: identity, short introduction, reading map, explanation, visual evidence, recall.
- Interactive lab: identity and progress, visual demonstration, one focused exercise, immediate feedback, stable navigation.
- Introduce one new distinction at a time.
- Put the explanation beside the state it describes.
- Keep ordinary reading content unframed. Use panels only for controls, comparisons, figures, and feedback.
- Keep source quotations visually distinct from added teaching copy without turning the page into nested cards.
- Bind pronunciation, glossary, or translation annotations to the exact token they describe so annotation and source wrap together.

## Visual Tokens

```css
:root {
  --ink: #18181b;
  --ink-soft: #27272a;
  --muted: #71717a;
  --canvas: #f7f5ef;
  --surface: #ffffff;
  --surface-muted: #f4f1e9;
  --line: #d7dbe2;
  --accent: #147d8f;
  --warm: #f2b84b;
  --good: #6a7f2f;
  --conflict: #c44f37;
}
```

- Body: Inter/system sans, 16px, line-height 1.55.
- Main title: system sans, 34px/700 desktop, 28px/700 mobile.
- Serif is optional and reserved for headings inside bounded teaching panels.
- Panel: white, 1px line, 8px radius, restrained shadow.
- Letter spacing remains 0.
- Do not scale font size with viewport width.

## Layout

- For inspectable illustrations, diagrams, scans, or screenshots, reuse the offline image preview bundle via `image-preview.md`. Keep image links as fallbacks, preserve reading position on return, and match project colors without changing its typography. Do not duplicate an existing equivalent viewer.

- Maximum usable width: 1120px; mobile side margins: 16px.
- Reading pages use natural document scrolling.
- Interactive desktop grid: `minmax(0, 1fr) 330px`, 18px gap.
- Visual stage appears before controls on mobile.
- Use the tallest step as the shared desktop height. Do not create a nested scrollbar to force equality.
- Move long explanations into a reading section below the workspace.
- Align paired source pages, before/after images, or neighboring illustrations to a shared visual baseline when they are meant to be compared as one unit.

## Long-Form Reading Navigation

- Multi-page book readers use the shared navigation in `reader-chrome.md`. For a single long lesson or reference page, prefer a chapter contents control collapsed by default on both desktop and mobile. Keep the trigger visible without a permanently expanded directory competing with the text; adapt if the learner explicitly prefers a persistent outline.
- Open a bounded, scrollable dropdown on request without shifting the reading layout. Close it after section selection, Escape, or an outside click. Keep keyboard access and expanded-state semantics; return focus to the trigger on Escape and place the selected heading below any sticky header.
- This is navigation disclosure, not a new teaching hierarchy. Preserve continuous reading and source order; do not invent nested topics or substeps to populate a menu. Keep necessary step progress visible in interactive lessons. A short page may need no contents menu.
- Check collapsed/open states, long labels, keyboard use, and anchor positioning on desktop and mobile.

## Color and Feedback

- Structural UI stays neutral. Color represents meaning or interaction.
- Use one consistent primary accent.
- Never rely on color alone; repeat meaning with labels, position, or shape.
- Each meaningful interaction changes the visual and produces one short factual sentence.
- Feedback states what changed or what needs correction; it does not praise the interface, explain implementation, or repeat the control label.
- Avoid gradients, decorative blobs, nested cards, and dashboard-like color noise.

## Controls

This section belongs to the paper courseware preset: it applies when the learner has chosen that preset. Paper first, app second. Every control and component looks like print on the page's paper, including new ones that no reference describes: a practice block, a quiz, a slider for a 3D lab, a filter, a card.

- Before inventing a control, reuse one that exists: the segmented choice and toggle from `reader-chrome.md` ("Book tools"), the reference card, the image preview, or a control already in the project.
- Choice between a few options: plain text options; the chosen one is ink with a thin accent underline, the others muted. On/off: the same text treatment.
- Buttons and actions: accent text, or text with a hairline border when it must read as a button. Continuous values: a hairline track, a small ink handle, and the value printed as text beside it, with a reset to the baseline.
- Surfaces: paper color, hairline borders, at most a faint contact shadow. Group with spacing and hairlines before adding a panel.
- Do not use filled pills, sliding switch thumbs, checkboxes, native `<select>` menus, frosted glass or blur, glowing or heavy shadows, gradients, or outlined hover states. Hover changes ink or underline, not the box.
- Icons are thin line-drawn inline SVG in `currentColor`. Never use emoji, and never use symbol characters that Apple devices draw as color emoji (↩ ↗ ↔ ▶ ◀ ➡ ⬅ ✔ ✖ ☑ ⚠ ★ © as an icon, and anything in the emoji ranges). Plain arrows such as ← → and the ▾ chevron are safe as text.
- Keyboard focus shows a thin accent ring; keep 44px touch targets even when the visible mark is small.
- Where a bundled example or older project page conflicts with this section (the glass panels and glowing slider handles in `0002-stepped-interactive.html`), follow this section.

## Motion

- Keep transitions under 420ms. When motion follows a gesture or moves an object, use a critically damped spring (no bounce) that starts from the current position; elsewhere prefer a short fade.
- Animate the relationship that changed, not the entire page.
- Avoid continuous decoration.
- Respect `prefers-reduced-motion`.

## Quality Check

- Obvious reading order.
- No clipped or overlapping text.
- No horizontal overflow.
- Stable panel dimensions.
- Direct local-file opening works without a server.
- Desktop and mobile screenshots pass. Take desktop screenshots of long reading pages with a headless browser and a render budget (`msedge --headless=new --virtual-time-budget=8000 --window-size=1440,16000 --screenshot=…`, splitting the result into viewport-sized pieces to look at); an embedded or background browser tab may not paint while it is hidden and its screenshots time out, and headless browsers clamp narrow widths, so check phone width in a visible browser with device emulation instead. Smooth scrolling never runs in a hidden tab, so an anchor that "does not work" there is usually not a bug; test with `scrollIntoView({behavior: 'instant'})` first.
- Interactive canvases are nonblank and controls visibly respond.
- Saved learner work survives reload, and any clear action has the intended recovery behavior.
- Learner-facing copy still matches the final rendered controls and state.
