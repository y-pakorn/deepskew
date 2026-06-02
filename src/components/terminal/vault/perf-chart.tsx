"use client";

import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

export interface PerfPoint {
  time: number; // unix seconds
  value: number;
}

/** PLP share-price area chart (lightweight-charts v5). Client-only. */
export function PerfChart({ data }: { data: PerfPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "rgba(0,0,0,0)" },
        textColor: "#5A626E",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#1E222A", style: 1 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.18, bottom: 0.08 },
      },
      timeScale: { borderVisible: false, timeVisible: false, secondsVisible: false },
      handleScroll: false,
      handleScale: false,
      crosshair: {
        horzLine: { visible: false, labelVisible: false },
        vertLine: { visible: false, labelVisible: false },
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
    // Defensive: lightweight-charts needs strictly ascending, unique times.
    const bySecond = new Map<number, number>();
    for (const d of data) bySecond.set(d.time, d.value);
    const cleaned = [...bySecond.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
    series.setData(cleaned);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} className="h-full w-full" />;
}
