// Live fetch of Osgood beach (Salem) water-quality data from the MA DPH "Beach
// Water Quality Dashboard" (a Tableau Server view).
//
// Two pieces of data, from two views of the same workbook:
//   - Results: the Town = Salem results table → filter locally to "Osgood" for
//     its recent Enterococci readings.
//   - Closures: the closures table renders the full statewide closure list in
//     its bootstrap (no filter needed) → check whether Osgood appears.
//
// The dashboard disables underlying-data export, so we replicate the browser:
// open the embedded view, bootstrap a viz session, (for results) apply the
// Town = Salem filter, and reconstruct the rendered table from Tableau's
// dataSegments + paneColumnsData. Everything is wrapped so ANY failure resolves
// to null and the caller falls back to the seeded reading.
//
// These identifiers are specific to the current published workbook; if MA DPH
// republishes the dashboard they may change and the live fetch fails gracefully.

import {
  BEACH_NAME,
  MARINE_SINGLE_SAMPLE_THRESHOLD,
  MA_DPH_DASHBOARD_URL,
  TOWN,
  type WaterReading,
  type WaterSample,
} from "@/data/water-quality";

const HOST = "https://datavisualization.dph.mass.gov";
const TOWN_FIELD = "[sqlproxy.0uo8mb00mz07te10p3y9b04vxr9k].[none:Town:nk]";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function htmlUnescape(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function deepFind(obj: any, key: string, hits: any[] = []): any[] {
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (k === key) hits.push(obj[k]);
      deepFind(obj[k], key, hits);
    }
  }
  return hits;
}

// Bootstrap responses are length-prefixed "<len>;<json>" records; command
// responses are a single JSON object. Handle both.
function parseRecords(text: string): any[] {
  try {
    return [JSON.parse(text)];
  } catch {}
  const out: any[] = [];
  let i = 0;
  while (i < text.length) {
    const semi = text.indexOf(";", i);
    if (semi < 0) break;
    const len = parseInt(text.slice(i, semi), 10);
    if (!Number.isFinite(len)) break;
    try {
      out.push(JSON.parse(text.slice(semi + 1, semi + 1 + len)));
    } catch {
      break;
    }
    i = semi + 1 + len;
  }
  return out;
}

// Reconstruct table rows from one or more parsed Tableau records, picking the
// pane whose column captions satisfy `wantCaption`.
function reconstructRows(
  records: any[],
  wantCaption: (caps: string[]) => boolean,
): Record<string, any>[] {
  const byType: Record<string, any[]> = {};
  for (const rec of records) {
    for (const ds of deepFind(rec, "dataSegments")) {
      for (const segKey of Object.keys(ds)) {
        const cols = ds[segKey]?.dataColumns;
        if (!Array.isArray(cols)) continue;
        for (const c of cols) byType[c.dataType] = (byType[c.dataType] || []).concat(c.dataValues);
      }
    }
  }

  let pane: any = null;
  for (const rec of records) {
    for (const p of deepFind(rec, "paneColumnsData")) {
      const caps = (p?.vizDataColumns || []).map((c: any) => c.fieldCaption).filter(Boolean);
      if (caps.length && wantCaption(caps)) {
        pane = p;
        break;
      }
    }
    if (pane) break;
  }
  if (!pane) return [];

  const valuesFor = (c: any): any[] => {
    const paneIdx = c.paneIndices?.[0] ?? 0;
    const colIdx = c.columnIndices?.[0] ?? 0;
    const vpc = pane.paneColumnsList?.[paneIdx]?.vizPaneColumns?.[colIdx];
    if (!vpc) return [];
    const indices = vpc.valueIndices?.length ? vpc.valueIndices : vpc.aliasIndices;
    const pool = byType[c.dataType] || [];
    return (indices || []).map((ix: number) => (ix < 0 ? pool[Math.abs(ix) - 1] : pool[ix]));
  };

  const columns: Record<string, any[]> = {};
  for (const c of pane.vizDataColumns) if (c.fieldCaption) columns[c.fieldCaption] = valuesFor(c);

  const n = Math.max(0, ...Object.values(columns).map((v) => v.length));
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < n; i++) {
    const row: Record<string, any> = {};
    for (const k of Object.keys(columns)) row[k] = columns[k][i];
    rows.push(row);
  }
  return rows;
}

const commonHeaders = (referer: string) => ({
  "User-Agent": UA,
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "text/javascript",
  "X-Requested-With": "XMLHttpRequest",
  Referer: referer,
});

class Jar {
  private map = new Map<string, string>();
  absorb(res: Response) {
    const getter = (res.headers as any).getSetCookie;
    const sc: string[] = typeof getter === "function" ? getter.call(res.headers) : [];
    for (const c of sc) {
      const pair = c.split(";")[0];
      const i = pair.indexOf("=");
      if (i > 0) this.map.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() {
    return [...this.map].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function openSession(viewPath: string, signal: AbortSignal) {
  const view = `${HOST}/views/BeachWaterQualityDashboard/${viewPath}`;
  const jar = new Jar();
  const r1 = await fetch(`${view}?:embed=y&:showVizHome=no&:apiID=host0`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal,
  });
  jar.absorb(r1);
  const html = await r1.text();
  const m = html.match(/id="tsConfigContainer">([\s\S]*?)<\/textarea>/);
  if (!m) throw new Error("no tsConfigContainer");
  const cfg = JSON.parse(htmlUnescape(m[1]));

  const r2 = await fetch(`${HOST}${cfg.vizql_root}/bootstrapSession/sessions/${cfg.sessionid}`, {
    method: "POST",
    headers: { ...commonHeaders(`${view}?:embed=y`), Cookie: jar.header() },
    body: new URLSearchParams({ sheet_id: cfg.sheetId, worksheetPortSize: '{"w":1000,"h":800}' }),
    signal,
  });
  jar.absorb(r2);
  const bootstrap = await r2.text();
  return { view, jar, cfg, bootstrap };
}

// Osgood's recent Enterococci readings (Salem results, filtered locally).
async function fetchOsgoodSamples(signal: AbortSignal): Promise<WaterSample[]> {
  const { view, jar, cfg } = await openSession("ResultsTable", signal);
  const r3 = await fetch(
    `${HOST}${cfg.vizql_root}/sessions/${cfg.sessionid}/commands/tabdoc/categorical-filter`,
    {
      method: "POST",
      headers: { ...commonHeaders(`${view}?:embed=y`), Cookie: jar.header() },
      body: new URLSearchParams({
        visualIdPresModel: JSON.stringify({ worksheet: "TestResultsTable", dashboard: "Results (Table)" }),
        globalFieldName: TOWN_FIELD,
        membershipTarget: "filter",
        filterUpdateType: "filter-replace",
        filterValues: JSON.stringify([TOWN]),
      }),
      signal,
    },
  );
  const rows = reconstructRows(parseRecords(await r3.text()), (caps) =>
    caps.includes("Name") && caps.some((c) => c.includes("Results")),
  );
  const resultKey = "AGG(Results (CFU/100 ml))";
  return rows
    .filter(
      (r) =>
        String(r.Name) === BEACH_NAME &&
        /entero/i.test(String(r.Indicator)) &&
        Number.isFinite(Number(r[resultKey])),
    )
    .map((r) => ({ date: String(r.Date).slice(0, 10), result: Number(r[resultKey]) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // most recent first
}

// Statewide closures render in the bootstrap; return the Salem ones.
async function fetchSalemClosures(signal: AbortSignal): Promise<{ beach: string; reason: string }[]> {
  const { bootstrap } = await openSession("Closures", signal);
  const rows = reconstructRows(parseRecords(bootstrap), (caps) =>
    caps.includes("Beach") && caps.some((c) => /Closure|Reason/i.test(c)),
  );
  return rows
    .filter((r) => String(r.Town) === TOWN)
    .map((r) => ({ beach: String(r.Beach), reason: String(r["Closure Reason"] ?? "") }));
}

/**
 * Most recent Osgood reading plus its closure status. Returns null on any
 * failure (network, timeout, dashboard change) so the caller can fall back.
 */
export async function fetchOsgoodReading(): Promise<WaterReading | null> {
  const signal = AbortSignal.timeout(8000);
  const [samplesRes, closuresRes] = await Promise.allSettled([
    fetchOsgoodSamples(signal),
    fetchSalemClosures(signal),
  ]);

  // Without the readings there's nothing to show; let the caller use the seed.
  if (samplesRes.status !== "fulfilled" || samplesRes.value.length === 0) return null;
  const history = samplesRes.value.slice(0, 6);
  const latest = history[0] ?? null;

  let status: WaterReading["status"] = "open";
  let closureReason: string | null = null;
  if (closuresRes.status === "fulfilled") {
    const closed = closuresRes.value.find((c) => c.beach === BEACH_NAME);
    if (closed) {
      status = "closed";
      closureReason = closed.reason || "Closed";
    }
  } else {
    status = "unknown"; // couldn't confirm closure status
  }

  return {
    beach: BEACH_NAME,
    town: TOWN,
    unit: "cfu/100 mL",
    threshold: MARINE_SINGLE_SAMPLE_THRESHOLD,
    latest,
    history,
    withinStandard: latest ? latest.result <= MARINE_SINGLE_SAMPLE_THRESHOLD : null,
    status,
    closureReason,
    source: "madph",
    dashboardUrl: MA_DPH_DASHBOARD_URL,
  };
}
