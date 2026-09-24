import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Chip } from "../../src/components/Chip";
import { Divider } from "../../src/components/Divider";
import { IconButton } from "../../src/components/IconButton";
import { Input } from "../../src/components/Input";
import { PairedTitle } from "../../src/components/PairedTitle";
import { SectionHeader } from "../../src/components/SectionHeader";
import { Skeleton } from "../../src/components/Skeleton";
import { Text } from "../../src/components/Text";
import { spacing } from "../../src/theme/spacing";

// Dev-only primitive catalog. Not linked from any user-facing screen.
// Visible only when the app is not production, or when the
// EXPO_PUBLIC_ENABLE_DEV_ROUTES flag is set. Report the flag name to the
// operator: EXPO_PUBLIC_ENABLE_DEV_ROUTES.
const DEV_ROUTES_ENABLED =
  process.env.EXPO_PUBLIC_APP_ENV !== "production" ||
  process.env.EXPO_PUBLIC_ENABLE_DEV_ROUTES === "true";

export default function PrimitivesGallery() {
  const [chipOn, setChipOn] = useState(false);
  const [name, setName] = useState("Ada");

  if (!DEV_ROUTES_ENABLED) {
    return (
      <View>
        <Text>Not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={{ padding: spacing.lg }}>
        <PairedTitle first="Primitive" second="Gallery" />
        <Divider />

        <SectionHeader title="Text roles" />
        <Text role="displayXl">Display XL</Text>
        <Text role="display">Display</Text>
        <Text role="h1">Heading 1</Text>
        <Text role="h2">Heading 2</Text>
        <Text role="h3">Heading 3</Text>
        <Text role="body">Body text for paragraphs and list content.</Text>
        <Text role="small">Small label text.</Text>
        <Text role="mono">₦1,234.00 tabular</Text>
        <Divider />

        <SectionHeader title="Buttons" />
        <Button title="Primary" onPress={() => {}} testID="gallery-btn-primary" />
        <Button
          title="Secondary"
          variant="secondary"
          onPress={() => {}}
          testID="gallery-btn-secondary"
        />
        <Button title="Ghost" variant="ghost" onPress={() => {}} testID="gallery-btn-ghost" />
        <Button title="Disabled" onPress={() => {}} disabled testID="gallery-btn-disabled" />
        <Button
          title="Trailing icon"
          onPress={() => {}}
          trailingIcon={<Text role="small">→</Text>}
          testID="gallery-btn-icon"
        />
        <Divider />

        <SectionHeader title="Icon buttons" />
        <IconButton accessibilityLabel="Back" onPress={() => {}} testID="gallery-icon-light">
          <Text role="body">←</Text>
        </IconButton>
        <Card variant="ink">
          <IconButton
            accessibilityLabel="Menu on dark"
            onPress={() => {}}
            tone="dark"
            testID="gallery-icon-dark"
          >
            <Text role="body" color="paper">
              ☰
            </Text>
          </IconButton>
        </Card>
        <Divider />

        <SectionHeader title="Inputs" />
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Adaeze"
          testID="gallery-input"
        />
        <Input
          label="Amount with error"
          value=""
          onChangeText={() => {}}
          error="Enter a valid non-negative amount."
          testID="gallery-input-error"
        />
        <Divider />

        <SectionHeader title="Chips" />
        <Chip label="All" testID="gallery-chip" />
        <Chip
          label="Toggle me"
          selected={chipOn}
          onPress={() => setChipOn((v) => !v)}
          testID="gallery-chip-toggle"
        />
        <Card variant="ink">
          <Chip label="Dark chip" tone="dark" testID="gallery-chip-dark" />
        </Card>
        <Divider />

        <SectionHeader title="Cards" actionLabel="See all" onAction={() => {}} />
        <Card variant="paper" testID="gallery-card-paper">
          <Text role="body">Paper card</Text>
        </Card>
        <Card variant="yellow" testID="gallery-card-yellow">
          <Text role="body">Yellow card</Text>
        </Card>
        <Card variant="ink" testID="gallery-card-ink">
          <Text role="body" color="paper">
            Ink card
          </Text>
        </Card>
        <Card variant="mist" testID="gallery-card-mist">
          <Text role="body">Mist card</Text>
        </Card>
        <Card variant="mint" testID="gallery-card-mint">
          <Text role="body">Mint card</Text>
        </Card>
        <Card variant="coral" testID="gallery-card-coral">
          <Text role="body">Coral card</Text>
        </Card>
        <Card variant="paper" compact testID="gallery-card-compact">
          <Text role="body">Compact card</Text>
        </Card>
        <Divider />

        <SectionHeader title="Skeleton" />
        <Skeleton testID="gallery-skeleton" />
        <Skeleton height={64} radiusName="compact" testID="gallery-skeleton-tall" />
      </View>
    </ScrollView>
  );
}
