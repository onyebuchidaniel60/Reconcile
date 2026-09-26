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
  getTransaction,
  getTransactions,
  updateBudget,
} from "../src/lib/db";
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
  disconnectConnection: jest.fn(),
  getReviewCount: jest.fn(),
  getPendingReviews: jest.fn(),
  parseMajorToMinor: (raw: string) => {
    const value = Number.parseFloat(raw.replace(/[,₦\s]/g, ""));
    if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid non-negative amount.");
    return Math.round(value * 100);
  },
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
const mockGetTransaction = getTransaction as unknown as MockFn;
const mockGetTransactions = getTransactions as unknown as MockFn;
const mockUpdateBudget = updateBudget as unknown as MockFn;
const M = (fn: unknown): MockFn => fn as unknown as MockFn;

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
      id: "b1", period_start: "2026-09-01", period_end: "2026-10-01",
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
  M(mockCreateBudget).mockResolvedValue(undefined);
  M(mockUpdateBudget).mockResolvedValue(undefined);
  M(mockConfirmReview).mockResolvedValue(undefined);
  M(mockExcludeReview).mockResolvedValue(undefined);
  M(mockDisconnect).mockResolvedValue(undefined);
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
      txn({ id: "t2", merchant_name: "Shoprite", occurred_at: "2026-09-10T09:00:00.000Z" }),
    ]);
    await render(<ActivityScreen />);
    expect(await screen.findByTestId("activity-day-Sept 14")).toBeTruthy();
    expect(screen.getByTestId("activity-day-Sept 10")).toBeTruthy();
    expect(screen.getByText("Bolt")).toBeTruthy();
    expect(screen.getByText("Shoprite")).toBeTruthy();
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

describe("Insights screen", () => {
  it("renders the insight cards with real numbers", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn(),
      txn({ id: "old", occurred_at: "2026-08-11T09:00:00.000Z" }),
    ]);
    await render(<InsightsScreen />);
    expect(await screen.findByText("This month vs last month")).toBeTruthy();
    expect(screen.getByText("Biggest category change")).toBeTruthy();
    expect(screen.getByText("Top merchant")).toBeTruthy();
  });

  it("shows the first-month card without history", async () => {
    M(mockGetTransactions).mockResolvedValue([
      txn({ occurred_at: "2026-09-14T10:00:00.000Z" }),
    ]);
    await render(<InsightsScreen />);
    expect(await screen.findByText("Insights arrive after your first month.")).toBeTruthy();
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
