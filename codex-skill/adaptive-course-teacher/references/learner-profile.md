# Learner Profile

A learner profile carries preferences from one learning project to the next, so a new project starts from what already worked instead of from a copied conversation. It is private to the learner and never part of this skill or a public repository.

## Where to Find It

Check in this order and use the first file that exists:

1. `learnerProfile` in the project's ignored `.learning-local.json`.
2. `learnerProfile` in `~/.adaptive-learning/config.json`.
3. `~/.adaptive-learning/profile.md`.

Paths may be absolute or relative to the file that names them. A profile kept in a synchronized folder works across the learner's machines; the pointer in `~/.adaptive-learning/config.json` is per machine.

If no profile exists, continue without one. After the first project has settled some preferences, offer to create one from `assets/learner-profile-template.md`, and ask where to keep it.

## How to Use It

- Read it before onboarding and skip questions it already answers.
- Treat each entry within its stated scope. "Software follow-alongs: start with a viewing map" does not apply to a novel; "reading pages: 京华老宋 body text" does not apply to a 3D lab.
- Project files override the profile. A newer request overrides both.
- Preferences describe how the learner likes to learn and what they like to look at. They are not evidence of subject knowledge and not authorization to produce anything.
- Personality types and attention descriptions are tentative design signals, never diagnoses. Do not mention them in lesson copy.

## What Belongs Where

| Kind of information | Home |
| --- | --- |
| Language, explanation style, pace, attention costs | Profile |
| Note home, note-writing instructions or a pointer to them | Profile |
| Selected presets (visual system, reading typography, reader navigation) | Profile, naming the preset from `presets.md` |
| Devices, tools, and working habits (browser channel, note CLI, translation or delegate models, git and repository naming) | Profile |
| Things the learner already knows across subjects, and things to stop repeating | Profile, with scope |
| Mission, sources, checkpoint, subject conventions, unit history | Project files |
| Hosting details, access lists, deployment steps | Project files only |
| Credentials, tokens, passwords | Nowhere in these files |

## Promoting a Preference

A preference moves from a project's `NOTES.md` into the profile when the learner states it as general ("from now on", "for all my projects"), or confirms it after it held in more than one project. Write it with its scope and, when useful, the date. Tell the learner in one line when you add or change a profile entry. Remove entries the learner reverses; keep the profile short enough to read at the start of every session.

## Sharing

The skill and its presets are shareable. The profile is not. A learner who wants to share their setup shares the presets they selected and, if they choose, a copy of their profile with personal details removed. The template is what another learner fills in for themselves.
