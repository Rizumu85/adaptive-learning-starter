# Adaptive Course Teacher

A long-term learning workflow for video courses, software follow-alongs, books, textbooks, and practice-led study. Each project keeps a mission, trusted sources, learning records, and a checkpoint. Each unit starts with a short map, continues with the learner's own reading or viewing, and ends with a reconstruction of the reasoning, a recall check, and only the notes or lessons the learner chooses to keep.

## What You Get

- A project template that any installed copy can use to start a new learning project.
- Subject playbooks (video course, software follow-along, book and reading edition, textbook and exercises) that the agent adapts instead of copying between subjects.
- A learning engine: mission, resources, learning records, glossary, reference sheets, retrieval and spaced review, and choosing the next unit from evidence.
- Optional presets you can adopt as they are: paper courseware, stepped interactive labs, book reader navigation, an offline image viewer, and a Chinese reading typography pairing.
- A private learner profile, kept outside this package, so a new project starts from preferences that already worked.

## Install

Give an agent the repository URL and ask it to install this skill:
https://github.com/Rizumu85/adaptive-learning-starter

Or run `npx skills add Rizumu85/adaptive-learning-starter`.

No API key or configuration is needed for text-based teaching. Browsing course pages, processing media, and building interactive examples need the matching tools on your machine. Example development uses Node.js; the prebuilt HTML examples open without a build. The `agents/` folder holds optional display metadata for one host; other hosts ignore it.

## Usage

- New subject: "Use adaptive-course-teacher to start a learning project for this course in this folder."
- Returning: "Continue my learning project from the last checkpoint."
- After a lesson: "I watched it casually. Rebuild the important reasoning and tell me what is worth keeping."

The first project asks a few questions about your goal and how you like to learn. When some preferences settle, the agent offers to save them in a learner profile (`references/learner-profile.md`) so later projects skip those questions.

## Privacy and Boundaries

- Your profile, learning records, and licensed sources stay in your own files. The skill does not upload, publish, or synchronize anything by itself; hosting needs your authorization for the material and the audience.
- It does not count reading, copying, or generated material as learning; it records what you actually showed.
- To share your setup with a friend, share this skill and the presets you use. Keep your profile private, or share a copy with personal details removed.

Automated format validation does not show that teaching works. Example builds and browser checks have been run on Windows; macOS and Linux devices and real stylus feel need checking on those devices.
