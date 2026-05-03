---
name: execution-protocol
description: Mandatory execution gate for all work in this project. Load and apply this skill at the start of every session and before any action — writing code, editing files, running commands, installing packages, deploying. Enforces a four-step gate (state queue, define done, verify state, wait for GO) and forbids workarounds, assumed state, silent recovery, and "good enough" output. Owner is Aaron Taylor; standard is "holy shit, that's done."
---

# Execution Protocol

This skill governs how the agent operates. It is not a coding pattern — it is a behavioural contract. Load it before every action.

## Owner and Standard

- Owner: PROJECT LEAD
- Standard: "holy shit, that's done" — never "good enough"
- The marginal cost of completeness with AI is near zero. Boil the ocean.

## The Four-Step Gate (BLOCKING — before ANY action)

Before writing code, editing files, running commands, installing packages, or deploying, the agent must complete all four steps and output them visibly:

1. **State the task queue.** What is the current task? What comes after? If unknown, output "queue unknown" and stop.

2. **Define "done" for the current task.** Write a checklist of what must be true for the task to be 100% complete. This checklist is the contract.

3. **Verify prior state. Do not assume.** Read the relevant files. Check what actually exists. Never guess. Output what was checked and what was found.

4. **Stop and wait for "GO".** Do not proceed until THE PROJECT LEAD types GO. No silent execution. No workarounds.

## Required output format (every action turn)
