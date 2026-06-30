// Regenerate the bundled tide-prediction snapshot from NOAA.
//
// Tide predictions are deterministic, so this fetches the next 7 days of high/low
// predictions for station 8442645 once and writes them to
// src/data/tide-predictions.json. The API route (src/pages/api/tides.json.ts)
// serves that snapshot whenever the live NOAA call fails, so the tide card never
// blanks during NOAA's intermittent datagetter outages.
//
// Wired to the `prebuild` npm script so every deploy rolls the window forward.
// Run by hand with `pnpm generate:tides`.
//
// If NOAA is unreachable, the existing snapshot is left untouched and the script
// exits 0 so a deploy never breaks just because NOAA is down at build time.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const STATION_ID = "8442645";
const RANGE_HOURS = 168; // 7 days
const APPLICATION = "osgood-park-neighborhood";
const TIMEOUT_MS = 8000;
const ATTEMPTS = 4;

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "tide-predictions.json",
);

/** Today's date in the station's local zone (Eastern) as YYYYMMDD. */
function easternYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function buildUrl() {
  const params = new URLSearchParams({
    product: "predictions",
    interval: "hilo",
    datum: "MLLW",
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    begin_date: easternYmd(),
    range: String(RANGE_HOURS),
    station: STATION_ID,
    application: APPLICATION,
  });
  return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`;
}

async function fetchPredictions() {
  const url = buildUrl();
  let lastErr;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": APPLICATION },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`NOAA responded ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const predictions = data.predictions ?? [];
      if (predictions.length === 0) throw new Error("NOAA returned no predictions");
      return predictions;
    } catch (err) {
      lastErr = err;
      if (i < ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Unable to reach NOAA");
}

async function main() {
  let predictions;
  try {
    predictions = await fetchPredictions();
  } catch (err) {
    console.warn(
      `[generate-tides] NOAA unreachable (${err.message}); keeping existing snapshot.`,
    );
    // Make sure a valid file at least exists so the build can import it.
    try {
      await readFile(OUT_PATH, "utf8");
    } catch {
      await writeFile(
        OUT_PATH,
        JSON.stringify({ generatedAt: null, station: STATION_ID, tides: [] }, null, 2) + "\n",
      );
      console.warn("[generate-tides] wrote empty placeholder snapshot.");
    }
    return; // exit 0
  }

  const tides = predictions.map((p) => ({
    time: p.t,
    height: Number(p.v),
    type: p.type === "H" ? "high" : "low",
  }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    station: STATION_ID,
    tides,
  };

  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(
    `[generate-tides] wrote ${tides.length} predictions (${tides[0]?.time} … ${tides[tides.length - 1]?.time}).`,
  );
}

main().catch((err) => {
  // Never fail the build on a snapshot-refresh error.
  console.warn(`[generate-tides] unexpected error: ${err?.message ?? err}`);
});
