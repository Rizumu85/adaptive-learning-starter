# Local Assets and Hosted Lessons

Decide separately what may enter Git, what the deployment needs, and who may access the hosted result. Ignoring a file in Git neither protects a deployed copy nor uploads it automatically.

Before including local source scans, fonts, or derived material in a deployment, establish authorization for the intended hosted use and verify the site's actual access scope. Personal-use or local-use permission does not automatically cover public redistribution. Reuse explicit authorization already provided; do not repeatedly ask for the same private deployment.

Use an explicit build allowlist for required assets. Exclude caches, dependencies, extraction directories, credentials, and unrelated complete source collections. Keep authorized private assets out of Git when appropriate, while including them in the authorized build artifact. A public or source-only build should omit private assets by default; private inclusion should be an explicit build mode.

Keep large static assets separate from executable bundles when the host supports it. Record asset provenance and, when needed for reproducibility, a local manifest of checksums; a Git commit alone cannot reproduce ignored external inputs.

After deployment, verify representative pages, fonts, images, and media using authenticated access. Also check that an unauthenticated visitor cannot retrieve a protected asset. Inspect content types and actual browser rendering, not just HTTP success. Recheck permissions before broadening access; do not silently expose assets included for a private audience.

Use the hosting provider's supported packaging and authentication mechanism. Keep provider-specific IDs and instructions in the project, not the general teaching skill.
