import { decide } from "../engine/decide";
import { Decision, ProposedAction } from "../engine/types";

const URGENT_KEYWORDS = ["outage", "data loss", "legal", "security breach", "cancel"];
const KNOWN_CATEGORIES: Record<string, string> = {
    "password": "account_access",
    "reset": "account_access",
    "invoice": "billing",
    "billing": "billing",
    "refund": "billing",
};

export interface SupportTicketInput {
    ticketId: string;
    text: string;                    // raw ticket text
    customerTier: "free" | "pro" | "enterprise";
    sentimentScore: number;          // -1 (very negative) to 1 (very positive)
    priorTicketsThisWeek: number;    // how many tickets this same customer opened recently
}

export function evaluateSupportTicket(input: SupportTicketInput): Decision {
    const evidence: string[] = [];
    const missingInfo: string[] = [];
    const lowerText = input.text.toLowerCase();

    // --- Risk: negative sentiment, high-value customers, and urgent language raise the stakes ---
    let risk = 0;

    const matchedUrgent = URGENT_KEYWORDS.filter((word) => lowerText.includes(word));
    if (matchedUrgent.length > 0) {
        risk += 0.5;
        evidence.push(`Ticket mentions urgent terms: ${matchedUrgent.join(", ")}.`);
    }

    if (input.customerTier === "enterprise") {
        risk += 0.3;
        evidence.push("Customer is on the enterprise tier — higher business impact if mishandled.");
    } else if (input.customerTier === "pro") {
        risk += 0.15;
    }

    if (input.sentimentScore < -0.3) {
        risk += 0.2;
        evidence.push(`Customer sentiment is negative (${input.sentimentScore.toFixed(2)}).`);
    }

    risk = Math.min(risk, 1);

    // --- Confidence: does the ticket clearly match a known, well-handled category? ---
    const matchedCategory = Object.keys(KNOWN_CATEGORIES).find((word) => lowerText.includes(word));
    let confidence: number;
    if (matchedCategory) {
        confidence = 0.85;
        evidence.push(`Ticket matches known category "${KNOWN_CATEGORIES[matchedCategory]}" (keyword: "${matchedCategory}").`);
    } else {
        confidence = 0.35;
        missingInfo.push("a clear category match for this ticket's request");
    }

    if (input.priorTicketsThisWeek >= 3) {
        confidence -= 0.15;
        evidence.push(`Customer has opened ${input.priorTicketsThisWeek} tickets this week — may be an unresolved recurring issue.`);
    }

    confidence = Math.max(0, Math.min(confidence, 1));

    // --- Reversible: an automated reply can be followed up on, unless it's a cancellation/legal matter ---
    const reversible = !lowerText.includes("cancel") && !lowerText.includes("legal");

    const action: ProposedAction = {
        actionType: "ticket_triage",
        description: `Triage ticket ${input.ticketId}: "${input.text.slice(0, 60)}${input.text.length > 60 ? "..." : ""}"`,
        signals: { confidence, risk, reversible, evidence, missingInfo },
    };

    return decide(action);
}