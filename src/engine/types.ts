// The 5 possible outcomes a decision can produce.
export type DecisionOutcome = "execute" | "ask" | "defer" | "escalate" | "refuse";

// Each domain (refund, ticket, moderation) calculates these "signals"
// about a proposed action. The core engine only ever looks at these
// signals — it doesn't know anything about refunds or tickets itself.
export interface DecisionSignals {
    confidence: number;    // 0 to 1 — how sure are we this is the right call?
    risk: number;          // 0 to 1 — how bad is it if we get this wrong?
    reversible: boolean;   // can this action be undone after it happens?
    evidence: string[];    // facts that support the decision
    missingInfo: string[]; // things we don't know but would help
}

// What a domain file hands to the engine: the action itself, plus its signals.
export interface ProposedAction {
    actionType: string;     // e.g. "refund_approval"
    description: string;    // human-readable summary, e.g. "Refund $40 to customer #123"
    signals: DecisionSignals;
}

// What the engine hands back after making a decision.
export interface Decision {
    outcome: DecisionOutcome;
    confidence: number;
    risk: number;
    reversible: boolean;
    evidence: string[];
    missingInfo: string[];
    reasoning: string;      // plain-English explanation of why this outcome was chosen
}