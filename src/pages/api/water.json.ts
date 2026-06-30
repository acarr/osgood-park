import type { APIRoute } from "astro";

import { fallbackReading } from "@/data/water-quality";
import { fetchSalemWaterReading } from "@/lib/water-quality-source";

// Run on-demand (Vercel function) rather than being prerendered.
export const prerender = false;

// Pull the latest Salem reading live from the MA DPH dashboard (see
// src/lib/water-quality-source.ts). The edge cache below is the "periodic grab":
// the upstream is hit at most ~once every 6 hours; everything else is served from
// cache. Any fetch failure falls back to the seeded last-known reading, so the
// section always renders something sensible.
//
// If the live scrape proves unreliable over time, move fetchSalemWaterReading()
// into a Vercel Cron that writes the result to Vercel Blob/KV, and read that here.
export const GET: APIRoute = async () => {
  const reading = (await fetchSalemWaterReading()) ?? fallbackReading;
  const live = reading.source === "madph";

  return new Response(JSON.stringify(reading), {
    headers: {
      "Content-Type": "application/json",
      // Live data: ~6h refresh. Fallback: retry sooner in case the source recovers.
      "Cache-Control": live
        ? "public, s-maxage=21600, stale-while-revalidate=86400"
        : "public, s-maxage=900, stale-while-revalidate=86400",
    },
  });
};
