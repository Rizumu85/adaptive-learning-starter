---
name: adaptive-course-teacher
description: Turn video courses and other learning materials into personalized viewing maps, post-view reconstructions, durable notes, screenshots, animated WebP clips, and focused interactive HTML lessons. Use when a learner wants to study a course with AI, reduce listening or working-memory load, follow along accurately, diagnose confusing steps, or iteratively discover a learning and note-taking method that fits them.
---

# Adaptive Course Teacher

Treat learning as an iterative collaboration. Do not assume the learner needs the same media, depth, or note structure for every topic.

## Start

1. Read the project `AGENTS.md`, `MISSION.md`, `NOTES.md`, and `DESIGN.md` when present.
2. If the learner profile is missing, use `references/onboarding.md`. Ask only one to three questions at a time.
3. Record stable preferences in the project `NOTES.md`; keep subject-specific knowledge in notes or reference files rather than this skill.
4. Begin with one small lesson and revise from observed work. Do not prebuild a complete curriculum before the learner has produced evidence.

## Per-Lesson Workflow

Read `references/teaching-workflow.md` before handling a course episode.

1. Acquire trustworthy source material: transcript, lesson page, supplied files, and relevant discussion comments when authorized.
2. Give a short viewing map before the learner watches.
3. After viewing, reconstruct the load-bearing reasoning. Do not merely summarize the timeline.
4. Separate verified course actions from added advice, version adaptations, and diagnostics.
5. Let the learner choose what becomes a durable note, mind map, screenshot, animated WebP, or interactive lesson.
6. When practice is part of the lesson, define what counts as independent performance and record each meaningful capability separately.

## Visual Material

Read `references/media-workflow.md` before capturing screenshots, producing animation, or building HTML.

- Prefer a static image for a fixed UI location or comparison.
- Prefer animated WebP for a short visible procedure or state change.
- Prefer interactive HTML when changing one variable, coordinate space, causal order, or spatial relation is the obstacle.
- Do not add interaction when a short explanation or image teaches the point better.
- Never use GIF as the final animated-note format unless the learner explicitly requests it.
- When interactive courseware needs custom code, author the editable source in TypeScript and compile or bundle it into local JavaScript for the browser. Preserve direct local-file opening when the project requires it, and do not hand-edit generated JavaScript. Vendored libraries and unavoidable tool configuration are exempt.

Read `references/courseware-design.md` before creating HTML. Treat it as a starting theme, then adapt it to the learner, subject, and existing project style.
Read `references/interactive-courseware.md` before implementing custom interaction, persistence, narration synchronization, canvas input, or local browser delivery.

## Learner-Facing Copy

Read `references/learner-facing-copy.md` before publishing AI-written or externally reviewed lesson copy. Preserve source quotations, remove discussion residue, and keep copy review separate from UI and behavior changes unless the learner authorizes both.

## Accuracy Rules

- Never invent a course step, timestamp, shortcut, menu path, or parameter.
- Verify same-named controls by full context: application version, mode, editor, properties tab, data level, and keymap.
- A follow-along procedure contains only verified source actions. Put additions in a clearly labeled diagnostic or optional section.
- When comments contain a claim, distinguish instructor confirmation from learner speculation and verify behavior when possible.
- Respect course licensing. Do not redistribute source videos, PDFs, paid downloads, or login-protected media.
- Keep licensed source files and locally authorized assets outside version control unless redistribution is explicitly permitted. Preserve provenance for every derived crop, transcription, narration, or model.

## Bundled Examples

Use `assets/examples/lessons/0001-reading-sample.html` for calm long-form reading structure.
Use `assets/examples/lessons/0002-stepped-interactive.html` for a focused 3D stepped lab.
Use `assets/examples/lessons/0003-comparison-lab.html` for side-by-side state comparison.

Examples are patterns, not templates to copy blindly. Remove topic-specific language and preserve only the teaching structure that fits the new lesson.
