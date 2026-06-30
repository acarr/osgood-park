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
  error?: string;
}

interface WaterReading {
  beach: string;
  area: string;
  value: number;
  unit: string;
  threshold: number;
  status: "safe" | "advisory" | "unknown";
  sampledOn: string;
  source: "fallback" | "madph";
  dashboardUrl: string;
}

type Load<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "error" };

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

const STATUS: Record<
  WaterReading["status"],
  { label: string; badge: string; icon: typeof CircleCheck }
> = {
  safe: {
    label: "Safe for swimming",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    icon: CircleCheck,
  },
  advisory: {
    label: "Advisory in effect",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-500",
    icon: TriangleAlert,
  },
  unknown: {
    label: "No recent reading",
    badge: "bg-muted text-muted-foreground",
    icon: Droplets,
  },
};

function TideCard() {
  const [load, setLoad] = useState<Load<TidesResponse>>({ state: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/tides.json")
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
          <CardTitle>Today's Tides</CardTitle>
          <CardDescription>Salem Harbor · NOAA Station 8442645</CardDescription>
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
            const tides = load.data.tides ?? [];
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
            const now = easternNowString();
            const nextIdx = tides.findIndex((t) => t.time > now);
            const next = nextIdx >= 0 ? tides[nextIdx] : null;

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

function WaterCard() {
  const [load, setLoad] = useState<Load<WaterReading>>({ state: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/water.json")
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
  const status = STATUS[reading?.status ?? "unknown"];
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
          <CardTitle>Water Safety</CardTitle>
          <CardDescription>Salem Sound · MA Dept. of Public Health</CardDescription>
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
          <p className="text-sm text-muted-foreground">
            Water-quality data is unavailable right now. See the official dashboard below.
          </p>
        )}

        {load.state === "ready" && reading && (
          <div className="space-y-4">
            <Badge className={cn("gap-1.5 px-3 py-1 text-sm", status.badge)}>
              <StatusIcon className="size-4!" />
              {status.label}
            </Badge>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{reading.value}</span>
                <span className="text-sm text-muted-foreground">{reading.unit}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Enterococci · state limit {reading.threshold} {reading.unit}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{reading.beach}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sampled</dt>
                <dd>{formatSampledDate(reading.sampledOn)}</dd>
              </div>
            </dl>
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
          View the official MA DPH dashboard
          <ExternalLink className="size-3.5" />
        </a>
      </CardFooter>
    </Card>
  );
}

export function TideWaterSection() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <TideCard />
      <WaterCard />
    </div>
  );
}

export default TideWaterSection;
