import type { APIRoute } from "astro";

import {
  STATION_ID,
  STATION_NAME,
  fallbackTides,
  type TideEvent,
  type TidesResponse,
} from "@/data/tides";

// Run on-demand (Vercel function) rather than being prerendered.
export const prerender = false;

interface NoaaPrediction {
  t: string; // local time, "YYYY-MM-DD HH:mm"
  v: string; // height
  type: "H" | "L";
}

// Predictions are deterministic, so we grab a whole week in one call and cache it
// hard at the edge (see Cache-Control below). NOAA's datagetter has intermittent
// 502/504 outages; when it's unreachable we serve the bundled snapshot instead of
// erroring, so the tide card always renders real tides.
const RANGE_HOURS = 168; // 7 days
const APPLICATION = "osgood-park-neighborhood"; // identify ourselves to NOAA
const TIMEOUT_MS = 8000;
const ATTEMPTS = 3;

/** Today's date in the station's local zone (Eastern), as YYYYMMDD / YYYY-MM-DD. */
function easternToday(): { ymd: string; iso: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  return { ymd: `${y}${m}${d}`, iso: `${y}-${m}-${d}` };
}

function buildUrl(beginYmd: string): string {
  const params = new URLSearchParams({
    product: "predictions",
    interval: "hilo",
    datum: "MLLW",
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    begin_date: beginYmd,
    range: String(RANGE_HOURS),
    station: STATION_ID,
    application: APPLICATION,
  });
  return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`;
}

// NOAA occasionally drops or stalls a request; retry a few times with a generous
// timeout and a small backoff so a transient hiccup doesn't surface as an error.
async function fetchPredictions(beginYmd: string): Promise<NoaaPrediction[]> {
  const url = buildUrl(beginYmd);
  let lastErr: unknown;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": APPLICATION },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`NOAA responded ${res.status}`);
      const data = (await res.json()) as {
        predictions?: NoaaPrediction[];
        error?: { message: string };
      };
      if (data.error) throw new Error(data.error.message);
      const predictions = data.predictions ?? [];
      if (predictions.length === 0) throw new Error("NOAA returned no predictions");
      return predictions;
    } catch (err) {
      lastErr = err;
      if (i < ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 750 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Unable to load tide data");
}

function json(body: TidesResponse, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": cacheControl },
  });
}

export const GET: APIRoute = async () => {
  const today = easternToday();

  try {
    const predictions = await fetchPredictions(today.ymd);
    const tides: TideEvent[] = predictions.map((p) => ({
      time: p.t,
      height: Number(p.v),
      type: p.type === "H" ? "high" : "low",
    }));

    return json(
      {
        station: STATION_ID,
        stationName: STATION_NAME,
        tides,
        updatedAt: new Date().toISOString(),
        source: "noaa",
      },
      // Predictions don't change: refresh at the edge ~twice a day and serve stale
      // for a week while revalidating. This keeps NOAA hits to a couple/day/region.
      "public, s-maxage=43200, stale-while-revalidate=604800",
    );
  } catch {
    // NOAA is unreachable — serve the bundled snapshot so the card never blanks.
    // Trim to today onward; the client filters to today and finds the next tide.
    const tides = fallbackTides.filter((t) => t.time.slice(0, 10) >= today.iso);

    return json(
      {
        station: STATION_ID,
        stationName: STATION_NAME,
        tides,
        updatedAt: new Date().toISOString(),
        source: "fallback",
      },
      // Retry the live source sooner while it's down.
      "public, s-maxage=900, stale-while-revalidate=86400",
    );
  }
};
