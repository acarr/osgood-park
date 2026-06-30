// Tide data for the Tide & Water Safety section.
//
// Source: NOAA CO-OPS station 8442645 (Salem, Salem Harbor). We request high/low
// tide predictions (product=predictions, interval=hilo, datum=MLLW). Predictions
// are astronomical and deterministic, so a snapshot of the next several days is
// exactly as accurate as a live call — which is why we can cache it hard.
//
// The live fetch lives in src/pages/api/tides.json.ts. When NOAA is slow or down
// (its datagetter endpoint has intermittent 502/504 outages), the API serves the
// bundled `fallbackTides` snapshot below so the section never shows an error.
//
// The snapshot in tide-predictions.json is regenerated on every deploy by
// scripts/generate-tides.mjs (wired to the `prebuild` npm script), which rolls
// the window forward. Run `pnpm generate:tides` to refresh it by hand.

import snapshot from "./tide-predictions.json";

// NOAA CO-OPS station "Salem, Salem Harbor".
export const STATION_ID = "8442645";
export const STATION_NAME = "Salem, Salem Harbor";

/** Public NOAA station page to link out to. */
export const NOAA_STATION_URL =
  "https://tidesandcurrents.noaa.gov/stationhome.html?id=8442645";

export interface TideEvent {
  /** Local (station) time, "YYYY-MM-DD HH:mm". Station zone is Eastern (lst_ldt). */
  time: string;
  /** Predicted height in feet (MLLW datum). */
  height: number;
  type: "high" | "low";
}

export interface TidesResponse {
  station: string;
  stationName: string;
  tides: TideEvent[];
  updatedAt: string;
  /** Where the data came from: live NOAA call, or the bundled snapshot. */
  source: "noaa" | "fallback";
}

interface TideSnapshot {
  /** ISO timestamp the snapshot was generated, or null if never populated. */
  generatedAt: string | null;
  station: string;
  tides: TideEvent[];
}

const data = snapshot as TideSnapshot;

/** Bundled hilo-prediction snapshot; served when the live NOAA fetch fails. */
export const fallbackTides: TideEvent[] = data.tides;
export const fallbackGeneratedAt: string | null = data.generatedAt;
