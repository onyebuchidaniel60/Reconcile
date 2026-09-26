import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { Divider } from "../src/components/Divider";
import { IconButton } from "../src/components/IconButton";
import { Input } from "../src/components/Input";
import { PairedTitle } from "../src/components/PairedTitle";
import { SectionHeader } from "../src/components/SectionHeader";
import { Skeleton } from "../src/components/Skeleton";
import { Text } from "../src/components/Text";

describe("Wave 1 primitives", () => {
  it("Text renders body by default with an ink color", async () => {
    await render(<Text testID="t">Hello</Text>);
    expect(screen.getByTestId("t")).toBeTruthy();
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("Text renders every role without crashing", async () => {
    const roles = [
      "displayXl",
      "display",
      "titleLight",
      "titleHeavy",
      "h1",
      "h2",
      "h3",
      "body",
      "small",
      "mono",
    ] as const;
    for (const role of roles) {
      const { unmount } = await render(<Text role={role}>{role}</Text>);
      expect(screen.getByText(role)).toBeTruthy();
      await unmount();
    }
  });

  it("PairedTitle renders both words", async () => {
    await render(<PairedTitle first="Home" second="Budget" />);
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
  });
});

describe("Wave 2 primitives", () => {
  it("Button renders each variant with an accessible label", async () => {
    const onPress = jest.fn();
    const { unmount } = await render(<Button title="Go" onPress={onPress} />);
    expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
    await unmount();
    await render(
      <>
        <Button title="S" variant="secondary" />
        <Button title="G" variant="ghost" />
      </>,
    );
    expect(screen.getByRole("button", { name: "S" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "G" })).toBeTruthy();
  });

  it("Button fires onPress and respects disabled", async () => {
    const onPress = jest.fn();
    await render(<Button title="Go" onPress={onPress} testID="btn" />);
    await fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
    const blocked = jest.fn();
    await render(<Button title="No" onPress={blocked} disabled testID="btn-off" />);
    expect(screen.getByRole("button", { name: "No" }).props.accessibilityState.disabled).toBe(
      true,
    );
    expect(blocked).not.toHaveBeenCalled();
  });

  it("Button prefers an explicit accessibility label", async () => {
    await render(<Button title="Go" accessibilityLabel="Start demo" />);
    expect(screen.getByRole("button", { name: "Start demo" })).toBeTruthy();
  });

  it("Button loading shows a spinner and blocks presses", async () => {
    const onPress = jest.fn();
    await render(<Button title="Go" onPress={onPress} loading testID="btn-loading" />);
    expect(screen.getByTestId("btn-loading-spinner")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Go" }).props.accessibilityState.busy,
    ).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("IconButton requires a label and fires onPress", async () => {
    const onPress = jest.fn();
    await render(
      <IconButton accessibilityLabel="Back" onPress={onPress}>
        <Text>←</Text>
      </IconButton>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("Input renders its label and accepts text", async () => {
    const onChangeText = jest.fn();
    await render(<Input label="Name" value="" onChangeText={onChangeText} />);
    expect(screen.getByText("Name")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Name"), "Ada");
    expect(onChangeText).toHaveBeenCalledWith("Ada");
  });

  it("Input shows the error variant", async () => {
    await render(
      <Input label="Amount" value="" onChangeText={() => {}} error="Bad amount" />,
    );
    expect(screen.getByText("Bad amount")).toBeTruthy();
  });

  it("Chip renders, selects, and fires onPress", async () => {
    const onPress = jest.fn();
    await render(<Chip label="All" onPress={onPress} testID="chip" />);
    await fireEvent.press(screen.getByTestId("chip"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await render(<Chip label="On" selected testID="chip-on" />);
    expect(
      screen.getByTestId("chip-on").props.accessibilityState.selected,
    ).toBe(true);
  });

  it("Chip meets the 44px minimum touch target (Phase 10A)", async () => {
    await render(<Chip label="All" onPress={() => {}} testID="chip-44" />);
    const style = StyleSheet.flatten(screen.getByTestId("chip-44").props.style);
    expect(style.minHeight).toBe(44);
    expect(style.minWidth).toBe(44);
  });
});

describe("Wave 3 primitives", () => {
  it("Card renders every surface variant", async () => {
    const variants = ["paper", "yellow", "ink", "mist", "mint", "coral"] as const;
    for (const variant of variants) {
      const { unmount } = await render(
        <Card variant={variant} testID={`card-${variant}`}>
          <Text>{variant}</Text>
        </Card>,
      );
      expect(screen.getByTestId(`card-${variant}`)).toBeTruthy();
      await unmount();
    }
  });

  it("Divider renders", async () => {
    await render(<Divider testID="div" />);
    expect(screen.getByTestId("div")).toBeTruthy();
  });

  it("SectionHeader renders title and action", async () => {
    const onAction = jest.fn();
    await render(
      <SectionHeader title="Recent" actionLabel="See all" onAction={onAction} />,
    );
    expect(screen.getByText("Recent")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "See all" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("Skeleton renders with default accessibility label", async () => {
    await render(<Skeleton />);
    expect(screen.getByLabelText("Loading")).toBeTruthy();
  });
});
