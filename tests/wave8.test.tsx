import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { validateBarFills } from "../src/components/BarChart";
import { Donut } from "../src/components/Donut";
import { BudgetOverviewCard } from "../src/components/organisms/BudgetOverviewCard";
import { ExpensesBarCard } from "../src/components/organisms/ExpensesBarCard";
import { HeroSummaryCard } from "../src/components/organisms/HeroSummaryCard";
import { InsightCard } from "../src/components/organisms/InsightCard";
import { PositiveMessageCard } from "../src/components/organisms/PositiveMessageCard";
import { ReviewHeader } from "../src/components/organisms/ReviewHeader";
import { SpendTrendCard } from "../src/components/organisms/SpendTrendCard";
import * as motion from "../src/theme/motion";
import { colors } from "../src/theme/colors";

const BARS = [
  { label: "May", value: 9800000, fill: "ink" },
  { label: "Jun", value: 12400000, fill: "hatched" },
  { label: "Jul", value: 8600000, fill: "ink" },
  { label: "Aug", value: 7900000, fill: "ink" },
] as const;

const TICKS = [
  { value: 0, label: "₦0" },
  { value: 5000000, label: "₦50k" },
];

describe("Wave 8 HeroSummaryCard", () => {
  it("renders period, total, and legend with a composed label", async () => {
    await render(
      <HeroSummaryCard
        period="September 2026"
        total={281700000}
        income={174700000}
        expenses={107000000}
        currency="NGN"
        testID="hero"
      />,
    );
    expect(screen.getByText("Summary")).toBeTruthy();
    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(screen.getByText("₦2,817,000.00")).toBeTruthy();
    // Once: the Donut's internal legend is hidden in favor of the card legend.
    expect(screen.getByText("Income ₦1,747,000.00")).toBeTruthy();
    expect(screen.getByText("Expenses ₦1,070,000.00")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Summary for September 2026. Income ₦1,747,000.00, expenses ₦1,070,000.00.",
      ),
    ).toBeTruthy();
  });

  it("fires onPressPeriod from the period selector", async () => {
    const onPressPeriod = jest.fn();
    await render(
      <HeroSummaryCard
        period="September 2026"
        total={100}
        income={60}
        expenses={40}
        currency="NGN"
        onPressPeriod={onPressPeriod}
      />,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Change period, currently September 2026" }),
    );
    expect(onPressPeriod).toHaveBeenCalledTimes(1);
  });
});

describe("Wave 8 BudgetOverviewCard", () => {
  /** Find the first node whose flattened style carries `backgroundColor`. */
  function nodeWithBg(tree: unknown, bg: string): boolean {
    let hit = false;
    const walk = (node: unknown): void => {
      if (hit) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (!node || typeof node !== "object") return;
      const style = (node as { props?: { style?: unknown } }).props?.style;
      const first = Array.isArray(style) ? style[0] : style;
      if (
        first &&
        typeof first === "object" &&
        (first as { backgroundColor?: string }).backgroundColor === bg
      ) {
        hit = true;
        return;
      }
      walk((node as { children?: unknown }).children);
    };
    walk(tree);
    return hit;
  }

  function zoneStyle(tree: unknown): { width?: string; alignItems?: string } | null {
    let out: { width?: string; alignItems?: string } | null = null;
    const walk = (node: unknown): void => {
      if (out) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (!node || typeof node !== "object") return;
      const props = (node as { props?: { testID?: string; style?: unknown } }).props;
      if (props?.testID?.endsWith("-label-zone")) {
        const first = Array.isArray(props.style) ? props.style[0] : props.style;
        out = (first ?? {}) as { width?: string; alignItems?: string };
        return;
      }
      walk((node as { children?: unknown }).children);
    };
    walk(tree);
    return out;
  }

  it("renders the label, Today badge, percentage, and date range", async () => {
    await render(
      <BudgetOverviewCard
        spent={12500000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={0.5}
        testID="budget"
      />,
    );
    expect(screen.getByText("Budget Overview")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("Sept 1, 2026")).toBeTruthy();
    expect(screen.getByText("Sept 30, 2026")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Budget overview. Spent ₦125,000.00 of ₦250,000.00, Sept 1, 2026 to Sept 30, 2026.",
      ),
    ).toBeTruthy();
  });

  it("shows used and remaining amounts as Spent / Left (Phase 10B, Fix A)", async () => {
    await render(
      <BudgetOverviewCard
        spent={15000000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={0.6}
        testID="budget-split"
      />,
    );
    // 60% used, per the reference: the percentage names the filled portion.
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText("Spent")).toBeTruthy();
    expect(screen.getByText("₦150,000.00")).toBeTruthy();
    expect(screen.getByText("Left")).toBeTruthy();
    expect(screen.getByText("₦100,000.00")).toBeTruthy();
  });

  it("reads 100% and full fill at exactly the limit", async () => {
    const { toJSON } = await render(
      <BudgetOverviewCard
        spent={25000000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={1}
        testID="budget-at"
      />,
    );
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("Left")).toBeTruthy();
    expect(screen.getByText("₦0.00")).toBeTruthy();
    // At the limit is not over budget: ink fill, not alert red.
    expect(nodeWithBg(toJSON(), colors.alertRed)).toBe(false);
    expect(nodeWithBg(toJSON(), colors.ink)).toBe(true);
  });

  it("switches the right row to Over with the overdraft in alert red", async () => {
    const { toJSON } = await render(
      <BudgetOverviewCard
        spent={30250000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={1.21}
        testID="budget-over-row"
      />,
    );
    expect(screen.getByText("121%")).toBeTruthy();
    expect(screen.queryByText("Left")).toBeNull();
    expect(screen.getByText("Over")).toBeTruthy();
    expect(screen.getByText("₦52,500.00")).toBeTruthy();
    expect(nodeWithBg(toJSON(), colors.alertRed)).toBe(true);
  });

  it("keeps the percentage pill visible when the fill is tiny (Phase 10B, Fix A)", async () => {
    const { toJSON } = await render(
      <BudgetOverviewCard
        spent={125000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={0.05}
        testID="budget-tiny"
      />,
    );
    // 5% fill: below the edge-anchor ratio, so the pill is right-anchored to
    // the fill edge rather than centred in a sliver.
    expect(screen.getByText("5%")).toBeTruthy();
    const zone = zoneStyle(toJSON());
    expect(zone).not.toBeNull();
    expect(zone?.alignItems).toBe("flex-end");
    // The pill zone is floored so the pill can never be clipped by a 5% fill.
    expect(zone?.width).toBe("15%");
  });

  it("centres the pill over a wide fill (Phase 10B, Fix A)", async () => {
    const { toJSON } = await render(
      <BudgetOverviewCard
        spent={17500000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={0.7}
        testID="budget-wide"
      />,
    );
    expect(screen.getByText("70%")).toBeTruthy();
    const zone = zoneStyle(toJSON());
    expect(zone?.alignItems).toBe("center");
    expect(zone?.width).toBe("70%");
  });

  it("renders over-budget uncapped with an alert-red fill (Phase 10A.5)", async () => {
    const { toJSON } = await render(
      <BudgetOverviewCard
        spent={30250000}
        limit={25000000}
        currency="NGN"
        periodStart="Sept 1, 2026"
        periodEnd="Sept 30, 2026"
        progress={1.21}
        testID="budget-over"
      />,
    );
    expect(screen.getByText("121%")).toBeTruthy();
    const found: unknown[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (!node || typeof node !== "object") return;
      const style = (node as { props?: { style?: unknown } }).props?.style;
      const first = Array.isArray(style) ? style[0] : style;
      if (
        first &&
        typeof first === "object" &&
        (first as { backgroundColor?: string }).backgroundColor === colors.alertRed
      ) {
        found.push(node);
      }
      const children = (node as { children?: unknown }).children;
      if (Array.isArray(children)) children.forEach(walk);
    };
    walk(toJSON());
    expect(found.length).toBeGreaterThan(0);
  });
});

describe("Wave 8 ExpensesBarCard", () => {
  it("renders one hatched bar and one alert-red starburst", async () => {
    expect(validateBarFills([...BARS])).toBeNull();
    await render(
      <ExpensesBarCard
        bars={[...BARS]}
        axisTicks={[...TICKS]}
        callout="+₦26,000"
        currency="NGN"
        testID="expenses"
      />,
    );
    expect(screen.getByText("Expenses — Last 4 months")).toBeTruthy();
    expect(screen.getByLabelText("Highlight: +₦26,000")).toBeTruthy();
    expect(screen.getByText("Jun")).toBeTruthy();
  });

  it("fires onPressRange from the header", async () => {
    const onPressRange = jest.fn();
    await render(
      <ExpensesBarCard
        bars={[...BARS]}
        axisTicks={[...TICKS]}
        callout="+₦26,000"
        currency="NGN"
        onPressRange={onPressRange}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Change expenses range" }));
    expect(onPressRange).toHaveBeenCalledTimes(1);
  });
});

describe("Wave 8 SpendTrendCard", () => {
  const POINTS = [
    { x: 1, y: 120 },
    { x: 10, y: 200 },
    { x: 20, y: 290 },
    { x: 30, y: 340 },
  ];

  it("renders the hero amount, limit line, starburst, and projection", async () => {
    await render(
      <SpendTrendCard
        spent={41250000}
        limit={50000000}
        currency="NGN"
        points={POINTS}
        projectedFrom={3}
        axisTicks={[{ value: 1, label: "Sept 1" }]}
        testID="trend"
      />,
    );
    expect(screen.getByText("₦412,500.00")).toBeTruthy();
    expect(screen.getByText("Spent out of ₦500,000.00")).toBeTruthy();
    expect(screen.getByTestId("trend-starburst")).toBeTruthy();
    expect(screen.getByTestId("trend-chart").props.accessibilityLabel).toMatch(
      /projected segment/,
    );
  });

  it("renders without a projected segment", async () => {
    await render(
      <SpendTrendCard
        spent={41250000}
        limit={50000000}
        currency="NGN"
        points={POINTS}
        axisTicks={[]}
        testID="trend-plain"
      />,
    );
    expect(screen.getByTestId("trend-plain-chart").props.accessibilityLabel).not.toMatch(
      /projected segment/,
    );
  });
});

describe("Wave 8 PositiveMessageCard", () => {
  it("renders the single sentence", async () => {
    await render(
      <PositiveMessageCard
        message="Keep spending. You are on track."
        testID="positive"
      />,
    );
    expect(screen.getByText("Keep spending. You are on track.")).toBeTruthy();
    expect(screen.getByLabelText("Keep spending. You are on track.")).toBeTruthy();
  });
});

describe("Wave 8 InsightCard", () => {
  it("renders label, paired amounts, and explanation", async () => {
    await render(
      <InsightCard
        label="This month vs last month"
        primary={14683647}
        secondary={33567435}
        delta={56}
        deltaDirection="down"
        explanation="Food costs fell."
        currency="NGN"
        testID="insight"
      />,
    );
    expect(screen.getByText("This month vs last month")).toBeTruthy();
    expect(screen.getByText("₦146,836.47")).toBeTruthy();
    expect(screen.getByText("₦335,674.35")).toBeTruthy();
    expect(screen.getByText("Food costs fell.")).toBeTruthy();
  });

  it("renders the correct arrow and sign per direction", async () => {
    const cases = [
      { direction: "down", text: "↓ -56%" },
      { direction: "up", text: "↑ +56%" },
      { direction: "flat", text: "→ 0%" },
    ] as const;
    for (const { direction, text } of cases) {
      const { unmount } = await render(
        <InsightCard
          label="L"
          primary={1}
          secondary={2}
          delta={direction === "flat" ? 0 : 56}
          deltaDirection={direction}
          explanation="E"
          currency="NGN"
          testID={`insight-${direction}`}
        />,
      );
      expect(screen.getByTestId(`insight-${direction}-delta`)).toBeTruthy();
      expect(screen.getByText(direction === "flat" ? "→ 0%" : text)).toBeTruthy();
      await unmount();
    }
  });

  it("renders yellow and ink surfaces with a starburst option (Phase 10A)", async () => {
    const props = {
      label: "L",
      primary: 100,
      secondary: 200,
      delta: 50,
      deltaDirection: "down" as const,
      explanation: "E",
      currency: "NGN",
    };
    const { unmount } = await render(
      <InsightCard {...props} surface="yellow" testID="insight-y" />,
    );
    expect(screen.getByTestId("insight-y")).toBeTruthy();
    expect(screen.queryByTestId("insight-y-starburst")).toBeNull();
    await unmount();
    await render(
      <InsightCard {...props} surface="ink" starburst testID="insight-k" />,
    );
    expect(screen.getByTestId("insight-k-starburst")).toBeTruthy();
  });
});

describe("Wave 8 ReviewHeader", () => {
  it("renders the paired title with starburst and progress", async () => {
    await render(
      <ReviewHeader
        firstWord="Review"
        secondWord="Transactions"
        starburst
        progress="3 of 12"
        testID="review-header"
      />,
    );
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Transactions")).toBeTruthy();
    expect(screen.getByTestId("review-header-starburst")).toBeTruthy();
    expect(screen.getByText("3 of 12")).toBeTruthy();
  });

  it("omits the starburst and progress when not asked", async () => {
    await render(
      <ReviewHeader firstWord="Review" secondWord="Transactions" testID="review-plain" />,
    );
    expect(screen.queryByTestId("review-plain-starburst")).toBeNull();
    expect(screen.queryByTestId("review-plain-progress")).toBeNull();
  });
});

describe("Wave 8 amount scaling", () => {
  it("Donut hides its legend on request and steps long totals down", async () => {
    const { unmount } = await render(
      <Donut
        total={174700}
        primary={0.62}
        currency="NGN"
        labels={{ primary: "Income", secondary: "Expenses" }}
      />,
    );
    expect(screen.getByText("Income ₦1,083.14")).toBeTruthy();
    await unmount();
    await render(
      <Donut
        total={281700000}
        primary={0.62}
        currency="NGN"
        labels={{ primary: "Income", secondary: "Expenses" }}
        showLegend={false}
      />,
    );
    expect(screen.queryByText("Income ₦1,746,540.00")).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByText("₦2,817,000.00").props.style).fontSize,
    ).toBe(19);
  });

  it("SpendTrendCard steps long hero amounts down", async () => {
    await render(
      <SpendTrendCard
        spent={41250000}
        limit={50000000}
        currency="NGN"
        points={[{ x: 1, y: 1 }]}
        axisTicks={[]}
        testID="trend-step"
      />,
    );
    expect(
      StyleSheet.flatten(screen.getByText("₦412,500.00").props.style).fontSize,
    ).toBe(30);
  });
});

describe("Wave 8 reduced motion", () => {
  it("renders chart organisms statically under reduced motion", async () => {
    const spy = jest.spyOn(motion, "useMotion").mockReturnValue(motion.resolveDurations(true));
    try {
      await render(
        <>
          <HeroSummaryCard
            period="September 2026"
            total={281700000}
            income={174700000}
            expenses={107000000}
            currency="NGN"
            testID="hero-rm"
          />
          <ExpensesBarCard
            bars={[...BARS]}
            axisTicks={[...TICKS]}
            callout="+₦26,000"
            currency="NGN"
            testID="expenses-rm"
          />
          <SpendTrendCard
            spent={41250000}
            limit={50000000}
            currency="NGN"
            points={[{ x: 1, y: 1 }]}
            axisTicks={[]}
            testID="trend-rm"
          />
        </>,
      );
      expect(screen.getByTestId("hero-rm")).toBeTruthy();
      expect(screen.getByTestId("expenses-rm")).toBeTruthy();
      expect(screen.getByTestId("trend-rm")).toBeTruthy();
      expect(screen.getByText("₦2,817,000.00")).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});
