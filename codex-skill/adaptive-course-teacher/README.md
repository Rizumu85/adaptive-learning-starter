# Adaptive Course Teacher

A learning workflow for video courses, textbooks, and exercise-led study. It turns source material into a small learning map, targeted explanation, practice, and durable notes chosen by the learner.

Give an agent the repository URL and ask it to install this skill:
https://github.com/Rizumu85/adaptive-learning-starter

The repository root has installation and project-template instructions. This package includes Codex discovery metadata in `agents/openai.yaml`; its teaching references use general agent capabilities. No API key or extra configuration is needed for text-based teaching. Browsing, media processing, and interactive examples require their respective tools. Optional example development uses Node.js; prebuilt HTML examples open without a build.

## Usage

Start with: “Use adaptive-course-teacher to help me study this chapter. Read my project notes and continue from my last exercise.” Existing projects retain their preferences across conversations. A machine-local scratch override is optional, not a required onboarding step.

## Privacy and Boundaries

Keep personal learning records and licensed sources in the learner's project. External review and hosting require authorization for the intended material and audience; this skill does not itself upload files or synchronize progress. It does not infer mastery from reading, copying, or typing.

See `references/textbook-learning.md` for reading-led lessons and `references/workspace-management.md` for storage and resume behavior. The optional `assets/examples/practice/index.html` demonstrates a catalog and separately saved typed/handwritten work. Its README provides TypeScript build commands and verification limits.

Automated skill-format validation does not establish teaching effectiveness. Windows example build checks and browser checks can be run locally; macOS/Linux device behavior and actual stylus feel need verification on those devices.

## Bounded Book Study

A broad learning request starts necessary setup and one small unit, followed by learner feedback. Repository setup does not authorize whole-book notes or HTML. Explicit batch deliverables remain supported within their stated scope. Generated artifacts are not learner progress.

Use `references/book-learning.md` for source location checks and the bounded reading loop. The optional textbook workflow supplements it where relevant; previous projects supply preferences, not transferable mastery or a fixed lesson format.
