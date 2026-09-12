import { Decision, ProposedAction } from "../engine/types";

export interface AuditEntry {
    id: string;           // unique id for this record
    timestamp: string;    // when the decision was made
    actionType: string;
    description: string;
    decision: Decision;
}

const auditLog: AuditEntry[] = [];

export function recordDecision(action: ProposedAction, decision: Decision): AuditEntry {
    const entry: AuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actionType: action.actionType,
        description: action.description,
        decision,
    };
    auditLog.push(entry);
    return entry;
}

export function getAuditLog(): AuditEntry[] {
    return [...auditLog].reverse(); // most recent decision first
}