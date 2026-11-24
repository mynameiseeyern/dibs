// Places in the app: the web's Google place cards (components/PlaceCard.tsx, PlaceDetailsSheet.tsx)
// and its map picker (components/PlacePicker.tsx), built on the server's Places routes so the
// Google key never reaches the phone. Cards load once per session (lib/places.ts), and only the
// place ID is ever kept (Places terms). A place typed in shows its name and address instead.

import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
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

/**
 * Everything about one place, in a bottom sheet: the web's PlaceDetailsSheet, which shows Google's
 * panel (photos, rating, type, price, address, hours, website, phone, summary, reviews). The app
 * can't use Google's panel, so the server fetches the same things (`?full=1`), only once the
 * sheet's open since each load is billed. Nothing but the place ID is stored.
 */
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
  const place = usePlace(open ? placeId : null, true);
  const line = placeLine(place);
  const where = place?.address ?? address;
  const { height } = useWindowDimensions();
  const photos = place?.photos?.length ? place.photos : place?.photo ? [place.photo] : [];
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title={place?.name ?? name} />
        <ScrollView style={{ maxHeight: height * 0.62 }} contentContainerClassName="gap-4" showsVerticalScrollIndicator={false}>
          {placeId ? <Gallery photos={photos} loading={!place} /> : null}
          <View className="gap-1">
            {line ? <Text className="text-paragraph-sm text-text-sub-600">{line}</Text> : null}
            {place?.open_now != null ? (
              <Text className={place.open_now ? "text-label-sm text-success-base" : "text-label-sm text-error-base"}>{place.open_now ? "Open now" : "Closed now"}</Text>
            ) : null}
            {where ? <Text className="text-paragraph-sm text-text-sub-600">{where}</Text> : null}
          </View>
          {placeId && !place ? <ActivityIndicator /> : null}
          {place?.hours?.length ? <Hours lines={place.hours} /> : null}
          {place?.website ? <Row icon="global-line" label={place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} onPress={() => Linking.openURL(place.website!)} /> : null}
          {place?.phone ? <Row icon="phone-line" label={place.phone} onPress={() => Linking.openURL(`tel:${place.phone!.replace(/\s/g, "")}`)} /> : null}
          {place?.summary ? <Text className="text-paragraph-md text-text-strong-950">{place.summary}</Text> : null}
          {place?.reviews?.length ? (
            <View className="gap-3">
              <Text className="text-label-md text-text-strong-950">Reviews</Text>
              {place.reviews.map((r, i) => (
                <View key={i} className="gap-1 border-t border-stroke-soft-200 pt-3">
                  <Text className="text-label-sm text-text-strong-950">{r.author}</Text>
                  <Text className="text-paragraph-xs text-text-sub-600">
                    {[r.rating ? `${"★".repeat(Math.round(r.rating))}${"☆".repeat(5 - Math.round(r.rating))}` : null, r.when].filter(Boolean).join(" · ")}
                  </Text>
                  <Text numberOfLines={6} className="text-paragraph-sm text-text-strong-950">
                    {r.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {place ? <Text className="text-paragraph-xs text-text-soft-400">From Google Maps</Text> : null}
        </ScrollView>
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

/** Google's photos, swiped sideways with the next one peeking in, and who took the one you're on. */
function Gallery({ photos, loading }: { photos: { uri: string; by: string | null }[]; loading: boolean }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 32, 560) - (photos.length > 1 ? 40 : 0);
  const [at, setAt] = useState(0);
  if (!photos.length)
    return (
      <View className="h-48 w-full items-center justify-center rounded-lg bg-bg-weak-50">
        {loading ? <ActivityIndicator /> : <Icon name="map-pin-2-line" className="text-[32px] leading-[32px] text-primary-base" />}
      </View>
    );
  return (
    <View className="gap-1.5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={w + 8}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 8 }}
        onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / (w + 8)))}
      >
        {photos.map((p, i) => (
          <Image
            key={p.uri}
            source={{ uri: p.uri }}
            style={{ width: w, height: 220, borderRadius: 12 }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo ${i + 1} of ${photos.length}`}
          />
        ))}
      </ScrollView>
      <Text className="text-paragraph-xs text-text-soft-400">
        {photos.length > 1 ? `${Math.min(at, photos.length - 1) + 1} of ${photos.length}` : ""}
        {photos.length > 1 && photos[at]?.by ? " · " : ""}
        {photos[Math.min(at, photos.length - 1)]?.by ? `Photo: ${photos[Math.min(at, photos.length - 1)]!.by}` : ""}
      </Text>
    </View>
  );
}

/** Opening hours: today's line, tap for the week (Google's panel does the same). */
function Hours({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  // Google's lines start Monday; JS days start Sunday.
  const today = lines[(new Date().getDay() + 6) % 7] ?? lines[0];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} className="flex-row gap-3 active:opacity-70">
      <Icon name="time-line" className="text-[20px] leading-[20px] text-text-sub-600" />
      <View className="flex-1 gap-0.5">
        {(open ? lines : [today]).map((l) => (
          <Text key={l} className={l === today ? "text-paragraph-sm text-text-strong-950" : "text-paragraph-sm text-text-sub-600"}>
            {l}
          </Text>
        ))}
      </View>
      <Icon name={open ? "arrow-up-s-line" : "arrow-down-s-line"} className="text-[20px] leading-[20px] text-text-sub-600" />
    </Pressable>
  );
}

function Row({ icon, label, onPress }: { icon: "global-line" | "phone-line"; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} className="min-h-11 flex-row items-center gap-3 active:opacity-70">
      <Icon name={icon} className="text-[20px] leading-[20px] text-text-sub-600" />
      <Text numberOfLines={1} className="flex-1 text-paragraph-md text-primary-dark">
        {label}
      </Text>
    </Pressable>
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
  const search = useRef<ComponentRef<typeof TextInput>>(null);

  // Focus the search once the sheet has slid up (SheetFrame takes 250ms), not as it mounts: the
  // keyboard arriving first meant the sheet missed it and sat hidden behind the keyboard, leaving
  // just the dimmed page until something made it measure again (TestFlight, Nov 2026).
  useEffect(() => {
    if (!open || typing) return;
    const t = setTimeout(() => search.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [open, typing]);

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
                  <Input.Input ref={search} value={q} onChangeText={setQ} placeholder="Thai, bowling, Bondi Icebergs" autoCorrect={false} returnKeyType="search" />
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
