import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/** Chart tokens per theme. Series pair validated for CVD separation on both surfaces. */
function tokens(dark: boolean) {
  return dark
    ? { s1: '#24a568', s2: '#6366f1', grid: '#1e293b', axis: '#64748b', surface: '#0f172a', ink: '#e2e8f0', tipBg: '#0f172a', tipBorder: '#334155' }
    : { s1: '#178553', s2: '#6366f1', grid: '#eef2f6', axis: '#94a3b8', surface: '#ffffff', ink: '#0f172a', tipBg: '#ffffff', tipBorder: '#e2e8f0' };
}

export function useChartTokens() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return tokens(dark);
}

function tooltipStyle(t: ReturnType<typeof tokens>) {
  return {
    contentStyle: { background: t.tipBg, border: `1px solid ${t.tipBorder}`, borderRadius: 12, fontSize: 12, color: t.ink, boxShadow: '0 4px 16px rgba(0,0,0,.08)' },
    labelStyle: { color: t.ink, fontWeight: 600 },
    itemStyle: { color: t.ink },
  };
}

const axisProps = (t: ReturnType<typeof tokens>) => ({ stroke: t.axis, fontSize: 11, tickLine: false, axisLine: false });

/** Single-series score line; optional dashed target line. */
export function ScoreLineChart({ data, height = 240, valueLabel = 'Score', max = 100, target }: { data: { label: string; value: number }[]; height?: number; valueLabel?: string; max?: number; target?: number }) {
  const t = useChartTokens();
  const ticks = max === 160 ? [10, 40, 70, 100, 130, 160] : [0, 25, 50, 75, 100];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={16} />
        <YAxis domain={[ticks[0], max]} ticks={ticks} {...axisProps(t)} />
        {target != null && <ReferenceLine y={target} stroke={t.axis} strokeDasharray="4 4" label={{ value: `Target ${target}`, position: 'insideTopRight', fontSize: 11, fill: t.axis }} />}
        <Tooltip {...tooltipStyle(t)} cursor={{ stroke: t.axis, strokeDasharray: '3 3' }} formatter={(v: number) => [v, valueLabel]} />
        <Line type="monotone" dataKey="value" name={valueLabel} stroke={t.s1} strokeWidth={2} dot={{ r: 4, fill: t.s1, stroke: t.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: t.surface, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Single-series count bars (e.g. answers per day). */
export function CountBarChart({ data, height = 200, valueLabel }: { data: { label: string; value: number }[]; height?: number; valueLabel: string }) {
  const t = useChartTokens();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }} barCategoryGap={3}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(t)} interval="preserveStartEnd" minTickGap={8} />
        <YAxis allowDecimals={false} {...axisProps(t)} />
        <Tooltip {...tooltipStyle(t)} cursor={{ fill: t.grid }} formatter={(v: number) => [v, valueLabel]} />
        <Bar dataKey="value" name={valueLabel} fill={t.s1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for dimension scores; one or two series (compare). */
export function DimensionBarChart({
  data, seriesA, seriesB, height,
}: { data: { label: string; a: number; b?: number }[]; seriesA: string; seriesB?: string; height?: number }) {
  const t = useChartTokens();
  const h = height ?? data.length * (seriesB ? 46 : 34) + 30;
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid stroke={t.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axisProps(t)} />
        <YAxis type="category" dataKey="label" width={130} {...axisProps(t)} />
        <Tooltip {...tooltipStyle(t)} cursor={{ fill: t.grid }} />
        {seriesB && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: t.ink }} />}
        <Bar dataKey="a" name={seriesA} fill={t.s1} radius={[0, 4, 4, 0]} maxBarSize={16} label={!seriesB ? { position: 'right', fontSize: 11, fill: t.ink } : undefined} />
        {seriesB && <Bar dataKey="b" name={seriesB} fill={t.s2} radius={[0, 4, 4, 0]} maxBarSize={16} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
