import { ProposedAction, Decision, DecisionOutcome } from "./types";
import { recordDecision } from "../audit/auditLog";

// Thresholds that tune how cautious the engine is.
const HIGH_RISK = 0.7;
const LOW_RISK = 0.3;
const HIGH_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.4;

export function decide(action: ProposedAction): Decision {
    const { confidence, risk, reversible, evidence, missingInfo } = action.signals;

    let outcome: DecisionOutcome;
    let reasoning: string;

    if (risk >= HIGH_RISK && confidence < LOW_CONFIDENCE) {
        // Very risky and we barely understand the situation. Don't touch it.
        outcome = "refuse";
        reasoning = `Risk is high (${risk.toFixed(2)}) and confidence is too low (${confidence.toFixed(2)}) to justify acting at all.`;
    } else if (risk >= HIGH_RISK && !reversible) {
        // High risk AND can't be undone — always needs a human, no matter how confident we are.
        outcome = "escalate";
        reasoning = `Risk is high (${risk.toFixed(2)}) and the action cannot be reversed, so a human must approve this regardless of confidence.`;
    } else if (missingInfo.length > 0 && confidence < HIGH_CONFIDENCE) {
        // We know we're missing something, and we're not confident enough to ignore it.
        outcome = "ask";
        reasoning = `Missing information (${missingInfo.join(", ")}) and confidence (${confidence.toFixed(2)}) isn't high enough to proceed without it.`;
    } else if (risk >= HIGH_RISK && confidence >= HIGH_CONFIDENCE) {
        // High risk but reversible and we're confident — a human should still sign off.
        outcome = "escalate";
        reasoning = `Risk is high (${risk.toFixed(2)}), so even with strong confidence (${confidence.toFixed(2)}) this goes to a human for sign-off.`;
    } else if (risk <= LOW_RISK && confidence >= HIGH_CONFIDENCE) {
        // Low risk, high confidence — just do it.
        outcome = "execute";
        reasoning = `Risk is low (${risk.toFixed(2)}) and confidence is high (${confidence.toFixed(2)}), so this action can run immediately.`;
    } else if (confidence >= HIGH_CONFIDENCE) {
        // Medium risk but we're confident — proceed.
        outcome = "execute";
        reasoning = `Confidence is high (${confidence.toFixed(2)}) and risk is manageable (${risk.toFixed(2)}), so this action can run.`;
    } else if (confidence >= LOW_CONFIDENCE) {
        // Not fully confident, not clearly dangerous — pause and wait rather than guess.
        outcome = "defer";
        reasoning = `Confidence (${confidence.toFixed(2)}) is too uncertain to act now, but risk (${risk.toFixed(2)}) doesn't require escalation. Waiting for more signal.`;
    } else {
        // Low confidence overall — safer to ask than to guess or stall silently.
        outcome = "ask";
        reasoning = `Confidence (${confidence.toFixed(2)}) is too low to act on its own judgment.`;
    }

    const decision: Decision = { outcome, confidence, risk, reversible, evidence, missingInfo, reasoning };
    recordDecision(action, decision);
    return decision;
}