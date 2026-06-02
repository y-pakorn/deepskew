"use client";

import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

export interface PerfPoint {
  time: number; // unix seconds
  value: number;
}

/** PLP share-price area chart (lightweight-charts v5) with a hover tooltip. */
export function PerfChart({ data }: { data: PerfPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [tip, setTip] = useState<{
    left: number;
    value: number;
    date: string;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "rgba(0,0,0,0)" },
        textColor: "#8a8a8a",
        fontFamily: "var(--font-inter), sans-serif",
        fontSize: 12,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#1E222A" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.18, bottom: 0.08 },
      },
      timeScale: { borderVisible: false, timeVisible: false, secondsVisible: false },
      handleScroll: false,
      handleScale: false,
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#3b3b3b", width: 1, style: 3, labelVisible: false },
        horzLine: { color: "#3b3b3b", width: 1, style: 3, labelVisible: false },
      },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#007eed",
      topColor: "rgba(0,126,237,0.25)",
      bottomColor: "rgba(0,126,237,0)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });
    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      const s = seriesRef.current;
      if (!s || !param.point || param.time == null) {
        setTip(null);
        return;
      }
      const point = param.seriesData.get(s) as { value?: number } | undefined;
      if (!point || typeof point.value !== "number") {
        setTip(null);
        return;
      }
      const d = new Date((param.time as number) * 1000);
      const left = Math.max(30, Math.min(param.point.x, el.clientWidth - 30));
      setTip({
        left,
        value: point.value,
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    });

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !data.length) return;
    const bySecond = new Map<number, number>();
    for (const d of data) bySecond.set(d.time, d.value);
    const cleaned = [...bySecond.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
    series.setData(cleaned);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {tip ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded border border-hairline bg-panel-elev px-1.5 py-0.5 text-val whitespace-nowrap tabular"
          style={{ left: tip.left }}
        >
          <span className="text-accent-brand">{tip.value.toFixed(4)}</span>{" "}
          <span className="text-text-faint">{tip.date}</span>
        </div>
      ) : null}
    </div>
  );
}
