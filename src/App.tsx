import { jStat } from 'jstat';
import {
  BarChart3,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  LineChart,
  Palette,
  Plus,
  RefreshCw,
  Settings2,
  Sigma,
  Sparkles,
  Table2,
} from 'lucide-react';
import type { PointerEvent } from 'react';
import { Fragment, useMemo, useState } from 'react';

type Sheet = 'data' | 'analysis' | 'graph' | 'layout' | 'notes' | 'tutorials' | 'map';
type GraphMode = 'scatter' | 'bar' | 'box' | 'line' | 'dose' | 'survival';
type AnalysisType = 'auto' | 'welch' | 'paired' | 'mannWhitney' | 'anova' | 'kruskal' | 'linear' | 'dose' | 'survival';
type ErrorBars = 'sem' | 'sd' | 'ci95' | 'none';
type PaletteId = 'editorial' | 'bright' | 'colourblind' | 'nature' | 'mono';

type Point = { x: number; y: number };
type CleanGroup = {
  name: string;
  values: number[];
  points: Point[];
  color: string;
};
type CleanResult = {
  groups: CleanGroup[];
  rows: string[][];
  format: string;
  warnings: string[];
  roles: {
    x?: string;
    y?: string;
    group?: string;
  };
};
type SurvivalGroup = {
  name: string;
  color: string;
  rows: Array<{ time: number; event: number }>;
  curve: Point[];
};
type Summary = {
  name: string;
  n: number;
  mean: number;
  sd: number;
  sem: number;
  ci95: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
};
type GraphSettings = {
  palette: PaletteId;
  title: string;
  xLabel: string;
  yLabel: string;
  fontSize: number;
  symbolSize: number;
  lineWidth: number;
  barWidth: number;
  showGrid: boolean;
  showPoints: boolean;
  showLegend: boolean;
  showPValues: boolean;
  errorBars: ErrorBars;
};
type GraphPreset = 'journal' | 'talk' | 'poster' | 'minimal';
type TableKind = 'column' | 'grouped' | 'xy' | 'dose' | 'survival' | 'multiple';
type TableSetup = {
  groups: number;
  replicates: number;
  subcolumns: number;
  xPoints: number;
  paired: boolean;
  repeatedMeasures: boolean;
};

const palettes: Record<PaletteId, string[]> = {
  editorial: ['#155c64', '#c84f48', '#514f9f', '#cf8c22', '#2f7d57', '#a83f73', '#4b6b9c', '#7a6a37'],
  bright: ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#56b4e9', '#e69f00', '#332288', '#88ccee'],
  colourblind: ['#005ab5', '#dc3220', '#1a85ff', '#d41159', '#40b0a6', '#994f00', '#648fff', '#785ef0'],
  nature: ['#386641', '#bc4749', '#3f88c5', '#f6ae2d', '#6a4c93', '#2a9d8f', '#8f6a3a', '#606c38'],
  mono: ['#222222', '#555555', '#777777', '#999999', '#bbbbbb', '#444444', '#6b6b6b', '#8d8d8d'],
};

const defaultSettings: GraphSettings = {
  palette: 'editorial',
  title: 'Cell viability by treatment',
  xLabel: 'Condition',
  yLabel: 'Response',
  fontSize: 13,
  symbolSize: 6,
  lineWidth: 2.2,
  barWidth: 0.56,
  showGrid: true,
  showPoints: true,
  showLegend: true,
  showPValues: true,
  errorBars: 'sem',
};

const groupedSample = `Condition,Rep 1,Rep 2,Rep 3,Rep 4
Vehicle,4.1,4.4,4.0,4.8
Drug A,5.7,6.1,5.9,6.3
Drug B,3.2,3.5,3.1,3.8`;

const doseSample = `Concentration,Response,Compound
0.001,4.8,Drug A
0.003,6.2,Drug A
0.01,12.5,Drug A
0.03,26.1,Drug A
0.1,53.2,Drug A
0.3,78.4,Drug A
1,92.7,Drug A
0.001,5.5,Drug B
0.003,9.1,Drug B
0.01,20.2,Drug B
0.03,45.3,Drug B
0.1,72.2,Drug B
0.3,90.4,Drug B
1,96.1,Drug B`;

const xySample = `Time,Response,Series
0,1.1,Control
1,1.6,Control
2,2.0,Control
3,2.4,Control
4,2.7,Control
0,1.2,Treated
1,2.1,Treated
2,3.4,Treated
3,4.8,Treated
4,5.9,Treated`;

const survivalSample = `Time,Event,Group
0,0,Control
4,1,Control
8,1,Control
12,0,Control
0,0,Treated
6,1,Treated
10,0,Treated
14,1,Treated`;

const graphModes: Array<{ id: GraphMode; label: string; icon: typeof BarChart3 }> = [
  { id: 'scatter', label: 'Dot', icon: Sparkles },
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'box', label: 'Box', icon: FileSpreadsheet },
  { id: 'line', label: 'Line', icon: LineChart },
  { id: 'dose', label: 'Dose', icon: FlaskConical },
  { id: 'survival', label: 'Survival', icon: LineChart },
];

const analyses: Array<{ id: AnalysisType; label: string; detail: string }> = [
  { id: 'auto', label: 'Choose for me', detail: 'Uses table shape and group count.' },
  { id: 'welch', label: 'Unpaired t test', detail: 'Welch correction by default.' },
  { id: 'paired', label: 'Paired t test', detail: 'Pairs rows by replicate order.' },
  { id: 'mannWhitney', label: 'Mann-Whitney', detail: 'Nonparametric two-group comparison.' },
  { id: 'anova', label: 'One-way ANOVA', detail: 'Ordinary ANOVA with effect size.' },
  { id: 'kruskal', label: 'Kruskal-Wallis', detail: 'Nonparametric multi-group comparison.' },
  { id: 'linear', label: 'Linear regression', detail: 'For XY or long dose tables.' },
  { id: 'dose', label: 'Dose response', detail: 'Four-parameter logistic estimate.' },
  { id: 'survival', label: 'Survival', detail: 'Kaplan-Meier curves and log-rank test.' },
];

const graphPresets: Array<{ id: GraphPreset; label: string; detail: string }> = [
  { id: 'journal', label: 'Journal', detail: 'Compact text, raw points, restrained grid.' },
  { id: 'talk', label: 'Talk', detail: 'Larger text and symbols for slides.' },
  { id: 'poster', label: 'Poster', detail: 'High contrast and wider marks.' },
  { id: 'minimal', label: 'Minimal', detail: 'Clean axis-first figure with no grid.' },
];

const tableKinds: Array<{ id: TableKind; label: string; detail: string; status: string }> = [
  { id: 'column', label: 'Column', detail: 'One variable across treatments; t tests, ANOVA, nonparametric tests.', status: 'Ready' },
  { id: 'grouped', label: 'Grouped', detail: 'Rows are treatments, columns are replicates or subcolumns.', status: 'Ready' },
  { id: 'xy', label: 'XY', detail: 'X values with one or more Y series; lines and regression.', status: 'Ready' },
  { id: 'dose', label: 'Dose-response', detail: 'Concentration-response data with grouped compounds.', status: 'Ready' },
  { id: 'survival', label: 'Survival', detail: 'Kaplan-Meier time/event data with number-at-risk table.', status: 'Ready' },
  { id: 'multiple', label: 'Multiple variables', detail: 'Clinical/sample metadata with many measured variables.', status: 'Engine soon' },
];

const defaultSetup: TableSetup = {
  groups: 3,
  replicates: 4,
  subcolumns: 1,
  xPoints: 6,
  paired: false,
  repeatedMeasures: false,
};

function splitRows(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      return line
        .split(delimiter)
        .map((cell) => cell.trim().replace(/^"|"$/g, ''))
        .filter((cell) => cell.length > 0);
    });
}

function toNumber(value: string) {
  const normalized = value.replace(/,/g, '').replace(/[^\d.+\-eE]/g, '');
  if (!normalized) return NaN;
  return Number(normalized);
}

function looksNumeric(value: string) {
  return Number.isFinite(toNumber(value));
}

function parseSmartInput(text: string, palette: PaletteId): CleanResult {
  const rows = splitRows(text);
  const warnings: string[] = [];
  if (rows.length === 0) {
    return { groups: [], rows: [], format: 'No data detected', warnings: ['Paste CSV, TSV, or spreadsheet cells.'], roles: {} };
  }

  const first = rows[0] ?? [];
  const hasHeader = first.some((cell) => !looksNumeric(cell));
  const body = hasHeader ? rows.slice(1) : rows;
  const header = hasHeader ? first : [];
  const groupColumn = header.findIndex((cell) => /group|condition|treatment|sample|genotype|compound|strain/i.test(cell));
  const valueColumn = header.findIndex((cell) => /value|response|measurement|signal|fold|ratio|ct|count|viability|activity/i.test(cell));
  const xColumn = header.findIndex((cell) => /x$|time|dose|concentration|conc|log|day|hour|predictor/i.test(cell));

  if (groupColumn >= 0 && valueColumn >= 0) {
    const grouped = new Map<string, { values: number[]; points: Point[] }>();
    for (const row of body) {
      const group = row[groupColumn] || 'Untitled';
      const y = toNumber(row[valueColumn] || '');
      const x = xColumn >= 0 ? toNumber(row[xColumn] || '') : NaN;
      if (!Number.isFinite(y)) continue;
      const item = grouped.get(group) ?? { values: [], points: [] };
      item.values.push(y);
      if (Number.isFinite(x)) item.points.push({ x, y });
      grouped.set(group, item);
    }
    return {
      groups: colorize(grouped, palette),
      rows,
      format: xColumn >= 0 ? 'Multiple variables table: X, response, and group detected' : 'Long table: group column plus value column',
      warnings: grouped.size < 2 ? ['Only one group detected. Add another group to compare conditions.'] : warnings,
      roles: { x: header[xColumn], y: header[valueColumn], group: header[groupColumn] },
    };
  }

  if (body.every((row) => row.length >= 2 && !looksNumeric(row[0]) && row.slice(1).some(looksNumeric))) {
    const groups = new Map<string, { values: number[]; points: Point[] }>();
    for (const row of body) {
      const values = row.slice(1).map(toNumber).filter(Number.isFinite);
      groups.set(row[0], { values, points: [] });
    }
    return { groups: colorize(groups, palette), rows, format: 'Wide table: condition name plus replicate columns', warnings, roles: { group: header[0] } };
  }

  if (header.length > 1 && body.some((row) => row.some(looksNumeric))) {
    const groups = new Map<string, { values: number[]; points: Point[] }>();
    header.forEach((name, columnIndex) => {
      const values = body.map((row) => toNumber(row[columnIndex] || '')).filter(Number.isFinite);
      if (values.length > 0) groups.set(name || `Group ${columnIndex + 1}`, { values, points: [] });
    });
    return { groups: colorize(groups, palette), rows, format: 'Column table: each numeric column is a group', warnings, roles: {} };
  }

  warnings.push('The import assistant could not infer groups confidently.');
  return { groups: [], rows, format: 'Unrecognized table', warnings, roles: {} };
}

function colorize(groups: Map<string, { values: number[]; points: Point[] }>, palette: PaletteId): CleanGroup[] {
  const colors = palettes[palette];
  return [...groups.entries()]
    .filter(([, group]) => group.values.length > 0)
    .map(([name, group], index) => ({
      name,
      values: group.values,
      points: group.points,
      color: colors[index % colors.length],
    }));
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sd(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
}

function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function summaries(groups: CleanGroup[]): Summary[] {
  return groups.map((group) => {
    const avg = mean(group.values);
    const deviation = sd(group.values);
    const sem = deviation / Math.sqrt(group.values.length);
    const tCrit = group.values.length > 1 ? jStat.studentt.inv(0.975, group.values.length - 1) : 0;
    return {
      name: group.name,
      n: group.values.length,
      mean: avg,
      sd: deviation,
      sem,
      ci95: sem * tCrit,
      median: quantile(group.values, 0.5),
      q1: quantile(group.values, 0.25),
      q3: quantile(group.values, 0.75),
      min: Math.min(...group.values),
      max: Math.max(...group.values),
    };
  });
}

function rankValues(values: Array<{ value: number; group: number }>) {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const ranked: Array<{ value: number; group: number; rank: number }> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j += 1;
    const rank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k += 1) ranked.push({ ...sorted[k], rank });
    i = j;
  }
  return ranked;
}

function welch(groups: CleanGroup[]) {
  if (groups.length !== 2 || groups.some((group) => group.values.length < 2)) return null;
  const [a, b] = groups;
  const ma = mean(a.values);
  const mb = mean(b.values);
  const sda = sd(a.values);
  const sdb = sd(b.values);
  const na = a.values.length;
  const nb = b.values.length;
  const se2a = sda ** 2 / na;
  const se2b = sdb ** 2 / nb;
  const t = (ma - mb) / Math.sqrt(se2a + se2b);
  const df = (se2a + se2b) ** 2 / (se2a ** 2 / (na - 1) + se2b ** 2 / (nb - 1));
  const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
  const ci = jStat.studentt.inv(0.975, df) * Math.sqrt(se2a + se2b);
  return { label: 'Welch unpaired t test', p, lines: [`Difference = ${fmt(ma - mb)}`, `t = ${fmt(t)}, df = ${fmt(df)}`, `95% CI = ${fmt(ma - mb - ci)} to ${fmt(ma - mb + ci)}`] };
}

function welchPValue(a: CleanGroup, b: CleanGroup) {
  if (a.values.length < 2 || b.values.length < 2) return null;
  const ma = mean(a.values);
  const mb = mean(b.values);
  const sda = sd(a.values);
  const sdb = sd(b.values);
  const na = a.values.length;
  const nb = b.values.length;
  const se2a = sda ** 2 / na;
  const se2b = sdb ** 2 / nb;
  const t = (ma - mb) / Math.sqrt(se2a + se2b);
  const df = (se2a + se2b) ** 2 / (se2a ** 2 / (na - 1) + se2b ** 2 / (nb - 1));
  const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
  return { p, difference: ma - mb };
}

function pairwiseComparisons(groups: CleanGroup[]) {
  const raw = groups.flatMap((a, aIndex) =>
    groups.slice(aIndex + 1).map((b) => {
      const result = welchPValue(a, b);
      return result ? { a: a.name, b: b.name, difference: result.difference, p: result.p, adjustedP: result.p } : null;
    }),
  ).filter(Boolean) as Array<{ a: string; b: string; difference: number; p: number; adjustedP: number }>;

  const sorted = [...raw].sort((left, right) => left.p - right.p);
  const m = sorted.length;
  sorted.forEach((row, index) => {
    row.adjustedP = Math.min(1, row.p * (m - index));
  });
  return raw.map((row) => sorted.find((item) => item.a === row.a && item.b === row.b) ?? row);
}

function survivalFromRows(rows: string[][], palette: PaletteId) {
  const header = rows[0] ?? [];
  const timeColumn = header.findIndex((cell) => /time|day|month|week/i.test(cell));
  const eventColumn = header.findIndex((cell) => /event|status|death|failure|censor/i.test(cell));
  const groupColumn = header.findIndex((cell) => /group|treatment|condition|arm/i.test(cell));
  if (timeColumn < 0 || eventColumn < 0 || groupColumn < 0) return { groups: [] as SurvivalGroup[], p: NaN, lines: [] as string[] };

  const grouped = new Map<string, Array<{ time: number; event: number }>>();
  for (const row of rows.slice(1)) {
    const time = toNumber(row[timeColumn] ?? '');
    const event = toNumber(row[eventColumn] ?? '');
    const group = row[groupColumn] || 'Untitled';
    if (Number.isFinite(time) && Number.isFinite(event)) grouped.set(group, [...(grouped.get(group) ?? []), { time, event: event > 0 ? 1 : 0 }]);
  }
  const colors = palettes[palette];
  const groups = [...grouped.entries()].map(([name, groupRows], index) => ({
    name,
    color: colors[index % colors.length],
    rows: groupRows.sort((a, b) => a.time - b.time),
    curve: kaplanMeier(groupRows),
  }));
  const logRank = logRankTest(groups);
  return {
    groups,
    p: logRank?.p ?? NaN,
    lines: logRank ? [`Log-rank chi-square = ${fmt(logRank.chiSquare)}`, `df = ${logRank.df}`] : ['Add at least two survival groups for log-rank testing.'],
  };
}

function kaplanMeier(rows: Array<{ time: number; event: number }>) {
  const sortedTimes = [...new Set(rows.map((row) => row.time))].sort((a, b) => a - b);
  let survival = 1;
  const curve: Point[] = [{ x: 0, y: 1 }];
  for (const time of sortedTimes) {
    const atRisk = rows.filter((row) => row.time >= time).length;
    const events = rows.filter((row) => row.time === time && row.event === 1).length;
    if (atRisk > 0 && events > 0) survival *= 1 - events / atRisk;
    curve.push({ x: time, y: survival });
  }
  return curve;
}

function logRankTest(groups: SurvivalGroup[]) {
  if (groups.length < 2) return null;
  const allRows = groups.flatMap((group) => group.rows.map((row) => ({ ...row, group: group.name })));
  const eventTimes = [...new Set(allRows.filter((row) => row.event === 1).map((row) => row.time))].sort((a, b) => a - b);
  const observed = new Map(groups.map((group) => [group.name, 0]));
  const expected = new Map(groups.map((group) => [group.name, 0]));
  for (const time of eventTimes) {
    const totalAtRisk = allRows.filter((row) => row.time >= time).length;
    const totalEvents = allRows.filter((row) => row.time === time && row.event === 1).length;
    for (const group of groups) {
      const atRisk = group.rows.filter((row) => row.time >= time).length;
      const events = group.rows.filter((row) => row.time === time && row.event === 1).length;
      observed.set(group.name, (observed.get(group.name) ?? 0) + events);
      expected.set(group.name, (expected.get(group.name) ?? 0) + (totalAtRisk > 0 ? (atRisk / totalAtRisk) * totalEvents : 0));
    }
  }
  const chiSquare = groups.reduce((sum, group) => {
    const o = observed.get(group.name) ?? 0;
    const e = expected.get(group.name) ?? 0;
    return e > 0 ? sum + (o - e) ** 2 / e : sum;
  }, 0);
  const df = groups.length - 1;
  return { chiSquare, df, p: 1 - jStat.chisquare.cdf(chiSquare, df) };
}

function pairedT(groups: CleanGroup[]) {
  if (groups.length !== 2) return null;
  const n = Math.min(groups[0].values.length, groups[1].values.length);
  if (n < 2) return null;
  const diffs = Array.from({ length: n }, (_, index) => groups[0].values[index] - groups[1].values[index]);
  const avg = mean(diffs);
  const deviation = sd(diffs);
  const t = avg / (deviation / Math.sqrt(n));
  const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 1));
  return { label: 'Paired t test', p, lines: [`Mean paired difference = ${fmt(avg)}`, `t = ${fmt(t)}, df = ${n - 1}`] };
}

function mannWhitney(groups: CleanGroup[]) {
  if (groups.length !== 2) return null;
  const [a, b] = groups;
  if (a.values.length < 1 || b.values.length < 1) return null;
  const ranked = rankValues([
    ...a.values.map((value) => ({ value, group: 0 })),
    ...b.values.map((value) => ({ value, group: 1 })),
  ]);
  const r1 = ranked.filter((item) => item.group === 0).reduce((sum, item) => sum + item.rank, 0);
  const n1 = a.values.length;
  const n2 = b.values.length;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u = Math.min(u1, n1 * n2 - u1);
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (u - mu) / sigma;
  const p = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  return { label: 'Mann-Whitney test', p, lines: [`U = ${fmt(u)}`, `Normal approximation z = ${fmt(z)}`] };
}

function oneWayAnova(groups: CleanGroup[]) {
  if (groups.length < 3 || groups.some((group) => group.values.length < 2)) return null;
  const all = groups.flatMap((group) => group.values);
  const grandMean = mean(all);
  const ssBetween = groups.reduce((sum, group) => sum + group.values.length * (mean(group.values) - grandMean) ** 2, 0);
  const ssWithin = groups.reduce(
    (sum, group) => sum + group.values.reduce((groupSum, value) => groupSum + (value - mean(group.values)) ** 2, 0),
    0,
  );
  const dfBetween = groups.length - 1;
  const dfWithin = all.length - groups.length;
  const f = (ssBetween / dfBetween) / (ssWithin / dfWithin);
  const p = 1 - jStat.centralF.cdf(f, dfBetween, dfWithin);
  const eta2 = ssBetween / (ssBetween + ssWithin);
  return { label: 'Ordinary one-way ANOVA', p, lines: [`F = ${fmt(f)}, df = ${dfBetween}/${dfWithin}`, `Eta squared = ${fmt(eta2)}`] };
}

function kruskalWallis(groups: CleanGroup[]) {
  if (groups.length < 3) return null;
  const ranked = rankValues(groups.flatMap((group, groupIndex) => group.values.map((value) => ({ value, group: groupIndex }))));
  const n = ranked.length;
  const h =
    (12 / (n * (n + 1))) *
      groups.reduce((sum, group, groupIndex) => {
        const rankSum = ranked.filter((item) => item.group === groupIndex).reduce((rankTotal, item) => rankTotal + item.rank, 0);
        return sum + rankSum ** 2 / group.values.length;
      }, 0) -
    3 * (n + 1);
  const p = 1 - jStat.chisquare.cdf(h, groups.length - 1);
  return { label: 'Kruskal-Wallis test', p, lines: [`H = ${fmt(h)}`, `df = ${groups.length - 1}`] };
}

function linearRegression(groups: CleanGroup[]) {
  const points = groups.flatMap((group) => group.points);
  if (points.length < 3) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xMean = mean(xs);
  const yMean = mean(ys);
  const ssX = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  const ssY = ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const ssXY = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
  const slope = ssXY / ssX;
  const intercept = yMean - slope * xMean;
  const r2 = ssXY ** 2 / (ssX * ssY);
  const t = slope / Math.sqrt(((1 - r2) * ssY) / (points.length - 2) / ssX);
  const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), points.length - 2));
  return { label: 'Linear regression', p, slope, intercept, lines: [`Y = ${fmt(slope)}X + ${fmt(intercept)}`, `R squared = ${fmt(r2)}`] };
}

function doseResponse(groups: CleanGroup[]) {
  const fits = groups
    .filter((group) => group.points.length >= 4)
    .map((group) => {
      const sorted = [...group.points].sort((a, b) => a.x - b.x);
      const bottom = Math.min(...sorted.map((point) => point.y));
      const top = Math.max(...sorted.map((point) => point.y));
      const halfway = bottom + (top - bottom) / 2;
      let ec50 = sorted[Math.floor(sorted.length / 2)].x;
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = sorted[i - 1];
        const next = sorted[i];
        if ((prev.y <= halfway && next.y >= halfway) || (prev.y >= halfway && next.y <= halfway)) {
          const fraction = (halfway - prev.y) / (next.y - prev.y);
          ec50 = prev.x + fraction * (next.x - prev.x);
          break;
        }
      }
      return `${group.name}: bottom ${fmt(bottom)}, top ${fmt(top)}, EC50 about ${fmt(ec50)}`;
    });
  if (!fits.length) return null;
  return { label: 'Dose-response estimate', p: NaN, lines: fits };
}

function runAnalysis(type: AnalysisType, groups: CleanGroup[]) {
  if (type === 'auto') return doseResponse(groups) ?? (groups.length === 2 ? welch(groups) : oneWayAnova(groups));
  if (type === 'welch') return welch(groups);
  if (type === 'paired') return pairedT(groups);
  if (type === 'mannWhitney') return mannWhitney(groups);
  if (type === 'anova') return oneWayAnova(groups);
  if (type === 'kruskal') return kruskalWallis(groups);
  if (type === 'linear') return linearRegression(groups);
  return doseResponse(groups);
}

function fmt(value: number) {
  if (!Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)) return value.toExponential(2);
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function pLabel(p: number) {
  if (!Number.isFinite(p)) return 'P not computed';
  if (p < 0.0001) return 'P < 0.0001';
  return `P = ${fmt(p)}`;
}

function errorValue(summary: Summary, errorBars: ErrorBars) {
  if (errorBars === 'sd') return summary.sd;
  if (errorBars === 'ci95') return summary.ci95;
  if (errorBars === 'sem') return summary.sem;
  return 0;
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCsv(groups: CleanGroup[]) {
  const maxLength = Math.max(...groups.map((group) => group.values.length), 0);
  const lines = [groups.map((group) => group.name).join(',')];
  for (let i = 0; i < maxLength; i += 1) lines.push(groups.map((group) => group.values[i] ?? '').join(','));
  return lines.join('\n');
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function normalizedRows(text: string, minRows = 2, minCols = 2) {
  const rows = splitRows(text);
  const height = Math.max(rows.length, minRows);
  const width = Math.max(...rows.map((row) => row.length), minCols);
  return Array.from({ length: height }, (_, rowIndex) =>
    Array.from({ length: width }, (_, columnIndex) => rows[rowIndex]?.[columnIndex] ?? ''),
  );
}

function updateCell(text: string, rowIndex: number, columnIndex: number, value: string) {
  const rows = normalizedRows(text);
  rows[rowIndex][columnIndex] = value;
  return rowsToCsv(rows);
}

function appendRow(text: string) {
  const rows = normalizedRows(text);
  rows.push(Array.from({ length: rows[0].length }, () => ''));
  return rowsToCsv(rows);
}

function appendColumn(text: string) {
  const rows = normalizedRows(text);
  const label = rows.length > 0 && rows[0][0] === 'Condition' ? `Rep ${rows[0].length}` : `Column ${rows[0].length + 1}`;
  rows.forEach((row, index) => row.push(index === 0 ? label : ''));
  return rowsToCsv(rows);
}

function wideToLong(text: string) {
  const rows = splitRows(text);
  if (rows.length < 2) return text;
  const header = rows[0];
  const lines = ['Group,Replicate,Value'];
  for (const row of rows.slice(1)) {
    const group = row[0] || 'Untitled';
    row.slice(1).forEach((cell, index) => {
      const value = toNumber(cell);
      if (Number.isFinite(value)) lines.push([escapeCsv(group), escapeCsv(header[index + 1] || `Rep ${index + 1}`), value].join(','));
    });
  }
  return lines.join('\n');
}

function transposeTable(text: string) {
  const rows = splitRows(text);
  const width = Math.max(...rows.map((row) => row.length), 0);
  return Array.from({ length: width }, (_, columnIndex) => rows.map((row) => escapeCsv(row[columnIndex] ?? '')).join(',')).join('\n');
}

function normalizeToFirstGroup(groups: CleanGroup[]) {
  if (!groups.length) return '';
  const controlMean = mean(groups[0].values);
  if (!Number.isFinite(controlMean) || controlMean === 0) return '';
  const maxLength = Math.max(...groups.map((group) => group.values.length), 0);
  const lines = [groups.map((group) => escapeCsv(group.name)).join(',')];
  for (let index = 0; index < maxLength; index += 1) {
    lines.push(groups.map((group) => (group.values[index] === undefined ? '' : fmt((group.values[index] / controlMean) * 100))).join(','));
  }
  return lines.join('\n');
}

function log10FirstNumericColumn(text: string) {
  const rows = splitRows(text);
  if (rows.length < 2) return text;
  const header = [...rows[0]];
  const columnIndex = header.findIndex((cell) => /dose|conc|concentration|x|time/i.test(cell));
  const target = columnIndex >= 0 ? columnIndex : rows[1].findIndex(looksNumeric);
  if (target < 0) return text;
  header[target] = `log10(${header[target] || 'X'})`;
  return [
    header.map(escapeCsv).join(','),
    ...rows.slice(1).map((row) => {
      const copy = [...row];
      const value = toNumber(copy[target] || '');
      copy[target] = value > 0 ? fmt(Math.log10(value)) : copy[target];
      return copy.map(escapeCsv).join(',');
    }),
  ].join('\n');
}

function importSuggestions(clean: CleanResult) {
  const suggestions = [`Detected ${clean.groups.length} data set${clean.groups.length === 1 ? '' : 's'} as ${clean.format.toLowerCase()}.`];
  if (clean.format.includes('Wide table')) suggestions.push('This is good for grouped scatter, bars, box plots, t tests, and ANOVA.');
  if (clean.roles.x) suggestions.push(`Use ${clean.roles.x} as X and ${clean.roles.y ?? 'response'} as Y for XY, dose-response, and regression graphs.`);
  if (clean.groups.length === 2) suggestions.push('Two groups detected: unpaired, paired, or nonparametric comparisons are available.');
  if (clean.groups.length > 2) suggestions.push('Three or more groups detected: ANOVA and Kruskal-Wallis are available now; post-tests belong in the engine roadmap.');
  if (clean.warnings.length) suggestions.push(...clean.warnings);
  return suggestions;
}

function applyGraphPreset(preset: GraphPreset, setSetting: <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => void) {
  if (preset === 'journal') {
    setSetting('fontSize', 12);
    setSetting('symbolSize', 5);
    setSetting('lineWidth', 1.8);
    setSetting('showGrid', true);
    setSetting('showPoints', true);
    setSetting('palette', 'editorial');
  }
  if (preset === 'talk') {
    setSetting('fontSize', 16);
    setSetting('symbolSize', 8);
    setSetting('lineWidth', 3);
    setSetting('showGrid', false);
    setSetting('showPoints', true);
    setSetting('palette', 'bright');
  }
  if (preset === 'poster') {
    setSetting('fontSize', 18);
    setSetting('symbolSize', 9);
    setSetting('lineWidth', 3.6);
    setSetting('barWidth', 0.68);
    setSetting('showLegend', true);
    setSetting('palette', 'colourblind');
  }
  if (preset === 'minimal') {
    setSetting('fontSize', 13);
    setSetting('symbolSize', 6);
    setSetting('lineWidth', 2);
    setSetting('showGrid', false);
    setSetting('showLegend', false);
    setSetting('palette', 'mono');
  }
}

function defaultSetupForKind(kind: TableKind): TableSetup {
  if (kind === 'xy' || kind === 'dose') return { groups: 2, replicates: 3, subcolumns: 1, xPoints: 7, paired: false, repeatedMeasures: true };
  if (kind === 'survival') return { groups: 2, replicates: 8, subcolumns: 1, xPoints: 6, paired: false, repeatedMeasures: false };
  if (kind === 'multiple') return { groups: 2, replicates: 6, subcolumns: 4, xPoints: 1, paired: false, repeatedMeasures: false };
  return defaultSetup;
}

function groupName(index: number) {
  if (index === 0) return 'Control';
  if (index === 1) return 'Treatment A';
  if (index === 2) return 'Treatment B';
  return `Treatment ${index + 1}`;
}

function syntheticValue(groupIndex: number, replicateIndex: number, subIndex = 0) {
  const base = 4.2 + groupIndex * 0.85 + subIndex * 0.35;
  const wobble = ((replicateIndex % 3) - 1) * 0.22 + Math.sin((groupIndex + 1) * (replicateIndex + 2)) * 0.12;
  return fmt(base + wobble);
}

function generateTable(kind: TableKind, setup: TableSetup) {
  const groups = Math.max(1, Math.min(setup.groups, 12));
  const replicates = Math.max(1, Math.min(setup.replicates, 24));
  const subcolumns = Math.max(1, Math.min(setup.subcolumns, 8));
  const xPoints = Math.max(2, Math.min(setup.xPoints, 24));

  if (kind === 'xy') {
    const lines = ['Time,Response,Series'];
    for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
      for (let xIndex = 0; xIndex < xPoints; xIndex += 1) {
        const value = 1 + groupIndex * 0.45 + xIndex * (0.55 + groupIndex * 0.16) + Math.sin(xIndex + groupIndex) * 0.1;
        lines.push([xIndex, fmt(value), groupName(groupIndex)].join(','));
      }
    }
    return lines.join('\n');
  }

  if (kind === 'dose') {
    const doses = Array.from({ length: xPoints }, (_, index) => 10 ** (-3 + index * (3 / Math.max(xPoints - 1, 1))));
    const lines = ['Concentration,Response,Compound'];
    for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
      const ec50 = 0.035 + groupIndex * 0.04;
      for (const dose of doses) {
        const response = 5 + 92 / (1 + (ec50 / dose) ** 1.15);
        lines.push([fmt(dose), fmt(response), groupName(groupIndex)].join(','));
      }
    }
    return lines.join('\n');
  }

  if (kind === 'survival') {
    const lines = ['Time,Event,Group'];
    for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
      for (let replicateIndex = 0; replicateIndex < replicates; replicateIndex += 1) {
        const time = 2 + replicateIndex * 2 + groupIndex;
        const event = replicateIndex % 4 === 0 ? 0 : 1;
        lines.push([time, event, groupName(groupIndex)].join(','));
      }
    }
    return lines.join('\n');
  }

  if (kind === 'multiple') {
    const headers = ['Sample', 'Group', ...Array.from({ length: subcolumns }, (_, index) => `Variable ${index + 1}`)];
    const lines = [headers.join(',')];
    for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
      for (let replicateIndex = 0; replicateIndex < replicates; replicateIndex += 1) {
        lines.push([
          `${groupName(groupIndex).replace(/\s+/g, '')}-${replicateIndex + 1}`,
          groupName(groupIndex),
          ...Array.from({ length: subcolumns }, (_, subIndex) => syntheticValue(groupIndex, replicateIndex, subIndex)),
        ].join(','));
      }
    }
    return lines.join('\n');
  }

  if (kind === 'column') {
    const headers = Array.from({ length: groups }, (_, index) => groupName(index));
    const lines = [headers.join(',')];
    for (let replicateIndex = 0; replicateIndex < replicates; replicateIndex += 1) {
      lines.push(headers.map((_, groupIndex) => syntheticValue(groupIndex, replicateIndex)).join(','));
    }
    return lines.join('\n');
  }

  const headers = ['Condition', ...Array.from({ length: replicates * subcolumns }, (_, index) => `Rep ${index + 1}`)];
  const lines = [headers.join(',')];
  for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
    lines.push([groupName(groupIndex), ...Array.from({ length: replicates * subcolumns }, (_, replicateIndex) => syntheticValue(groupIndex, replicateIndex))].join(','));
  }
  return lines.join('\n');
}

function tableKindDefaults(kind: TableKind, setup = defaultSetupForKind(kind)) {
  if (kind === 'xy') {
    return {
      data: generateTable(kind, setup),
      graphMode: 'line' as GraphMode,
      analysisType: 'linear' as AnalysisType,
      title: 'Response over time',
      xLabel: 'Time',
      yLabel: 'Response',
    };
  }
  if (kind === 'dose') {
    return {
      data: generateTable(kind, setup),
      graphMode: 'dose' as GraphMode,
      analysisType: 'dose' as AnalysisType,
      title: 'Dose response by compound',
      xLabel: 'Concentration',
      yLabel: 'Response',
    };
  }
  if (kind === 'survival') {
    return {
      data: generateTable(kind, setup),
      graphMode: 'survival' as GraphMode,
      analysisType: 'survival' as AnalysisType,
      title: 'Survival by group',
      xLabel: 'Time',
      yLabel: 'Survival probability',
    };
  }
  return {
    data: generateTable(kind, setup),
    graphMode: kind === 'column' ? ('scatter' as GraphMode) : ('bar' as GraphMode),
    analysisType: 'auto' as AnalysisType,
    title: kind === 'column' ? 'Column data by treatment' : 'Grouped data by treatment',
    xLabel: 'Condition',
    yLabel: 'Response',
  };
}

function Plot({ groups, mode, settings }: { groups: CleanGroup[]; mode: GraphMode; settings: GraphSettings }) {
  const stats = summaries(groups);
  const comparisonBars = settings.showPValues
    ? pairwiseComparisons(groups)
        .sort((a, b) => a.adjustedP - b.adjustedP)
        .slice(0, 3)
    : [];
  const width = 900;
  const height = 560;
  const margin = { top: 68, right: settings.showLegend ? 150 : 34, bottom: 104, left: 82 };
  const xyMode = mode === 'dose' || (mode === 'line' && groups.some((group) => group.points.length > 2));
  const yValues = groups.flatMap((group) => group.values);
  const xValues = xyMode ? groups.flatMap((group) => group.points.map((point) => point.x)) : groups.map((_, index) => index + 1);
  const minY = Math.min(0, ...yValues);
  const maxY = Math.max(...yValues, 1);
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 1);
  const ySpan = maxY - minY || 1;
  const xSpan = maxX - minX || 1;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const y = (value: number) => margin.top + plotH - ((value - minY) / ySpan) * plotH;
  const xCat = (index: number) => margin.left + (plotW / Math.max(groups.length, 1)) * (index + 0.5);
  const xVal = (value: number) => margin.left + ((value - minX) / xSpan) * plotW;
  const band = plotW / Math.max(groups.length, 1);
  const yTicks = Array.from({ length: 5 }, (_, index) => minY + (ySpan * index) / 4);
  const xTicks = xyMode ? Array.from({ length: 5 }, (_, index) => minX + (xSpan * index) / 4) : [];

  return (
    <svg id="export-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={settings.title} className="plot">
      <rect width={width} height={height} fill="#ffffff" />
      <text x={margin.left} y={34} className="plot-title" style={{ fontSize: settings.fontSize + 8 }}>
        {settings.title}
      </text>
      {settings.showGrid &&
        yTicks.map((tick) => (
          <line key={tick} x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="grid-line" />
        ))}
      {yTicks.map((tick) => (
        <text key={`label-${tick}`} x={margin.left - 12} y={y(tick) + 4} textAnchor="end" className="axis-label" style={{ fontSize: settings.fontSize }}>
          {fmt(tick)}
        </text>
      ))}
      {xTicks.map((tick) => (
        <text key={tick} x={xVal(tick)} y={height - margin.bottom + 28} textAnchor="middle" className="axis-label" style={{ fontSize: settings.fontSize }}>
          {fmt(tick)}
        </text>
      ))}
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} className="axis-line" />
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} className="axis-line" />

      {mode === 'line' && !xyMode && (
        <polyline
          points={stats.map((summary, index) => `${xCat(index)},${y(summary.mean)}`).join(' ')}
          fill="none"
          stroke="#30343f"
          strokeWidth={settings.lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {groups.map((group, groupIndex) => {
        const summary = stats[groupIndex];
        const center = xCat(groupIndex);
        const jitterStep = Math.min(16, band / Math.max(group.values.length + 1, 4));
        const error = errorValue(summary, settings.errorBars);
        const points = group.points.length ? group.points : group.values.map((value, index) => ({ x: index + 1, y: value }));
        const linePoints = points.map((point) => `${xyMode ? xVal(point.x) : xCat(groupIndex)},${y(point.y)}`).join(' ');
        return (
          <g key={group.name}>
            {((mode === 'line' && xyMode) || mode === 'dose') && (
              <polyline points={linePoints} fill="none" stroke={group.color} strokeWidth={settings.lineWidth} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {mode === 'bar' && (
              <>
                <rect
                  x={center - (band * settings.barWidth) / 2}
                  y={y(summary.mean)}
                  width={band * settings.barWidth}
                  height={Math.max(1, y(minY) - y(summary.mean))}
                  fill={group.color}
                  opacity="0.82"
                />
                {settings.errorBars !== 'none' && (
                  <>
                    <line x1={center} x2={center} y1={y(summary.mean - error)} y2={y(summary.mean + error)} className="error-line" />
                    <line x1={center - 10} x2={center + 10} y1={y(summary.mean + error)} y2={y(summary.mean + error)} className="error-line" />
                    <line x1={center - 10} x2={center + 10} y1={y(summary.mean - error)} y2={y(summary.mean - error)} className="error-line" />
                  </>
                )}
              </>
            )}
            {mode === 'box' && (
              <>
                <rect
                  x={center - band * 0.22}
                  y={y(summary.q3)}
                  width={band * 0.44}
                  height={Math.max(1, y(summary.q1) - y(summary.q3))}
                  fill={group.color}
                  opacity="0.22"
                  stroke={group.color}
                  strokeWidth="2"
                />
                <line x1={center - band * 0.22} x2={center + band * 0.22} y1={y(summary.median)} y2={y(summary.median)} stroke={group.color} strokeWidth="3" />
                <line x1={center} x2={center} y1={y(summary.min)} y2={y(summary.q1)} className="error-line" />
                <line x1={center} x2={center} y1={y(summary.max)} y2={y(summary.q3)} className="error-line" />
              </>
            )}
            {settings.showPoints &&
              points.map((point, valueIndex) => {
                const offset = (valueIndex - (points.length - 1) / 2) * jitterStep;
                return (
                  <circle
                    key={`${group.name}-${valueIndex}`}
                    cx={xyMode ? xVal(point.x) : center + (mode === 'bar' ? offset * 0.55 : offset)}
                    cy={xyMode ? y(point.y) : y(point.y)}
                    r={settings.symbolSize}
                    fill={mode === 'bar' ? '#ffffff' : group.color}
                    stroke={group.color}
                    strokeWidth="2"
                    opacity="0.94"
                  />
                );
              })}
            {!xyMode && (
              <>
                <text x={center} y={height - margin.bottom + 30} textAnchor="middle" className="group-label" style={{ fontSize: settings.fontSize }}>
                  {group.name}
                </text>
                <text x={center} y={height - margin.bottom + 52} textAnchor="middle" className="axis-label" style={{ fontSize: settings.fontSize - 1 }}>
                  n={group.values.length}
                </text>
              </>
            )}
          </g>
        );
      })}
      {!xyMode &&
        comparisonBars.map((comparison, index) => {
          const left = groups.findIndex((group) => group.name === comparison.a);
          const right = groups.findIndex((group) => group.name === comparison.b);
          if (left < 0 || right < 0) return null;
          const x1 = xCat(left);
          const x2 = xCat(right);
          const yBar = margin.top + 18 + index * 24;
          return (
            <g key={`${comparison.a}-${comparison.b}-bar`}>
              <line x1={x1} x2={x1} y1={yBar + 8} y2={yBar + 16} className="pvalue-line" />
              <line x1={x1} x2={x2} y1={yBar + 8} y2={yBar + 8} className="pvalue-line" />
              <line x1={x2} x2={x2} y1={yBar + 8} y2={yBar + 16} className="pvalue-line" />
              <text x={(x1 + x2) / 2} y={yBar} textAnchor="middle" className="pvalue-label" style={{ fontSize: settings.fontSize - 1 }}>
                {pLabel(comparison.adjustedP)}
              </text>
            </g>
          );
        })}
      <text x={margin.left + plotW / 2} y={height - 22} textAnchor="middle" className="axis-title" style={{ fontSize: settings.fontSize + 1 }}>
        {settings.xLabel}
      </text>
      <text transform={`translate(24 ${margin.top + plotH / 2}) rotate(-90)`} textAnchor="middle" className="axis-title" style={{ fontSize: settings.fontSize + 1 }}>
        {settings.yLabel}
      </text>
      {settings.showLegend &&
        groups.map((group, index) => (
          <g key={`legend-${group.name}`} transform={`translate(${width - margin.right + 28} ${margin.top + index * 26})`}>
            <circle cx="0" cy="0" r="6" fill={group.color} />
            <text x="14" y="5" className="axis-label" style={{ fontSize: settings.fontSize }}>
              {group.name}
            </text>
          </g>
        ))}
    </svg>
  );
}

function SurvivalPlot({ survival, settings }: { survival: ReturnType<typeof survivalFromRows>; settings: GraphSettings }) {
  const width = 900;
  const height = 620;
  const margin = { top: 68, right: settings.showLegend ? 150 : 36, bottom: 168, left: 82 };
  const allTimes = survival.groups.flatMap((group) => group.rows.map((row) => row.time));
  const maxTime = Math.max(...allTimes, 1);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const x = (value: number) => margin.left + (value / maxTime) * plotW;
  const y = (value: number) => margin.top + plotH - value * plotH;
  const ticks = Array.from({ length: 5 }, (_, index) => (maxTime * index) / 4);
  const riskTimes = Array.from({ length: 5 }, (_, index) => Math.round((maxTime * index) / 4));

  return (
    <svg id="export-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={settings.title} className="plot survival-plot">
      <rect width={width} height={height} fill="#ffffff" />
      <text x={margin.left} y={34} className="plot-title" style={{ fontSize: settings.fontSize + 8 }}>
        {settings.title}
      </text>
      {ticks.map((tick) => (
        <g key={tick}>
          {settings.showGrid && <line x1={x(tick)} x2={x(tick)} y1={margin.top} y2={height - margin.bottom} className="grid-line" />}
          <text x={x(tick)} y={height - margin.bottom + 28} textAnchor="middle" className="axis-label" style={{ fontSize: settings.fontSize }}>
            {fmt(tick)}
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          {settings.showGrid && <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="grid-line" />}
          <text x={margin.left - 12} y={y(tick) + 4} textAnchor="end" className="axis-label" style={{ fontSize: settings.fontSize }}>
            {fmt(tick)}
          </text>
        </g>
      ))}
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} className="axis-line" />
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} className="axis-line" />
      {survival.groups.map((group) => (
        <polyline
          key={group.name}
          points={group.curve.map((point) => `${x(point.x)},${y(point.y)}`).join(' ')}
          fill="none"
          stroke={group.color}
          strokeWidth={settings.lineWidth}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      ))}
      <text x={margin.left + plotW / 2} y={height - 76} textAnchor="middle" className="axis-title" style={{ fontSize: settings.fontSize + 1 }}>
        {settings.xLabel}
      </text>
      <text transform={`translate(24 ${margin.top + plotH / 2}) rotate(-90)`} textAnchor="middle" className="axis-title" style={{ fontSize: settings.fontSize + 1 }}>
        {settings.yLabel}
      </text>
      <text x={margin.left} y={height - 122} className="risk-title" style={{ fontSize: settings.fontSize }}>
        Number at risk
      </text>
      {riskTimes.map((time) => (
        <text key={`risk-time-${time}`} x={x(time)} y={height - 104} textAnchor="middle" className="axis-label" style={{ fontSize: settings.fontSize - 1 }}>
          {time}
        </text>
      ))}
      {survival.groups.map((group, groupIndex) => (
        <g key={`risk-${group.name}`}>
          <text x={margin.left - 10} y={height - 80 + groupIndex * 22} textAnchor="end" className="axis-label" fill={group.color} style={{ fontSize: settings.fontSize - 1 }}>
            {group.name}
          </text>
          {riskTimes.map((time) => (
            <text key={`${group.name}-${time}`} x={x(time)} y={height - 80 + groupIndex * 22} textAnchor="middle" className="axis-label" style={{ fontSize: settings.fontSize - 1 }}>
              {group.rows.filter((row) => row.time >= time).length}
            </text>
          ))}
        </g>
      ))}
      {settings.showLegend &&
        survival.groups.map((group, index) => (
          <g key={`legend-${group.name}`} transform={`translate(${width - margin.right + 28} ${margin.top + index * 26})`}>
            <circle cx="0" cy="0" r="6" fill={group.color} />
            <text x="14" y="5" className="axis-label" style={{ fontSize: settings.fontSize }}>
              {group.name}
            </text>
          </g>
        ))}
    </svg>
  );
}

function SelectRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeRow({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
      <strong>{value}</strong>
    </label>
  );
}

function StepperRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const setClamped = (next: number) => onChange(Math.max(min, Math.min(max, next)));
  const step = (next: number) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setClamped(next);
  };
  return (
    <div className="stepper-row" role="group" aria-label={label}>
      <span>{label}</span>
      <button type="button" onPointerDown={step(value - 1)} aria-label={`Decrease ${label}`}>
        -
      </button>
      <input type="number" min={min} max={max} value={value} onChange={(event) => setClamped(Number(event.target.value))} />
      <button type="button" onPointerDown={step(value + 1)} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

function EditableDataGrid({ rawData, onChange }: { rawData: string; onChange: (value: string) => void }) {
  const rows = normalizedRows(rawData, 4, 4);
  const visibleRows = rows.slice(0, 16);
  const visibleWidth = Math.min(Math.max(...visibleRows.map((row) => row.length), 4), 12);
  return (
    <div className="editable-table">
      <div className="table-actions">
        <button onClick={() => onChange(appendRow(rawData))}>Add row</button>
        <button onClick={() => onChange(appendColumn(rawData))}>Add column</button>
      </div>
      <div className="editable-grid" style={{ gridTemplateColumns: `repeat(${visibleWidth}, minmax(96px, 1fr))` }}>
        {visibleRows.map((row, rowIndex) =>
          Array.from({ length: visibleWidth }, (_, columnIndex) => (
            <input
              key={`${rowIndex}-${columnIndex}`}
              className={rowIndex === 0 ? 'header-cell' : ''}
              value={row[columnIndex] ?? ''}
              onChange={(event) => onChange(updateCell(rawData, rowIndex, columnIndex, event.target.value))}
              aria-label={`Row ${rowIndex + 1} column ${columnIndex + 1}`}
            />
          )),
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [rawData, setRawData] = useState(groupedSample);
  const [activeSheet, setActiveSheet] = useState<Sheet>('graph');
  const [graphMode, setGraphMode] = useState<GraphMode>('scatter');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('auto');
  const [tableKind, setTableKind] = useState<TableKind>('grouped');
  const [tableSetup, setTableSetup] = useState<TableSetup>(defaultSetupForKind('grouped'));
  const [assistantPrompt, setAssistantPrompt] = useState('Turn this into the right table for a grouped bar graph with raw points.');
  const [labNotes, setLabNotes] = useState('Aim: compare response across conditions.\n\nDesign notes:\n- Check whether replicates are independent biological replicates.\n- Record exclusions before analysis.\n- Export graph and JSON together for reproducibility.');
  const [settings, setSettings] = useState<GraphSettings>(defaultSettings);
  const clean = useMemo(() => parseSmartInput(rawData, settings.palette), [rawData, settings.palette]);
  const survival = useMemo(() => survivalFromRows(clean.rows, settings.palette), [clean.rows, settings.palette]);
  const stats = useMemo(() => summaries(clean.groups), [clean.groups]);
  const analysis = useMemo(() => runAnalysis(analysisType, clean.groups), [analysisType, clean.groups]);
  const displayedAnalysis =
    analysisType === 'survival'
      ? { label: 'Kaplan-Meier survival analysis', p: survival.p, lines: survival.lines }
      : analysis;
  const pairwise = useMemo(() => pairwiseComparisons(clean.groups), [clean.groups]);
  const suggestions = useMemo(() => importSuggestions(clean), [clean]);
  const setSetting = <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  const exportSvg = () => {
    const svg = document.getElementById('export-plot');
    if (!svg) return;
    download('biograph-studio-plot.svg', new XMLSerializer().serializeToString(svg), 'image/svg+xml');
  };
  const exportJson = () => {
    download('biograph-studio-analysis.json', JSON.stringify({ settings, graphMode, analysisType, import: clean, summaries: stats, analysis }, null, 2), 'application/json');
  };
  const applyTableKind = (kind: TableKind) => {
    const nextSetup = defaultSetupForKind(kind);
    const defaults = tableKindDefaults(kind, nextSetup);
    setTableKind(kind);
    setTableSetup(nextSetup);
    setRawData(defaults.data);
    setGraphMode(defaults.graphMode);
    setAnalysisType(defaults.analysisType);
    setSetting('title', defaults.title);
    setSetting('xLabel', defaults.xLabel);
    setSetting('yLabel', defaults.yLabel);
    setActiveSheet('data');
  };
  const updateTableSetup = <K extends keyof TableSetup>(key: K, value: TableSetup[K]) => setTableSetup((current) => ({ ...current, [key]: value }));
  const regenerateTable = () => {
    const defaults = tableKindDefaults(tableKind, tableSetup);
    setRawData(defaults.data);
    setGraphMode(defaults.graphMode);
    setAnalysisType(defaults.analysisType);
    setSetting('title', defaults.title);
    setSetting('xLabel', defaults.xLabel);
    setSetting('yLabel', defaults.yLabel);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>BioGraph Studio</h1>
          <p>Workbook statistics and publication figures for biological data.</p>
        </div>
        <div className="toolbar">
          <button onClick={() => setRawData(groupedSample)} title="Load grouped sample">
            <RefreshCw size={17} />
            Grouped
          </button>
          <button
            onClick={() => {
              setRawData(doseSample);
              setGraphMode('dose');
              setAnalysisType('dose');
              setSetting('title', 'Dose response by compound');
              setSetting('xLabel', 'Concentration');
            }}
            title="Load dose-response sample"
          >
            <FlaskConical size={17} />
            Dose
          </button>
          <button onClick={exportSvg} title="Download SVG">
            <Download size={17} />
            SVG
          </button>
          <button onClick={() => download('biograph-studio-data.csv', buildCsv(clean.groups), 'text/csv')} title="Download cleaned CSV">
            <FileSpreadsheet size={17} />
            CSV
          </button>
          <button onClick={exportJson} title="Download analysis JSON">
            <FileJson size={17} />
            JSON
          </button>
        </div>
      </header>
      <nav className="classic-actions" aria-label="Classic workbook actions">
        <button onClick={() => setActiveSheet('data')}>
          <Plus size={17} />
          New Table & Graph
        </button>
        <button onClick={() => setActiveSheet('analysis')}>
          <Sigma size={17} />
          Analyze
        </button>
        <button onClick={() => setActiveSheet('graph')}>
          <BarChart3 size={17} />
          Change Graph Type
        </button>
        <button onClick={() => setActiveSheet('graph')}>
          <Settings2 size={17} />
          Format Graph
        </button>
      </nav>

      <section className="workbench">
        <aside className="navigator">
          <div className="nav-title">Project</div>
          {[
            ['data', Table2, 'Data tables'],
            ['analysis', Sigma, 'Analyses'],
            ['graph', BarChart3, 'Graphs'],
            ['layout', FileText, 'Layouts'],
            ['notes', FileText, 'Notes'],
            ['tutorials', Sparkles, 'Tutorials'],
            ['map', Sparkles, 'Feature map'],
          ].map(([id, Icon, label]) => (
            <button key={id as string} className={activeSheet === id ? 'active' : ''} onClick={() => setActiveSheet(id as Sheet)}>
              <Icon size={17} />
              {label as string}
            </button>
          ))}
          <div className="detected-card">
            <strong>{clean.groups.length}</strong>
            <span>detected data sets</span>
          </div>
        </aside>

        <section className="main-sheet">
          <div className="workflow-strip" aria-label="Workflow">
            {[
              ['1', 'Paste data', clean.rows.length ? 'done' : 'todo'],
              ['2', 'Choose analysis', displayedAnalysis ? 'done' : 'todo'],
              ['3', 'Style graph', clean.groups.length || survival.groups.length ? 'done' : 'todo'],
              ['4', 'Export figure', 'ready'],
            ].map(([step, label, state]) => (
              <div key={step} className={state}>
                <strong>{step}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="sheet-tabs" role="tablist" aria-label="Graph style">
            {graphModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button key={mode.id} className={graphMode === mode.id ? 'active' : ''} onClick={() => setGraphMode(mode.id)} title={`${mode.label} plot`}>
                  <Icon size={17} />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {activeSheet === 'data' && (
            <div className="data-sheet">
              <div className="sheet-heading">
                <h2>New Table & Graph</h2>
                <span>{clean.format}</span>
              </div>
              <div className="table-kind-panel">
                <div className="starter-heading">
                  <span className="eyebrow">Choose table type</span>
                  <strong>Start the way scientific graphing users expect.</strong>
                </div>
                <div className="table-kind-grid">
                  {tableKinds.map((kind) => (
                    <button
                      key={kind.id}
                      aria-label={`${kind.label} table. ${kind.detail} ${kind.status}.`}
                      className={tableKind === kind.id ? 'active' : ''}
                      onClick={() => applyTableKind(kind.id)}
                    >
                      <span className="kind-title">
                        <Table2 size={15} />
                        <strong>{kind.label}</strong>
                        <em>{kind.status}</em>
                      </span>
                      <span>{kind.detail}</span>
                    </button>
                  ))}
                </div>
                <div className="setup-grid">
                  <StepperRow label="Groups" value={tableSetup.groups} min={1} max={12} onChange={(value) => updateTableSetup('groups', value)} />
                  <StepperRow label="Replicates" value={tableSetup.replicates} min={1} max={24} onChange={(value) => updateTableSetup('replicates', value)} />
                  <StepperRow label="Subcolumns" value={tableSetup.subcolumns} min={1} max={8} onChange={(value) => updateTableSetup('subcolumns', value)} />
                  <StepperRow label="X values" value={tableSetup.xPoints} min={2} max={24} onChange={(value) => updateTableSetup('xPoints', value)} />
                  <label className="toggle-row">
                    <input type="checkbox" checked={tableSetup.paired} onChange={(event) => updateTableSetup('paired', event.target.checked)} />
                    Matched or paired values
                  </label>
                  <label className="toggle-row">
                    <input type="checkbox" checked={tableSetup.repeatedMeasures} onChange={(event) => updateTableSetup('repeatedMeasures', event.target.checked)} />
                    Repeated measures over X
                  </label>
                  <button className="primary-action" onClick={regenerateTable}>
                    Generate table
                  </button>
                </div>
              </div>
              <div className="assistant-panel">
                <div>
                  <span className="eyebrow">Smart import assistant</span>
                  <strong>Paste anything. Keep the workbook shape familiar.</strong>
                  <p>This is the front-end contract for a future AI parser: infer roles, clean labels, reshape tables, and explain the statistical consequences before anything is plotted.</p>
                </div>
                <label>
                  Assistant instruction
                  <input value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} />
                </label>
                <div className="assistant-actions">
                  <button onClick={() => setRawData(wideToLong(rawData))}>Wide to long</button>
                  <button onClick={() => setRawData(transposeTable(rawData))}>Transpose</button>
                  <button
                    onClick={() => {
                      const normalized = normalizeToFirstGroup(clean.groups);
                      if (normalized) {
                        setRawData(normalized);
                        setSetting('yLabel', `% of ${clean.groups[0]?.name ?? 'control'}`);
                      }
                    }}
                  >
                    Normalize to first group
                  </button>
                  <button onClick={() => setRawData(log10FirstNumericColumn(rawData))}>Log10 X</button>
                </div>
              </div>
              <div className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <div key={suggestion}>
                    <Sparkles size={14} />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
              <div className="sheet-heading compact-heading">
                <h2>Data Table</h2>
                <span>Edit cells directly or paste into raw CSV.</span>
              </div>
              <EditableDataGrid rawData={rawData} onChange={setRawData} />
              <textarea value={rawData} onChange={(event) => setRawData(event.target.value)} spellCheck={false} aria-label="Raw pasted table" />
            </div>
          )}

          {activeSheet === 'analysis' && (
            <div className="analysis-sheet">
              <div className="sheet-heading">
                <h2>Analyze Data</h2>
                <span>{displayedAnalysis?.label ?? 'No compatible test yet'}</span>
              </div>
              <div className="analysis-grid">
                {analyses.map((item) => (
                  <button key={item.id} className={analysisType === item.id ? 'analysis-card active' : 'analysis-card'} onClick={() => setAnalysisType(item.id)}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                ))}
              </div>
              <div className="result-panel">
                <span className="eyebrow">Result</span>
                {displayedAnalysis ? (
                  <>
                    <strong>{displayedAnalysis.label}</strong>
                    <b>{pLabel(displayedAnalysis.p)}</b>
                    {displayedAnalysis.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </>
                ) : (
                  <span>This analysis is not compatible with the current table.</span>
                )}
              </div>
              {analysisType !== 'survival' && pairwise.length > 0 && (
                <div className="comparison-panel">
                  <div className="sheet-heading compact-heading">
                    <h2>Multiple Comparisons</h2>
                    <span>Welch pairwise tests with Holm adjustment</span>
                  </div>
                  <div className="comparison-table">
                    <strong>Comparison</strong>
                    <strong>Difference</strong>
                    <strong>P value</strong>
                    <strong>Adjusted P</strong>
                    {pairwise.map((row) => (
                      <Fragment key={`${row.a}-${row.b}`}>
                        <span key={`${row.a}-${row.b}-name`}>{row.a} vs {row.b}</span>
                        <span key={`${row.a}-${row.b}-diff`}>{fmt(row.difference)}</span>
                        <span key={`${row.a}-${row.b}-p`}>{pLabel(row.p)}</span>
                        <span key={`${row.a}-${row.b}-adj`}>{pLabel(row.adjustedP)}</span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}
              <div className="analysis-roadmap">
                {[
                  ['Implemented in-browser', 'Descriptives, t tests, Mann-Whitney, one-way ANOVA, Kruskal-Wallis, linear regression, dose estimates.'],
                  ['Next statistical engine', 'Multiple comparisons, two-way/repeated-measures/mixed-effects models, nonlinear regression, survival, PCA.'],
                  ['AI guidance layer', 'Explains assumptions, suggests tests, reshapes tables, writes methods text, and flags design problems before analysis.'],
                ].map(([title, detail]) => (
                  <div key={title}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSheet === 'graph' && (
            <div className="graph-sheet">
              <div className="graph-workspace">
                <div className="sheet-heading">
                  <h2>Change Graph Type</h2>
                  <span>Linked to the selected data table</span>
                </div>
                {graphMode === 'survival' && survival.groups.length > 0 ? (
                  <SurvivalPlot survival={survival} settings={settings} />
                ) : clean.groups.length > 0 ? (
                  <Plot groups={clean.groups} mode={graphMode} settings={settings} />
                ) : (
                  <div className="empty-state">No plottable numeric groups detected.</div>
                )}
              </div>
            </div>
          )}

          {activeSheet === 'layout' && (
            <div className="layout-sheet">
              <div className="sheet-heading">
                <h2>Figure Layout</h2>
                <span>Export-ready composition controls</span>
              </div>
              <div className="layout-grid">
                {[
                  ['Single figure', 'One graph with legend and axis labels.'],
                  ['Two-panel figure', 'Graph plus analysis summary table.'],
                  ['Four-panel figure', 'Designed for assay panels or figure supplements.'],
                  ['Slide figure', 'Large typography and simple legend for talks.'],
                ].map(([title, detail]) => (
                  <button key={title} onClick={() => applyGraphPreset(title.includes('Slide') ? 'talk' : title.includes('Single') ? 'journal' : 'poster', setSetting)}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </button>
                ))}
              </div>
              <div className="layout-preview">
                <div>
                  <strong>Panel A</strong>
                  <span>{settings.title}</span>
                </div>
                <div>
                  <strong>Analysis</strong>
                  <span>{displayedAnalysis?.label ?? 'No compatible analysis'} - {displayedAnalysis ? pLabel(displayedAnalysis.p) : clean.format}</span>
                </div>
                <div>
                  <strong>Export package</strong>
                  <span>SVG figure, cleaned CSV, JSON analysis record.</span>
                </div>
              </div>
            </div>
          )}

          {activeSheet === 'notes' && (
            <div className="notes-sheet">
              <div className="sheet-heading">
                <h2>Notebook & Audit Trail</h2>
                <span>Methods text starts here</span>
              </div>
              <textarea value={labNotes} onChange={(event) => setLabNotes(event.target.value)} aria-label="Lab notes" />
              <div className="audit-grid">
                {[
                  ['Table', `${tableKind} · ${tableSetup.groups} groups · ${tableSetup.replicates} replicates`],
                  ['Design', `${tableSetup.paired ? 'paired' : 'unpaired'} · ${tableSetup.repeatedMeasures ? 'repeated measures' : 'independent groups'}`],
                  ['Import', clean.format],
                  ['Graph', `${graphMode} · ${settings.palette} palette · ${settings.errorBars.toUpperCase()} error bars`],
                  ['Analysis', displayedAnalysis ? `${displayedAnalysis.label}; ${pLabel(displayedAnalysis.p)}` : 'No compatible analysis yet'],
                  ['Data sets', clean.groups.map((group) => `${group.name} n=${group.values.length}`).join('; ')],
                ].map(([title, detail]) => (
                  <div key={title}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSheet === 'tutorials' && (
            <div className="tutorial-sheet">
              <div className="sheet-heading">
                <h2>Tutorials & AI Guidance</h2>
                <span>Built-in help for common biology figures</span>
              </div>
              <div className="tutorial-grid">
                {[
                  ['Grouped bar with raw points', 'Choose Grouped, set groups/replicates, generate table, pick Bar, turn on P value bars.'],
                  ['Dose-response curve', 'Choose Dose-response, set X values, generate table, use Dose graph and dose-response analysis.'],
                  ['Kaplan-Meier survival', 'Choose Survival, enter Time/Event/Group, use Survival graph, read the number-at-risk table below the curve.'],
                  ['Fix pasted data', 'Paste into raw CSV, then use Wide to long, Transpose, Normalize, or Log10 X before analysis.'],
                  ['Make it publication-ready', 'Use Journal preset, show raw points, set error bars, export SVG and JSON together.'],
                  ['AI assistant contract', 'Future server-side AI should reshape data, explain assumptions, suggest tests, and produce methods text.'],
                ].map(([title, detail]) => (
                  <div key={title}>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSheet === 'map' && (
            <div className="feature-map">
              <h2>Build Coverage</h2>
              {[
                ['Ready now', 'Column/grouped/XY/dose/survival starters, KM curves, risk tables, smart paste, graph presets, exports, core tests.'],
                ['Partial now', 'Multiple-variable tables have starters and audit capture, but engine calculations need backend support.'],
                ['Engine target', 'Two-way/repeated/mixed models, nonlinear regression, multiple comparisons, survival curves, PCA.'],
                ['AI target', 'Natural-language table repair, test guidance, assumptions, methods text, and figure-polishing suggestions.'],
                ['Graph target', 'Direct-click graph editing, multi-panel layouts, PNG/PDF export, journal size presets.'],
              ].map(([title, detail]) => (
                <div key={title}>
                  <Sparkles size={15} />
                  <span><strong>{title}</strong> {detail}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="inspector">
          <div className="panel-heading">
            <Settings2 size={18} />
            <h2>Inspector</h2>
          </div>
          <label className="text-control">
            Figure title
            <input value={settings.title} onChange={(event) => setSetting('title', event.target.value)} aria-label="Figure title" />
          </label>
          <label className="text-control">
            X axis
            <input value={settings.xLabel} onChange={(event) => setSetting('xLabel', event.target.value)} />
          </label>
          <label className="text-control">
            Y axis
            <input value={settings.yLabel} onChange={(event) => setSetting('yLabel', event.target.value)} />
          </label>
          <SelectRow
            label="Palette"
            value={settings.palette}
            onChange={(value) => setSetting('palette', value)}
            options={[
              { value: 'editorial', label: 'Editorial' },
              { value: 'bright', label: 'Bright' },
              { value: 'colourblind', label: 'Colourblind' },
              { value: 'nature', label: 'Nature' },
              { value: 'mono', label: 'Mono' },
            ]}
          />
          <SelectRow
            label="Error bars"
            value={settings.errorBars}
            onChange={(value) => setSetting('errorBars', value)}
            options={[
              { value: 'sem', label: 'SEM' },
              { value: 'sd', label: 'SD' },
              { value: 'ci95', label: '95% CI' },
              { value: 'none', label: 'None' },
            ]}
          />
          <RangeRow label="Font" value={settings.fontSize} min={10} max={20} step={1} onChange={(value) => setSetting('fontSize', value)} />
          <RangeRow label="Symbols" value={settings.symbolSize} min={3} max={12} step={1} onChange={(value) => setSetting('symbolSize', value)} />
          <RangeRow label="Lines" value={settings.lineWidth} min={1} max={5} step={0.2} onChange={(value) => setSetting('lineWidth', value)} />
          <RangeRow label="Bars" value={settings.barWidth} min={0.25} max={0.85} step={0.05} onChange={(value) => setSetting('barWidth', value)} />
          <label className="toggle-row">
            <input type="checkbox" checked={settings.showGrid} onChange={(event) => setSetting('showGrid', event.target.checked)} />
            Grid
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.showPoints} onChange={(event) => setSetting('showPoints', event.target.checked)} />
            Raw points
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.showLegend} onChange={(event) => setSetting('showLegend', event.target.checked)} />
            Legend
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.showPValues} onChange={(event) => setSetting('showPValues', event.target.checked)} />
            P value bars
          </label>
          <div className="palette-strip" aria-label="Selected colour palette">
            <Palette size={16} />
            {palettes[settings.palette].slice(0, 8).map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </div>
          <div className="preset-panel">
            <span className="eyebrow">Graph presets</span>
            {graphPresets.map((preset) => (
              <button key={preset.id} onClick={() => applyGraphPreset(preset.id, setSetting)}>
                <strong>{preset.label}</strong>
                <span>{preset.detail}</span>
              </button>
            ))}
          </div>
          <div className="result-panel compact">
            <span className="eyebrow">Suggested analysis</span>
            <strong>{displayedAnalysis?.label ?? 'No result yet'}</strong>
            <span>{displayedAnalysis ? pLabel(displayedAnalysis.p) : clean.format}</span>
          </div>
          <div className="engine-panel">
            <span className="eyebrow">Stats engine</span>
            <strong>Browser now, R/Python later</strong>
            <span>Current tests run in JavaScript. The API boundary is designed so R, Python, or WebAssembly engines can replace or extend calculations without changing the UI.</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
