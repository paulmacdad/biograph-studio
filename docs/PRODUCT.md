# Product Direction

The product goal is a free scientific graphing and statistics workbook for biologists who do not want to become statisticians or programmers just to make correct, beautiful figures.

## What Must Feel Familiar

- A project/workbook with data tables, analyses, graphs, layouts, and notes.
- Graph-first feedback: users should see a useful figure almost immediately after pasting data.
- Guided stats: the app should recommend plausible analyses and explain why.
- Publication-quality defaults with direct control over axes, symbols, bars, legends, labels, error bars, palettes, and export sizes.

## Where It Should Beat Existing Tools

- Messy input handling: paste instrument output, spreadsheet blocks, or badly shaped tables and get suggested repairs.
- AI-assisted reshaping: "make this a grouped table", "normalize to control", "use dose as X", "make a qPCR fold-change graph".
- Reproducible analysis: every click should become a readable audit trail and optional R/Python script.
- Better palettes and presets for journals, talks, posters, colourblind safety, and multi-panel figures.
- Extensible statistical engine using R/Python/WebAssembly rather than being limited to front-end code.

## Near-Term UX Milestones

- Table templates for column, grouped, XY, survival, nested, qPCR, ELISA, viability, and Western blot workflows.
- A graph wizard that asks: data type, biological question, graph family, analysis, styling preset, export target.
- Direct manipulation of graph elements: click title, axes, legend, point set, bar, or error bar to edit it in the inspector.
- Project save/load with raw data, transformed data, analyses, graphs, layouts, and notes.
- Server-side AI assistant with no browser-exposed API key.
