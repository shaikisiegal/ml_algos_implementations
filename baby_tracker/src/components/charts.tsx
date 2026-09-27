import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tint, usePalette } from '../lib/theme.ts';

/** Round an axis max up to a clean 1/2/2.5/5 × 10^n step (so ticks at 0, ½, max read cleanly). */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= v) return m * exp;
  return 10 * exp;
}

export interface BarDatum {
  label: string;
  value: number;
  /** Extra line in the tooltip, e.g. "💧 5 · 💩 2". */
  detail?: string;
  /** Tooltip title, e.g. "Mon 21 Sep". */
  title: string;
}

interface BarChartProps {
  data: BarDatum[];
  color: string;
  format: (v: number) => string;
  average?: number;
  /** Shaded reference range, e.g. recommended sleep. */
  band?: [number, number];
  bandLabel?: string;
  height?: number;
}

const Y_AXIS_W = 40;

/**
 * Single-series column chart (no legend — the screen title names the series).
 * Tap a column for its value; the average is a thin reference line.
 */
export function BarChart({ data, color, format, average, band, bandLabel, height = 190 }: BarChartProps) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), band?.[1] ?? 0, average ?? 0));
  const y = (v: number) => height - (v / max) * height;
  const plotW = Math.max(0, width - Y_AXIS_W);
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(24, slot - 2)); // ≥2px surface gap between neighbours
  const labelEvery = data.length > 14 ? 5 : data.length > 7 ? 2 : 1;
  const selected = sel !== null ? data[sel] : null;

  return (
    <View>
      <View style={styles.tooltipRow}>
        {selected ? (
          <View style={[styles.tooltip, { backgroundColor: p.text }]}>
            <Text style={[styles.tooltipTitle, { color: p.bg }]}>{selected.title}</Text>
            <Text style={[styles.tooltipValue, { color: p.bg }]}>
              {format(selected.value)}
              {selected.detail ? `  ·  ${selected.detail}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={[styles.tapHint, { color: p.muted }]}>Tap a bar for details</Text>
        )}
      </View>

      <View style={{ height: height + 22 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            {[0, 0.5, 1].map((f) => (
              <View key={f} style={[styles.tickRow, { top: y(max * f) - 7 }]}>
                <Text style={[styles.tick, { color: p.muted }]}>{format(max * f)}</Text>
                <View style={[styles.gridLine, { backgroundColor: p.border }]} />
              </View>
            ))}

            {band ? (
              <View
                style={[
                  styles.band,
                  { left: Y_AXIS_W, width: plotW, top: y(band[1]), height: y(band[0]) - y(band[1]), backgroundColor: p.grid },
                ]}
              >
                {bandLabel ? <Text style={[styles.bandLabel, { color: p.muted }]}>{bandLabel}</Text> : null}
              </View>
            ) : null}

            {data.map((d, i) => {
              const h = Math.max(d.value > 0 ? 2 : 0, height - y(d.value));
              const isSel = sel === i;
              return (
                <Pressable
                  key={i}
                  accessibilityLabel={`${d.title}: ${format(d.value)}`}
                  onPress={() => setSel(isSel ? null : i)}
                  style={[styles.slot, { left: Y_AXIS_W + i * slot, width: slot, height }]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barW,
                        height: h,
                        backgroundColor: sel === null || isSel ? color : tint(color, 0.45),
                      },
                    ]}
                  />
                </Pressable>
              );
            })}

            {average !== undefined && average > 0 ? (
              <View style={[styles.avgLine, { left: Y_AXIS_W, width: plotW, top: y(average), backgroundColor: p.text }]}>
                <Text style={[styles.avgLabel, { color: p.text, backgroundColor: p.card }]}>avg {format(average)}</Text>
              </View>
            ) : null}

            {data.map((d, i) =>
              i % labelEvery === 0 || i === data.length - 1 ? (
                <Text
                  key={`l${i}`}
                  style={[styles.xLabel, { left: Y_AXIS_W + i * slot + slot / 2 - 16, top: height + 4, color: p.muted }]}
                >
                  {d.label}
                </Text>
              ) : null,
            )}
          </>
        ) : null}
      </View>
    </View>
  );
}

export interface LinePoint {
  t: number;
  value: number;
  title: string;
}

/** Single-series line over time (x is real time, so uneven gaps stay honest). */
export function LineChart({
  points,
  color,
  format,
  formatTick = format,
  height = 180,
}: {
  points: LinePoint[];
  color: string;
  format: (v: number) => string;
  /** Axis tick text (keep it short; the unit belongs in the title). */
  formatTick?: (v: number) => string;
  height?: number;
}) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const values = points.map((pt) => pt.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const t0 = points[0]?.t ?? 0;
  const t1 = points[points.length - 1]?.t ?? 1;
  const plotW = Math.max(0, width - Y_AXIS_W - 12);
  const x = (t: number) => Y_AXIS_W + 6 + (t1 === t0 ? plotW / 2 : ((t - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => 8 + (1 - (v - yMin) / (yMax - yMin)) * (height - 16);
  const selected = sel !== null ? points[sel] : null;

  return (
    <View>
      <View style={styles.tooltipRow}>
        {selected ? (
          <View style={[styles.tooltip, { backgroundColor: p.text }]}>
            <Text style={[styles.tooltipTitle, { color: p.bg }]}>{selected.title}</Text>
            <Text style={[styles.tooltipValue, { color: p.bg }]}>{format(selected.value)}</Text>
          </View>
        ) : (
          <Text style={[styles.tapHint, { color: p.muted }]}>Tap a point for details</Text>
        )}
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
              <View key={i} style={[styles.tickRow, { top: y(v) - 7 }]}>
                <Text style={[styles.tick, { color: p.muted }]}>{formatTick(v)}</Text>
                <View style={[styles.gridLine, { backgroundColor: p.border }]} />
              </View>
            ))}
            {points.slice(1).map((pt, i) => {
              const a = points[i];
              const x1 = x(a.t);
              const y1 = y(a.value);
              const x2 = x(pt.t);
              const y2 = y(pt.value);
              const len = Math.hypot(x2 - x1, y2 - y1);
              const angle = Math.atan2(y2 - y1, x2 - x1);
              return (
                <View
                  key={`s${i}`}
                  style={[
                    styles.segment,
                    {
                      left: (x1 + x2) / 2 - len / 2,
                      top: (y1 + y2) / 2 - 1,
                      width: len,
                      backgroundColor: color,
                      transform: [{ rotate: `${angle}rad` }],
                    },
                  ]}
                />
              );
            })}
            {points.map((pt, i) => (
              <Pressable
                key={i}
                accessibilityLabel={`${pt.title}: ${format(pt.value)}`}
                onPress={() => setSel(sel === i ? null : i)}
                hitSlop={10}
                style={[styles.pointHit, { left: x(pt.t) - 12, top: y(pt.value) - 12 }]}
              >
                <View
                  style={[
                    styles.point,
                    { backgroundColor: color, borderColor: p.card },
                    sel === i && { transform: [{ scale: 1.4 }] },
                  ]}
                />
              </Pressable>
            ))}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipRow: { minHeight: 44, justifyContent: 'center', marginBottom: 6 },
  tooltip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  tooltipTitle: { fontSize: 12, fontWeight: '600', opacity: 0.8 },
  tooltipValue: { fontSize: 15, fontWeight: '800' },
  tapHint: { fontSize: 12 },
  tickRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  tick: { width: Y_AXIS_W - 4, fontSize: 11, textAlign: 'right', marginRight: 4, fontVariant: ['tabular-nums'] },
  gridLine: { flex: 1, height: StyleSheet.hairlineWidth },
  band: { position: 'absolute', justifyContent: 'flex-start' },
  bandLabel: { fontSize: 11, marginLeft: 4, marginTop: 2 },
  slot: { position: 'absolute', top: 0, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  avgLine: { position: 'absolute', height: 1 },
  avgLabel: { position: 'absolute', right: 0, top: -16, fontSize: 11, fontWeight: '700', paddingHorizontal: 3 },
  xLabel: { position: 'absolute', width: 32, textAlign: 'center', fontSize: 11, fontVariant: ['tabular-nums'] },
  segment: { position: 'absolute', height: 2, borderRadius: 1 },
  pointHit: { position: 'absolute', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  point: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
