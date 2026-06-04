# Statistical Engine Direction

BioGraph Studio should be a friendly front end over a serious statistical engine.

The browser prototype currently runs lightweight JavaScript analyses so the UI is usable immediately. Long term, calculations should be delegated through a stable engine boundary:

```ts
type AnalysisRequest = {
  table: CleanTable;
  analysis: AnalysisSpec;
  options: AnalysisOptions;
};

type AnalysisResponse = {
  summary: TableSummary;
  results: ResultTable[];
  diagnostics: Diagnostic[];
  figureLayers: FigureLayer[];
  methodText: string;
  reproducibility: ScriptArtifact[];
};
```

## Candidate Backends

- R through plumber, webR, or an R service for mature biostatistics and CRAN packages.
- Python through FastAPI, SciPy, statsmodels, lifelines, scikit-learn, and lmfit.
- WebAssembly for selected offline-capable routines.

## Required Analysis Families

- Column/grouped/XY/multiple-variable/survival/nested data tables
- Descriptives, normality checks, transformations, and outlier detection
- t tests, nonparametric tests, one-way/two-way/three-way ANOVA
- Repeated-measures, mixed-effects, nested, and multiple-comparison workflows
- Linear and nonlinear regression, IC50/EC50, binding, kinetics, enzyme models
- Kaplan-Meier survival, log-rank and Gehan-Wilcoxon tests
- Logistic regression, PCA, correlation matrices, and multiple-variable exploration

## Non-Negotiables

- Every result must include assumptions, diagnostics, and method text.
- Every graph must be reproducible from raw data plus recorded transformations.
- AI can suggest and reshape, but statistical execution must be deterministic and auditable.
- Exported project files must preserve raw data, cleaned data, transformations, analyses, graph settings, and software version.
