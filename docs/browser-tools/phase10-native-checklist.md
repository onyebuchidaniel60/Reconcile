# Phase 10 — Native audit checklist (operator device walk)

Preview APK: <FILL AFTER PART E — preview APK URL>
Built from: <FILL — Phase 10A fix commit hash>
Device used: <FILL — model + Android version>

How to report back: copy the "RESULT TEMPLATE" section at the bottom into a
single chat message, filled in. One line per screen: PASS or FAIL + notes.

General (every screen):
- Content stays clear of the notch, camera cutout, status bar, and gesture
  nav bar (portrait, 375-class width if possible).
- No crash, no freeze, no blank white/black flash when opening the screen.
- Scroll feels smooth; lists settle without jitter.
- Press feedback feels right (gentle scale) and haptics fire where noted.
- Small text (12–13px labels, axis ticks, "based on" lines) is legible.
- The ₦ sign at large sizes looks like one clean glyph (no broken strokes
  spilling into the digits).

Web could NOT verify (check these with extra care — no web equivalent):
- Real 44px touch feel on every button, chip, link, and row.
- Real haptic feedback (confirm pulse, chip select, CTA press).
- Keyboard behavior at each input (opens, layouts shift, Done/Next works).
- On-device font rendering at small sizes.
- Native shadow and border rendering (pill nav, cards).
- Scroll physics and long-list performance on device.

Screens (walk in this order):

1. Welcome — Continue button; "I already have an account? Sign in." link
   (taller tap area now, should still look like one quiet line); starburst
   renders once, no animation loop. Tap Continue → Privacy.
2. Privacy — can/can't table rows; Back + Continue; nothing clipped at 360px
   widths. Tap Continue → Country.
3. Country — Nigeria chip selected (yellow, taller now); Ghana/Kenya/
   South Africa disabled with "Coming soon". Tap Nigeria, Continue → Signup.
4. Sign up — Email + Password inputs: keyboard opens, focused input stays
   visible, secure entry masks. "Already have an account? Sign in." link.
   (Use your existing account or a throwaway; do not spam signups.)
5. Sign in — same keyboard checks; wrong password shows an inline error on
   the password field; correct login lands on Demo entry.
6. Demo entry — connected accounts listed; Sync now works; Continue to Home.
7. Home (dark) — greeting one line with ellipsis; yellow Summary hero with
   donut (hatched + solid arcs, animated reveal), period selector, legend;
   mist Budget Overview with progress + Today pill; Review pill button;
   Recent Activity rows (5) → tap one → Detail; dark pill nav, Home active.
   Confirm haptic on presses. Rotate-safe areas top and bottom.
8. Review Transactions (dark) — paired title + yellow starburst + "N of M";
   category chips (taller now, 44px); tap a chip (selection haptic); View
   details link; Confirm (pulse haptic, row exits, counter decrements).
   Scroll the whole queue: background must stay ink all the way down.
9. Transaction Detail — big centered amount; facts card (masked account);
   review card chips + note input (keyboard!); Confirm; Exclude (confirm the
   destructive haptic). Back returns to the previous screen.
10. Activity — day group headers ("Sept 26", …) above each day's rows;
    horizontal chip scroller (All/New/categories/accounts); tap a chip, list
    narrows; tap a row → Detail; pill nav, Activity active.
11. Budget Setup — Monthly total input (numeric keyboard); category cap rows
    with circles; all 13 categories reachable by scrolling ABOVE the fixed
    Save button (last row must clear it); Save → Budget.
12. Budget — yellow Expenses card: 4 bars (one hatched), red starburst badge
    reading "-₦139k"-style compact delta fully INSIDE the badge; ink card:
    big amount, visible yellow trend line with markers and dashed projection,
    visible date labels (Sept 1 / Sept 16 / Oct 1); mint forecast card;
    Category caps section; NEW "Edit budget" ghost button → opens Setup
    prefilled → change total → Save → Budget reflects it.
13. Insights — three cards: YELLOW month-compare, INK biggest-change with
    white starburst, paper top merchant; paired numbers + arrow deltas;
    Ask Reconcile ghost entry; Back home link; pill nav, Insights active.
14. Ask Reconcile — suggestion chips; type a question, Send (haptic);
    ink user bubble right, paper answer left with a single "based on:" line;
    keyboard send/dismiss; Back home.
15. Settings — title reads "Your Settings"; rows (account, disconnect,
    privacy, subscription, about, sign out) all comfortably tappable;
    disconnect flow; sign out → Welcome. (Do not sign out until the end —
    it ends the session. Avatar on Home also opens Settings.)
16. Error/offline — turn on airplane mode and use the app: note exactly what
    appears (which screen states show offline/empty/error, retry behavior).
    There is no URL bar on native, so the not-found screen cannot be opened
    directly — skip it unless a dead link is found.

RESULT TEMPLATE (paste back filled in):
- Device/model/Android:
- APK installed clean / launch OK:
- 01 Welcome:
- 02 Privacy:
- 03 Country:
- 04 Sign up:
- 05 Sign in:
- 06 Demo entry:
- 07 Home:
- 08 Review:
- 09 Detail:
- 10 Activity:
- 11 Budget Setup:
- 12 Budget (incl. Edit round-trip):
- 13 Insights:
- 14 Ask:
- 15 Settings:
- 16 Offline behavior:
- Haptics overall:
- Keyboard overall:
- Visual corrections needed (list):
- Crashes (list, or "none"):
