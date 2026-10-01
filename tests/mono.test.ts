import { describe, expect, it } from "@jest/globals";
import {
  parseWebhookEvent,
  verifyWebhookSecret,
  hashPayload,
  MonoError,
} from "../supabase/functions/_shared/providers/mono/webhook";
import {
  normalizeAccount,
  normalizeTransaction,
  normalizeTransactions,
} from "../supabase/functions/_shared/providers/mono/normalize";
import { validateNormalized } from "../supabase/functions/_shared/finance";

// Fixtures are transcribed from Mono's documented response examples
// (docs.mono.co API reference). The field names are Mono's; nothing here is
// invented.

describe("mono account normalisation", () => {
  const accountEnvelope = {
    status: "successful",
    data: {
      account: {
        id: "6972325w62ta67u33f88840a",
        name: "Samuel Olamide",
        account_number: "1234567890",
        currency: "NGN",
        balance: 73573,
        type: "SAVINGS",
        bvn: "6115",
        institution: { name: "GTBank", bank_code: "058", type: "PERSONAL_BANKING" },
      },
      customer: { id: "682dd53a74682beb490a0ed4" },
      meta: {
        data_status: "AVAILABLE",
        auth_method: "internet_banking",
        retrieved_data: ["identity", "balance", "transactions"],
        ref: "4055877-T",
      },
    },
  };

  it("produces the expected normalised account shape", () => {
    const account = normalizeAccount(accountEnvelope, "6972325w62ta67u33f88840a");
    expect(account).toEqual({
      providerAccountId: "6972325w62ta67u33f88840a",
      institutionId: "058",
      institutionName: "GTBank",
      displayName: "Samuel Olamide",
      // The full account number must never survive: only the last four digits.
      maskedAccountNumber: "•••• 7890",
      currency: "NGN",
      currentBalanceMinor: 73573,
      availableBalanceMinor: 73573,
      status: "active",
      dataStatus: "AVAILABLE",
    });
  });

  it("never leaks the full account number or the BVN", () => {
    const account = normalizeAccount(accountEnvelope, "6972325w62ta67u33f88840a");
    const serialised = JSON.stringify(account);
    expect(serialised).not.toContain("1234567890");
    expect(serialised).not.toContain("6115");
  });

  it("handles the account_updated casing where the id is _id", () => {
    const webhookShape = {
      data: {
        account: {
          _id: "697926f050B9c321c1451dda",
          name: "Samuel Olamide",
          accountNumber: "0131883461",
          currency: "NGN",
          balance: 22967,
          institution: { name: "ALAT by WEMA", bankCode: "035", type: "PERSONAL_BANKING" },
        },
        meta: { data_status: "AVAILABLE" },
      },
    };
    const account = normalizeAccount(webhookShape, "697926f050B9c321c1451dda");
    expect(account.providerAccountId).toBe("697926f050B9c321c1451dda");
    expect(account.maskedAccountNumber).toBe("•••• 3461");
  });

  it("falls back safely on a zero balance and on a missing balance", () => {
    const zero = normalizeAccount({ data: { account: { id: "a1", balance: 0 } } }, "a1");
    expect(zero.currentBalanceMinor).toBe(0);
    const missing = normalizeAccount({ data: { account: { id: "a1" } } }, "a1");
    expect(missing.currentBalanceMinor).toBe(0);
    expect(missing.currency).toBe("NGN");
    expect(missing.maskedAccountNumber).toBe("••••");
  });

  it("rejects a non-ISO currency rather than storing it", () => {
    const account = normalizeAccount(
      { data: { account: { id: "a1", currency: "naira", balance: 10 } } },
      "a1",
    );
    expect(account.currency).toBe("NGN");
  });
});

describe("mono transaction normalisation", () => {
  // From docs.mono.co Transactions: `data` is an array of
  // { id, narration, amount, type, balance, date, category }.
  const txnEnvelope = {
    status: "successful",
    data: [
      {
        id: "66141bbff58d2687e7d91234",
        narration: "PG00001",
        amount: 500,
        type: "debit",
        balance: 1500,
        date: "2023-12-14T00:02:00.500Z",
        category: "unknown",
      },
      {
        id: "66141bbff58d2687e7d91235",
        narration: "0000132312091322123456789012345 NIP TRANSFER",
        amount: 1000,
        type: "debit",
        balance: 2000,
        date: "2023-12-09T13:23:00.100Z",
        category: "bank_charges",
      },
    ],
    meta: { total: 307, page: 1, previous: null, next: null },
  };

  it("produces valid normalised transactions", () => {
    const page = normalizeTransactions(txnEnvelope);
    expect(page.transactions).toHaveLength(2);
    expect(page.total).toBe(307);
    expect(page.page).toBe(1);
    expect(page.hasMore).toBe(true);
    for (const t of page.transactions) {
      expect(validateNormalized(t)).toEqual([]);
    }
  });

  it("classifies a debit as an expense", () => {
    const [first] = normalizeTransactions(txnEnvelope).transactions;
    expect(first).toMatchObject({
      providerTransactionId: "66141bbff58d2687e7d91234",
      amountMinor: 500,
      currency: "NGN",
      direction: "debit",
      semanticType: "expense",
      budgetEligible: true,
      normalizedMerchant: "pg00001",
    });
  });

  it("keeps NGN in kobo without converting", () => {
    const [first] = normalizeTransactions(txnEnvelope).transactions;
    // 500 kobo must stay 500 minor units, not become 50000.
    expect(first.amountMinor).toBe(500);
  });

  it("drops rows with no id, a fractional amount, an unknown type, or a bad date", () => {
    const page = normalizeTransactions({
      data: [
        { id: "ok1", narration: "A", amount: 100, type: "debit", date: "2024-01-01T00:00:00.000Z" },
        { narration: "no id", amount: 100, type: "debit", date: "2024-01-01T00:00:00.000Z" },
        { id: "bad-amount", narration: "B", amount: 10.5, type: "debit", date: "2024-01-01T00:00:00.000Z" },
        { id: "bad-type", narration: "C", amount: 100, type: "sideways", date: "2024-01-01T00:00:00.000Z" },
        { id: "bad-date", narration: "D", amount: 100, type: "debit", date: "not-a-date" },
        { id: "zero", narration: "E", amount: 0, type: "debit", date: "2024-01-01T00:00:00.000Z" },
        { id: "negative", narration: "F", amount: -100, type: "debit", date: "2024-01-01T00:00:00.000Z" },
      ],
      meta: { total: 7, page: 1 },
    });
    expect(page.transactions).toHaveLength(1);
    expect(page.transactions[0].providerTransactionId).toBe("ok1");
    // hasMore must reflect rows Mono returned, not rows that survived filtering,
    // or a page of malformed rows would look like the end of the ledger.
    expect(page.hasMore).toBe(true);
  });

  it("reports hasMore false on an empty page", () => {
    const page = normalizeTransactions({ data: [], meta: { total: 0, page: 3 } });
    expect(page.transactions).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("reads telco-style nested paging as well as bank-data paging", () => {
    const page = normalizeTransactions({
      data: [
        { id: "t1", narration: "X", amount: 50, type: "credit", date: "2024-05-01T00:00:00.000Z" },
      ],
      meta: { paging: { total: 25, page: 1 } },
    });
    expect(page.total).toBe(25);
    expect(page.page).toBe(1);
    expect(page.hasMore).toBe(true);
  });

  it("classifies refunds and income", () => {
    const page = normalizeTransactions({
      data: [
        { id: "r1", narration: "REFUND", amount: 200, type: "credit", date: "2024-01-02T00:00:00.000Z", category: "refund" },
        { id: "s1", narration: "SALARY SEPT", amount: 500000, type: "credit", date: "2024-01-03T00:00:00.000Z", category: "salary" },
      ],
      meta: { total: 2, page: 1 },
    });
    expect(page.transactions[0].semanticType).toBe("refund");
    expect(page.transactions[1].semanticType).toBe("income");
  });

  it("does not decide internal transfers on a single row", () => {
    // Internal-vs-external is settled across rows by the pairing pass in the
    // sync pipeline, so a lone transfer must stay budget-eligible here.
    const [t] = normalizeTransactions({
      data: [
        { id: "x1", narration: "NIP TRANSFER OUT", amount: 1000, type: "debit", date: "2024-01-01T00:00:00.000Z" },
      ],
      meta: {},
    }).transactions;
    expect(t.budgetEligible).toBe(true);
    expect(t.semanticType).not.toBe("internal_transfer");
  });

  it("returns null for a row that is not an object", () => {
    expect(normalizeTransaction(null)).toBeNull();
    expect(normalizeTransaction("x")).toBeNull();
    expect(normalizeTransaction([])).toBeNull();
  });
});

describe("webhook authenticity", () => {
  const SECRET = "whsec_test_dashboard_value";

  it("accepts a matching mono-webhook-secret header", () => {
    expect(verifyWebhookSecret(SECRET, SECRET)).toEqual({ ok: true });
  });

  it("rejects a wrong secret", () => {
    const result = verifyWebhookSecret("wrong", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mismatch");
  });

  it("rejects a missing header", () => {
    const result = verifyWebhookSecret(null, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_header");
  });

  it("rejects an empty header", () => {
    expect(verifyWebhookSecret("", SECRET).ok).toBe(false);
  });

  it("fails closed when no secret is configured server-side", () => {
    const result = verifyWebhookSecret(SECRET, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_configured");
  });

  it("fails closed when the configured secret is empty", () => {
    expect(verifyWebhookSecret(SECRET, "").ok).toBe(false);
  });

  it("does not accept a truncated or extended secret", () => {
    expect(verifyWebhookSecret(SECRET.slice(0, -1), SECRET).ok).toBe(false);
    expect(verifyWebhookSecret(`${SECRET}x`, SECRET).ok).toBe(false);
  });

  it("is not satisfied by an HMAC-style signature header", () => {
    // The HMAC scheme belongs to a different Mono product (docs.mono.la) and
    // must not be mistaken for a valid Mono Connect webhook.
    const header =
      "t=1766002441,v1=62afda2079925823b390e1199060d793aa50d64ec9d7bf184f5b7e96c8bf411c";
    expect(verifyWebhookSecret(header, SECRET).ok).toBe(false);
  });
});

describe("webhook event parsing", () => {
  it("parses the documented account_connected payload", () => {
    const parsed = parseWebhookEvent({
      event: "mono.events.account_connected",
      event_id: "jU4ixom09P6eX2arBA3AmeiPyYalMk4WPdCaQ",
      timestamp: "2026-01-27T21:00:39.588Z",
      data: {
        id: "6979274350b9c321c14524b1",
        customer: "6961439d7716b67eba2d068a",
        meta: { data_status: "PROCESSING", auth_method: "internet_banking", ref: "4055877-T" },
        app: "68cbf35e9DS6deec038a43d9",
        business: "68ca76a195f6deec0384d6c0",
      },
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.eventId).toBe("jU4ixom09P6eX2arBA3AmeiPyYalMk4WPdCaQ");
    expect(parsed!.accountId).toBe("6979274350b9c321c14524b1");
    // meta.ref is how the Connect Link flow resolves ownership.
    expect(parsed!.reference).toBe("4055877-T");
    expect(parsed!.customerId).toBe("6961439d7716b67eba2d068a");
    expect(parsed!.dataStatus).toBe("PROCESSING");
  });

  it("parses account_updated, where the id is nested as _id", () => {
    const parsed = parseWebhookEvent({
      event: "mono.events.account_updated",
      event_id: "tDZCfxYASzx75YtXe3zbrgNzQtohDd6AE2BwWRvKf4",
      data: {
        account: {
          _id: "697926f050B9c321c1451dda",
          name: "Samuel",
          accountNumber: "0131883461",
          currency: "NGN",
          balance: 22967,
          institution: { name: "ALAT by WEMA", bankCode: "035" },
        },
        meta: {
          data_status: "AVAILABLE",
          retrieved_data: ["identity", "balance", "transactions"],
          ref: "4055877-T",
        },
      },
    });
    expect(parsed!.accountId).toBe("697926f050B9c321c1451dda");
    expect(parsed!.reference).toBe("4055877-T");
    expect(parsed!.dataStatus).toBe("AVAILABLE");
    expect(parsed!.retrievedData).toBe("identity,balance,transactions");
  });

  it("parses the documented account_unlinked payload", () => {
    const parsed = parseWebhookEvent({
      event: "mono.events.account_unlinked",
      event_id: "u1",
      data: { account: { id: "60770aa8c5878a2af69ed849" } },
    });
    expect(parsed!.accountId).toBe("60770aa8c5878a2af69ed849");
  });

  it("returns null without an event or an event_id", () => {
    expect(parseWebhookEvent({ data: {} })).toBeNull();
    expect(parseWebhookEvent({ event: "x" })).toBeNull();
    expect(parseWebhookEvent(null)).toBeNull();
    expect(parseWebhookEvent("nope")).toBeNull();
    expect(parseWebhookEvent([])).toBeNull();
  });
});

describe("webhook idempotency key", () => {
  // The unique (provider_id, provider_event_id) constraint on provider_events
  // is what makes a redelivery safe. Simulate the claim insert and assert the
  // second delivery collides instead of inserting again.
  function makeClaimStore() {
    const keys = new Set<string>();
    const rows: { provider_id: string; provider_event_id: string }[] = [];
    return {
      rows,
      claim: (providerId: string, eventId: string): boolean => {
        const key = `${providerId}:${eventId}`;
        if (keys.has(key)) return false;
        keys.add(key);
        rows.push({ provider_id: providerId, provider_event_id: eventId });
        return true;
      },
    };
  }

  it("inserts once for two identical events", () => {
    const store = makeClaimStore();
    expect(store.claim("mono", "evt_abc")).toBe(true);
    expect(store.claim("mono", "evt_abc")).toBe(false);
    expect(store.rows).toHaveLength(1);
    expect(store.claim("mono", "evt_xyz")).toBe(true);
    expect(store.rows).toHaveLength(2);
  });

  it("scopes the key by provider so ids cannot collide across providers", () => {
    const store = makeClaimStore();
    expect(store.claim("mono", "evt_1")).toBe(true);
    expect(store.claim("other", "evt_1")).toBe(true);
    expect(store.rows).toHaveLength(2);
  });
});

describe("payload hashing", () => {
  it("is stable and differs for different bodies", async () => {
    const a = await hashPayload('{"a":1}');
    const b = await hashPayload('{"a":1}');
    const c = await hashPayload('{"a":2}');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("MonoError", () => {
  it("carries a stable code and retryability", () => {
    const e = new MonoError("MONO_RATE_LIMITED", "busy", { retryable: true, status: 429 });
    expect(e.code).toBe("MONO_RATE_LIMITED");
    expect(e.retryable).toBe(true);
    expect(e.status).toBe(429);
  });
});
