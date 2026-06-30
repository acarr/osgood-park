// Water-safety data for the Tide & Water Safety section.
//
// Source: Massachusetts DPH Beach Water Quality dashboard (a Tableau view that
// exposes a CSV download but no clean public API). Marine beaches are tested for
// Enterococci; the state single-sample threshold is 104 cfu/100 mL — at or below
// is acceptable, above triggers an advisory.
//
// Until the periodic live fetch is wired up (see src/pages/api/water.json.ts),
// the endpoint serves the last-known reading below. Update `fallbackReading`
// when you have a newer measurement, or replace it entirely once the automated
// fetch lands.

export type WaterStatus = "safe" | "advisory" | "unknown";

export interface WaterReading {
  /** Beach or waterbody the sample was taken from. */
  beach: string;
  /** Town / general area. */
  area: string;
  /** Enterococci result, in cfu/100 mL. */
  value: number;
  unit: string;
  /** State single-sample marine threshold (cfu/100 mL). */
  threshold: number;
  status: WaterStatus;
  /** ISO date (YYYY-MM-DD) the sample was collected. */
  sampledOn: string;
  /** Where the figure came from: "fallback" (seeded) or "madph" (live). */
  source: "fallback" | "madph";
  /** Public dashboard to link out to. */
  dashboardUrl: string;

  // Optional summary fields, present when the live MA DPH data is available.
  /** Number of Salem beaches with a recent reading. */
  beachesTested?: number;
  /** How many of those met the single-sample standard. */
  beachesPassing?: number;
  /** Beach with the highest (worst) recent reading — the one `value` refers to. */
  highestBeach?: string;
}

export const MA_DPH_DASHBOARD_URL =
  "https://www.mass.gov/info-details/interactive-beach-water-quality-dashboard";

/** Reference URL for the underlying Tableau results table (CSV download lives here). */
export const MA_DPH_RESULTS_TABLE_URL =
  "https://datavisualization.dph.mass.gov/views/BeachWaterQualityDashboard/ResultsTable";

export const MARINE_SINGLE_SAMPLE_THRESHOLD = 104;

export function statusForValue(value: number, threshold = MARINE_SINGLE_SAMPLE_THRESHOLD): WaterStatus {
  if (!Number.isFinite(value)) return "unknown";
  return value <= threshold ? "safe" : "advisory";
}

/**
 * Last-known reading for Salem Sound. Placeholder values — replace with a real
 * recent measurement, or let the automated fetch overwrite this at request time.
 */
export const fallbackReading: WaterReading = {
  beach: "Salem Sound",
  area: "Salem, MA",
  value: 10,
  unit: "cfu/100 mL",
  threshold: MARINE_SINGLE_SAMPLE_THRESHOLD,
  status: "safe",
  sampledOn: "2026-06-29",
  source: "fallback",
  dashboardUrl: MA_DPH_DASHBOARD_URL,
};
