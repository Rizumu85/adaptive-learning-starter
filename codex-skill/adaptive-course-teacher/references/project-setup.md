# Setting Up a Learning Project

A project is one subject with one mission. Two unrelated subjects are two projects.

## Create It

1. Choose the folder. Use the location and naming pattern in the learner profile when it has one; otherwise ask once. Check the path for synchronization before large extractions (`workspace-management.md`).
2. Copy `assets/project-template/` into the folder. Never overwrite a file that already exists; report conflicts instead.
3. Fill `MISSION.md` through `onboarding.md`. Leave `RESOURCES.md` with the known primary source and let it grow.
4. Add subject-specific rules to `AGENTS.md` only when they are real decisions for this project (naming conventions, source handling, authorized scope).
5. If the learner uses version control for learning projects, initialize the repository with their naming and visibility habits from the profile. Confirm the `.gitignore` excludes licensed sources, scratch work, and machine-local configuration before the first commit. Creating a remote repository or pushing needs the learner's standing habit or explicit consent.

The template holds only what every project needs. `learning-records/`, `GLOSSARY.md`, `reference/` sheets, `lessons/`, and `assets/` components appear when the first real content for them exists.

## Starting From an Earlier Project

When the learner points to an earlier project as an example of how they like to learn, read its notes for preferences and working habits, then write any general ones into the learner profile instead of copying the project. Do not copy its lessons, exercises, naming rules, analogies, or subject knowledge. The earlier project shows how the learner likes to learn, not what this subject needs.

## Keep Project Files Readable

A new session reads these files first, so their length is a cost on every session.

- `AGENTS.md`: current rules only, written as rules. When an authorization or rule changes, rewrite the rule in place instead of appending a dated entry beneath the old one.
- `NOTES.md`: the current checkpoint at the top, then stable preferences for this subject. Move finished unit logs into `learning-records/` (when they carry evidence) or a history file in `reference/`.
- `START-HERE.md` (optional): a short learner-facing entry point with the current unit, where to open it, and what to do next.
- Hosting details, access lists, and deployment procedures belong in a separate project reference file, not in `AGENTS.md` or `NOTES.md`.
