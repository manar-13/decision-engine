# Deliberate Failure Test

## The attack: splitting one risky action into several safe-looking ones

The refund domain judges each request independently — it has no memory of what it just decided a moment ago for the same customer. This creates a "structuring" problem (the same trick used to dodge bank reporting thresholds by breaking one large transaction into several small ones).

### The setup

A single $75 refund, no reason given, on a fairly new account, correctly gets refused or asked for more information by the engine — small individual risk factors add up.

But split into five separate $15 refund requests, submitted back to back:

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST https://decision-engine-sodl.onrender.com/api/refund \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"split-$i\",\"amount\":15,\"customerTenureDays\":100,\"priorRefunds\":0,\"reasonProvided\":true,\"reasonMatchesPolicy\":true}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['outcome'])"
done
```

### What actually happens

All five return **`execute`**. Every single call looks safe on its own — small amount, valid reason, low risk. The engine has no way to notice that the same actor just ran this exact play four times in the last few seconds. Cumulatively, $75 moved with zero scrutiny, when a single $75 request without a matching pattern of small "safe" calls might have been asked for more information.

### Why this happens

Two root causes:

1. **No cross-call memory.** `decide()` and each domain file only ever see the one request in front of them. The audit log records history, but nothing in the decision path actually *reads* it back before making the next call.
2. **Self-reported history.** `priorRefunds` is a field the caller provides, not something the engine independently verifies against its own audit trail. A caller (malicious or just buggy) can always pass `0`, and the engine has no way to catch the lie.

### What I'd do about it

The fix isn't more rules inside `decide.ts` — it's giving the refund domain access to its own audit history before computing signals, so `priorRefunds` (and a new "requests from this customer in the last hour" signal) come from the system's own record, not from whatever the caller claims. That's a data-access change, not a decision-logic change — which is exactly the kind of gap a source-only code review can't always catch, but a determined bad actor would find in minutes.

I'm noting this honestly rather than hiding it: a system that claims a high score on "failure thinking" is more credible when it shows a real crack, not a strawman.