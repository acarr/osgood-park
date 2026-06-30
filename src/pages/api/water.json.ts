import type { APIRoute } from "astro";
import { fallbackReading, type WaterReading } from "@/data/water-quality";

// Run on-demand (Vercel function) rather than being prerendered.
export const prerender = false;

/**
 * Return the latest Salem Sound water-safety reading.
 *
 * TODO (water-quality automation): replace the placeholder below with a real
 * periodic fetch of the MA DPH beach data. Approach, in order of preference:
 *   1. A stable CSV/JSON dataset behind the dashboard (MEPHT / EPA BEACON /
 *      data.mass.gov) — most reliable.
 *   2. The Tableau view's CSV export endpoint (the dashboard's "Download CSV").
 *      Reference: see MA_DPH_RESULTS_TABLE_URL in src/data/water-quality.ts
 * Parse, filter to Salem Sound / Salem beaches, take the most recent sample, and
 * map it to a WaterReading. The edge cache below makes this the "periodic grab":
 * the upstream is hit at most ~once every 6 hours.
 *
 * If the inline fetch turns out to be too slow or unreliable, move it to a Vercel
 * Cron (vercel.json crons -> /api/cron/refresh-water) that writes the parsed
 * reading to Vercel Blob/KV, and read that here instead.
 */
async function fetchLatestReading(): Promise<WaterReading> {
  // Not yet wired to the live source — serve the seeded last-known reading.
  return fallbackReading;
}

export const GET: APIRoute = async () => {
  try {
    const reading = await fetchLatestReading();
    return new Response(JSON.stringify(reading), {
      headers: {
        "Content-Type": "application/json",
        // ~6h refresh at the edge; serve stale for a day while revalidating.
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(JSON.stringify(fallbackReading), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300",
      },
    });
  }
};
