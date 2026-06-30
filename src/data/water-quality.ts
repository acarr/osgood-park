// Water-safety data for the Tide & Water Safety section, focused on our beach:
// Osgood, in Salem.
//
// Source: Massachusetts DPH "Beach Water Quality Dashboard" (Tableau). Marine
// beaches are tested for Enterococci; the state single-sample standard is
// 104 cfu/100 mL — at or below is within the standard, above is an exceedance.
// Separately, DPH publishes a list of currently-closed beaches with a reason.
//
// The live fetch lives in src/lib/water-quality-source.ts. When it can't reach
// the dashboard, the API serves `fallbackReading` below so the section never
// errors — update it if you have a newer reading on hand.

export type WaterStatus = "open" | "closed" | "unknown";

export interface WaterSample {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Enterococci result, cfu/100 mL. */
  result: number;
}

export interface WaterReading {
  beach: string;
  town: string;
  unit: string;
  /** State single-sample marine standard (cfu/100 mL). */
  threshold: number;
  /** Most recent sample, or null if none found. */
  latest: WaterSample | null;
  /** Recent samples, most-recent first. */
  history: WaterSample[];
  /** Whether the latest result is at or below the standard (null if no reading). */
  withinStandard: boolean | null;
  /** Closure status from the DPH closures list. */
  status: WaterStatus;
  /** Reason text when closed (e.g. "Bacterial Exceedance"), else null. */
  closureReason: string | null;
  /** Where the data came from: "fallback" (seeded) or "madph" (live). */
  source: "fallback" | "madph";
  /** Public dashboard to link out to. */
  dashboardUrl: string;
}

export const BEACH_NAME = "Osgood";
export const TOWN = "Salem";

export const MARINE_SINGLE_SAMPLE_THRESHOLD = 104;

export const MA_DPH_DASHBOARD_URL =
  "https://www.mass.gov/info-details/interactive-beach-water-quality-dashboard";

/** Reference URL for the underlying Tableau results table. */
export const MA_DPH_RESULTS_TABLE_URL =
  "https://datavisualization.dph.mass.gov/views/BeachWaterQualityDashboard/ResultsTable";

/** Last-known reading for Osgood. Replace if the live fetch is unavailable. */
export const fallbackReading: WaterReading = {
  beach: BEACH_NAME,
  town: TOWN,
  unit: "cfu/100 mL",
  threshold: MARINE_SINGLE_SAMPLE_THRESHOLD,
  latest: { date: "2026-06-22", result: 10 },
  history: [
    { date: "2026-06-22", result: 10 },
    { date: "2026-06-15", result: 5 },
    { date: "2026-06-08", result: 41 },
  ],
  withinStandard: true,
  status: "open",
  closureReason: null,
  source: "fallback",
  dashboardUrl: MA_DPH_DASHBOARD_URL,
};
