import { decide } from "../engine/decide";
import { Decision, ProposedAction } from "../engine/types";

export interface ContentModerationInput {
    postId: string;
    text: string;
    reportCount: number;           // how many users reported this post
    authorTrustScore: number;      // 0 to 1, based on account history
    containsFlaggedTerms: boolean; // did an automated filter catch severe policy terms?
    isRepeatOffender: boolean;     // has this author had content removed before?
}

export function evaluateContentForRemoval(input: ContentModerationInput): Decision {
    const evidence: string[] = [];
    const missingInfo: string[] = [];

    // --- Risk: getting this wrong matters more when the content is already spreading or severe ---
    let risk = 0;
    if (input.containsFlaggedTerms) {
        risk += 0.4;
        evidence.push("Automated filter flagged severe policy terms in the content.");
    }
    if (input.reportCount >= 5) {
        risk += 0.3;
        evidence.push(`Post has been reported ${input.reportCount} times.`);
    } else if (input.reportCount > 0) {
        risk += 0.1;
    }
    if (input.isRepeatOffender) {
        risk += 0.2;
        evidence.push("Author has had content removed before.");
    }
    risk = Math.min(risk, 1);

    // --- Confidence: automated flags are the strongest signal; otherwise, weigh reports against trust ---
    let confidence: number;
    if (input.containsFlaggedTerms) {
        confidence = 0.85;
    } else {
        confidence = 0.3 + input.reportCount * 0.05 + (1 - input.authorTrustScore) * 0.3;
        if (input.reportCount < 3 && input.authorTrustScore > 0.7) {
            missingInfo.push("clearer evidence of an actual policy violation, beyond a few reports on a trusted account");
        }
    }
    confidence = Math.max(0, Math.min(confidence, 1));

    // --- Reversible: a first flag can be undone by restoring the post; a repeat offender's
    //     record already shapes how the account is treated going forward, so it's less clean to undo ---
    const reversible = !input.isRepeatOffender;

    const action: ProposedAction = {
        actionType: "content_moderation",
        description: `Review post ${input.postId} for removal (${input.reportCount} reports)`,
        signals: { confidence, risk, reversible, evidence, missingInfo },
    };

    return decide(action);
}