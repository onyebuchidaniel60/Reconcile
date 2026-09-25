import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { Activity, House } from "lucide-react-native";
import { DarkScreenScaffold } from "../src/components/DarkScreenScaffold";
import { FormScaffold } from "../src/components/FormScaffold";
import { Input } from "../src/components/Input";
import { PairedTitle } from "../src/components/PairedTitle";
import { PillNav } from "../src/components/PillNav";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { Text } from "../src/components/Text";
import { colors } from "../src/theme/colors";

describe("Wave 7 ScreenScaffold", () => {
  it("renders a header with title, back, and actions", async () => {
    const onBack = jest.fn();
    const onSearch = jest.fn();
    await render(
      <ScreenScaffold
        titleFirst="Home"
        titleSecond="Budget"
        onBack={onBack}
        actions={[
          { label: "Search", icon: <Activity size={24} color={colors.ink} />, onPress: onSearch },
        ]}
        testID="scaffold"
      >
        <Text>Content</Text>
      </ScreenScaffold>,
    );
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Budget")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("renders at most two actions and works without scrolling", async () => {
    await render(
      <ScreenScaffold
        titleFirst="A"
        titleSecond="B"
        actions={[
          { label: "One", icon: <House size={24} color={colors.ink} /> },
          { label: "Two", icon: <House size={24} color={colors.ink} /> },
          { label: "Three", icon: <House size={24} color={colors.ink} /> },
        ]}
        scroll={false}
        testID="scaffold-flat"
      >
        <Text>Flat content</Text>
      </ScreenScaffold>,
    );
    expect(screen.getByRole("button", { name: "One" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Two" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Three" })).toBeNull();
    expect(screen.getByText("Flat content")).toBeTruthy();
  });

  it("PairedTitle accepts a paper color for dark surfaces", async () => {
    await render(<PairedTitle first="Review" second="Transactions" color="paper" />);
    expect(StyleSheet.flatten(screen.getByText("Review").props.style).color).toBe(
      colors.paper,
    );
    expect(StyleSheet.flatten(screen.getByText("Transactions").props.style).color).toBe(
      colors.paper,
    );
  });
});

describe("Wave 7 DarkScreenScaffold", () => {
  it("renders ink background with paper title and children", async () => {
    await render(
      <DarkScreenScaffold titleFirst="Review" titleSecond="Transactions" testID="dark">
        <Text color="paper">Dark content</Text>
      </DarkScreenScaffold>,
    );
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Transactions")).toBeTruthy();
    expect(screen.getByText("Dark content")).toBeTruthy();
    const host = screen.getByTestId("dark");
    expect(StyleSheet.flatten(host.props.style).backgroundColor).toBe(colors.ink);
  });
});

describe("Wave 7 FormScaffold", () => {
  it("renders title, subtitle, inputs, and the CTA", async () => {
    const onCta = jest.fn();
    await render(
      <FormScaffold
        titleFirst="Welcome"
        titleSecond="Back"
        subtitle="Sign in to continue."
        ctaTitle="Continue"
        onCta={onCta}
        testID="form"
      >
        <Input label="Email" value="" onChangeText={() => {}} />
      </FormScaffold>,
    );
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.getByText("Sign in to continue.")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByTestId("form-avoider")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("disables the CTA when asked", async () => {
    await render(
      <FormScaffold titleFirst="A" titleSecond="B" ctaTitle="Go" ctaDisabled testID="form-off">
        <Text>Fields</Text>
      </FormScaffold>,
    );
    expect(
      screen.getByRole("button", { name: "Go" }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it("renders inline content when scroll is disabled", async () => {
    await render(
      <FormScaffold titleFirst="A" titleSecond="B" ctaTitle="Go" scroll={false}>
        <Text>Inline fields</Text>
      </FormScaffold>,
    );
    expect(screen.getByText("Inline fields")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
  });
});

describe("Wave 7 PillNav", () => {
  it("renders four labeled items with the active one selected", async () => {
    await render(<PillNav active="home" onNavigate={() => {}} testID="pill" />);
    for (const label of ["Home", "Activity", "Budget", "Insights"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Home" }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(
      screen.getByRole("button", { name: "Budget" }).props.accessibilityState.selected,
    ).toBe(false);
  });

  it("fires onNavigate with the tapped route and moves selection", async () => {
    const onNavigate = jest.fn();
    const view = await render(<PillNav active="home" onNavigate={onNavigate} testID="pill" />);
    await fireEvent.press(screen.getByTestId("pill-activity"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("activity");
    await view.rerender(<PillNav active="activity" onNavigate={onNavigate} testID="pill" />);
    expect(
      screen.getByRole("button", { name: "Activity" }).props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Home" }).props.accessibilityState.selected).toBe(
      false,
    );
  });

  it("gives every item a 44x44 target on both surfaces", async () => {
    const { unmount } = await render(
      <PillNav active="budget" onNavigate={() => {}} testID="pill-light" />,
    );
    const light = StyleSheet.flatten(screen.getByTestId("pill-light-budget").props.style);
    expect(light.width).toBe(44);
    expect(light.height).toBe(44);
    await unmount();
    await render(
      <PillNav active="insights" onNavigate={() => {}} surface="dark" testID="pill-dark" />,
    );
    const dark = StyleSheet.flatten(screen.getByTestId("pill-dark-insights").props.style);
    expect(dark.width).toBe(44);
    expect(dark.height).toBe(44);
    expect(StyleSheet.flatten(screen.getByTestId("pill-dark").props.style).backgroundColor).toBe(
      colors.ink,
    );
  });
});
