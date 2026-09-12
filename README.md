# Decision Engine

An AI decision layer that knows when it's allowed to act. Built for the DOO Builders League "Decision Engine" challenge.

Instead of executing every instruction it receives, this system evaluates a proposed action against **confidence**, **risk**, **evidence**, and **reversibility** — then returns one of five outcomes: **execute**, **ask**, **defer**, **escalate**, or **refuse**. Every decision is logged with full reasoning in an audit trail.

## Live demo

**https://decision-engine-sodl.onrender.com/**

(Free hosting tier — the first request after a period of inactivity can take 30-50 seconds to wake up.)

## What it does

Three real-world domains are wired into the same core engine:

- **Refund approval** — should a refund be auto-approved, based on amount, refund history, and stated reason?
- **Support ticket triage** — can a ticket be auto-handled, or does it need a human?
- **Content moderation** — should a reported post be removed?

Each domain turns its own situation into a shared set of signals (confidence, risk, reversibility, evidence, missing information), and one shared engine makes the actual call. Adding a fourth domain later would mean writing one new file — the decision logic itself never changes.

## Running it locally

```bash
git clone https://github.com/manar-13/decision-engine.git
cd decision-engine
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

To run the automated tests:

```bash
npx vitest run
```

No API keys, no `.env` file, and no external accounts are required — everything runs with mock data.

## Project structure

```
src/
  engine/
    types.ts       — shared data shapes (a proposed action, its signals, a decision)
    decide.ts       — the core decision logic (the "brain")
  domains/
    refundApproval.ts       — turns a refund request into signals
    ticketTriage.ts          — turns a support ticket into signals
    contentModeration.ts     — turns a reported post into signals
  audit/
    auditLog.ts     — records every decision made, in order
  server.ts          — the web server + API endpoints
public/
  index.html         — the live demo page
tests/
  decide.test.ts      — automated tests covering the engine and all 3 domains
```

See `ARCHITECTURE.md` for a diagram of how a request flows through the system, `FAILURE_TEST.md` for a deliberate edge case and what happens when it's hit, `THESIS.md` for where I think decision layers are headed, and `EXPLANATION.md` for a full walkthrough of the design decisions behind this project.

## Why this design

The hardest part of building an autonomous system isn't calling the right function — it's knowing when *not* to. This engine treats "don't act" as just as valid an outcome as "act," and never runs a consequential decision without leaving behind a reason anyone can read back later.

## What I'd improve with more time

- Persist the audit trail to a real database instead of an in-memory list (currently resets if the server restarts)
- Let the confidence/risk thresholds be tuned per domain instead of shared globally
- Add a feedback loop where a human's override of a decision adjusts future scoring for similar cases