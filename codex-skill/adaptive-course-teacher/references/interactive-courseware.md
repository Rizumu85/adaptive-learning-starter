# Interactive Courseware

Read this reference when a lesson needs custom browser interaction rather than a static explanation or image.

## Learning Contract

- State the observable capability the interaction should teach or assess.
- Teach one new distinction at a time and keep instructions beside the state they describe.
- Show prerequisite information before independent practice, then remove answer-bearing prompts during recall.
- Record distinct capabilities separately. Recognition, guided execution, independent recall, correctness, fluency, and presentation must not silently substitute for one another.

## Local-First Delivery

- Author editable application code in TypeScript.
- Compile or bundle local JavaScript for the browser; never hand-edit emitted JavaScript.
- Bundle dependencies locally and pin versions. Do not require a CDN for a durable lesson.
- Preserve direct `file://` opening when that is part of the learner's workflow. Commit the browser bundle when the learner should be able to double-click the lesson without building it first.
- If a feature requires an HTTP origin, provide the smallest local launcher and explain that browser storage is scoped to the exact origin and URL.

## State and Compatibility

- Use a versioned storage key and a documented serializable schema.
- Persist learner work after meaningful input without interrupting practice.
- Hydrate text fields deliberately; never let an object coerce into visible text such as `[object Object]`.
- Keep older saved records readable when refactoring rendering or UI. Add a migration only when a compatible default is not enough.
- Store drawing coordinates in a resolution-independent form when canvases resize.
- Keep undo, clear, and recovery behavior explicit. Prefer a recoverable clear when accidental loss is plausible.

## Pen, Touch, and Canvas Input

When the learner draws or writes:

- size the canvas backing store for `devicePixelRatio` while keeping CSS dimensions stable;
- use Pointer Events, pointer capture, and coalesced samples when available;
- preserve real pen pressure but damp small pressure and position noise;
- do not append a zero-pressure lift sample that creates a terminal bead or hook;
- distinguish a live stroke from its completed outline so lift-time cleanup does not distort earlier points;
- preserve deliberate corners and stops while smoothing sampling jitter;
- prefer a maintained stroke-outline library over custom geometry when it satisfies the interaction;
- test with the learner's actual input device when possible, not only a mouse.

## Reading, Narration, and Annotations

- Bind pronunciation, glossary, or translation annotations semantically to the matching token so they wrap together. Do not render an annotation sentence and source sentence as independent wrapping streams.
- Prefer a local natural narration file when pronunciation and timing matter. Use browser speech as a fallback rather than the only path.
- Synchronize narration to the smallest reliable unit available. Highlight the current token and keep completed progress visible.
- If progress is drawn under wrapped text, create one track for each actual rendered line. Unplayed space may remain transparent; completed progress must not disappear behind the current token.
- Manual stop should return the reading view to its intentional idle state.

## Source Images and Paired Material

- Keep paired pages, before/after images, or adjacent source illustrations aligned to a shared visual baseline when they are meant to be read together.
- Preserve source pixels when cropping or removing paper-colored margins. Use transparency for removed whitespace; do not redraw a source image with AI and present it as the original.
- Keep captions short and tied to the evidence visible in the image.

## Verification

Verify the actual lesson, not only isolated functions:

- direct local-file opening and any supported local-server path;
- desktop, mobile, high-density display, and reduced-motion behavior;
- no horizontal overflow, clipping, or unstable panel dimensions;
- nonblank canvas pixels and visibly responsive controls;
- keyboard focus and non-color feedback for meaningful state;
- saved-state reload, undo, clear/recover, and an older compatible record;
- no console exceptions or missing local assets;
- representative pointer or stylus input, including pressure and lift;
- learner-facing copy against the rendered UI after the final build.
