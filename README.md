# BioGraph Studio

A free, browser-based scientific plotting and beginner-friendly statistics prototype for wet-lab data.

This is not a GraphPad Prism clone. It is a legally distinct open tool aimed at the same common workflow pain points: messy spreadsheet paste, grouped biological measurements, quick statistical checks, publication-style SVG export, and reproducible cleaned data export.

## Current Prototype

- Smart paste import for CSV, TSV, and copied spreadsheet cells
- Table setup controls for groups, replicates, subcolumns, X values, paired values, and repeated-measures designs
- Editable workbook-style data grid with add-row and add-column controls
- Wide, long, column-oriented, and dose/response table detection
- One-click reshaping actions for wide-to-long, transpose, control normalization, and log10 X conversion
- Familiar scientific-workbook flow with New Table & Graph, Analyze, Change Graph Type, and Format Graph actions
- Working layout, notebook, audit-trail, and build-coverage screens
- Built-in tutorial sheet for grouped graphs, dose-response, Kaplan-Meier, data repair, publication styling, and AI guidance
- Workbook-style navigator for data, analyses, graphs, layouts, notes, and feature planning
- Dot, bar, box, line, and dose-response SVG plots, including log10 X scaling and smooth fitted curves
- P-value comparison bars on grouped plots
- Kaplan-Meier survival plots with number-at-risk table and log-rank result
- Publication graph inspector with axis labels, X scale, fit curves, font sizing, symbols, line width, bar width, grids, points, legends, error bars, multiple palettes, and journal/talk/poster/minimal presets
- Per-group n, mean, SD, SEM, 95% CI, median, quartiles, min, and max
- Welch unpaired t test, paired t test, Mann-Whitney test, one-way ANOVA, Kruskal-Wallis test, linear regression, dose-response EC50-style estimates with Hill-slope display, Kaplan-Meier/log-rank, and pairwise Welch comparisons with Holm adjustment
- Cleaned CSV, SVG figure, and JSON analysis export

## Direction

The app should preserve the two things that make familiar biology graphing tools useful: approachable workflow and beautiful figures. It should then exceed them with smarter import/reshaping, AI guidance, reproducible project history, better palettes, and an engine boundary that can use R, Python, or WebAssembly for advanced statistics.

See:

- [Product direction](docs/PRODUCT.md)
- [Statistical engine direction](docs/ENGINE.md)

## Research Notes

Public Prism material emphasizes simplified scientific statistics, biology-friendly table formats, t tests, ANOVA, regression, dose-response, survival analysis, PCA, and guided assumptions. Current public pricing/licensing changes are a major user complaint in lab communities. Existing alternatives include general open-source tools such as R and LabPlot, plus browser graphing tools such as TechGraphOnline and newer reproducible-code-focused tools.

The gap this prototype targets first is not just "more statistical power"; it is less manual data reshaping for non-statisticians plus a more direct path from messy lab output to beautiful, reproducible figures.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Next Build Targets

- Optional AI import assistant with a server-side API key, never a browser-exposed key
- Full nonlinear regression engine with IC50/EC50, binding, kinetics, enzyme models, constraints, confidence intervals, and residual diagnostics
- Multiple-comparison corrections after ANOVA, including Tukey, Dunnett, Holm-Sidak, Bonferroni, FDR, and Games-Howell style workflows
- Two-way, three-way, repeated-measures, mixed-effects, nested, and multiple-variable analyses
- Gehan-Wilcoxon tests, logistic regression, PCA, transformations, outlier detection, and normality checks
- qPCR, ELISA, Western blot, and viability assay templates
- Project files that save raw data, cleaned data, analysis choices, and graph styling together
- PNG/PDF export and PowerPoint-friendly figure sizing
