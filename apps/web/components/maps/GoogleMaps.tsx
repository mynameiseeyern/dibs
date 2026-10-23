"use client";

import { createContext, useContext } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

/** Browser key: Maps JavaScript API and Places UI Kit, restricted to our domains. */
export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Advanced markers need a map ID. Google's demo ID works until a real one is set.
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

const Loaded = createContext(false);

/**
 * Loads Google's Maps JavaScript API for everything inside it. Nest freely: only the outermost
 * one loads, so the script is set up once with one set of options.
 */
export function GoogleMaps({ children }: { children: React.ReactNode }) {
  const inside = useContext(Loaded);
  if (!MAPS_KEY || inside) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_KEY} region="AU" language="en-AU">
      <Loaded.Provider value>{children}</Loaded.Provider>
    </APIProvider>
  );
}

/** True inside a GoogleMaps with a key, so Google's elements can be used. */
export const useGoogleMapsReady = () => useContext(Loaded);

/** Google place IDs only: not typed-in places (no ID) or the made-up places in local demo mode. */
export const isGooglePlaceId = (id: string | null | undefined): id is string => Boolean(id && !id.startsWith("demo:"));
