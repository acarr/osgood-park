import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  Droplets,
  ExternalLink,
  TriangleAlert,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TideEvent {
  time: string; // "YYYY-MM-DD HH:mm" (station local time)
  height: number;
  type: "high" | "low";
}

interface TidesResponse {
  stationName: string;
  tides: TideEvent[];
  source?: "noaa" | "fallback";
  error?: string;
}

interface WaterSample {
  date: string; // YYYY-MM-DD
  result: number;
}

interface WaterReading {
  beach: string;
  town: string;
  unit: string;
  threshold: number;
  latest: WaterSample | null;
  history: WaterSample[];
  withinStandard: boolean | null;
  status: "open" | "closed" | "unknown";
  closureReason: string | null;
  source: "fallback" | "madph";
  dashboardUrl: string;
}

type Load<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "error" };

// Editable copy for these cards. Passed in from the page so the wording lives in
// src/content/home.yaml (see the `tides` and `water` blocks) rather than here.
interface TideContent {
  cardTitle: string;
  cardSubtitle: string;
}
interface WaterContent {
  cardTitle: string;
  cardSubtitle: string;
  statusOpen: string;
  statusClosed: string;
  statusUnknown: string;
  latestLabel: string;
  historyLabel: string;
  contaminant: string;
  unavailable: string;
  noReadings: string;
  dashboardLinkText: string;
}
export interface TideWaterContent {
  tides: TideContent;
  water: WaterContent;
}

const NOAA_STATION_URL =
  "https://tidesandcurrents.noaa.gov/stationhome.html?id=8442645";

/** Current Eastern wall-clock as "YYYY-MM-DD HH:mm" so we can compare to NOAA's local times. */
function easternNowString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function formatTime(time: string): string {
  const clock = time.split(" ")[1] ?? "";
  const [hStr, m] = clock.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Parsing both strings the same way cancels the timezone offset, so the delta is correct anywhere. */
function minutesUntil(from: string, to: string): number {
  const a = new Date(from.replace(" ", "T")).getTime();
  const b = new Date(to.replace(" ", "T")).getTime();
  return Math.round((b - a) / 60000);
}

function formatCountdown(min: number): string {
  if (min <= 0) return "now";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `in ${m} min`;
  if (m === 0) return `in ${h} hr`;
  return `in ${h} hr ${m} min`;
}

function formatSampledDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Badge color + icon per status (styling stays in code; the label text comes
// from content — see statusLabel() below).
const STATUS_STYLE: Record<
  WaterReading["status"],
  { badge: string; icon: typeof CircleCheck }
> = {
  open: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    icon: CircleCheck,
  },
  closed: {
    badge: "bg-red-500/15 text-red-700 dark:text-red-400",
    icon: TriangleAlert,
  },
  unknown: {
    badge: "bg-muted text-muted-foreground",
    icon: Droplets,
  },
};

function TideCard({ content }: { content: TideContent }) {
  const [load, setLoad] = useState<Load<TidesResponse>>({ state: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/tides.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: TidesResponse) => {
        if (active) setLoad({ state: "ready", data });
      })
      .catch(() => active && setLoad({ state: "error" }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="p-2">
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Waves className="size-5 text-foreground" />
        </span>
        <div>
          <CardTitle>{content.cardTitle}</CardTitle>
          <CardDescription>{content.cardSubtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {load.state === "loading" && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {load.state === "error" && (
          <p className="text-sm text-muted-foreground">
            Tide data is unavailable right now. View it directly at the{" "}
            <a href={NOAA_STATION_URL} target="_blank" rel="noreferrer" className="underline">
              NOAA station page
            </a>
            .
          </p>
        )}

        {load.state === "ready" &&
          (() => {
            // The API returns a multi-day window. Show today's tides, but compute
            // the "next" tide across the whole window so it still points to
            // tomorrow's first tide after the last one today has passed.
            const allTides = load.data.tides ?? [];
            const now = easternNowString();
            const today = now.slice(0, 10);
            const tides = allTides.filter((t) => t.time.slice(0, 10) === today);
            const next = allTides.find((t) => t.time > now) ?? null;

            if (tides.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  No tide predictions available today.{" "}
                  <a href={NOAA_STATION_URL} target="_blank" rel="noreferrer" className="underline">
                    Check NOAA
                  </a>
                  .
                </p>
              );
            }

            return (
              <div className="space-y-5">
                {next && (
                  <div className="rounded-lg bg-muted/60 p-4">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                      Next {next.type} tide
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold">{formatTime(next.time)}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCountdown(minutesUntil(now, next.time))}
                      </span>
                    </div>
                  </div>
                )}
                <ul className="divide-y divide-border">
                  {tides.map((t) => {
                    const isNext = next?.time === t.time;
                    const past = t.time <= now;
                    return (
                      <li
                        key={t.time}
                        className={cn(
                          "flex items-center justify-between py-2 text-sm",
                          past && !isNext && "text-muted-foreground/60",
                          isNext && "font-medium",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {t.type === "high" ? (
                            <ArrowUp className="size-4 text-foreground" />
                          ) : (
                            <ArrowDown className="size-4 text-muted-foreground" />
                          )}
                          {t.type === "high" ? "High" : "Low"} tide
                        </span>
                        <span className="flex items-center gap-3 tabular-nums">
                          <span>{formatTime(t.time)}</span>
                          <span className="text-muted-foreground">{t.height.toFixed(1)} ft</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
      </CardContent>
    </Card>
  );
}

function WaterCard({ content }: { content: WaterContent }) {
  const [load, setLoad] = useState<Load<WaterReading>>({ state: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/water.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: WaterReading) => {
        if (active) setLoad({ state: "ready", data });
      })
      .catch(() => active && setLoad({ state: "error" }));
    return () => {
      active = false;
    };
  }, []);

  const reading = load.state === "ready" ? load.data : null;
  const currentStatus = reading?.status ?? "unknown";
  const status = STATUS_STYLE[currentStatus];
  const statusLabel = {
    open: content.statusOpen,
    closed: content.statusClosed,
    unknown: content.statusUnknown,
  }[currentStatus];
  const StatusIcon = status.icon;
  const dashboardUrl =
    reading?.dashboardUrl ??
    "https://www.mass.gov/info-details/interactive-beach-water-quality-dashboard";

  return (
    <Card className="p-2">
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Droplets className="size-5 text-foreground" />
        </span>
        <div>
          <CardTitle>{content.cardTitle}</CardTitle>
          <CardDescription>{content.cardSubtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {load.state === "loading" && (
          <div className="space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {load.state === "error" && (
          <p className="text-sm text-muted-foreground">{content.unavailable}</p>
        )}

        {load.state === "ready" && reading && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge className={cn("gap-1.5 px-3 py-1 text-sm", status.badge)}>
                <StatusIcon className="size-4!" />
                {statusLabel}
              </Badge>
              {reading.status === "closed" && reading.closureReason && (
                <span className="text-sm text-muted-foreground">{reading.closureReason}</span>
              )}
            </div>

            {reading.latest ? (
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {content.latestLabel}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">
                    {reading.latest.result}
                  </span>
                  <span className="text-sm text-muted-foreground">{reading.unit}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSampledDate(reading.latest.date)} · {content.contaminant} ·{" "}
                  {reading.withinStandard
                    ? `within the ${reading.threshold} ${reading.unit} limit`
                    : `above the ${reading.threshold} ${reading.unit} limit`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{content.noReadings}</p>
            )}

            {reading.history.length > 1 && (
              <div>
                <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">
                  {content.historyLabel}
                </p>
                <ul className="divide-y divide-border">
                  {reading.history.map((s) => (
                    <li
                      key={s.date}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <span>{formatSampledDate(s.date)}</span>
                      <span className="tabular-nums">
                        {s.result} <span className="text-muted-foreground">{reading.unit}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          {content.dashboardLinkText}
          <ExternalLink className="size-3.5" />
        </a>
      </CardFooter>
    </Card>
  );
}

export function TideWaterSection({ content }: { content: TideWaterContent }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <TideCard content={content.tides} />
      <WaterCard content={content.water} />
    </div>
  );
}

export default TideWaterSection;
