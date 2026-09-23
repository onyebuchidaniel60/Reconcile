// Live integration tests: RLS isolation + sync idempotency against a real
// Supabase project. SKIPPED unless RUN_LIVE_TESTS=1 with LIVE_SUPABASE_URL,
// LIVE_SUPABASE_ANON_KEY, and LIVE_SUPABASE_SERVICE_ROLE_KEY in the
// environment. Never run casually: they create and delete real auth users.
// Secrets are read from the environment only and never printed.
import { describe, expect, it } from "@jest/globals";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env["LIVE_SUPABASE_URL"] as string,
    process.env["LIVE_SUPABASE_SERVICE_ROLE_KEY"] as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
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
      if (error || !data.user) throw new Error(`setup failed for ${email}`);
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
      void userB;
    } finally {
      await admin.from("transaction_reviews").delete().eq("user_id", userA);
      await admin.from("transaction_reviews").delete().eq("user_id", userB);
      await admin.from("transactions").delete().eq("user_id", userA);
      await admin.from("transactions").delete().eq("user_id", userB);
      await admin.from("bank_accounts").delete().eq("user_id", userA);
      await admin.from("bank_connections").delete().eq("user_id", userA);
      await admin.from("sync_runs").delete().eq("user_id", userA);
      await admin.auth.admin.deleteUser(userA);
      await admin.auth.admin.deleteUser(userB);
    }
  }, 120000);
});
