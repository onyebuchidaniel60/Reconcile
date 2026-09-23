import { describe, expect, it } from "@jest/globals";
import {
  dedupeKey,
  findInternalTransferPairs,
  type TransferCandidate,
} from "../supabase/functions/_shared/finance";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-09-10T10:00:00Z");

function cand(partial: Partial<TransferCandidate> & { id: string }): TransferCandidate {
  return {
    bankAccountId: "a",
    direction: "debit",
    amountMinor: 5000000,
    occurredAtMs: T0,
    semanticType: "expense",
    ...partial,
  };
}

describe("internal transfer matching (high-confidence only)", () => {
  it("matches opposite directions, equal amounts, different accounts", () => {
    const pairs = findInternalTransferPairs([
      cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
      cand({ id: "c1", bankAccountId: "gtb", direction: "credit" }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].map((r) => r.id).sort()).toEqual(["c1", "d1"]);
  });

  it("rejects same-account, unequal-amount, and out-of-window pairs", () => {
    expect(
      findInternalTransferPairs([
        cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
        cand({ id: "c1", bankAccountId: "uba", direction: "credit" }),
      ]),
    ).toHaveLength(0);
    expect(
      findInternalTransferPairs([
        cand({ id: "d1", direction: "debit", amountMinor: 5000000 }),
        cand({ id: "c1", bankAccountId: "b", direction: "credit", amountMinor: 5000001 }),
      ]),
    ).toHaveLength(0);
    expect(
      findInternalTransferPairs([
        cand({ id: "d1", direction: "debit" }),
        cand({ id: "c1", bankAccountId: "b", direction: "credit", occurredAtMs: T0 + 3 * DAY }),
      ]),
    ).toHaveLength(0);
  });

  it("matches each transaction at most once", () => {    const pairs = findInternalTransferPairs([
      cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
      cand({ id: "c1", bankAccountId: "gtb", direction: "credit" }),
      cand({ id: "c2", bankAccountId: "gtb", direction: "credit" }),
    ]);
    expect(pairs).toHaveLength(1);
  });

  it("ignores malformed rows instead of matching everything", () => {
    const broken = {
      id: "x",
      bankAccountId: "other",
      direction: "credit",
      occurredAtMs: T0,
      semanticType: "expense",
    };
    expect(
      findInternalTransferPairs([
        cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
        { ...broken, amountMinor: undefined } as unknown as TransferCandidate,
        { ...broken, id: "y", amountMinor: Number.NaN } as unknown as TransferCandidate,
      ]),
    ).toHaveLength(0);
  });
});

describe("dedupe idempotency", () => {
  it("builds stable keys and filters already-seen ids", () => {
    const existing = new Set([dedupeKey("demo", "acct-a", "demo_gtb_001")]);
    const incoming = ["demo_gtb_001", "demo_gtb_002"].map((id) => ({
      id,
      key: dedupeKey("demo", "acct-a", id),
    }));
    const fresh = incoming.filter((t) => !existing.has(t.key));
    expect(fresh.map((t) => t.id)).toEqual(["demo_gtb_002"]);
    // A second identical sync sees nothing new.
    const seenAfter = new Set([...existing, ...fresh.map((t) => t.key)]);
    expect(incoming.filter((t) => !seenAfter.has(t.key))).toHaveLength(0);
  });
});
