import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { Avatar, avatarInitialForName, avatarTintForName } from "../src/components/Avatar";
import { BlockingSpinner } from "../src/components/BlockingSpinner";
import { Button } from "../src/components/Button";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { LoadingState } from "../src/components/LoadingState";
import { TransactionRow } from "../src/components/TransactionRow";
import { colors } from "../src/theme/colors";
import * as motion from "../src/theme/motion";

function flattened(testID: string): Record<string, unknown> {
  const node = screen.getByTestId(testID);
  return StyleSheet.flatten(node.props.style) as Record<string, unknown>;
}

describe("Wave 6 TransactionRow", () => {
  it("renders an expense with a minus sign and a composed label", async () => {
    await render(
      <TransactionRow
        merchant="Bolt"
        date="Sept 14"
        amount={420000}
        currency="NGN"
        category="Transport"
        direction="expense"
        testID="row"
      />,
    );
    expect(screen.getByText("Bolt")).toBeTruthy();
    expect(screen.getByText("Sept 14")).toBeTruthy();
    expect(screen.getByText("-₦4,200.00")).toBeTruthy();
    expect(
      screen.getByLabelText("Bolt, Transport, ₦4,200.00 debit, Sept 14"),
    ).toBeTruthy();
  });

  it("prefixes income and refund with a plus sign", async () => {
    const { unmount } = await render(
      <TransactionRow
        merchant="Salary"
        date="Sept 1"
        amount={25000000}
        currency="NGN"
        category="Income"
        direction="income"
        testID="row-income"
      />,
    );
    expect(screen.getByText("+₦250,000.00")).toBeTruthy();
    expect(
      screen.getByLabelText("Salary, Income, ₦250,000.00 credit, Sept 1"),
    ).toBeTruthy();
    await unmount();
    await render(
      <TransactionRow
        merchant="Jumia refund"
        date="Sept 10"
        amount={1550000}
        currency="NGN"
        category="Shopping"
        direction="refund"
        testID="row-refund"
      />,
    );
    expect(screen.getByText("+₦15,500.00")).toBeTruthy();
  });

  it("mutes internal transfers with a neutral gray circle and no sign", async () => {
    await render(
      <TransactionRow
        merchant="GTB to Kuda"
        date="Sept 12"
        amount={5000000}
        currency="NGN"
        category="Internal Transfer"
        direction="internal_transfer"
        testID="row-transfer"
      />,
    );
    expect(screen.getByText("₦50,000.00")).toBeTruthy();
    expect(flattened("row-transfer").opacity).toBe(0.6);
    const circle = screen.getByLabelText("Internal Transfer", { exact: true });
    expect(StyleSheet.flatten(circle.props.style).backgroundColor).toBe(colors.line);
    expect(
      screen.getByLabelText("GTB to Kuda, Internal Transfer, ₦50,000.00 transfer, Sept 12"),
    ).toBeTruthy();
  });

  it("renders the dark surface with paper text", async () => {
    await render(
      <TransactionRow
        merchant="Netflix"
        date="Sept 5"
        amount={650000}
        currency="NGN"
        category="Entertainment"
        direction="expense"
        surface="dark"
        testID="row-dark"
      />,
    );
    expect(screen.getByText("-₦6,500.00")).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText("Netflix").props.style).color).toBe(
      colors.paper,
    );
  });

  it("fires onPress with a button role", async () => {
    const onPress = jest.fn();
    await render(
      <TransactionRow
        merchant="Bolt"
        date="Sept 14"
        amount={420000}
        currency="NGN"
        category="Transport"
        direction="expense"
        onPress={onPress}
      />,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Bolt, Transport, ₦4,200.00 debit, Sept 14" }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("Wave 6 states", () => {
  it("EmptyState renders the message, a default icon, and an action", async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        message="Nothing here yet."
        action={<Button title="Sync" variant="ghost" onPress={onPress} />}
        testID="empty"
      />,
    );
    expect(screen.getByText("Nothing here yet.")).toBeTruthy();
    expect(screen.getByLabelText("Nothing here yet.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sync" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ErrorState renders the message, fires retry, and never shows the code", async () => {
    const onRetry = jest.fn();
    await render(
      <ErrorState
        message="Sync failed."
        onRetry={onRetry}
        errorCode="SYNC_500"
        testID="error"
      />,
    );
    expect(screen.getByText("Sync failed.")).toBeTruthy();
    expect(screen.queryByText("SYNC_500")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("LoadingState renders every variant as skeleton compositions", async () => {
    const variants = ["row-list", "card-hero", "chart-card"] as const;
    for (const variant of variants) {
      const { unmount } = await render(
        <LoadingState variant={variant} testID={`loading-${variant}`} />,
      );
      expect(screen.getByTestId(`loading-${variant}`)).toBeTruthy();
      expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(0);
      await unmount();
    }
  });

  it("LoadingState renders statically under reduced motion", async () => {
    const spy = jest.spyOn(motion, "useMotion").mockReturnValue(motion.resolveDurations(true));
    try {
      await render(<LoadingState variant="row-list" testID="loading-rm" />);
      expect(screen.getByTestId("loading-rm")).toBeTruthy();
      expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("BlockingSpinner renders an indicator, and static text under reduced motion", async () => {
    const { unmount } = await render(<BlockingSpinner testID="blocking" />);
    expect(screen.getByLabelText("Loading")).toBeTruthy();
    await unmount();
    const spy = jest.spyOn(motion, "useMotion").mockReturnValue(motion.resolveDurations(true));
    try {
      await render(<BlockingSpinner testID="blocking-rm" />);
      expect(screen.getByText("Loading…")).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("Wave 6 Avatar", () => {
  it("derives the initial from the display name", () => {
    expect(avatarInitialForName("Adaeze")).toBe("A");
    expect(avatarInitialForName("  chidi ")).toBe("C");
    expect(avatarInitialForName("")).toBe("?");
  });

  it("hashes the name deterministically to one tint", () => {
    expect(avatarTintForName("Adaeze")).toBe(avatarTintForName("Adaeze"));
    expect([colors.coral, colors.mint, colors.mist, colors.lavender]).toContain(
      avatarTintForName("Adaeze"),
    );
    expect([colors.coral, colors.mint, colors.mist, colors.lavender]).toContain(
      avatarTintForName("Chidi"),
    );
  });

  it("renders every size with its initial", async () => {
    const sizes = [32, 40, 48, 64] as const;
    for (const size of sizes) {
      const { unmount } = await render(
        <Avatar displayName="Adaeze" size={size} testID={`avatar-${size}`} />,
      );
      expect(screen.getByTestId(`avatar-${size}`)).toBeTruthy();
      expect(screen.getByText("A")).toBeTruthy();
      expect(screen.getByLabelText("Adaeze")).toBeTruthy();
      await unmount();
    }
  });
});
