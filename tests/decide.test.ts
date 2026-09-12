import { describe, it, expect } from "vitest";
import { decide } from "../src/engine/decide";
import { evaluateRefundRequest } from "../src/domains/refundApproval";
import { evaluateSupportTicket } from "../src/domains/ticketTriage";
import { evaluateContentForRemoval } from "../src/domains/contentModeration";

describe("core engine — decide()", () => {
    it("executes when confidence is high and risk is low", () => {
        const result = decide({
            actionType: "test",
            description: "test action",
            signals: { confidence: 0.9, risk: 0.1, reversible: true, evidence: [], missingInfo: [] },
        });
        expect(result.outcome).toBe("execute");
    });

    it("asks when information is missing and confidence isn't high enough", () => {
        const result = decide({
            actionType: "test",
            description: "test action",
            signals: { confidence: 0.3, risk: 0.2, reversible: true, evidence: [], missingInfo: ["something"] },
        });
        expect(result.outcome).toBe("ask");
    });

    it("defers when confidence is middling and risk is low", () => {
        const result = decide({
            actionType: "test",
            description: "test action",
            signals: { confidence: 0.5, risk: 0.2, reversible: true, evidence: [], missingInfo: [] },
        });
        expect(result.outcome).toBe("defer");
    });

    it("refuses when risk is high and confidence is very low", () => {
        const result = decide({
            actionType: "test",
            description: "test action",
            signals: { confidence: 0.1, risk: 0.9, reversible: true, evidence: [], missingInfo: [] },
        });
        expect(result.outcome).toBe("refuse");
    });

    it("escalates when risk is high and the action can't be undone", () => {
        const result = decide({
            actionType: "test",
            description: "test action",
            signals: { confidence: 0.9, risk: 0.8, reversible: false, evidence: [], missingInfo: [] },
        });
        expect(result.outcome).toBe("escalate");
    });
});

describe("refund approval domain", () => {
    it("executes a small refund with a valid, policy-matching reason", () => {
        const result = evaluateRefundRequest({
            orderId: "order-1",
            amount: 15,
            customerTenureDays: 100,
            priorRefunds: 0,
            reasonProvided: true,
            reasonMatchesPolicy: true,
        });
        expect(result.outcome).toBe("execute");
    });

    it("refuses a large refund from a repeat refunder with no reason given", () => {
        const result = evaluateRefundRequest({
            orderId: "order-2",
            amount: 250,
            customerTenureDays: 100,
            priorRefunds: 4,
            reasonProvided: false,
            reasonMatchesPolicy: false,
        });
        expect(result.outcome).toBe("refuse");
        expect(result.missingInfo).toContain("reason for the refund");
    });
});

describe("ticket triage domain", () => {
    it("executes a routine, clearly-categorized ticket", () => {
        const result = evaluateSupportTicket({
            ticketId: "ticket-1",
            text: "I need to reset my password please",
            customerTier: "free",
            sentimentScore: 0.2,
            priorTicketsThisWeek: 0,
        });
        expect(result.outcome).toBe("execute");
    });

    it("refuses to auto-handle an ambiguous, high-stakes enterprise outage ticket", () => {
        const result = evaluateSupportTicket({
            ticketId: "ticket-2",
            text: "We are experiencing a major outage affecting our production systems",
            customerTier: "enterprise",
            sentimentScore: -0.6,
            priorTicketsThisWeek: 1,
        });
        expect(result.outcome).toBe("refuse");
    });
});

describe("content moderation domain", () => {
    it("escalates flagged content with many reports when the action is still reversible", () => {
        const result = evaluateContentForRemoval({
            postId: "post-1",
            text: "example flagged text",
            reportCount: 6,
            authorTrustScore: 0.5,
            containsFlaggedTerms: true,
            isRepeatOffender: false,
        });
        expect(result.outcome).toBe("escalate");
    });
});