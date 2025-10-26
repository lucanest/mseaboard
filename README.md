<img src="public/animatedtitle.gif"/>

**MSEABOARD** is an interactive web application for visualizing genetic sequences, multiple sequence alignments (MSA), phylogenetic trees, distance matrices (or any data that can be visualized as a 2D heatmap), sequence logos, protein structures, and tabular or numeric datasets.  With a customizable layout, the tool enables visualizing different data types in different panels, these can also be linked to each other allowing for interactive and interconnected visualizations, some examples include:

- An MSA can be linked to  a corresponding phylogenetic tree, then when hovering over a sequence in the MSA panel the corresponding leaf in the tree will be highlighted and vice-versa. 
- A distance matrix can be linked to an MSA, a tree or a protein structure, hovering over a cell in the matrix will then highlight the two corresponding sequences/tree nodes/residues in the 3D structure.

The full set of features and linking functionalities is described below (note, this README is currently being updated (🚧) and may be incomplete).

 **No installation required**
- Available online at [https://mseaboard.com](https://mseaboard.com)

# Usage

## Uploading and saving data, linking panels and common panel features (🚧):

 **Upload & visualize different data types**
- **MSA (.fasta/.fas)**: View alignments with colored residues and codon highlighting.
- **Phylogenetic trees (.nwk/.nhx)**: Explore trees in Newick or NHX format.
- **Distance matrices (.phy)**: Visualise phylogenetic distance matrices or any data that can be visualized as a 2D heatmap
- **Tabular data (.csv/.tsv)**: Select numeric columns for barchart plotting.
- **Numeric lists (.txt)**: Plot numeric data as barcharts.

 **Flexible panel management**
- Create, duplicate, remove, or rename panels dynamically.
- Arrange panels freely in a draggable, resizable grid layout.
- Save or load entire board (panel data, layout, and links).

 **Link panels for synchronized exploration**
- Link alignment, tree, heatmap, structure, sequence logo or data panels.
- Hover over alignment columns, tree tips, heatmap cells or barchart bars to highlight corresponding elements in linked panels.
- Horizontal scroll into view feature for alignments, sequence logos or barcharts when receiving a highlight through a link.

 **Export / import**
- Save current board as a JSON file.
- Load previously saved boards for seamless continuation and data sharing.


## Panel-specific features (🚧):

### **MSA panels**:
View sequences or multiple sequence alignments (supported data format: fasta files), click on a site column to set a persistent highlight on it, click again to remove it.
Scroll into view: When receiving a highlight from a linked panel the MSA scrolls to bring the corresponding highlighted site into view.
Can be linked to: MSA panels, Tree panels, Heatmap panels, Data panels, Sequence logo panels, protein structures.

- By clicking on the **search button** the user can perform a search inside the alignment: A search bar will appear, if the user types in an integer index and hits enter the alignment will scroll to it and the corresponding column will be highlighted, if the user types a motif (e.g. AACG) then all occurrences of that motif inside the MSA will be highlighted and the user will be able to navigate between them. To exit the search click on the button again or press escape.
- Clicking on the **statistics button** a set of per-site statistics (for now residue conservation and gap fraction) will be computed and this data will be opened in a new data panel.
- Clicking on the **sequence logo button** a will create a sequence logo, opened in a dedicated panel, showing the information in bits of each residue appearing in each site of the alignment. The sequence logo panel will be automatically linked to the original MSA panel provided the former is not in codon mode.
- Nucleotide sequences/MSAs can also be translated into amino acids with the **translation button**, the translation will then be opened in another panel (linked to the original if the former is in codon mode).
- Clicking on the **distance matrix button** a distance matrix is built from the alignment (using normalized Hamming distances) and opened in a new heatmap panel (linked to the original MSA one).
- Clicking on the **tree button** allows to reconstruct a phylogenetic tree from the MSA using FastME, the user is prompted with the choice of a substitution model (among those supported by FastME) and then a phylogenetic tree is reconstructed, it will be opened in another panel, linked to the original one.
#### **Nucleotide alignments**:
-  If the panels contains dna sequences the user can toggle the codon mode via the **codon button**, this will switch indexing to codons: In this mode on hover three adjacent alignment columns (corresponding to the three positions in each codon) are highlighted at a time and the codon indexing will be used for panel linking as well as for the search. When in this mode, if the user computes the alignment statistics via the corresponding button, these will be computed per-codon instead of per-site.


### **Tree panels**:
Visualise phylogenetic trees (supported data format: Newick or NHX with node annotations), click on a leaf node to set a persistent highlight on it, click again to remove it. Hover over branches to see their lengths, hover over nodes to see their annotations (even beyond those used for coloring the nodes).

- By clicking on the **branch lengths button** the user can switch between two different views, choosing whether to draw the branches with their actual lengths or not.
- By clicking on the **tree view button** the user can again switch between two different views, choosing whether to represent the tree with a circular or a rectangular view.
- Clicking on the **distance matrix button** a distance matrix is built from the tree (using patristic distances, the sum of the branch lengths along the path connecting one leaf to the other) and opened in a new heatmap panel (linked to the original tree one).


Can be linked to: MSA panels, Tree panels, Heatmap panels.

### **Heatmap panels**:
Visualise distance matrices (supported data format: phylip-formatted distance matrices), click on a cell to set a persistent highlight on it, click again to remove it.
Provided the input data is properly formatted this panel allows a great deal of flexibility, beyond phylogenetic distance matrices the panel can be used to visualize protein residue distance matrices, HB plots, coevolution and correlation matrices, attention/saliency maps of a neural network, and in general any kind of data that can benefit from being visualized as 2D heatmap.
The colorbar is a legend but also a threshold selector, clicking on it all cells containing values below the treshold will be colored with one color, those with values above it with the other (this can for instance turn a residue distance matrix into a protein contact map), click on the colorbar again to restore the original view.

- By clicking on the **tree button** the user can reconstruct a tree (via the Neighbor Joining algorithm) from the matrix, this will be opened in another panel, linked to the original one.
- By clicking on the **view button** the user can switch between two different views, choosing whether to represent the data as a square matrix or a diamond (as typically done for LD plots).


Can be linked to: MSA panels, Tree panels, Heatmap panels, protein structures.

### **Data panels**: (🚧)


### **Protein structure panels**: (🚧)


### **Sequence logo panels**:
Create from MSA panels: Visually shows the information in bits of each residue appearing in each site of the alignment.
Scroll into view: When receiving a highlight from a linked panel the sequence logo scrolls to bring the corresponding highlighted site into view.

Can be linked to: MSA panels, Data panels, Sequence logo panels.

### **Notepad panels**:
Write notes and observations here.



## Local setup

Run the app locally:

```bash
npm install
npm run start
```

Visit `http://localhost:3000` and upload your files.

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


## License

MSEABOARD is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License (AGPLv3)** as published by the Free Software Foundation.

This means:
- You are free to use, modify, and distribute the software for any purpose.
- **If you modify the source code and run it as a hosted service, you must make the source code of your modified version available to your users.**

See the [`LICENSE`](LICENSE) file for full details.

