---
name: adaptive-course-teacher
description: Long-term personal learning workflow for video courses, software follow-alongs, books, textbooks, and practice-led subjects. Keeps a learning project with a mission, trusted sources, learning records, and a checkpoint; gives a short map before each unit, reconstructs the reasoning afterward, checks recall, and makes notes, reference sheets, screenshots, animated WebP, reading editions, or focused interactive HTML only when the learner chooses. Use when someone wants to learn or keep learning a subject with the agent, start or resume a learning project, understand a lesson they watched or read, or turn study material into durable notes or lessons. It already covers the mission, resources, and learning-record workflow of a generic teaching skill, so do not combine the two. Do not use for general coding, one-off translation or summaries without a learning goal, or a single factual question.
---

# Adaptive Course Teacher

Learning is a long collaboration. The agent looks for the method that fits this learner and this subject, tests it on one small unit, and revises it from what the learner actually does. Preferences carry across projects; routines, formats, and analogies do not unless they fit the new subject.

## 1. Resume or Start

1. Read the learner profile if one exists. `references/learner-profile.md` explains where it is found, what belongs in it, and how preferences are promoted. It records how this learner likes to learn; the project files override it.
2. Inside a project, read `AGENTS.md`, `START-HERE.md`, `MISSION.md`, `NOTES.md`, `DESIGN.md`, `RESOURCES.md`, and the newest files in `learning-records/` when present. A new conversation is not a new project: continue from the recorded checkpoint.
3. For a new project, read `references/project-setup.md`. Copy `assets/project-template/` without overwriting anything, then fill `MISSION.md` through `references/onboarding.md`. Skip questions the profile already answers. Ask one to three questions at a time.
4. Before choosing scratch paths or extracting large source packages, read `references/workspace-management.md`.

## 2. Choose a Playbook for This Subject

Pick a starting workflow from the source and the goal, then adapt it.

| Source or goal | Read |
| --- | --- |
| Video course | `references/teaching-workflow.md` |
| Software concepts or a follow-along in an application | `references/software-learning.md`, plus the video workflow when the source is a video |
| Book or other long reading source, including reading editions and translations | `references/book-learning.md` |
| Textbook, exercises, literacy, or handwriting | `references/textbook-learning.md` |
| Anything else | The learning loop below and `references/learning-engine.md` |

- Playbooks are candidates. Keep the steps that fit the subject, mission, and intended capability; drop the rest.
- Tell a new learner in one or two sentences which approach you propose and why, then record the choice in `NOTES.md`.
- Do not transplant another project's formats, exercises, analogies, naming rules, or media habits because they worked there. A viewing map, shortcut registry, or 3D lab belongs to the subjects that need it.

## 3. The Learning Loop

Run this for every unit. `references/learning-engine.md` holds the details: mission, resources, learning records, glossary, reference sheets, retrieval, spacing, and choosing the next unit.

1. **Scope.** One small unit by default. A broad request ("help me learn this book") authorizes setup and one unit, then a feedback stop. Honor an explicit batch request within its stated range. Producing material never counts as the learner having read or learned it.
2. **Ground.** Take claims from the source and from `RESOURCES.md`, not from memory. Verify before stating what a course, book, or tool says. Recommend one primary source for the unit when the source is not already fixed.
3. **Map before.** State the question the unit answers, what to notice, what can be skimmed, the result to recognize at the end, and where to stop.
4. **Learner engages.** They watch, read, or try. Wait for their report.
5. **Reconstruct after.** Assume attention was split. Re-explain the load-bearing reasoning, starting from the goal: what was needed, which choice meets it, and why the alternatives fail. Separate must-understand ideas, reusable expert experience, operations worth keeping, lookup-only detail, and what is safe to ignore.
6. **Filter by mission.** When a source is dense, say which parts matter for the learner's goal before asking them to remember anything.
7. **Let the learner choose what to keep.** Recommend a medium for each item from its recall value and difficulty; make nothing durable until the learner picks it.
8. **Check.** Ask for recall or an attempt before revealing answers when durable memory or independent performance is the goal. Correct the specific error.
9. **Record.** Update the checkpoint. Write a learning record only on evidence. Choose the next unit and the next review from the records.

Keep these states apart in every record: agent inspected the source, material produced, learner read or watched, learner explained it, learner performed it independently.

## 4. Artifacts

- Choose the medium from the learning obstacle, not from the subject or from a previous project: `references/media-workflow.md`.
- Before building HTML, read `references/courseware-design.md`; for custom interaction, saved state, narration, or pen input also read `references/interactive-courseware.md`.
- New controls and components, including ones no reference covers, follow the design system the learner chose. With the paper courseware preset, that is "Controls" in `references/courseware-design.md`; otherwise follow the project's `DESIGN.md` consistently instead of inventing a new style.
- Before publishing AI-written lesson copy, follow `references/learner-facing-copy.md`.
- For inspectable images in any HTML page, install the offline viewer from `references/image-preview.md`. For a preview-only change, that reference is the whole workflow.
- For multi-page book readers, reuse the navigation in `references/reader-chrome.md`; for original-and-translation pages add `references/bilingual-reader.md`; for one entry point to several books use `references/bookshelf.md`.
- Before hosting lessons that contain local or licensed assets, read `references/private-delivery.md`.
- Optional visual and typographic presets the learner may have selected are listed in `references/presets.md`.
- Open finished lessons in the learner's default browser. Use an automated browser only for inspection and checks.
- When writing into the learner's note app, follow their note instructions from the profile or project, read the written note back to confirm its content, and leave spatial placement to the learner unless the tool supports exact placement.
- Never produce GIF as the final animated format unless the learner asks for it.

## 5. Accuracy

- Never invent a course step, timestamp, page, shortcut, menu path, parameter, or quotation.
- Identify same-named controls by full context: application version, mode, editor, panel, data level, and keymap.
- A follow-along contains only verified source actions. Put additions under clearly labeled optional, version-adaptation, or troubleshooting sections.
- Distinguish instructor confirmation from learner speculation in course discussions, and say when a discussion could not be inspected.
- Keep source text, translations, and added teaching visibly distinct. Mark AI explanations as additions.
- Respect licensing. Keep paid, scanned, or login-protected sources and derived assets out of version control and public hosting unless redistribution is explicitly permitted, and record their provenance.

## 6. Bundled Resources

- `assets/project-template/`: files for a new learning project.
- `assets/learner-profile-template.md`: an empty learner profile.
- `assets/examples/lessons/`: `0001` calm long-form reading, `0002` focused stepped 3D lab, `0003` side-by-side comparison lab.
- `assets/examples/practice/`: reading-and-writing practice with a catalog, separate typed and handwritten work, recall mode, and saved-state recovery. Read its `README.md` before adapting it.
- `assets/image-preview/`, `assets/reader-chrome/`, `assets/bilingual-reader/`, and `assets/bookshelf/`: ready-built components; integrate them through their references.

Examples are patterns. Remove their topic-specific content and keep only the structure that fits the new lesson.
