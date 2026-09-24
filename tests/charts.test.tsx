import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { Svg, Defs, Pattern } from "react-native-svg";
import { BarChart, validateBarFills } from "../src/components/BarChart";
import { CategoryCircle } from "../src/components/CategoryCircle";
import { ChartAxis } from "../src/components/ChartAxis";
import { ChartLegend } from "../src/components/ChartLegend";
import { ChartTextEquivalent } from "../src/components/ChartTextEquivalent";
import { Donut } from "../src/components/Donut";
import { HatchPattern } from "../src/components/HatchPattern";
import { LineChart } from "../src/components/LineChart";
import { PillBadge } from "../src/components/PillBadge";
import { ProgressBar } from "../src/components/ProgressBar";
import { Starburst } from "../src/components/Starburst";

const BARS = [
  { label: "Jun", value: 12000, fill: "ink" },
  { label: "Jul", value: 18500, fill: "hatched" },
  { label: "Aug", value: 8000, fill: "ink" },
  { label: "Sep", value: 6500, fill: "ink" },
] as const;

describe("Wave 4 components", () => {
  it("CategoryCircle renders every category with its name as label", async () => {
    const categories = [
      "Food",
      "Transport",
      "Bills",
      "Shopping",
      "Entertainment",
      "Health",
      "Personal",
      "Education",
      "Family",
      "Income",
      "Internal Transfer",
    ] as const;
    for (const category of categories) {
      const { unmount } = await render(<CategoryCircle category={category} />);
      expect(
        screen.getByLabelText(category, { exact: true }),
      ).toBeTruthy();
      await unmount();
    }
  });

  it("Starburst renders variants, sizes, and alert text", async () => {
    await render(
      <>
        <Starburst variant="signal-yellow" testID="s-y" />
        <Starburst variant="alert-red" text="-₦150" testID="s-r" />
        <Starburst variant="paper" size={32} testID="s-p" />
        <Starburst variant="signal-yellow" size={64} testID="s-b" />
      </>,
    );
    expect(screen.getByTestId("s-y")).toBeTruthy();
    expect(screen.getByTestId("s-r")).toBeTruthy();
    expect(screen.getByText("-₦150")).toBeTruthy();
    expect(screen.getByTestId("s-p")).toBeTruthy();
    expect(screen.getByTestId("s-b")).toBeTruthy();
  });

  it("ProgressBar renders with and without a label", async () => {
    await render(
      <>
        <ProgressBar value={0.5} testID="pb" />
        <ProgressBar value={0.5} label="50%" testID="pb-label" />
        <ProgressBar value={0.75} variant="ink" testID="pb-ink" />
      </>,
    );
    expect(screen.getByTestId("pb")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByTestId("pb-ink")).toBeTruthy();
  });

  it("PillBadge renders dark and light variants", async () => {
    await render(
      <>
        <PillBadge label="Today" variant="dark" />
        <PillBadge label="50%" variant="light" />
      </>,
    );
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });
});

describe("Wave 5 chart infrastructure", () => {
  it("HatchPattern instances produce distinct ids on one page", () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      tree = TestRenderer.create(
        <Svg>
          <Defs>
            <HatchPattern />
            <HatchPattern />
          </Defs>
        </Svg>,
      );
    });
    if (!tree) throw new Error("renderer not created");
    const patterns = tree.root.findAllByType(Pattern);
    expect(patterns).toHaveLength(2);
    const [first, second] = patterns;
    expect(first.props.id).toBeDefined();
    expect(second.props.id).toBeDefined();
    expect(first.props.id).not.toBe(second.props.id);
  });

  it("ChartAxis renders x and y ticks", async () => {
    const ticks = [
      { value: 1, label: "Jun" },
      { value: 2, label: "Jul" },
    ];
    await render(
      <>
        <ChartAxis orientation="x" ticks={ticks} length={200} testID="ax" />
        <ChartAxis orientation="y" ticks={ticks} length={120} testID="ay" />
      </>,
    );
    expect(screen.getByTestId("ax")).toBeTruthy();
    expect(screen.getByTestId("ay")).toBeTruthy();
    expect(screen.getAllByText("Jun")).toHaveLength(2);
  });

  it("ChartLegend renders entries and ChartTextEquivalent describes", async () => {
    await render(
      <>
        <ChartLegend
          entries={[
            { color: "#EAFF00", label: "Income", value: "₦1" },
            { color: "#0A0A0A", label: "Expenses", value: "₦2" },
          ]}
        />
        <ChartTextEquivalent description="Bar chart. Jun 12,000." testID="cte" />
      </>,
    );
    expect(screen.getByText(/Income/)).toBeTruthy();
    const equivalent = screen.getByTestId("cte");
    expect(equivalent.props.accessibilityLabel).toContain("Jun 12,000");
  });
});

describe("Wave 5 charts", () => {
  it("Donut renders total, legend, and text equivalent", async () => {
    await render(
      <Donut
        total={174700}
        primary={0.62}
        currency="NGN"
        labels={{ primary: "Income", secondary: "Expenses" }}
        testID="donut"
      />,
    );
    expect(screen.getByTestId("donut")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText("Income ₦1,083.14")).toBeTruthy();
  });

  it("BarChart enforces exactly one hatched bar", () => {
    expect(validateBarFills([...BARS])).toBeNull();
    expect(
      validateBarFills(BARS.map((b) => ({ ...b, fill: "ink" as const }))),
    ).toMatch(/exactly one/);
    expect(
      validateBarFills([
        { label: "A", value: 1, fill: "hatched" },
        { label: "B", value: 2, fill: "hatched" },
      ]),
    ).toMatch(/exactly one/);
  });

  it("BarChart renders bars with labels", async () => {
    await render(
      <BarChart
        bars={[...BARS]}
        axisTicks={[{ value: 0, label: "0" }]}
        testID="bars"
      />,
    );
    expect(screen.getByTestId("bars")).toBeTruthy();
    expect(screen.getByText("Jul")).toBeTruthy();
  });

  it("LineChart renders with and without a projected segment", async () => {
    const points = [
      { x: 1, y: 300 },
      { x: 10, y: 260 },
      { x: 20, y: 310 },
    ];
    const { unmount } = await render(
      <LineChart points={points} projectedFrom={2} testID="line-proj" />,
    );
    expect(screen.getByTestId("line-proj")).toBeTruthy();
    await unmount();
    await render(<LineChart points={points} testID="line-plain" />);
    expect(screen.getByTestId("line-plain")).toBeTruthy();
  });

  it("charts expose accessible descriptions, not SVG text", async () => {
    await render(
      <BarChart bars={[...BARS]} axisTicks={[]} testID="bars-a11y" />,
    );
    const chart = screen.getByTestId("bars-a11y");
    expect(chart.props.accessibilityLabel).toMatch(/^Bar chart\./);
  });
});
