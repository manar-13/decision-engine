# Project Explanation

This document explains how this decision engine works and why it's built the way it is. It's written for anyone reviewing the code — a mentor, a judge, or a future version of me — who wants to understand the design decisions behind it, not just read the code line by line.

## What this project does

This is a decision layer: a system that sits in front of an AI agent's actions and decides whether the action should actually run. Instead of executing every instruction it receives, it evaluates a proposed action against confidence, risk, evidence, and reversibility, and returns one of five outcomes: **execute**, **ask**, **defer**, **escalate**, or **refuse** — each with a plain-English reason attached.

Three real domains are wired into it: refund approval, support ticket triage, and content moderation.

## Why the code is split into `engine/` and `domains/`

`src/engine/` contains the only two files that know anything about *deciding*: `types.ts` defines the shared shapes, and `decide.ts` contains the actual threshold logic. Neither file has ever heard of a refund, a ticket, or a post.

`src/domains/` contains one file per real-world situation. Each domain file's entire job is to look at its own kind of input and translate it into the shared "signals" shape (confidence, risk, reversible, evidence, missingInfo) that the engine understands. A domain never decides anything itself — it only gathers evidence and hands it off.

I chose this split so that the *hard, safety-critical part* (the actual decision logic) exists in exactly one place. If I ever needed to tighten the rules — say, make the engine more cautious about irreversible actions — I'd change one function, and every domain, present and future, would inherit that change automatically. Compare that to writing decision logic separately inside each domain: the same bug or oversight would need to be fixed three times, and a fourth domain added later could easily miss it.

## Why these specific signals

I settled on four signals — confidence, risk, reversibility, and missing information — because together they answer the four questions that actually matter before acting: *how sure am I, how bad is it if I'm wrong, can I undo it if I am, and do I even have enough information to judge this at all?* Evidence is a fifth, supporting piece: the plain-English "why" behind the numbers, so a decision is never just a score with no explanation attached.

The threshold values themselves (0.7 for "high," 0.3 for "low," and so on) are deliberately simple and named as constants at the top of `decide.ts`, not buried in conditionals — so someone auditing this system doesn't have to reverse-engineer what "risky" means from scattered numbers.

## Why the audit trail lives inside the engine, not the domains

`recordDecision()` is called from inside `decide.ts` itself, not from each domain file. This means logging isn't something a domain author has to remember to do — it's structurally guaranteed. Every decision, from any domain, present or future, gets recorded the same way, with zero chance of a forgotten log call. This mirrors a lesson from my previous project (a Google Sheets connector): safety mechanisms that depend on every caller remembering to opt in eventually get skipped by someone. Mechanisms that are baked into the one shared choke point don't have that failure mode.

## Testing philosophy

`tests/decide.test.ts` tests the engine directly with made-up signal values (to prove the core threshold logic is correct in isolation), and then tests each domain function with realistic inputs (to prove the wiring between "real-world situation" and "signals" actually works end to end). Both layers are tested because a bug could live in either one — the engine could miscalculate a threshold, or a domain could miscalculate risk from a good input — and testing only one layer would miss the other.

## The failure test, and what it taught me

While looking for a case to deliberately break, I found something more interesting than a crash: the engine can be gamed by splitting one large, risky action into several small, individually-safe ones, because it has no memory of what it just approved a moment ago for the same actor. I wrote this up honestly in `FAILURE_TEST.md` rather than picking an easier, less revealing example, because a system that can't admit its own gaps isn't one I'd trust — and finding this gap by actually trying to attack my own design was more valuable than any amount of additional unit tests would have been.

## What I'd still improve given more time

- Give domains read access to their own audit history, so signals like "prior refunds" come from the system's own record instead of being self-reported by the caller (this directly closes the gap found in the failure test)
- Move the audit log to a persistent store instead of an in-memory list
- Let confidence/risk thresholds be tuned per domain instead of sharing one global set of constants

## How this project came together

This is my second build in the Builders League program, after a Google Sheets connector where I learned the value of designing safety mechanisms that can't be bypassed by an oversight. I carried that lesson directly into this project's audit trail design. Where the Sheets connector taught me to defend against a caller skipping a safety step, this project taught me to look for the sneakier version of that same problem: a caller who never skips anything, but exploits the fact that each individual step looks safe on its own.