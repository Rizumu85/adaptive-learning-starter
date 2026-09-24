# Reading and Writing Example

Open `index.html` directly in a browser. The original sentence is a demonstration, not a textbook quotation. No licensed font, source scan, or personal learner record is included.

The catalog reports drafts and attempts, not mastery. Typed reference and handwriting are saved separately within one versioned lesson record. Recall hides the source and typed reference together, including them from the accessibility tree; revealing the model is counted separately. Handwriting uses a locally bundled perfect-freehand outline. Undo removes the last stroke; add-lines expands the paper without scaling earlier writing.

This small example does not grade handwriting, teach stroke order, implement spaced repetition, or synchronize devices. It uses system fonts, accepts pen or mouse input, and ignores touch contacts on the writing surface to reduce accidental marks. Validate the intended stylus and browser before using it as a production lesson.

Stroke x coordinates are stored as a fraction of paper width; y coordinates are CSS-pixel distances from the top. Increasing paper height preserves existing writing. Width changes rescale horizontal positions. For tasks requiring exact geometric proportions, choose a fixed logical page coordinate system instead.

Browser storage can be unavailable or differ across file URLs and origins. Failure is shown without discarding current input. An unreadable record is not overwritten until the learner chooses to replace it. Use a stable local server origin if the browser does not retain file-based records.

## Development

The editable code is `src/practice.ts`. `practice.js` is committed generated output so learners do not need a build or network connection. Retain `THIRD_PARTY_NOTICES.md` when copying the bundled library.

With Node.js and npm available, run from this directory:

```text
npm ci
npm run check
npm run build
```

Check direct-file opening, a narrow viewport, pen/mouse drawing, undo, adding rows, recall concealment, saved-state reload, and invalid saved records. Preserve separate lesson IDs and source/assessment boundaries when adapting the example.
