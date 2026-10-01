import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { ReactNode } from "react";
import * as motion from "../src/theme/motion";
import {
  askQuestion,
  confirmReview,
  createBudget,
  disconnectConnection,
  excludeReview,
  getAccounts,
  getActiveConnection,
  getCategories,
  getCurrentMonthBudget,
  getProfile,
  getTransaction,
  getTransactions,
  updateBudget,
  setAvatarUrl,
  setReviewDisplayName,
} from "../src/lib/db";
import {
  pickAvatarImage,
  removeAvatarObjects,
  uploadAvatarImage,
} from "../src/lib/avatar";
import { monthBoundsFor, monthOffset } from "../src/lib/txn";
import ActivityScreen from "../app/activity";
import TransactionDetailScreen from "../app/transaction/[id]";
import BudgetSetupScreen from "../app/budget-setup";
import BudgetScreen from "../app/budget";
import InsightsScreen from "../app/insights";
import AskScreen from "../app/ask";
import SettingsScreen from "../app/settings";
import NotFoundScreen from "../app/+not-found";
import OfflineScreen from "../app/offline";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSignOut = jest.fn<() => Promise<void>>();
let mockSessionEmail: string | null = "ada@example.com";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ id: "t1" }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  Stack: { Screen: () => null },
}));

jest.mock("../src/lib/session", () => ({
  useSession: () => ({
    session: mockSessionEmail ? { user: { email: mockSessionEmail } } : null,
    loading: false,
    configured: true,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: mockSignOut,
  }),
}));

jest.mock("../src/lib/db", () => ({
  getAccounts: jest.fn(),
  getTransactions: jest.fn(),
  getTransaction: jest.fn(),
  getCategories: jest.fn(),
  getCurrentMonthBudget: jest.fn(),
  createBudget: jest.fn(),
  updateBudget: jest.fn(),
  confirmReview: jest.fn(),
  excludeReview: jest.fn(),
  askQuestion: jest.fn(),
  getActiveConnection: jest.fn(),
  // Phase 11: Settings reads the connection regardless of status so a
  // reauth_required connection is visible instead of silently absent.
  getCurrentConnection: jest.fn(),
  needsReauth: jest.fn(() => false),
  disconnectConnection: jest.fn(),
  getReviewCount: jest.fn(),
  getPendingReviews: jest.fn(),
  getProfile: jest.fn(),
  setAvatarUrl: jest.fn(),
  setReviewDisplayName: jest.fn(),
  parseMajorToMinor: (raw: string) => {
    const value = Number.parseFloat(raw.replace(/[,₦\s]/g, ""));
    if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid non-negative amount.");
    return Math.round(value * 100);
  },
}));

jest.mock("../src/lib/avatar", () => ({
  pickAvatarImage: jest.fn(),
  uploadAvatarImage: jest.fn(),
  removeAvatarObjects: jest.fn(),
}));

type MockFn = {
  mockReset(): void;
  mockClear(): void;
  mockResolvedValue(value: unknown): void;
  mockResolvedValueOnce(value: unknown): void;
  mockRejectedValueOnce(error: unknown): void;
  mockReturnValue(value: unknown): void;
  mock: { calls: unknown[][] };
};
const mockAskQuestion = askQuestion as unknown as MockFn;
const mockConfirmReview = confirmReview as unknown as MockFn;
const mockCreateBudget = createBudget as unknown as MockFn;
const mockDisconnect = disconnectConnection as unknown as MockFn;
const mockExcludeReview = excludeReview as unknown as MockFn;
const mockGetAccounts = getAccounts as unknown as MockFn;
const mockGetActiveConnection = getActiveConnection as unknown as MockFn;
const mockGetCategories = getCategories as unknown as MockFn;
const mockGetCurrentMonthBudget = getCurrentMonthBudget as unknown as MockFn;
const mockGetProfile = getProfile as unknown as MockFn;
const mockSetAvatarUrl = setAvatarUrl as unknown as MockFn;
const mockSetReviewDisplayName = setReviewDisplayName as unknown as MockFn;
const mockPickAvatarImage = pickAvatarImage as unknown as MockFn;
const mockUploadAvatarImage = uploadAvatarImage as unknown as MockFn;
const mockRemoveAvatarObjects = removeAvatarObjects as unknown as MockFn;
const mockGetTransaction = getTransaction as unknown as MockFn;
const mockGetTransactions = getTransactions as unknown as MockFn;
const mockUpdateBudget = updateBudget as unknown as MockFn;
const M = (fn: unknown): MockFn => fn as unknown as MockFn;

/** Concatenated text content of a rendered node, in document order. */
function collectNodeText(node: unknown): string {
  let out = "";
  const walk = (n: unknown): void => {
    if (n === null || n === undefined || n === false) return;
    if (typeof n === "string" || typeof n === "number") {
      out += String(n);
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (typeof n === "object") walk((n as { children?: unknown }).children);
  };
  walk(node);
  return out;
}

// Screen renders compile many modules on first mount; allow headroom under
// parallel load so the suite is deterministic on saturated machines.
jest.setTimeout(20000);

const CATEGORIES = [
  { id: "food", label: "Food" },
  { id: "transport", label: "Transport" },
];

// ---- Time-independent fixtures (Phase 11) -------------------------------
//
// Same fix as tests/screens.test.tsx: these screens derive "this month" from
// the real clock, so hard-coded September 2026 fixtures rotted at the October
// boundary. Dates are derived from today, in UTC, matching the app's UTC-midnight
// month convention (Phase 10B.5). Days 10/11/14 exist in every month.

const NOW = new Date();
const NOW_Y = NOW.getUTCFullYear();
const NOW_M = NOW.getUTCMonth();

const utcDay = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

const utcAt = (year: number, month: number, day: number, hour = 10): string =>
  new Date(Date.UTC(year, month, day, hour)).toISOString();

const THIS_MONTH_START = utcDay(NOW_Y, NOW_M, 1);
const NEXT_MONTH_START = utcDay(NOW_Y, NOW_M + 1, 1);
const THIS_MONTH_10AM = utcAt(NOW_Y, NOW_M, 10);
const THIS_MONTH_14AM = utcAt(NOW_Y, NOW_M, 14);
const PREV_MONTH_11AM = utcAt(NOW_Y, NOW_M - 1, 11);

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
] as const;

/** Activity groups by UTC day; the 10th/14th of the current month render as these. */
const DAY_10_LABEL = `${MONTH_ABBR[NOW_M]} 10`;
const DAY_14_LABEL = `${MONTH_ABBR[NOW_M]} 14`;

/**
 * A "this month" instant that is guaranteed to be in the past.
 *
 * `app/insights.tsx` monthBounds() ends the current month at `now`, so a
 * fixture dated later in the month is excluded as future-dated and the
 * insights totals read ₦0.00. Local midnight today is always inside
 * [monthStart, now] on every day of the month.
 */
const THIS_MONTH_TO_DATE = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
})();

function txn(overrides = {}) {
  return {
    id: "t1",
    bank_account_id: "a1",
    amount_minor: 420000,
    currency: "NGN",
    direction: "debit",
    semantic_type: "expense",
    occurred_at: THIS_MONTH_14AM,
    merchant_name: "Bolt",
    narration: "Bolt trip ref 123",
    normalized_merchant: "bolt",
    budget_eligible: true,
    transaction_reviews: [{ status: "needs_review", category_id: "transport", user_note: null }],
    bank_accounts: { display_name: "GTBank Current", masked_account_number: "•••• 4821" },
    ...overrides,
  };
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
  mockSignOut.mockClear().mockResolvedValue(undefined);
  mockSessionEmail = "ada@example.com";
  for (const fn of [
    mockGetAccounts, mockGetTransactions, mockGetTransaction, mockGetCategories,
    mockGetCurrentMonthBudget, mockCreateBudget, mockUpdateBudget, mockConfirmReview,
    mockExcludeReview, mockAskQuestion, mockGetActiveConnection, mockDisconnect,
    mockGetProfile, mockSetAvatarUrl, mockSetReviewDisplayName,
    mockPickAvatarImage, mockUploadAvatarImage, mockRemoveAvatarObjects,
  ]) {
    M(fn).mockReset();
  }
  M(mockGetAccounts).mockResolvedValue([{ id: "a1", display_name: "GTBank", available_balance_minor: 1 }]);
  M(mockGetTransactions).mockResolvedValue([
    txn(),
    txn({ id: "t2", merchant_name: "Shoprite", transaction_reviews: [{ status: "reconciled", category_id: "food", user_note: null }] }),
  ]);
  M(mockGetCategories).mockResolvedValue(CATEGORIES);
  M(mockGetCurrentMonthBudget).mockResolvedValue({
    budget: {
      id: "b1", period_start: THIS_MONTH_START, period_end: NEXT_MONTH_START,
      total_limit_minor: 25000000, currency: "NGN",
    },
    caps: [{ category_id: "food", limit_minor: 5000000 }],
  });
  M(mockGetTransaction).mockResolvedValue({
    txn: txn(),
    review: { status: "needs_review", category_id: "transport", user_note: null },
  });
  M(mockAskQuestion).mockResolvedValue({ answer: "You spent ₦72,765.74 on Food.", basis: "based on: Food spend" });
  M(mockGetActiveConnection).mockResolvedValue({ id: "c1" });
  // Phase 11: Settings reads getCurrentConnection, which also sees a
  // reauth_required connection.
  const mockGetCurrentConnection = (jest.requireMock(
    "../src/lib/db",
  ) as { getCurrentConnection: unknown }).getCurrentConnection as MockFn;
  mockGetCurrentConnection.mockResolvedValue({ id: "c1" });
  M(mockGetProfile).mockResolvedValue({ id: "u1", email: "ada@example.com", avatar_url: null });
  M(mockCreateBudget).mockResolvedValue(undefined);
  M(mockUpdateBudget).mockResolvedValue(undefined);
  M(mockConfirmReview).mockResolvedValue(undefined);
  M(mockExcludeReview).mockResolvedValue(undefined);
  M(mockDisconnect).mockResolvedValue(undefined);
  M(mockSetReviewDisplayName).mockResolvedValue(undefined);
});

describe("Activity screen", () => {
  it("renders rows and filters narrow the list", async () => {
    await render(<ActivityScreen />);
    expect(await screen.findByText("Bolt")).toBeTruthy();
    expect(screen.getByText("Shoprite")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("activity-filter-cat-food"));
    expect(screen.queryByText("Bolt")).toBeNull();
    expect(screen.getByText("Shoprite")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("activity-filter-new"));
    expect(screen.getByText("Bolt")).toBeTruthy();
    expect(screen.queryByText("Shoprite")).toBeNull();
  });

  it("shows empty and error states", async () => {
    M(mockGetTransactions).mockResolvedValue([]);
    const { unmount } = await render(<ActivityScreen />);
    expect(await screen.findByText("No transactions yet. Connect a bank or enter Demo Mode.")).toBeTruthy();
    await unmount();
    M(mockGetTransactions).mockRejectedValueOnce(new Error("Offline."));
    await render(<ActivityScreen />);
    expect(await screen.findByText("Offline.")).toBeTruthy();
  });

  it("groups rows under day headers (Phase 10A)", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn(),
      txn({ id: "t2", merchant_name: "Shoprite", occurred_at: THIS_MONTH_10AM }),
    ]);
    await render(<ActivityScreen />);
    expect(await screen.findByTestId(`activity-day-${DAY_14_LABEL}`)).toBeTruthy();
    expect(screen.getByTestId(`activity-day-${DAY_10_LABEL}`)).toBeTruthy();
    expect(screen.getByText("Bolt")).toBeTruthy();
    expect(screen.getByText("Shoprite")).toBeTruthy();
  });

  it("offers rename only on reviewed rows (Phase 10B, Fix C)", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn({
        id: "t-done",
        merchant_name: "Bolt",
        transaction_reviews: [
          { status: "reconciled", category_id: "transport", user_note: null, display_name: "Airport taxi" },
        ],
      }),
      txn({
        id: "t-excluded",
        merchant_name: "Shoprite",
        transaction_reviews: [
          { status: "excluded", category_id: "food", user_note: null },
        ],
      }),
      // Still being triaged: renamed on the Review screen, not here.
      txn({
        id: "t-pending",
        merchant_name: "Medplus",
        transaction_reviews: [
          { status: "needs_review", category_id: null, user_note: null },
        ],
      }),
    ]);
    await render(<ActivityScreen />);
    expect(await screen.findByTestId("activity-row-t-done")).toBeTruthy();
    // Reconciled and excluded rows get the pencil.
    expect(screen.getByTestId("activity-rename-t-done")).toBeTruthy();
    expect(screen.getByTestId("activity-rename-t-excluded")).toBeTruthy();
    // needs_review rows never do.
    expect(screen.queryByTestId("activity-rename-t-pending")).toBeNull();
    // It routes to Detail, where the edit lives.
    await fireEvent.press(screen.getByTestId("activity-rename-t-done"));
    expect(mockPush).toHaveBeenCalledWith("/transaction/t-done");
  });
});

describe("Transaction Detail screen", () => {
  it("separates facts from review state and confirms", async () => {
    await render(<TransactionDetailScreen />);
    expect(await screen.findByText("-₦4,200.00")).toBeTruthy();
    expect(screen.getByText("Transaction facts")).toBeTruthy();
    expect(screen.getByText("Your review")).toBeTruthy();
    expect(screen.getByText("Bolt trip ref 123")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Set Food" }));
    await fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(mockConfirmReview).toHaveBeenCalledWith("t1", "food", undefined));
  });

  it("excludes on Exclude", async () => {
    await render(<TransactionDetailScreen />);
    await screen.findByText("-₦4,200.00");
    await fireEvent.press(screen.getByRole("button", { name: "Exclude transaction" }));
    await waitFor(() => expect(mockExcludeReview).toHaveBeenCalledWith("t1"));
  });

    it("shows the error state", async () => {
      M(mockGetTransaction).mockRejectedValueOnce(new Error("Gone."));
      await render(<TransactionDetailScreen />);
      expect(await screen.findByText("Gone.")).toBeTruthy();
    });

    it("titles with the user's display name and keeps raw narration (Phase 10A.5, Fix 7)", async () => {
      M(mockGetTransaction).mockResolvedValue({
        txn: txn(),
        review: {
          status: "reconciled",
          category_id: "transport",
          user_note: null,
          display_name: "Bolt Rides",
        },
      });
      await render(<TransactionDetailScreen />);
      expect(await screen.findByTestId("detail-merchant")).toBeTruthy();
      // Title follows the user-set name...
      expect(screen.getByText("Bolt Rides")).toBeTruthy();
      // ...while the immutable provider narration is still shown verbatim.
      expect(screen.getByText("Bolt trip ref 123")).toBeTruthy();
    });

    it("renames from Detail and leaves narration and review state alone (Phase 10B, Fix C)", async () => {
      M(mockGetTransaction).mockResolvedValue({
        txn: txn(),
        review: {
          status: "excluded",
          category_id: "transport",
          user_note: "keep my note",
          display_name: "Bolt Rides",
        },
      });
      await render(<TransactionDetailScreen />);
      await screen.findByTestId("detail-rename-open");
      await fireEvent.press(screen.getByTestId("detail-rename-open"));

      const field = screen.getByLabelText("Name this transaction");
      expect(field.props.value).toBe("Bolt Rides");
      await fireEvent.changeText(field, "Airport taxi");
      await fireEvent.press(screen.getByTestId("detail-rename-save"));

      // Name-only write: no status flip, no category change, no note wipe.
      await waitFor(() =>
        expect(mockSetReviewDisplayName).toHaveBeenCalledWith("t1", "Airport taxi"),
      );
      expect(mockConfirmReview).not.toHaveBeenCalled();
      // The raw narration is still on screen and still unedited.
      expect(screen.getByText("Bolt trip ref 123")).toBeTruthy();
      expect(screen.queryByTestId("detail-rename-input")).toBeNull();
    });

    it("cancels a rename without writing anything (Phase 10B, Fix C)", async () => {
      M(mockGetTransaction).mockResolvedValue({
        txn: txn(),
        review: {
          status: "reconciled",
          category_id: "transport",
          user_note: null,
          display_name: "Bolt Rides",
        },
      });
      await render(<TransactionDetailScreen />);
      await screen.findByTestId("detail-rename-open");
      await fireEvent.press(screen.getByTestId("detail-rename-open"));
      const field = screen.getByLabelText("Name this transaction");
      await fireEvent.changeText(field, "Discarded");
      await fireEvent.press(screen.getByTestId("detail-rename-cancel"));
      expect(mockSetReviewDisplayName).not.toHaveBeenCalled();
      // Reverted to the previous title.
      expect(screen.getByText("Bolt Rides")).toBeTruthy();
    });

    it("offers rename only once a review row exists (Phase 10B, Fix C)", async () => {
      M(mockGetTransaction).mockResolvedValue({
        txn: txn({ transaction_reviews: [] }),
        review: null,
      });
      await render(<TransactionDetailScreen />);
      expect(await screen.findByTestId("detail-merchant")).toBeTruthy();
      expect(screen.queryByTestId("detail-rename-open")).toBeNull();
    });
  });

describe("Budget Setup screen", () => {
  it("saves a new budget via create", async () => {
    M(mockGetCurrentMonthBudget).mockResolvedValue({ budget: null, caps: [] });
    await render(<BudgetSetupScreen />);
    await screen.findByText("Monthly total");
    await fireEvent.changeText(screen.getByLabelText("Monthly total"), "250000");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockCreateBudget).toHaveBeenCalledWith(
        25000000, "NGN", expect.any(String), expect.any(String), [],
      ),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/budget"));
  });

  it("updates an existing budget", async () => {
    await render(<BudgetSetupScreen />);
    await screen.findByText("Monthly total");
    await fireEvent.changeText(screen.getByLabelText("Monthly total"), "300000");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockUpdateBudget).toHaveBeenCalledWith("b1", 30000000, [
        { category_id: "food", limit_minor: 5000000 },
      ]),
    );
  });

  it("rejects invalid totals inline", async () => {
    M(mockGetCurrentMonthBudget).mockResolvedValue({ budget: null, caps: [] });
    await render(<BudgetSetupScreen />);
    await screen.findByText("Monthly total");
    await fireEvent.changeText(screen.getByLabelText("Monthly total"), "-5");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a valid non-negative amount.")).toBeTruthy();
    expect(mockCreateBudget).not.toHaveBeenCalled();
  });
});

describe("Budget screen", () => {
  it("renders charts, message, and caps", async () => {
    await render(<BudgetScreen />);
    expect(await screen.findByText("Expenses — Last 4 months")).toBeTruthy();
    expect(screen.getByTestId("budget-trend")).toBeTruthy();
    expect(screen.getByTestId("budget-positive")).toBeTruthy();
    expect(screen.getByText("Food")).toBeTruthy();
  });

  it("shows the empty state without a budget", async () => {
    M(mockGetCurrentMonthBudget).mockResolvedValue({ budget: null, caps: [] });
    await render(<BudgetScreen />);
    expect(await screen.findByText("No budget yet. Set one up to track spending.")).toBeTruthy();
  });

  it("reports month spend net of refunds (Phase 10B.5, Fix A)", async () => {
    // The shared helper's contract, observed through the real Budget screen:
    // expenses minus eligible refunds, ineligible rows and internal
    // transfers excluded. This is the figure Home's hero must match.
    const now = new Date();
    const inMonth = new Date(now.getFullYear(), now.getMonth(), 10).toISOString();
    M(mockGetTransactions).mockResolvedValue([
      txn({ id: "e1", amount_minor: 420000, occurred_at: inMonth }),
      txn({
        id: "r1",
        amount_minor: 20000,
        semantic_type: "refund",
        direction: "credit",
        occurred_at: inMonth,
      }),
      txn({ id: "x1", amount_minor: 9000000, budget_eligible: false, occurred_at: inMonth }),
      txn({
        id: "t1x",
        amount_minor: 5000000,
        semantic_type: "internal_transfer",
        occurred_at: inMonth,
      }),
    ]);
    await render(<BudgetScreen />);
    // Net = 420000 - 20000 = 400000 minor units. The trend card's hero
    // amount is `spent`, so it carries the shared figure directly.
    const trend = await screen.findByTestId("budget-trend");
    expect(collectNodeText(trend)).toContain("₦4,000.00");
  });

  it("renders statically under reduced motion", async () => {
    const spy = jest.spyOn(motion, "useMotion").mockReturnValue(motion.resolveDurations(true));
    try {
      await render(<BudgetScreen />);
      expect(await screen.findByTestId("budget-expenses")).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it("offers editing the existing budget (Phase 10A)", async () => {
    await render(<BudgetScreen />);
    await screen.findByTestId("budget-expenses");
    await fireEvent.press(screen.getByRole("button", { name: "Edit budget" }));
    expect(mockPush).toHaveBeenCalledWith("/budget-setup");
  });
});

// Guards the fixture-date trap that made this suite rot (Phase 11). These
// assertions are what the screen fixtures above silently depend on.
describe("time-independent fixtures", () => {
  it("places THIS_MONTH_TO_DATE inside the current month bounds the app uses", () => {
    const now = new Date();
    const { startMs } = monthBoundsFor(now);
    const at = Date.parse(THIS_MONTH_TO_DATE);
    expect(at).toBeGreaterThanOrEqual(startMs);
    // insights monthBounds() ends the current month at `now`, so a fixture
    // dated later in the month would read as future-dated and total ₦0.00.
    expect(at).toBeLessThanOrEqual(now.getTime());
  });

  it("places THIS_MONTH_14AM and THIS_MONTH_10AM inside the current calendar month", () => {
    const now = new Date();
    const { startMs, endMs } = monthBoundsFor(now);
    for (const iso of [THIS_MONTH_14AM, THIS_MONTH_10AM]) {
      const at = Date.parse(iso);
      expect(at).toBeGreaterThanOrEqual(startMs);
      expect(at).toBeLessThan(endMs);
    }
  });

  it("places PREV_MONTH_11AM inside the previous calendar month", () => {
    const now = new Date();
    const prev = monthBoundsFor(monthOffset(now, 1));
    const at = Date.parse(PREV_MONTH_11AM);
    expect(at).toBeGreaterThanOrEqual(prev.startMs);
    expect(at).toBeLessThan(prev.endMs);
  });

  it("derives budget period bounds from the current month", () => {
    expect(THIS_MONTH_START).toBe(utcDay(NOW_Y, NOW_M, 1));
    expect(NEXT_MONTH_START).toBe(utcDay(NOW_Y, NOW_M + 1, 1));
  });
});

describe("Insights screen", () => {
  it("renders the insight cards with real numbers", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn({ occurred_at: THIS_MONTH_TO_DATE }),
      txn({ id: "old", occurred_at: PREV_MONTH_11AM }),
    ]);
    await render(<InsightsScreen />);
    expect(await screen.findByText("This month vs last month")).toBeTruthy();
    expect(screen.getByText("Biggest category change")).toBeTruthy();
    expect(screen.getByText("Top merchant")).toBeTruthy();
  });

  it("shows the first-month card without history", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn({ occurred_at: THIS_MONTH_TO_DATE }),
    ]);
    await render(<InsightsScreen />);
    expect(await screen.findByText("Insights arrive after your first month.")).toBeTruthy();
  });

  it("labels the top merchant with the user's display name (Phase 10A.5, Fix 7)", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn({
        occurred_at: THIS_MONTH_TO_DATE,
        merchant_name: "Bolt",
        transaction_reviews: [
          { status: "reconciled", category_id: "transport", user_note: null, display_name: "Bolt Rides" },
        ],
      }),
      txn({ id: "old", occurred_at: PREV_MONTH_11AM }),
    ]);
    await render(<InsightsScreen />);
    expect(await screen.findByText("Top merchant")).toBeTruthy();
    expect(
      screen.getByText("Bolt Rides is your top merchant at ₦4,200.00 this month."),
    ).toBeTruthy();
  });
});

describe("Ask screen", () => {
  it("sends a question and renders the grounded answer", async () => {
    await render(<AskScreen />);
    expect(await screen.findByText(/Ask about your spending\./, {}, { timeout: 5000 })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Question"), "How much on food?");
    await fireEvent.press(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText("You spent ₦72,765.74 on Food.")).toBeTruthy();
    expect(screen.getByText("based on: Food spend")).toBeTruthy();
  });

  it("shows error with retry", async () => {
    M(mockAskQuestion).mockRejectedValueOnce(new Error("No answer."));
    await render(<AskScreen />);
    await screen.findByText(/Ask about your spending\./, {}, { timeout: 5000 });
    await fireEvent.changeText(screen.getByLabelText("Question"), "Hi?");
    await fireEvent.press(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText("No answer.")).toBeTruthy();
    M(mockAskQuestion).mockResolvedValue({ answer: "Ok.", basis: "Data" });
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Ok.")).toBeTruthy();
  });
});

describe("Settings screen", () => {
  it("renders sections and signs out", async () => {
    await render(<SettingsScreen />);
    expect(await screen.findByText("Account")).toBeTruthy();
    expect(screen.getByText("Privacy")).toBeTruthy();
    expect(screen.getByText("Subscription")).toBeTruthy();
    expect(screen.getByText("About")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/welcome"));
  });

  it("renders the pill with no active item", async () => {
    await render(<SettingsScreen />);
    await screen.findByText("Account");
    for (const label of ["Home", "Activity", "Budget", "Insights"]) {
      expect(
        screen.getByRole("button", { name: label }).props.accessibilityState.selected,
      ).toBe(false);
    }
  });

  it("shows Change photo without Remove when no photo exists (Phase 10A.5)", async () => {
    await render(<SettingsScreen />);
    await screen.findByText("Profile");
    expect(screen.getByTestId("settings-photo-change")).toBeTruthy();
    expect(screen.queryByTestId("settings-photo-remove")).toBeNull();
    expect(screen.queryByTestId("settings-avatar-image")).toBeNull();
  });

  it("shows Remove and the photo when one exists (Phase 10A.5)", async () => {
    M(mockGetProfile).mockResolvedValue({
      id: "u1",
      email: "ada@example.com",
      avatar_url: "https://example.com/a.jpg",
    });
    await render(<SettingsScreen />);
    await screen.findByTestId("settings-photo-remove");
    expect(screen.getByTestId("settings-avatar-image")).toBeTruthy();
  });
});

describe("Error screens", () => {
  it("NotFound renders and returns home", async () => {
    await render(<NotFoundScreen />);
    expect(await screen.findByText("This page doesn't exist.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Back home" }));
    expect(mockPush).toHaveBeenCalledWith("/home");
  });

  it("Offline retries back", async () => {
    await render(<OfflineScreen />);
    expect(await screen.findByText("You're offline. Check your connection and try again.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
