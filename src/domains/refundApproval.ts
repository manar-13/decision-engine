import { decide } from "../engine/decide";
import { Decision, ProposedAction } from "../engine/types";

export interface RefundRequestInput {
    orderId: string;
    amount: number;               // dollar amount requested
    customerTenureDays: number;   // how long the customer has had an account
    priorRefunds: number;         // how many refunds this customer has had before
    reasonProvided: boolean;      // did the customer explain why?
    reasonMatchesPolicy: boolean; // does the reason match an approved policy reason?
}

export function evaluateRefundRequest(input: RefundRequestInput): Decision {
    const evidence: string[] = [];
    const missingInfo: string[] = [];

    // --- Risk: bigger amounts and repeat refunders are riskier ---
    let risk = 0;
    if (input.amount > 200) {
        risk += 0.5;
        evidence.push(`Refund amount ($${input.amount}) is large.`);
    } else if (input.amount > 50) {
        risk += 0.25;
        evidence.push(`Refund amount ($${input.amount}) is moderate.`);
    } else {
        evidence.push(`Refund amount ($${input.amount}) is small.`);
    }

    if (input.priorRefunds >= 3) {
        risk += 0.4;
        evidence.push(`Customer has ${input.priorRefunds} prior refunds — possible pattern of abuse.`);
    } else if (input.priorRefunds > 0) {
        risk += 0.15;
        evidence.push(`Customer has ${input.priorRefunds} prior refund(s).`);
    }

    risk = Math.min(risk, 1);

    // --- Confidence: a stated, policy-matching reason is the strongest signal ---
    let confidence = 0.5;
    if (input.reasonProvided && input.reasonMatchesPolicy) {
        confidence = 0.9;
        evidence.push("Reason given matches an approved refund policy.");
    } else if (input.reasonProvided && !input.reasonMatchesPolicy) {
        confidence = 0.4;
        evidence.push("Reason given does not match any approved policy reason.");
    } else {
        confidence = 0.2;
        missingInfo.push("reason for the refund");
    }

    if (input.customerTenureDays < 7) {
        confidence -= 0.15;
        missingInfo.push("longer account history to judge trustworthiness");
    }

    confidence = Math.max(0, Math.min(confidence, 1));

    // --- Reversible: small refunds are cheap to undo if we're wrong; large ones aren't ---
    const reversible = input.amount <= 20;

    const action: ProposedAction = {
        actionType: "refund_approval",
        description: `Refund $${input.amount} for order ${input.orderId}`,
        signals: { confidence, risk, reversible, evidence, missingInfo },
    };

    return decide(action);
}