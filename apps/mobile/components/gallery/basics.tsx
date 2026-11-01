import { View } from "react-native";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import { Section } from "./section";

export function BasicsGallery() {
  return (
    <>
      <Section title="Button">
        <Button.Root size="large" block>
          Make a plan
        </Button.Root>
        <View className="flex-row flex-wrap gap-2">
          <Button.Root>
            <Button.Icon name="add-line" />
            Primary
          </Button.Root>
          <Button.Root mode="stroke">Stroke</Button.Root>
          <Button.Root mode="lighter">Lighter</Button.Root>
          <Button.Root mode="ghost">Ghost</Button.Root>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button.Root variant="neutral">Neutral</Button.Root>
          <Button.Root variant="neutral" mode="stroke">Stroke</Button.Root>
          <Button.Root variant="error" mode="lighter">Remove</Button.Root>
          <Button.Root size="small" variant="neutral" mode="lighter">Small</Button.Root>
          <Button.Root iconOnly variant="neutral" mode="stroke" accessibilityLabel="Share">
            <Button.Icon name="share-line" />
          </Button.Root>
          <Button.Root disabled>Disabled</Button.Root>
        </View>
        <Button.Root variant="dibs" size="large">
          Call dibs
        </Button.Root>
      </Section>

      <Section title="Input">
        <View className="gap-1">
          <Label.Root>
            Plan name <Label.Asterisk />
          </Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon name="sparkling-line" />
              <Input.Input placeholder="Friday dumplings" />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root>
            <Hint.Icon name="information-line" />
            Everyone with the link sees this.
          </Hint.Root>
        </View>
        <View className="gap-1">
          <Label.Root>
            PayID <Label.Sub>(optional)</Label.Sub>
          </Label.Root>
          <Input.Root hasError>
            <Input.Affix>AUD</Input.Affix>
            <Input.Wrapper>
              <Input.Input defaultValue="12.5o" />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root hasError>
            <Hint.Icon name="error-warning-fill" />
            That doesn't look like an amount.
          </Hint.Root>
        </View>
        <Input.Root disabled>
          <Input.Wrapper>
            <Input.Input placeholder="Disabled" />
          </Input.Wrapper>
        </Input.Root>
      </Section>
    </>
  );
}
