// Live integration tests: RLS isolation + sync idempotency against a real
// Supabase project. SKIPPED unless RUN_LIVE_TESTS=1 with LIVE_SUPABASE_URL,
// LIVE_SUPABASE_ANON_KEY, and LIVE_SUPABASE_SERVICE_ROLE_KEY in the
// environment. Never run casually: they create and delete real auth users.
// Secrets are read from the environment only and never printed.
import { describe, expect, it } from "@jest/globals";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as http from "node:http";
import * as https from "node:https";
import {
  hasHistory,
  periodSpend,
  remainingBudget,
  topMerchant,
} from "../supabase/functions/_shared/finance";

type FetchHeaders =
  | Record<string, string>
  | [string, string][]
  | { entries: () => Iterable<[string, string]> };

interface NodeFetchInit {
  method?: string;
  headers?: FetchHeaders;
  body?: string | Uint8Array | null;
}

interface NodeFetchResponse {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

function headerRecord(headers: FetchHeaders | undefined): Record<string, string> {
  if (!headers) return {};
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [k, v] of headers) out[k] = v;
    return out;
  }
  if ("entries" in headers && typeof headers.entries === "function") {
    return Object.fromEntries(headers.entries());
  }
  return { ...(headers as Record<string, string>) };
}

/**
 * Minimal fetch over node:http(s). The jest-expo environment replaces the
 * global fetch with stubbed native responses, so supabase-js is given this
 * working implementation explicitly via the client's `global.fetch` option.
 */
function nodeFetch(
  input: string | { url: string },
  init?: NodeFetchInit,
): Promise<NodeFetchResponse> {
  const urlText = typeof input === "string" ? input : input.url;
  return new Promise((resolve, reject) => {
    const url = new URL(urlText);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      { method: init?.method ?? "GET", headers: headerRecord(init?.headers) },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: {
              get: (name: string) => {
                const value = res.headers[name.toLowerCase()];
                if (Array.isArray(value)) return value[0] ?? null;
                return value ?? null;
              },
            },
            json: () => Promise.resolve(JSON.parse(text) as unknown),
            text: () => Promise.resolve(text),
          });
        });
      },
    );
    req.on("error", reject);
    if (init?.body) req.write(init.body);
    req.end();
  });
}

const workingFetch = nodeFetch as unknown as typeof fetch;

const LIVE =
  process.env["RUN_LIVE_TESTS"] === "1" &&
  !!process.env["LIVE_SUPABASE_URL"] &&
  !!process.env["LIVE_SUPABASE_ANON_KEY"] &&
  !!process.env["LIVE_SUPABASE_SERVICE_ROLE_KEY"];

const describeLive = LIVE ? describe : describe.skip;

function anonClient(): SupabaseClient {
  return createClient(
    process.env["LIVE_SUPABASE_URL"] as string,
    process.env["LIVE_SUPABASE_ANON_KEY"] as string,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: workingFetch },
    },
  );
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env["LIVE_SUPABASE_URL"] as string,
    process.env["LIVE_SUPABASE_SERVICE_ROLE_KEY"] as string,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: workingFetch },
    },
  );
}

describeLive("live integration (RLS + sync idempotency)", () => {
  it("isolates users and dedupes repeated syncs", async () => {
    const admin = adminClient();
    const stamp = Date.now();
    const emailA = `rls-a-${stamp}@example.com`;
    const emailB = `rls-b-${stamp}@example.com`;
    const password = `Test-${stamp}-x!`;

    const mkUser = async (email: string): Promise<string> => {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`setup failed for ${email}: ${JSON.stringify(error)}`);
      }
      return data.user.id;
    };

    const userA = await mkUser(emailA);
    const userB = await mkUser(emailB);

    try {
      const clientA = anonClient();
      const clientB = anonClient();
      const signIn = async (client: SupabaseClient, email: string) => {
        const { error } = await client.auth.signInWithPassword({ email, password });
        expect(error).toBeNull();
      };
      await signIn(clientA, emailA);
      await signIn(clientB, emailB);

      // A connects demo and syncs twice.
      const { data: conn, error: connError } = await clientA.functions.invoke(
        "bank-connect-session",
        { body: { provider_id: "demo" } },
      );
      expect(connError).toBeNull();
      const first = await clientA.functions.invoke("bank-sync", {
        body: { bank_connection_id: conn.connection.id, mode: "initial" },
      });
      expect(first.error).toBeNull();
      expect(first.data.added).toBeGreaterThan(0);
      const second = await clientA.functions.invoke("bank-sync", {
        body: { bank_connection_id: conn.connection.id, mode: "manual" },
      });
      expect(second.error).toBeNull();
      expect(second.data.added).toBe(0);

      // A sees rows; B cannot read A's rows.
      const { data: aRows } = await clientA.from("transactions").select("id");
      expect((aRows ?? []).length).toBeGreaterThan(0);
      const { data: bSeesA } = await clientB
        .from("transactions")
        .select("id")
        .eq("user_id", userA);
      expect(bSeesA ?? []).toHaveLength(0);
      const { data: bOwn } = await clientB.from("transactions").select("id");
      expect(bOwn ?? []).toHaveLength(0);

      // B cannot modify A's review state either.
      const victim = (aRows as { id: string }[])[0].id;
      const { data: bWrite } = await clientB
        .from("transaction_reviews")
        .update({ status: "excluded" })
        .eq("transaction_id", victim)
        .select("id");
      expect(bWrite ?? []).toHaveLength(0);

      // Review → confirm as the owner.
      const { data: pending } = await clientA
        .from("transaction_reviews")
        .select("transaction_id")
        .eq("status", "needs_review")
        .limit(5);
      expect((pending ?? []).length).toBeGreaterThan(0);
      const firstPending = (pending as { transaction_id: string }[])[0]
        .transaction_id;
      const { error: confirmError } = await clientA
        .from("transaction_reviews")
        .update({
          status: "reconciled",
          category_id: "food",
          confirmed_at: new Date().toISOString(),
          source: "user:confirm",
        })
        .eq("transaction_id", firstPending);
      expect(confirmError).toBeNull();
      const { data: confirmed } = await clientA
        .from("transaction_reviews")
        .select("status")
        .eq("transaction_id", firstPending)
        .maybeSingle();
      expect((confirmed as { status: string } | null)?.status).toBe("reconciled");

      // Internal transfer pair exists and is excluded from spend.
      const { data: transfers } = await clientA
        .from("transactions")
        .select("id,budget_eligible,semantic_type")
        .eq("semantic_type", "internal_transfer");
      expect((transfers ?? []).length).toBe(2);
      expect(
        (transfers as { budget_eligible: boolean }[]).every(
          (t) => t.budget_eligible === false,
        ),
      ).toBe(true);

      // Budget reflects eligible spend only.
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: budgetRow, error: budgetError } = await clientA
        .from("budgets")
        .insert({
          period_type: "monthly",
          period_start: start,
          period_end: end,
          total_limit_minor: 20000000,
          currency: "NGN",
        })
        .select("id,total_limit_minor")
        .single();
      expect(budgetError).toBeNull();
      const { data: ledger } = await clientA
        .from("transactions")
        .select("semantic_type,amount_minor,occurred_at,budget_eligible");
      const spend = periodSpend(
        ((ledger ?? []) as {
          semantic_type: "income";
          amount_minor: number;
          occurred_at: string;
          budget_eligible: boolean;
        }[]).map((r) => ({
          semanticType: r.semantic_type,
          amountMinor: r.amount_minor,
          occurredAtMs: Date.parse(r.occurred_at),
          budgetEligible: r.budget_eligible,
        })),
        Date.parse(start),
        Date.parse(end),
      );
      expect(spend.netMinor).toBeGreaterThanOrEqual(0);
      expect(
        remainingBudget(
          (budgetRow as { total_limit_minor: number }).total_limit_minor,
          spend.netMinor,
        ),
      ).toBe(20000000 - spend.netMinor);
      void userB;
    } finally {
      await admin.from("transaction_reviews").delete().eq("user_id", userA);
      await admin.from("transaction_reviews").delete().eq("user_id", userB);
      await admin.from("budgets").delete().eq("user_id", userA);
      await admin.from("transactions").delete().eq("user_id", userA);
      await admin.from("transactions").delete().eq("user_id", userB);
      await admin.from("bank_accounts").delete().eq("user_id", userA);
      await admin.from("bank_connections").delete().eq("user_id", userA);
      await admin.from("sync_runs").delete().eq("user_id", userA);
      await admin.auth.admin.deleteUser(userA);
      await admin.auth.admin.deleteUser(userB);
    }
  }, 120000);

  it("learns merchant rules, answers ask, and renders insights data", async () => {
    const admin = adminClient();
    const stamp = Date.now();
    const email = `slice2-${stamp}@example.com`;
    const password = `Test-${stamp}-x!`;

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError || !created.user) {
      throw new Error(`setup failed: ${JSON.stringify(createError)}`);
    }
    const userId = created.user.id;

    try {
      const client = anonClient();
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      expect(signInError).toBeNull();

      // Demo-mode connection (the previously failing path).
      const { data: conn, error: connError } = await client.functions.invoke(
        "bank-connect-session",
        { body: { provider_id: "demo" } },
      );
      expect(connError).toBeNull();
      expect(conn.accounts).toHaveLength(3);
      const sync = await client.functions.invoke("bank-sync", {
        body: { bank_connection_id: conn.connection.id, mode: "initial" },
      });
      expect(sync.error).toBeNull();
      expect(sync.data.added).toBeGreaterThan(0);

      // Two confirmations of the same merchant/category → learned rule.
      const { data: pending } = await client
        .from("transaction_reviews")
        .select("transaction_id,transactions!inner(normalized_merchant)")
        .eq("status", "needs_review")
        .limit(60);
      const byMerchant = new Map<string, string[]>();
      for (const r of ((pending ?? []) as unknown as {
        transaction_id: string;
        transactions: { normalized_merchant: string };
      }[])) {
        const list = byMerchant.get(r.transactions.normalized_merchant) ?? [];
        list.push(r.transaction_id);
        byMerchant.set(r.transactions.normalized_merchant, list);
      }
      const group = [...byMerchant.entries()].find(([, ids]) => ids.length >= 2);
      expect(group).toBeDefined();
      const [merchantKey, txnIds] = group as [string, string[]];
      for (const txnId of txnIds.slice(0, 2)) {
        const { error } = await client
          .from("transaction_reviews")
          .update({
            status: "reconciled",
            category_id: "transport",
            confirmed_at: new Date().toISOString(),
            source: "user:confirm",
          })
          .eq("transaction_id", txnId);
        expect(error).toBeNull();
      }
      // Same counting rule the app applies on confirm.
      const { data: confirmed } = await client
        .from("transaction_reviews")
        .select("transaction_id,category_id,transactions!inner(normalized_merchant)")
        .eq("status", "reconciled")
        .eq("category_id", "transport")
        .like("source", "user:%");
      const matching = ((confirmed ?? []) as unknown as {
        transactions: { normalized_merchant: string };
      }[]).filter((r) => r.transactions.normalized_merchant === merchantKey);
      expect(matching.length).toBeGreaterThanOrEqual(2);
      const { error: ruleError } = await client.from("merchant_rules").upsert(
        {
          user_id: userId,
          merchant_key: merchantKey,
          category_id: "transport",
          created_from: "confirmed-twice",
          confidence: 1.0,
        },
        { onConflict: "user_id,merchant_key", ignoreDuplicates: true },
      );
      expect(ruleError).toBeNull();
      const { data: rule } = await client
        .from("merchant_rules")
        .select("category_id")
        .eq("user_id", userId)
        .eq("merchant_key", merchantKey)
        .maybeSingle();
      expect((rule as { category_id: string } | null)?.category_id).toBe(
        "transport",
      );

      // Fresh suggestion after rule creation uses the learned rule.
      const victim = txnIds[0];
      await admin.from("transaction_reviews").delete().eq("transaction_id", victim);
      const resync = await client.functions.invoke("bank-sync", {
        body: { bank_connection_id: conn.connection.id, mode: "manual" },
      });
      expect(resync.error).toBeNull();
      expect(resync.data.added).toBe(0);
      const { data: resuggested } = await client
        .from("transaction_reviews")
        .select("category_id,source")
        .eq("transaction_id", victim)
        .maybeSingle();
      expect(
        (resuggested as { category_id: string } | null)?.category_id,
      ).toBe("transport");
      expect((resuggested as { source: string } | null)?.source).toBe(
        "suggestion:user_rule",
      );

      // Ask Reconcile answers from the user's own data.
      const spendQ = await client.functions.invoke("ai-ask", {
        body: { question: "How much did I spend this month?" },
      });
      expect(spendQ.error).toBeNull();
      expect(spendQ.data.intent).toBe("spend_summary");
      expect(spendQ.data.answer).toMatch(/₦/);
      expect(spendQ.data.basis).toMatch(/^based on: /);
      const noQ = await client.functions.invoke("ai-ask", {
        body: { question: "What is the weather?" },
      });
      expect(noQ.error).toBeNull();
      expect(noQ.data.intent).toBe("unsupported");
      expect(noQ.data.answer).toMatch(/can't answer that yet/);

      // Insights inputs render from live data.
      const { data: ledger } = await client
        .from("transactions")
        .select(
          "id,semantic_type,amount_minor,occurred_at,budget_eligible,normalized_merchant,merchant_name",
        );
      const { data: reviews } = await client
        .from("transaction_reviews")
        .select("transaction_id,category_id");
      const categoryByTxn = new Map(
        ((reviews ?? []) as { transaction_id: string; category_id: string }[]).map(
          (r) => [r.transaction_id, r.category_id] as const,
        ),
      );
      const now = new Date();
      const curStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const rows = ((ledger ?? []) as {
        id: string;
        semantic_type: "expense";
        amount_minor: number;
        occurred_at: string;
        budget_eligible: boolean;
        normalized_merchant: string;
        merchant_name: string;
      }[]).map((r) => ({
        semanticType: r.semantic_type,
        categoryId: categoryByTxn.get(r.id) ?? undefined,
        merchantKey: r.normalized_merchant,
        merchantName: r.merchant_name,
        amountMinor: r.amount_minor,
        occurredAtMs: Date.parse(r.occurred_at),
        budgetEligible: r.budget_eligible,
      }));
      expect(hasHistory(rows, prevStart, curStart)).toBe(true);
      const top = topMerchant(rows, curStart, Date.now());
      expect(top).not.toBeNull();
      expect(top?.totalMinor).toBeGreaterThan(0);
    } finally {
      await admin.from("transaction_reviews").delete().eq("user_id", userId);
      await admin.from("merchant_rules").delete().eq("user_id", userId);
      await admin.from("budgets").delete().eq("user_id", userId);
      await admin.from("transactions").delete().eq("user_id", userId);
      await admin.from("bank_accounts").delete().eq("user_id", userId);
      await admin.from("bank_connections").delete().eq("user_id", userId);
      await admin.from("sync_runs").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }, 180000);
});
