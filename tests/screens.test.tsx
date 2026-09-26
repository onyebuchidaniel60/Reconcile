import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { ReactNode } from "react";
import * as motion from "../src/theme/motion";
import { categoryTintFor, directionFor, formatBoundLabel, formatPeriodLabel, formatRowDate, monthSampleDays, periodIncome } from "../src/lib/txn";
import {
  confirmReview,
  connectDemo,
  getAccounts,
  getActiveConnection,
  getCategories,
  getCurrentMonthBudget,
  getPendingReviews,
  getReviewCount,
  getTransactions,
  syncConnection,
} from "../src/lib/db";

import WelcomeScreen from "../app/welcome";
import PrivacyScreen from "../app/privacy";
import CountryScreen from "../app/country";
import SignUpScreen from "../app/signup";
import SignInScreen from "../app/signin";
import DemoScreen from "../app/demo";
import HomeScreen from "../app/home";
import ReviewScreen from "../app/review";

// Screen renders compile many modules on first mount; allow headroom under
// parallel load so the suite is deterministic on saturated machines.
jest.setTimeout(20000);

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignUp = jest.fn<(email: string, password: string) => Promise<string | null>>();
const mockSignIn = jest.fn<(email: string, password: string) => Promise<string | null>>();
let mockSessionEmail: string | null = null;

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("../src/lib/session", () => ({
  useSession: () => ({
    session: mockSessionEmail ? { user: { email: mockSessionEmail } } : null,
    loading: false,
    configured: true,
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: jest.fn(),
  }),
}));

jest.mock("../src/lib/supabase", () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { user: {} } } }) },
  }),
}));

jest.mock("../src/lib/db", () => ({
  getAccounts: jest.fn(),
  getTransactions: jest.fn(),
  getReviewCount: jest.fn(),
  getCurrentMonthBudget: jest.fn(),
  getCategories: jest.fn(),
  getPendingReviews: jest.fn(),
  confirmReview: jest.fn(),
  connectDemo: jest.fn(),
  syncConnection: jest.fn(),
  getActiveConnection: jest.fn(),
}));

type MockFn = ReturnType<typeof jest.fn>;
const mockGetAccounts = getAccounts as unknown as MockFn;
const mockGetTransactions = getTransactions as unknown as MockFn;
const mockGetReviewCount = getReviewCount as unknown as MockFn;
const mockGetCurrentMonthBudget = getCurrentMonthBudget as unknown as MockFn;
const mockGetCategories = getCategories as unknown as MockFn;
const mockGetPendingReviews = getPendingReviews as unknown as MockFn;
const mockConfirmReview = confirmReview as unknown as MockFn;
const mockConnectDemo = connectDemo as unknown as MockFn;
const mockSyncConnection = syncConnection as unknown as MockFn;
const mockGetActiveConnection = getActiveConnection as unknown as MockFn;

const CATEGORIES = [
  { id: "food", label: "Food" },
  { id: "transport", label: "Transport" },
];

function txn(overrides = {}) {
  return {
    id: "t1",
    bank_account_id: "a1",
    amount_minor: 420000,
    currency: "NGN",
    direction: "debit",
    semantic_type: "expense",
    occurred_at: "2026-09-14T10:00:00.000Z",
    merchant_name: "Bolt",
    narration: null,
    normalized_merchant: "bolt",
    budget_eligible: true,
    transaction_reviews: [{ status: "needs_review", category_id: "transport", user_note: null }],
    ...overrides,
  };
}

function reviewItem(overrides = {}) {
  const t = txn();
  return {
    id: "r1",
    transaction_id: t.id,
    status: "needs_review",
    category_id: "transport",
    user_note: null,
    transaction: t,
    ...overrides,
  };
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSignUp.mockReset().mockResolvedValue(null);
  mockSignIn.mockReset().mockResolvedValue(null);
  mockSessionEmail = null;
  for (const fn of [
    mockGetAccounts,
    mockGetTransactions,
    mockGetReviewCount,
    mockGetCurrentMonthBudget,
    mockGetCategories,
    mockGetPendingReviews,
    mockConfirmReview,
    mockConnectDemo,
    mockSyncConnection,
    mockGetActiveConnection,
  ]) {
    fn.mockReset();
  }
  mockGetAccounts.mockResolvedValue([{ id: "a1", available_balance_minor: 500000 }]);
  mockGetTransactions.mockResolvedValue([txn(), txn({ id: "t2", merchant_name: "Shoprite" })]);
  mockGetReviewCount.mockResolvedValue(2);
  mockGetCurrentMonthBudget.mockResolvedValue({
    budget: {
      id: "b1",
      period_start: "2026-09-01",
      period_end: "2026-10-01",
      total_limit_minor: 25000000,
      currency: "NGN",
    },
    caps: [],
  });
  mockGetCategories.mockResolvedValue(CATEGORIES);
  mockGetPendingReviews.mockResolvedValue([reviewItem()]);
  mockConfirmReview.mockResolvedValue(undefined);
  mockGetActiveConnection.mockResolvedValue(null);
  mockConnectDemo.mockResolvedValue({ connection: { id: "c1" } });
  mockSyncConnection.mockResolvedValue({ seen: 55, added: 55, internal_transfer_pairs: 1 });
});

describe("Onboarding screens", () => {
  it("Welcome renders and Continue advances to Privacy", async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByText("Get")).toBeTruthy();
    expect(screen.getByText("Started")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(mockPush).toHaveBeenCalledWith("/privacy");
  });

  it("Privacy renders the two-column table and advances", async () => {
    await render(<PrivacyScreen />);
    expect(screen.getByText("Bank password")).toBeTruthy();
    expect(screen.getByText("Money movement")).toBeTruthy();
    expect(screen.getByText("Yes, to show you")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(mockPush).toHaveBeenCalledWith("/country");
  });

  it("Country defaults to Nigeria with others coming soon", async () => {
    await render(<CountryScreen />);
    expect(screen.getByRole("button", { name: "Nigeria" }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(mockPush).toHaveBeenCalledWith("/signup");
  });

  it("SignUp submits credentials and routes to Demo", async () => {
    await render(<SignUpScreen />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "secret123");
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith("ada@example.com", "secret123"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/demo"));
  });

  it("SignUp shows inline errors without submitting", async () => {
    await render(<SignUpScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter an email and a password.")).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("SignIn submits and routes to Demo", async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "secret123");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("ada@example.com", "secret123"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/demo"));
  });

  it("Demo entry enters demo mode and continues Home", async () => {
    await render(<DemoScreen />);
    expect(await screen.findByText("Try")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Enter Demo Mode" }));
    await waitFor(() => expect(mockConnectDemo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/home"));
  });

  it("Demo entry shows the Connect placeholder as disabled", async () => {
    await render(<DemoScreen />);
    await screen.findByText("Try");
    expect(screen.getByText("Coming soon")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Connect a real bank, coming soon" }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });
});

describe("Home screen", () => {
  it("renders greeting, hero, budget, rows, and pill with real data", async () => {
    mockSessionEmail = "adaeze@example.com";
    await render(<HomeScreen />);
    expect(await screen.findByText("Hey, Adaeze")).toBeTruthy();
    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(screen.getByText("Budget Overview")).toBeTruthy();
    expect(screen.getByText("Bolt")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "View cards" })).toBeTruthy();
    for (const label of ["Home", "Activity", "Budget", "Insights"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Home" }).props.accessibilityState.selected).toBe(
      true,
    );
  });

  it("navigates the pill to Activity", async () => {
    mockSessionEmail = "adaeze@example.com";
    await render(<HomeScreen />);
    await screen.findByText("Hey, Adaeze");
    await fireEvent.press(screen.getByTestId("home-pill-activity"));
    expect(mockPush).toHaveBeenCalledWith("/activity");
  });

  it("shows the empty state without accounts", async () => {
    mockSessionEmail = "adaeze@example.com";
    mockGetAccounts.mockResolvedValue([]);
    await render(<HomeScreen />);
    expect(await screen.findByText("No accounts connected")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Enter Demo Mode" }));
    expect(mockPush).toHaveBeenCalledWith("/demo");
  });

  it("shows the error state with retry", async () => {
    mockSessionEmail = "adaeze@example.com";
    mockGetTransactions.mockRejectedValueOnce(new Error("Offline."));
    await render(<HomeScreen />);
    expect(await screen.findByText("Offline.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mockGetTransactions).toHaveBeenCalledTimes(2));
  });

  it("links to Review when items need review", async () => {
    mockSessionEmail = "adaeze@example.com";
    await render(<HomeScreen />);
    const review = await screen.findByRole("button", { name: "Review 2 transactions" });
    await fireEvent.press(review);
    expect(mockPush).toHaveBeenCalledWith("/review");
  });

  it("opens Settings from the avatar", async () => {
    mockSessionEmail = "adaeze@example.com";
    await render(<HomeScreen />);
    await screen.findByText("Hey, Adaeze");
    await fireEvent.press(screen.getByRole("button", { name: "Open settings" }));
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });
});

describe("Review screen", () => {
  it("renders rows with progress, selects, picks, and confirms", async () => {
    await render(<ReviewScreen />);
    expect(await screen.findByText("1 of 1")).toBeTruthy();
    expect(screen.getByText("Bolt")).toBeTruthy();
    // Chips appear for the auto-selected first row.
    expect(screen.getByRole("button", { name: "Set Food" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Set Food" }));
    mockGetPendingReviews.mockResolvedValue([]);
    await fireEvent.press(screen.getByRole("button", { name: /Confirm/ }));
    await waitFor(() => expect(mockConfirmReview).toHaveBeenCalledWith("t1", "food"));
    expect(await screen.findByText("All caught up. Review complete.")).toBeTruthy();
  });

  it("selects a row to reveal chips and a details entry", async () => {
    const two = [
      reviewItem(),
      reviewItem({
        id: "r2",
        transaction_id: "t2",
        transaction: txn({ id: "t2", merchant_name: "Shoprite" }),
      }),
    ];
    mockGetPendingReviews.mockResolvedValue(two);
    await render(<ReviewScreen />);
    await screen.findByText("Bolt");
    expect(screen.getByText("1 of 2")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("review-row-t2"));
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(screen.getByText("View details")).toBeTruthy();
  });

  it("shows empty and error states", async () => {
    mockGetPendingReviews.mockResolvedValue([]);
    const { unmount } = await render(<ReviewScreen />);
    expect(await screen.findByText("All caught up. Review complete.")).toBeTruthy();
    await unmount();
    mockGetPendingReviews.mockRejectedValueOnce(new Error("Offline."));
    await render(<ReviewScreen />);
    expect(await screen.findByText("Offline.")).toBeTruthy();
  });

  it("confirms cleanly under reduced motion", async () => {
    const spy = jest.spyOn(motion, "useMotion").mockReturnValue(motion.resolveDurations(true));
    try {
      await render(<ReviewScreen />);
      await screen.findByText("Bolt");
      mockGetPendingReviews.mockResolvedValue([]);
      await fireEvent.press(screen.getByRole("button", { name: /Confirm/ }));
      await waitFor(() => expect(mockConfirmReview).toHaveBeenCalled());
    } finally {
      spy.mockRestore();
    }
  });
});

describe("txn display helpers", () => {
  it("maps direction and category tints", () => {
    expect(directionFor(txn({ semantic_type: "income" }))).toBe("income");
    expect(directionFor(txn({ semantic_type: "refund" }))).toBe("refund");
    expect(directionFor(txn({ semantic_type: "internal_transfer" }))).toBe("internal_transfer");
    expect(directionFor(txn({ semantic_type: "expense" }))).toBe("expense");
    expect(directionFor(txn({ semantic_type: "unknown" }))).toBe("expense");
    expect(categoryTintFor(txn(), CATEGORIES)).toBe("Transport");
    expect(
      categoryTintFor(txn({ semantic_type: "internal_transfer" }), CATEGORIES),
    ).toBe("Internal Transfer");
    expect(categoryTintFor(txn({ semantic_type: "income" }), [])).toBe("Income");
    expect(categoryTintFor(txn({ semantic_type: "expense" }), [])).toBe("Shopping");
    // Review embeds may omit transaction_reviews entirely; the explicit id wins.
    const bare = txn();
    delete (bare as { transaction_reviews?: unknown }).transaction_reviews;
    expect(categoryTintFor(bare, CATEGORIES)).toBe("Shopping");
    expect(categoryTintFor(bare, CATEGORIES, "food")).toBe("Food");
  });

  it("formats row, period, and bound labels", () => {
    expect(formatRowDate("2026-09-14T10:00:00.000Z")).toBe("Sept 14");
    expect(formatPeriodLabel(new Date(2026, 8, 1))).toBe("September 2026");
    expect(formatBoundLabel(new Date(2026, 8, 1))).toBe("Sept 1, 2026");
  });

  it("samples trend days without timezone collapse (Phase 10A)", () => {
    expect(monthSampleDays("2026-09-01")).toEqual([1, 10, 20, 30]);
    expect(monthSampleDays("2026-02-01")).toEqual([1, 10, 19, 28]);
    expect(monthSampleDays("2024-02-01")).toEqual([1, 10, 20, 29]);
  });

  it("sums in-month income regardless of eligibility", () => {
    const start = new Date(2026, 8, 1).getTime();
    const end = new Date(2026, 9, 1).getTime();
    const rows = [
      txn({ id: "i1", semantic_type: "income", amount_minor: 45000000, occurred_at: "2026-09-10T09:00:00.000Z", budget_eligible: false }),
      txn({ id: "i2", semantic_type: "income", amount_minor: 12000000, occurred_at: "2026-08-11T09:00:00.000Z", budget_eligible: false }),
      txn({ id: "e1", semantic_type: "expense", amount_minor: 420000, occurred_at: "2026-09-14T10:00:00.000Z" }),
    ];
    expect(periodIncome(rows, start, end)).toBe(45000000);
  });
});
