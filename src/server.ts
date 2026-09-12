import express from "express";
import * as path from "path";
import { evaluateRefundRequest } from "./domains/refundApproval";
import { evaluateSupportTicket } from "./domains/ticketTriage";
import { evaluateContentForRemoval } from "./domains/contentModeration";
import { getAuditLog } from "./audit/auditLog";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/refund", (req, res) => {
    try {
        const result = evaluateRefundRequest(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: "Invalid refund request input." });
    }
});

app.post("/api/ticket", (req, res) => {
    try {
        const result = evaluateSupportTicket(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: "Invalid ticket input." });
    }
});

app.post("/api/moderation", (req, res) => {
    try {
        const result = evaluateContentForRemoval(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: "Invalid moderation input." });
    }
});

app.get("/api/audit", (_req, res) => {
    res.json(getAuditLog());
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Decision Engine demo running on port ${port}`);
});