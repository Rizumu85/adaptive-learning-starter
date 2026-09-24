# Project and Working Directories

## Resume Before Configuring

Start in the learner's selected project. Read its instructions, learning notes, and optional `.learning-local.json` before choosing paths. A new conversation is not a new project: reuse the current location, confirmed preferences, and last lesson checkpoint. Do not repeat onboarding or ask for a scratch location on every conversation.

For a new project, use the selected folder unless a concrete requirement makes it unsuitable. Create a machine-local configuration only when an override is needed; ordinary small projects need no setup questionnaire.

## Keep Durable Work Separate

- Keep notes, source code, learner submissions, and irreplaceable source material in the project or the learner's designated durable library.
- Download caches, package extraction, temporary frames, and rebuildable outputs can use a disposable working directory. Never put the only copy of learner work in a system cache or temporary directory.
- Respect build-tool requirements. Do not arbitrarily relocate `node_modules` or create symlinks that a toolchain does not support. If project-local dependencies are the main problem, propose moving the development project to a non-synchronized location.
- Git ignores, cloud synchronization, and deployment inclusion are separate controls. `.gitignore` does not stop a cloud client from syncing files.

## Choose a Location From Evidence

Use an ordinary project-local `work/` directory for small jobs outside known synchronized roots. Before jobs that expand many files, check available provider configuration, environment information, and the learner's recorded setup. Resolve actual paths, including links where supported; a folder name alone does not prove synchronization status.

This applies to any synchronization provider, not just OneDrive. If synchronization is unknown and a large extraction is imminent, ask one targeted question rather than scanning unrelated personal directories. No cloud client means no cloud-specific relocation is necessary.

When a synchronized project needs substantial disposable work, propose a concrete non-synchronized cache location and explain which files would go there. Honor a location already authorized in this project. Ask once if choosing a different storage location is material to the learner; record that choice and reuse it.

Resolve platform cache roots at runtime: Windows local application data, macOS user Library caches, or Linux `XDG_CACHE_HOME` with the platform fallback. These are candidates, not proof of exclusion from synchronization: respect overrides and known custom sync roots. Namespace caches by a stable project ID to prevent projects overwriting each other.

## Machine-Local Configuration

An optional ignored `.learning-local.json` may hold `schemaVersion`, `projectId`, and `scratchRoot`. Resolve relative paths against the project, not the shell's current directory. Resolve a configured absolute path only on the current machine. Keep unknown fields when updating configuration. Never store credentials here.

Keep portable policy and checkpoint information in project notes; keep personal absolute paths in the ignored configuration. Agents and scripts must actually read this file before using an override; this reference alone does not redirect tools or configure cloud clients.

On a new machine or after a project move, validate that the recorded path is accessible and writable. If disposable cache is unavailable, select an available local cache for new work and record it; preserve the old location. If a durable source or submission is missing, report it and ask for its location. Do not silently create an empty replacement and mark the work recovered.

## Moves and Cleanup

Do not move an existing project, change a cloud client's settings, or delete learner material merely because synchronization is detected. When a move is requested, check source and destination, preserve pending work, and verify references afterward. Avoid generating thousands of cloud deletions during an active upload.

Clean only known regenerable files inside a verified project-specific scratch directory. Preserve diagnostics needed to resume a failed operation. Do not delete a cache root shared with other projects.
