# Product Direction

The product goal is a free scientific graphing and statistics workbook for biologists who do not want to become statisticians or programmers just to make correct, beautiful figures.

## What Must Feel Familiar

- A project/workbook with data tables, analyses, graphs, layouts, and notes.
- A "new table and graph" starting point where users choose Column, Grouped, XY, Dose-response, Survival, or Multiple-variable data before doing anything else.
- A setup step for each table where users specify how many groups, replicates, subcolumns, X values, paired values, and repeated-measures dimensions they have.
- Obvious top-level actions: New Table & Graph, Analyze, Change Graph Type, Format Graph, Export.
- Graph-first feedback: users should see a useful figure almost immediately after pasting data.
- Guided stats: the app should recommend plausible analyses and explain why.
- Publication-quality defaults with direct control over axes, symbols, bars, legends, labels, error bars, palettes, and export sizes.
- Direct graph annotations including p-value brackets and survival number-at-risk tables.

## Where It Should Beat Existing Tools

- Messy input handling: paste instrument output, spreadsheet blocks, or badly shaped tables and get suggested repairs.
- AI-assisted reshaping: "make this a grouped table", "normalize to control", "use dose as X", "make a qPCR fold-change graph".
- Dogfoodable assistant behavior: local deterministic guidance works immediately, while an optional server-side AI endpoint can replace it without exposing credentials in the browser.
- Reproducible analysis: every click should become a readable audit trail and optional R/Python script.
- Better palettes and presets for journals, talks, posters, colourblind safety, and multi-panel figures.
- Extensible statistical engine using R/Python/WebAssembly rather than being limited to front-end code.

## Near-Term UX Milestones

- Table templates for column, grouped, XY, survival, nested, qPCR, ELISA, viability, and Western blot workflows.
- Editable generated tables where changing the setup dimensions updates both table shape and linked graph defaults.
- Spreadsheet-like editing with add-row/add-column controls and immediate graph/statistics updates.
- A graph wizard that asks: data type, biological question, graph family, analysis, styling preset, export target.
- Direct manipulation of graph elements: click title, axes, legend, point set, bar, or error bar to edit it in the inspector.
- Project save/load with raw data, transformed data, analyses, graphs, layouts, and notes.
- Server-side AI assistant with no browser-exposed API key, using the current exported assistant context as the request contract.
