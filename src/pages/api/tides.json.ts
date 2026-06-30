import type { APIRoute } from "astro";

// Run on-demand (Vercel function) rather than being prerendered.
export const prerender = false;

// NOAA CO-OPS station "Salem, Salem Harbor".
const STATION_ID = "8442645";
const STATION_NAME = "Salem, Salem Harbor";

interface NoaaPrediction {
  t: string; // local time, "YYYY-MM-DD HH:mm"
  v: string; // height
  type: "H" | "L";
}

export interface TideEvent {
  /** Local (station) time, "YYYY-MM-DD HH:mm". */
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
}

// Fetch high/low predictions server-side to avoid browser CORS uncertainty and
// keep NOAA usage off the client. Times come back in the station's local zone
// (time_zone=lst_ldt), so the client can compare against Eastern wall-clock.
const noaaUrl =
  `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
  `?product=predictions&interval=hilo&datum=MLLW&units=english` +
  `&time_zone=lst_ldt&format=json&date=today&station=${STATION_ID}`;

// NOAA occasionally drops a request; retry a couple of times with a timeout so a
// transient hiccup doesn't surface as an error to the visitor.
async function fetchPredictions(attempts = 3): Promise<NoaaPrediction[]> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(noaaUrl, {
        headers: { "User-Agent": "osgood-park-neighborhood-association" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`NOAA responded ${res.status}`);
      const data = (await res.json()) as {
        predictions?: NoaaPrediction[];
        error?: { message: string };
      };
      if (data.error) throw new Error(data.error.message);
      return data.predictions ?? [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Unable to load tide data");
}

export const GET: APIRoute = async () => {
  try {
    const predictions = await fetchPredictions();

    const tides: TideEvent[] = predictions.map((p) => ({
      time: p.t,
      height: Number(p.v),
      type: p.type === "H" ? "high" : "low",
    }));

    const body: TidesResponse = {
      station: STATION_ID,
      stationName: STATION_NAME,
      tides,
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        // Refresh hourly at the edge; serve stale for a day while revalidating.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        station: STATION_ID,
        stationName: STATION_NAME,
        tides: [],
        error: err instanceof Error ? err.message : "Unable to load tide data",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300",
        },
      },
    );
  }
};
