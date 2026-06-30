// Live fetch of Salem beach water-quality results from the MA DPH "Beach Water
// Quality Dashboard" (a Tableau Server view).
//
// The dashboard disables underlying-data/CSV export, so we replicate what the
// browser does: open a viz session, then apply the Town = "Salem" filter, and
// read the rendered table out of Tableau's response. The whole thing is wrapped
// so ANY failure resolves to null — the caller falls back to the seeded reading
// and the page never shows an error.
//
// These identifiers are specific to the current published workbook. If MA DPH
// republishes the dashboard they may change; when that happens the live fetch
// fails gracefully and we keep serving the last-known value until updated here.

import {
  MARINE_SINGLE_SAMPLE_THRESHOLD,
  MA_DPH_DASHBOARD_URL,
  type WaterReading,
} from "@/data/water-quality";

const HOST = "https://datavisualization.dph.mass.gov";
const VIEW = `${HOST}/views/BeachWaterQualityDashboard/ResultsTable`;
const TOWN_FIELD = "[sqlproxy.0uo8mb00mz07te10p3y9b04vxr9k].[none:Town:nk]";
const WORKSHEET = "TestResultsTable";
const DASHBOARD = "Results (Table)";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface BeachRow {
  date: string;
  name: string;
  indicator: string;
  result: number;
}

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

// Minimal cookie jar so the bootstrap/filter requests reuse the session cookies.
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

async function fetchSalemRows(signal: AbortSignal): Promise<BeachRow[]> {
  const jar = new Jar();

  // 1) Open the embedded view → cookies + session config.
  const r1 = await fetch(`${VIEW}?:embed=y&:showVizHome=no&:apiID=host0`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal,
  });
  jar.absorb(r1);
  const html = await r1.text();
  const cfgMatch = html.match(/id="tsConfigContainer">([\s\S]*?)<\/textarea>/);
  if (!cfgMatch) throw new Error("no tsConfigContainer");
  const cfg = JSON.parse(htmlUnescape(cfgMatch[1]));
  const { sessionid, vizql_root: vizqlRoot, sheetId } = cfg;

  const commonHeaders = {
    "User-Agent": UA,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "text/javascript",
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${VIEW}?:embed=y`,
  };

  // 2) Bootstrap the session.
  const r2 = await fetch(`${HOST}${vizqlRoot}/bootstrapSession/sessions/${sessionid}`, {
    method: "POST",
    headers: { ...commonHeaders, Cookie: jar.header() },
    body: new URLSearchParams({ sheet_id: sheetId, worksheetPortSize: '{"w":1000,"h":800}' }),
    signal,
  });
  jar.absorb(r2);
  await r2.text();

  // 3) Apply Town = Salem; the response carries the rendered table.
  const r3 = await fetch(
    `${HOST}${vizqlRoot}/sessions/${sessionid}/commands/tabdoc/categorical-filter`,
    {
      method: "POST",
      headers: { ...commonHeaders, Cookie: jar.header() },
      body: new URLSearchParams({
        visualIdPresModel: JSON.stringify({ worksheet: WORKSHEET, dashboard: DASHBOARD }),
        globalFieldName: TOWN_FIELD,
        membershipTarget: "filter",
        filterUpdateType: "filter-replace",
        filterValues: JSON.stringify(["Salem"]),
      }),
      signal,
    },
  );
  const text = await r3.text();
  return parseTable(text);
}

// Reconstruct table rows from Tableau's dataSegments + paneColumnsData.
function parseTable(text: string): BeachRow[] {
  const rec = JSON.parse(text);

  // Pool every data value grouped by its dataType.
  const byType: Record<string, any[]> = {};
  for (const ds of deepFind(rec, "dataSegments")) {
    for (const segKey of Object.keys(ds)) {
      const cols = ds[segKey]?.dataColumns;
      if (!Array.isArray(cols)) continue;
      for (const c of cols) byType[c.dataType] = (byType[c.dataType] || []).concat(c.dataValues);
    }
  }

  // The results table's column model.
  let pane: any = null;
  for (const p of deepFind(rec, "paneColumnsData")) {
    const caps = (p?.vizDataColumns || []).map((c: any) => c.fieldCaption);
    if (caps.includes("Name") || caps.some((c: string) => c && c.includes("Results"))) {
      pane = p;
      break;
    }
  }
  if (!pane) throw new Error("no results pane");

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
  for (const c of pane.vizDataColumns) {
    if (c.fieldCaption) columns[c.fieldCaption] = valuesFor(c);
  }

  const dateCol = columns["Date"] || [];
  const nameCol = columns["Name"] || [];
  const indicatorCol = columns["Indicator"] || [];
  const resultCol =
    columns["AGG(Results (CFU/100 ml))"] ||
    Object.entries(columns).find(([k]) => k.includes("Results"))?.[1] ||
    [];

  const n = Math.max(dateCol.length, nameCol.length, resultCol.length);
  const rows: BeachRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      date: String(dateCol[i] ?? ""),
      name: String(nameCol[i] ?? ""),
      indicator: String(indicatorCol[i] ?? ""),
      result: Number(resultCol[i]),
    });
  }
  return rows;
}

/**
 * Most recent Salem water-quality reading, summarized across beaches. Returns
 * null on any failure (network, timeout, dashboard change) so the caller can
 * fall back to the seeded value.
 */
export async function fetchSalemWaterReading(): Promise<WaterReading | null> {
  try {
    const rows = await fetchSalemRows(AbortSignal.timeout(8000));

    // Keep Enterococci samples with a real numeric result.
    const clean = rows.filter(
      (r) => Number.isFinite(r.result) && /entero/i.test(r.indicator) && r.name,
    );
    if (clean.length === 0) return null;

    // Most recent sample per beach, then summarize.
    const latestByBeach = new Map<string, BeachRow>();
    for (const r of clean) {
      const prev = latestByBeach.get(r.name);
      if (!prev || r.date > prev.date) latestByBeach.set(r.name, r);
    }
    const beaches = [...latestByBeach.values()];
    const tested = beaches.length;
    const passing = beaches.filter((r) => r.result <= MARINE_SINGLE_SAMPLE_THRESHOLD).length;
    const worst = beaches.reduce((a, b) => (a.result > b.result ? a : b));
    const mostRecent = beaches.reduce((a, b) => (a.date > b.date ? a : b)).date.slice(0, 10);

    return {
      beach: "Salem beaches",
      area: "Salem, MA",
      value: worst.result,
      unit: "cfu/100 mL",
      threshold: MARINE_SINGLE_SAMPLE_THRESHOLD,
      status: passing === tested ? "safe" : "advisory",
      sampledOn: mostRecent,
      source: "madph",
      dashboardUrl: MA_DPH_DASHBOARD_URL,
      beachesTested: tested,
      beachesPassing: passing,
      highestBeach: worst.name,
    };
  } catch {
    return null;
  }
}
