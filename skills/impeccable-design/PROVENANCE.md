# Provenance and changes

This skill combines two open-source projects, adapted for Replit Agent.

## Impeccable
- Source: https://github.com/pbakaus/impeccable, commit d631a88, skill version 4.5.2 (generic `.agents` build)
- Copyright Paul Bakaus and contributors. Licensed under Apache 2.0: see `LICENSE-impeccable` and `NOTICE-impeccable.md`.
- Changes made here:
  - `SKILL.md` frontmatter rewritten (name `impeccable-design`, description, license, upstream metadata).
  - Added the "Platform lock" and "Awesome Design library" sections to `SKILL.md`.
  - Replaced the hard-coded `.agents/skills/impeccable/` path with `<skill-base-dir>/` and the Codex `$impeccable` prefix with plain `impeccable` across `SKILL.md` and `reference/`.
  - Replaced "Codex's structured user-input/question tool" with "the agent's structured user-input/question tool".
  - All other files are unmodified.

## Awesome DESIGN.md
- Source: https://github.com/VoltAgent/awesome-design-md, commit 13be5c0
- Copyright 2026 VoltAgent. Licensed under MIT: see `design-library/LICENSE-awesome-design-md`.
- Changes made here: each `design-md/<name>/DESIGN.md` copied to `design-library/<name>.md`; `design-library/INDEX.md` generated from their descriptions.
