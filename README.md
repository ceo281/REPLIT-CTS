# REPLIT-CTS

An execution protocol skill for Replit Agent.

## What this skill does

This skill enforces a strict behavioural contract on the Replit Agent before it takes any action — writing code, editing files, running commands, installing packages, or deploying.

It exists because AI coding agents have a tendency to:

- Skip ahead and start working before the task is properly defined
- Assume what was done in previous sessions instead of verifying
- Present workarounds when the real fix is reachable
- Declare tasks "done" when they're only partially complete
- Quietly recover from errors instead of surfacing them

This skill blocks all of that.

## The four-step gate

Before any action, the agent must:

1. **State the task queue** — what's the current task and what comes next
2. **Define "done"** — write a checklist of what must be true for the task to be 100% complete
3. **Verify prior state** — read the actual files, never guess what was done before
4. **Stop and wait for "GO"** — no silent execution

If any of those four steps is skipped, the agent has failed the protocol.

## Hard rules

- No compaction or summarisation of state without explicit permission
- No workarounds when the real fix exists
- No deferring solvable problems to "later"
- No fabricating file contents or claiming work was done that wasn't
- Search before building; test before shipping
- Pre-ship audit against the "definition of done" checklist before declaring complete

## Standard

"Holy shit, that's done" — never "good enough".

The marginal cost of completeness with AI is near zero. The skill is built around that principle.

## Installation

Install from this repo:
