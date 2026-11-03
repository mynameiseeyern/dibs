import { Text, View } from "react-native";
import * as Alert from "@/components/ui/alert";
import * as Avatar from "@/components/ui/avatar";
import * as AvatarGroup from "@/components/ui/avatar-group";
import * as Badge from "@/components/ui/badge";
import * as Button from "@/components/ui/button";
import * as CompactButton from "@/components/ui/compact-button";
import * as Divider from "@/components/ui/divider";
import * as LinkButton from "@/components/ui/link-button";
import * as ProgressBar from "@/components/ui/progress-bar";
import * as ProgressCircle from "@/components/ui/progress-circle";
import * as Tag from "@/components/ui/tag";
import { toast } from "@/components/ui/toast";
import { Section } from "./section";

const CREW = ["violet", "lime", "sun", "mint", "tangerine", "sky", "coral", "rose", "aqua", "ivory"] as const;

export function FeedbackGallery() {
  return (
    <>
      <Section title="Alert">
        <Alert.Root status="success">
          <Alert.Icon name="mail-check-fill" />
          <Alert.Content>
            <Alert.Title>Check your email</Alert.Title>
            Tap the link we sent you, on any device. Your plans will be waiting.
          </Alert.Content>
        </Alert.Root>
        <Alert.Root status="information">
          <Alert.Icon name="lock-2-fill" />
          <Alert.Content>
            <Alert.Title>Bills are just for people who came</Alert.Title>
            If you were there, ask the organiser to tick you in.
          </Alert.Content>
        </Alert.Root>
        <Alert.Root status="warning" size="small">
          <Alert.Icon />
          <Alert.Content>Voting closes in an hour.</Alert.Content>
        </Alert.Root>
        <Alert.Root status="error" variant="stroke">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Title>That didn't save</Alert.Title>
            Check your connection and try again.
          </Alert.Content>
          <Alert.CloseIcon />
        </Alert.Root>
      </Section>

      <Section title="Toast">
        <View className="flex-row flex-wrap gap-2">
          <Button.Root variant="neutral" mode="lighter" onPress={() => toast.success("Link copied")}>
            Success
          </Button.Root>
          <Button.Root variant="neutral" mode="lighter" onPress={() => toast.error("That didn't save", { description: "Check your connection and try again.", retry: () => toast.success("Saved") })}>
            Error
          </Button.Root>
          <Button.Root variant="neutral" mode="lighter" onPress={() => toast("Dibby's on it")}>
            Info
          </Button.Root>
        </View>
      </Section>

      <Section title="Badge">
        <View className="flex-row flex-wrap gap-2">
          <Badge.Root>Primary</Badge.Root>
          <Badge.Root color="accent">Dibby</Badge.Root>
          <Badge.Root color="success">
            <Badge.Icon name="lock-2-line" />
            Locked in
          </Badge.Root>
          <Badge.Root color="warning" variant="light">
            <Badge.Dot />
            Voting
          </Badge.Root>
          <Badge.Root color="error" variant="filled">
            Called off
          </Badge.Root>
          <Badge.Root color="information" variant="stroke">
            Stroke
          </Badge.Root>
          <Badge.Root size="small" square color="primary" variant="filled">
            3
          </Badge.Root>
          <Badge.Root disabled>Disabled</Badge.Root>
        </View>
      </Section>

      <Section title="Tag">
        <View className="flex-row flex-wrap gap-2">
          <Tag.Root>Surry Hills</Tag.Root>
          <Tag.Root variant="gray">Under $30</Tag.Root>
          <Tag.Root>
            <Tag.Icon name="restaurant-line" />
            Dumplings
            <Tag.DismissButton />
          </Tag.Root>
          <Tag.Root disabled>Disabled</Tag.Root>
        </View>
      </Section>

      <Section title="Divider">
        <Divider.Root />
        <Divider.Root variant="line-text">or</Divider.Root>
        <Divider.Root variant="solid-text">This week</Divider.Root>
      </Section>

      <Section title="Link button and compact button">
        <View className="flex-row flex-wrap items-center gap-4">
          <LinkButton.Root variant="primary">
            See who's in
            <LinkButton.Icon name="arrow-right-s-line" />
          </LinkButton.Root>
          <LinkButton.Root variant="black" underline>
            Edit
          </LinkButton.Root>
          <LinkButton.Root variant="error" size="small">
            Leave plan
          </LinkButton.Root>
          <LinkButton.Root disabled>Disabled</LinkButton.Root>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <CompactButton.Root accessibilityLabel="More">
            <CompactButton.Icon name="more-2-line" />
          </CompactButton.Root>
          <CompactButton.Root variant="ghost" accessibilityLabel="Close">
            <CompactButton.Icon name="close-line" />
          </CompactButton.Root>
          <CompactButton.Root variant="white" size="medium" accessibilityLabel="Share">
            <CompactButton.Icon name="share-line" />
          </CompactButton.Root>
          <CompactButton.Root size="medium" fullRadius={false} accessibilityLabel="Edit">
            <CompactButton.Icon name="pencil-line" />
          </CompactButton.Root>
          <CompactButton.Root disabled accessibilityLabel="Disabled">
            <CompactButton.Icon name="delete-bin-line" />
          </CompactButton.Root>
        </View>
      </Section>

      <Section title="Avatar">
        <View className="flex-row flex-wrap gap-2">
          {CREW.map((c, i) => (
            <Avatar.Root key={c} color={c} size="40" name={["Priya Shah", "Jun", "Ava Li", "Mo", "Tash K", "Sam", "Bea", "Ruby O", "Kai", "Ivy N"][i]} />
          ))}
        </View>
        <View className="flex-row items-end gap-3">
          <Avatar.Root size="72" color="violet" name="Ee Ng" />
          <Avatar.Root size="56" color="lime" name="Darcy">
            <Avatar.Indicator>
              <Avatar.Status status="online" />
            </Avatar.Indicator>
          </Avatar.Root>
          <Avatar.Root size="48" color="gray" />
          <Avatar.Root size="32" color="mint" name="Jo" />
          <Avatar.Root size="24" color="sky" name="Al" />
        </View>
        <AvatarGroup.Root size="32">
          <Avatar.Root color="violet" name="Priya Shah" />
          <Avatar.Root color="mint" name="Jun" />
          <Avatar.Root color="sun" name="Ava Li" />
          <Avatar.Root color="coral" name="Mo" />
          <AvatarGroup.Overflow>+3</AvatarGroup.Overflow>
        </AvatarGroup.Root>
      </Section>

      <Section title="Progress">
        <View className="gap-1">
          <Text className="text-label-xs text-text-sub-600">4 of 6 voted</Text>
          <ProgressBar.Root value={66} accessibilityLabel="Voted" />
        </View>
        <View className="gap-1">
          <Text className="text-label-xs text-text-sub-600">All settled</Text>
          <ProgressBar.Root value={6} max={6} color="accent" accessibilityLabel="Settled" />
        </View>
        <ProgressBar.Root value={30} color="success" />
        <View className="flex-row items-center gap-4">
          <ProgressCircle.Root value={66} size="56">
            4/6
          </ProgressCircle.Root>
          <ProgressCircle.Root value={100} size="48" />
          <ProgressCircle.Root value={25} size="80">
            25%
          </ProgressCircle.Root>
        </View>
      </Section>
    </>
  );
}
