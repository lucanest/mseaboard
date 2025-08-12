# MSEABOARD

**MSEABOARD** is an interactive web application for uploading, visualizing, and exploring multiple sequence alignments (MSA), phylogenetic trees, and tabular or numeric datasets. It provides linked, customizable panels for in-depth sequence and evolutionary analysis—all in your browser.

## Features

 **Upload & visualize different data types**
- **MSA (.fasta/.fas)**: View alignments with colored residues and codon highlighting.
- **Phylogenetic trees (.nwk/.nhx)**: Explore trees in Newick or NHX format.
- **Tabular data (.csv/.tsv)**: Select numeric columns for histogram plotting.
- **Numeric lists (.txt)**: Plot numeric data as histograms.

 **Flexible panel management**
- Create, duplicate, remove, or rename panels dynamically.
- Arrange panels freely in a draggable, resizable grid layout.
- Save or load entire workspaces (panel data, layout, and links).

 **Link panels for synchronized exploration**
- Link alignment, tree, or histogram panels.
- Hover over alignment columns, tree tips, or histogram bars to highlight corresponding elements in linked panels.
- Synchronized horizontal scrolling for linked alignments.

 **Rich visualization tools**
- Alignment panels with codon view toggle, sequence label truncation, and residue coloring.
- Phylogenetic trees with NHX annotation support and tip highlighting.
- Histograms with interactive column selection for tabular data.

 **Export / import**
- Save current workspace as a JSON file.
- Load previously saved workspaces for seamless continuation.

 **No installation required**
- Available online at [https://mseaboard.com](https://mseaboard.com)

---

## Setup

Run the app locally:

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and upload your files. Alternatively head directly to https://mseaboard.com

## Project structure

```bash
├── index.html
├── package.json
├── postcss.config.js
├── public
│   ├── d3.min.js
│   └── index.html
├── src
│   ├── App.jsx
│   ├── components
│   │   ├── Histogram.jsx
│   │   └── PhyloTreeViewer.jsx
│   ├── index.css
│   ├── index.jsx
│   └── main.jsx
└── tailwind.config.js
```

## Usage
	-	Upload data: Use the top menu buttons to upload MSA, tree, or data files.
	-	Manage panels: Duplicate, remove, link, or rename panels from the panel headers.
	-	Customize layout: Drag and resize panels as needed.
	-	Save/load workspace: Save your session to a file or load a previous session.
	-	Link panels: Link two panels to synchronize highlights and scrolling.
