// Places in the app: the web's Google place cards (components/PlaceCard.tsx, PlaceDetailsSheet.tsx)
// and its map picker (components/PlacePicker.tsx), built on the server's Places routes so the
// Google key never reaches the phone. Cards load once per session (lib/places.ts), and only the
// place ID is ever kept (Places terms). A place typed in shows its name and address instead.

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import type { PlaceHit, PlaceInfo } from "@dibs/shared/api";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { searchPlaces } from "@/lib/api";
import { usePlace } from "@/lib/places";
import { useColour } from "@/lib/theme";
import { cn } from "@/utils/cn";

/** "★ 4.5 (1,203) · $$ · Thai restaurant", whatever Google knows. */
export function placeLine(p: Pick<PlaceInfo, "rating" | "ratings" | "price" | "kind"> | null): string | null {
  if (!p) return null;
  const parts = [
    p.rating ? `★ ${p.rating.toFixed(1)}${p.ratings ? ` (${p.ratings.toLocaleString("en-AU")})` : ""}` : null,
    p.price ? "$".repeat(p.price) : null,
    p.kind,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** The place's first Google photo, or a map pin on a soft square while it loads (or for a typed-in place). */
export function PlacePhoto({ place, className, big }: { place: PlaceInfo | null; className?: string; big?: boolean }) {
  return (
    <View className={cn("items-center justify-center overflow-hidden bg-bg-weak-50", className)}>
      {place?.photo ? (
        <Image source={{ uri: place.photo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} accessible={false} />
      ) : (
        <Icon name="map-pin-2-line" className={big ? "text-[32px] leading-[32px] text-primary-base" : "text-[22px] leading-[22px] text-primary-base"} />
      )}
    </View>
  );
}

/** Everything about one place, in a bottom sheet: the web's PlaceDetailsSheet. */
export function PlaceSheet({
  open,
  onOpenChange,
  placeId,
  name,
  address,
  action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string | null;
  name: string;
  address: string | null;
  /** "Vote for this", say. */
  action?: { label: string; onPress: () => void } | null;
}) {
  const place = usePlace(open ? placeId : null);
  const line = placeLine(place);
  const where = place?.address ?? address;
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Body>
          <View className="gap-3">
            {placeId ? <PlacePhoto place={place} className="h-48 w-full rounded-lg" big /> : null}
            {place?.photo?.by ? <Text className="text-paragraph-xs text-text-soft-400">Photo: {place.photo.by}, from Google Maps</Text> : null}
            <View className="gap-1">
              <Text accessibilityRole="header" className="font-display text-title-h4 text-text-strong-950">
                {place?.name ?? name}
              </Text>
              {line ? <Text className="text-paragraph-sm text-text-sub-600">{line}</Text> : null}
              {place?.open_now != null ? (
                <Text className={place.open_now ? "text-label-sm text-success-base" : "text-label-sm text-error-base"}>{place.open_now ? "Open now" : "Closed now"}</Text>
              ) : null}
              {where ? <Text className="text-paragraph-sm text-text-sub-600">{where}</Text> : null}
            </View>
            {placeId && !place ? <ActivityIndicator /> : null}
          </View>
        </Modal.Body>
        <Modal.Footer>
          {action ? (
            <Button.Root size="large" block onPress={action.onPress}>
              {action.label}
            </Button.Root>
          ) : null}
          {place?.maps_url || where ? (
            <Button.Root variant="neutral" mode="stroke" size="large" block onPress={() => Linking.openURL(place?.maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where ?? name)}`)}>
              <Button.Icon name="map-2-line" />
              Open in Google Maps
            </Button.Root>
          ) : null}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

export type PlacePick = { kind: "map"; place: PlaceHit } | { kind: "typed"; name: string; address: string };

/**
 * Find a place: search Google's businesses (through the server), or type one in (someone's
 * place, a spot in a park). The web's PlacePicker, as a bottom sheet.
 */
export function PlacePicker({
  open,
  onOpenChange,
  onPick,
  area,
  title = "Add a place",
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pick: PlacePick) => void;
  /** The plan's area, to search near it. */
  area?: string | null;
  title?: string;
  busy?: boolean;
  error?: string | null;
}) {
  const [typing, setTyping] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const seq = useRef(0);
  const spinner = useColour("primary-base");

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits(null);
      setTyping(false);
      setProblem(null);
    }
  }, [open]);

  // Search as they type, a beat after they stop.
  useEffect(() => {
    if (typing || q.trim().length < 2) {
      setHits(null);
      return;
    }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(q.trim(), { area });
        if (n === seq.current) {
          setHits(found);
          setProblem(null);
        }
      } catch (e) {
        if (n === seq.current) setProblem((e as Error).message);
      } finally {
        if (n === seq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, typing, area]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title={title} description={typing ? "Someone's place, a spot in a park: anything that's not on the map." : area ? `Searching around ${area}.` : "Real places, open now."} />
        <Modal.Body>
          {typing ? (
            <View className="gap-3">
              <View className="gap-1">
                <Label.Root>Place</Label.Root>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Icon name="map-pin-line" />
                    <Input.Input value={name} onChangeText={setName} placeholder="Mr Wong, or Jess's place" maxLength={80} autoFocus />
                  </Input.Wrapper>
                </Input.Root>
                <Text className="text-paragraph-xs text-text-soft-400">Anyone with the link sees the name.</Text>
              </View>
              <View className="gap-1">
                <Label.Root>
                  Address <Text className="text-text-sub-600">(optional)</Text>
                </Label.Root>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input value={address} onChangeText={setAddress} placeholder="3 Bridge Lane, Sydney" maxLength={160} />
                  </Input.Wrapper>
                </Input.Root>
                <Text className="text-paragraph-xs text-text-soft-400">Only people in the plan see this.</Text>
              </View>
            </View>
          ) : (
            <View className="gap-2">
              <Input.Root>
                <Input.Wrapper>
                  <Input.Icon name="search-line" />
                  <Input.Input value={q} onChangeText={setQ} placeholder="Thai, bowling, Bondi Icebergs" autoFocus autoCorrect={false} returnKeyType="search" />
                </Input.Wrapper>
              </Input.Root>
              {searching && !hits ? <ActivityIndicator color={spinner} className="py-4" /> : null}
              {problem ? <Text className="text-paragraph-sm text-text-sub-600">{problem}</Text> : null}
              {hits && hits.length === 0 ? <Text className="py-2 text-paragraph-sm text-text-sub-600">Nothing open by that name. Try another word, or type it in.</Text> : null}
              {hits?.map((h, i) => (
                <Pressable
                  key={h.place_id}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.name}${h.address ? `, ${h.address}` : ""}`}
                  disabled={busy}
                  onPress={() => onPick({ kind: "map", place: h })}
                  className={cn("flex-row items-center gap-3 py-3 active:opacity-70", i > 0 && "border-t border-stroke-soft-200")}
                >
                  <View className="size-10 items-center justify-center rounded-md bg-bg-weak-50">
                    <Icon name="map-pin-2-line" className="text-[20px] leading-[20px] text-primary-base" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text numberOfLines={1} className="text-label-md text-text-strong-950">
                      {h.name}
                    </Text>
                    <Text numberOfLines={1} className="text-paragraph-xs text-text-sub-600">
                      {[h.rating ? `★ ${h.rating.toFixed(1)}` : null, h.kind, h.address].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {hits && hits.length > 0 ? <Text className="text-paragraph-xs text-text-soft-400">From Google Maps</Text> : null}
            </View>
          )}
          {error ? (
            <Hint.Root hasError>
              <Hint.Icon name="error-warning-fill" />
              {error}
            </Hint.Root>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {typing ? (
            <Button.Root size="large" block disabled={busy || !name.trim()} onPress={() => onPick({ kind: "typed", name: name.trim(), address: address.trim() })}>
              {busy ? "Adding…" : "Use this place"}
            </Button.Root>
          ) : null}
          <LinkButton.Root variant="gray" className="self-center" onPress={() => setTyping(!typing)}>
            {typing ? "Search the map instead" : "Not on the map? Type it in"}
          </LinkButton.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
