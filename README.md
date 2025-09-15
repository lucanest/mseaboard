
<img src="public/animatedtitle.gif"/>

**MSEABOARD** is an interactive web application for visualizing multiple sequence alignments (MSA), phylogenetic trees, distance matrices (or any data that can be visualized as a 2D heatmap), protein structures, and tabular or numeric datasets. It provides linked, customizable panels for in-depth sequence and evolutionary analysis.

## Features

 **Upload & visualize different data types**
- **MSA (.fasta/.fas)**: View alignments with colored residues and codon highlighting.
- **Phylogenetic trees (.nwk/.nhx)**: Explore trees in Newick or NHX format.
- **Tabular data (.csv/.tsv)**: Select numeric columns for barchart plotting.
- **Numeric lists (.txt)**: Plot numeric data as barcharts.

 **Flexible panel management**
- Create, duplicate, remove, or rename panels dynamically.
- Arrange panels freely in a draggable, resizable grid layout.
- Save or load entire board (panel data, layout, and links).

 **Link panels for synchronized exploration**
- Link alignment, tree, heatmap, structure, sequence logo or data panels.
- Hover over alignment columns, tree tips, or barchart bars to highlight corresponding elements in linked panels.
- Synchronized horizontal scrolling for linked alignments.

 **Rich visualization tools**
- Alignment panels with codon view toggle, sequence label truncation, and residue coloring.
- Phylogenetic trees with NHX annotation support and tip highlighting.
- Barcharts with interactive column selection for tabular data.

 **Export / import**
- Save current board as a JSON file.
- Load previously saved boards for seamless continuation.

 **No installation required**
- Available online at [https://mseaboard.com](https://mseaboard.com)

---

## Setup

Run the app locally:

```bash
npm install
npm run start
```

Visit `http://localhost:3000` and upload your files. Alternatively head directly to https://mseaboard.com

## Project structure

```bash
├── LICENSE
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
│   ├── animatedtitle.gif
│   ├── d3.min.js
│   ├── index.html
│   ├── mseaboard-example.json
│   └── wasm
│       ├── fastme.js
│       └── fastme.wasm
├── README.md
├── src
│   ├── App.jsx
│   ├── components
│   │   ├── Animations.jsx
│   │   ├── Buttons.jsx
│   │   ├── Heatmap.jsx
│   │   ├── Histogram.jsx
│   │   ├── PhyloTreeViewer.jsx
│   │   ├── Seqlogo.jsx
│   │   ├── StructureViewer.jsx
│   │   └── Utils.jsx
│   ├── constants
│   │   └── colors.js
│   ├── hooks
│   │   └── useElementSize.js
│   ├── index.css
│   ├── index.jsx
│   └── main.jsx
└── tailwind.config.js
```

## Usage
	-	Upload data: Use the top menu buttons to upload MSA, tree, distance matrix, protein structure or data files,
		alternatively simply drag and drop supported data types to add the to the board.
	-	Manage panels: Duplicate, remove, link, or rename panels from the panel headers.
	-	Customize layout: Drag and resize panels as needed.
	-	Save/load board: Save your session to a file or load a previous session.
	-	Link panels: Link two panels to synchronize highlights and scrolling.

## License

MSEABOARD is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License (AGPLv3)** as published by the Free Software Foundation.

This means:
- You are free to use, modify, and distribute the software for any purpose.
- **If you modify the source code and run it as a hosted service, you must make the source code of your modified version available to your users.**

See the [`LICENSE`](LICENSE) file for full details.
