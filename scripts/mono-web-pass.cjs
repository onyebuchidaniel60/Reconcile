// Phase 11 agent-as-user web pass.
//
// Walks the flow a real user takes with EXPO_PUBLIC_FEATURE_MONO=false (the
// Phase 11 default) and records what actually happened. Screenshots go to
// docs/browser-tools/phase11-shots/.
//
// This is a verification script, not a test: it reports, it does not assert.
// The Mono widget itself is expected NOT to complete headlessly; the pass
// verifies the surrounding integration (gate, route, demo path, no regressions)
// and records the widget outcome honestly.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:4173";
const EMAIL = process.env.PASS_EMAIL;
const PASSWORD = process.env.PASS_PASSWORD;
const SHOTS = path.join(__dirname, "..", "docs", "browser-tools", "phase11-shots");

const notes = [];
function note(step, detail) {
  const line = `${step}: ${detail}`;
  notes.push(line);
  console.log(line);
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  try {
    // ---- sign in ------------------------------------------------------
    // Supabase rejects example.com addresses and rate-limits signup emails, so
    // the pass signs in with a pre-confirmed user created via the admin API
    // (see the Phase 11 handoff for the one-liner).
    if (!EMAIL || !PASSWORD) throw new Error("PASS_EMAIL and PASS_PASSWORD are required");
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/demo/, { timeout: 60000 });
    // The email is masked in the report: the report is committed as evidence
    // and must not carry credentials.
    note("signin", `signed in, landed on /demo`);

    // ---- the Demo screen, flag state -----------------------------------
    await page.waitForSelector("text=Try", { timeout: 20000 });
    await page.screenshot({ path: path.join(SHOTS, "01-demo-flag-off.png"), fullPage: true });

    const connectBtn = page.getByRole("button", { name: "Connect a real bank" });
    const disabled = await connectBtn.getAttribute("disabled");
    const ariaDisabled = await connectBtn.getAttribute("aria-disabled");
    const comingSoon = await page.locator("text=Coming soon").count();
    const flagOn = disabled === null && ariaDisabled === null && comingSoon === 0;
    note(
      "gate",
      `Connect a real bank present=${(await connectBtn.count()) > 0} disabled=${disabled} ` +
        `aria-disabled=${ariaDisabled} "Coming soon"=${comingSoon > 0} => flag ${flagOn ? "ON" : "OFF"}`,
    );

    // ---- the real-bank connect route, when the flag is on ---------------
    if (flagOn) {
      await connectBtn.click();
      await page.waitForURL(/\/connect-bank/, { timeout: 30000 });
      note("connect-flow", "button is enabled and navigates to /connect-bank");
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SHOTS, "06-connect-bank-flag-on.png"),
        fullPage: true,
      });

      const startBtn = page.getByRole("button", { name: /Choose a bank/ });
      if ((await startBtn.count()) === 0) {
        note("connect-flow", "no 'Choose a bank' CTA found");
      } else {
        await startBtn.click();
        // Give bank-connect-session time to reach Mono and return a link.
        await page.waitForTimeout(20000);
        const frames = page.frames().map((f) => {
          try {
            return f.url();
          } catch {
            return "(unreadable)";
          }
        });
        note(
          "connect-flow",
          `after 'Choose a bank': frames=${JSON.stringify(frames)} ` +
            `monoWidgetLoaded=${frames.some((u) => u.includes("mono.co"))}`,
        );
        const errText = await page.locator("body").innerText();
        note(
          "connect-flow",
          `surface hasError=${/could not|unavailable|error/i.test(errText)}`,
        );
        await page.screenshot({
          path: path.join(SHOTS, "07-connect-bank-widget.png"),
          fullPage: true,
        });
      }
      // Back to the demo screen for the demo-path checks.
      await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
    }

    // ---- demo path must be unaffected --------------------------------
    // A user who has already run the demo sees "Continue to Home" instead of
    // "Enter Demo Mode"; both are the demo path and both must route Home.
    const enterDemo = page.getByRole("button", { name: "Enter Demo Mode" });
    const continueHome = page.getByRole("button", { name: "Continue to Home" });
    const label =
      (await enterDemo.count()) > 0 ? "Enter Demo Mode" : "Continue to Home";
    await (label === "Enter Demo Mode" ? enterDemo : continueHome).click();
    note("demo-path", `clicked "${label}"`);
    await page.waitForURL(/\/home/, { timeout: 120000 });
    note("demo-path", "Enter Demo Mode still routes to /home");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SHOTS, "02-home-demo.png"), fullPage: true });

    const homeText = await page.locator("body").innerText();
    note("demo-path", `home rendered ${homeText.length} chars; has greeting=${/Hey,/.test(homeText)}`);

    // ---- navigate the Phase 10 screens for regressions ----------------
    // Direct URLs: the pill nav renders differently under testID lookup on web,
    // and a mis-click would look like a regression that is not there.
    for (const route of ["home", "activity", "budget", "insights", "review"]) {
      await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
      const text = await page.locator("body").innerText();
      note(
        "regression",
        `${route}: url=${new URL(page.url()).pathname} chars=${text.length} ` +
          `hasError=${/Something went wrong|Try again/i.test(text)}`,
      );
      await page.screenshot({
        path: path.join(SHOTS, `03-${route}.png`),
        fullPage: true,
      });
    }

    // ---- settings (reauth surface) ------------------------------------
    await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    const settingsText = await page.locator("body").innerText();
    note(
      "settings",
      `rendered=${settingsText.length} chars ` +
        `hasSections=${/Account/.test(settingsText) && /Privacy/.test(settingsText)} ` +
        `reauthCardShown=${/Reconnect your bank/.test(settingsText)} (expected false: no reauth state)`,
    );
    await page.screenshot({ path: path.join(SHOTS, "04-settings.png"), fullPage: true });

    // ---- the Mono connect route with the flag OFF ---------------------
    await page.goto(`${BASE}/connect-bank`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const cbText = await page.locator("body").innerText();
    note(
      "connect-route",
      `flag off -> shows unavailable notice=${/not available yet/i.test(cbText)} webviewPresent=${(await page.locator("iframe").count()) > 0}`,
    );
    await page.screenshot({ path: path.join(SHOTS, "05-connect-bank-flag-off.png"), fullPage: true });
  } catch (error) {
    note("ERROR", error.message);
    await page.screenshot({ path: path.join(SHOTS, "99-error.png"), fullPage: true }).catch(() => {});
  } finally {
    note("console-errors", consoleErrors.length === 0 ? "none" : consoleErrors.slice(0, 8).join(" | "));
    await browser.close();
    fs.writeFileSync(path.join(SHOTS, "report.txt"), notes.join("\n"), "utf8");
    console.log("\n--- report ---\n" + notes.join("\n"));
  }
})();
