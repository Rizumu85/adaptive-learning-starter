# Learning From a Book

## First Session

Read the project instructions and inspect the contents plus one candidate section. Separate the learner's long-term goal from today's scope. If the starting point is unknown, propose one short unit and ask whether the learner has already read it; do not assume chapter one or transfer progress from another subject.

Provide a short reading map: the question to investigate, the verified location, one or two features to notice, and a natural stopping point. Stop after handing over this unit. Do not process later chapters to keep working while the learner reads. A requested whole-book outline may cover headings, but is not authorization to summarize every page or build every lesson.

## Source Locations

For scans, inspect actual page images before attributing claims to the book. Keep PDF page numbers and printed page labels distinct. Record verified pairs; never generalize one offset across the book without evidence. When locations conflict, flag them and verify the next unit before issuing exact reading instructions.

Keep source claims, paraphrases, and supplemental explanations distinguishable. Do not convert an illustrative claim into a numerical simulation unless the model is justified and its limits are clear. Passing implementation tests does not validate the science or interpretation.

## Reading Loop

1. Give the map for the selected short unit in conversation. A whole chapter is not the default unit.
2. Let the learner read and report what they noticed or where they became confused.
3. Reconstruct the missing reasoning with concrete observations appropriate to this subject, then name the concept. Do not reuse a fixed analogy across topics.
4. When useful, suggest one small application suited to the learner's goal. For drawing, this could be identifying a visible landmark or making a quick structural sketch; do not prescribe the same exercise for every section.
5. Choose what is worth retaining with the learner. Start with the lightest sufficient medium; build an interactive artifact only for a specific obstacle or an explicit request.
6. Record the learner's confirmed reading position, attempt, unresolved question, and next action. Source inspected by the agent, artifact completed, learner read, and learner demonstrated understanding are different states.

## Dense Sections

When a section lists more names, variations, or steps than the learner's goal needs, apply "Filtering Dense Material" in `learning-engine.md` before the learner tries to memorize it. A learner saying a section is "too detailed" or "I can't tell what matters" is the signal. Keep the book's text complete; change the emphasis and the check, not the source.

## Reading Editions

When the learner asks for the source itself as a web page (a scanned book is hard to read on screen, or a foreign-language book needs a translation beside it), make a reading edition. This is a separate deliverable from teaching.

- Keep the original text and the book's structure. Do not insert AI explanations, reading questions, or editorial notes into the edition. The reading map stays a separate Markdown file.
- Verify every page against the scan before calling it checked. OCR and text layers are drafts. Keep printed page labels and PDF indices distinct, and record verified pairs rather than a global offset.
- Crop figures from the source as described in `media-workflow.md`, keep them beside the passage they illustrate, and make them inspectable with `image-preview.md`.
- With two translations, compare them passage by passage and choose the clearer wording without blending them into a text neither translator wrote. Keep the changes and reasons in a local editorial file.
- For a machine translation, send short batches, keep the raw output and the reviewed version separately, and review against the source for omissions, invented content, terms, numbering, and image correspondence. Preserve the author's voice: first person stays first person, hedges and feelings stay, and splitting a paragraph into points is paragraphing, not summarizing.
- For Japanese with furigana, bind each reading to its word with semantic `ruby`, choose readings from context, and leave uncertain proper-noun readings unannotated rather than guessing.
- Regenerate pages from data and validate that every source paragraph and translation appears exactly once and in order; a navigation or styling change must not change the text.
- Use the shared navigation in `reader-chrome.md` for multi-page readers. Link references in the text to their figures and passages, and add multi-target references where one phrase needs a passage and a figure (or several figures) from different places; `reader-chrome.md` ("References") lists when to add them.
- Keep source text, translations, crops, and editorial data in ignored local directories. Host them only as `private-delivery.md` allows.

Reading-edition typography is a learner choice; see `presets.md` for the bundled Chinese reading pairing.

## Existing Projects

Keep existing materials. If their accuracy or authorization is unclear, label them as drafts or historical records rather than silently deleting them or counting them as learned. Do not overwrite a claimed learning history with invented certainty in either direction. Resume from the learner's last confirmed checkpoint.
