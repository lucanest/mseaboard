<img src="public/logo.png"/>

**MSEABOARD** is an interactive web application for visualizing genetic sequences, multiple sequence alignments (MSA), phylogenetic trees, matrices (such as distance matrices or any data that can be visualized as a 2D heatmap), sequence logos, protein structures, and tabular or numeric datasets.  With a customizable layout, the tool enables visualizing different data types in different panels, these can be linked to each other allowing for interactive and interconnected visualizations, some examples include:

- An MSA can be linked to  a corresponding phylogenetic tree, then when hovering over a sequence in the MSA panel the corresponding leaf in the tree will be highlighted and vice-versa. 
- A distance matrix can be linked to an MSA, a tree or a protein structure, hovering over a cell in the matrix will then highlight the two corresponding sequences/tree nodes/residues in the 3D structure.

The full set of features and linking functionalities is described below (☝️ Note that not everything in the manual may be correctly rendered in this README, a complete version can be found [here](https://www.mseaboard.com/?board=ddbcd607cbe8cfec3736521433f4ead8) ).

- Available online at [https://mseaboard.com](https://mseaboard.com)

# Usage
## Global Workspace Controls

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="width: 1.5rem; height: 1.5rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></span> | Undo | Reverts the last action (e.g., panel creation, resizing, tree pruning). |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="width: 1.5rem; height: 1.5rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></span> | Redo | Re-applies the last undone action. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="width: 1.5rem; height: 1.5rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></span> | Save Board | Downloads a <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.json</span> file containing all data, links, and layout information. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="width: 1.5rem; height: 1.5rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg></span> | Load Board | Upload a previously saved <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.json</span> file to restore a complete session. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><!--?xml version="1.0" standalone="no"?--><!--?xml version="1.0" standalone="no"?--><svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 824.000000 864.000000" preserveAspectRatio="xMidYMid meet"><g transform="translate(-600.000000,1494.000000) scale(0.250000,-0.250000)" fill="#374151" stroke="none"><path d="M3954 5118 c-157 -159 -161 -166 -133 -202 36 -45 65 -35 149 49 41 41 78 75 82 75 5 0 8 -211 8 -470 0 -518 -1 -509 72 -498 46 6 48 23 48 518 0 465 0 465 83 382 90 -89 122 -102 151 -60 31 43 21 59 -127 206 -181 179 -156 179 -333 0z"></path><path d="M3658 4744 c-57 -17 -138 -101 -156 -161 -8 -29 -12 -161 -12 -455 0 -477 0 -477 80 -552 81 -76 92 -77 577 -74 624 4 598 -24 598 638 0 476 0 478 -82 550 -108 95 -353 99 -353 7 0 -42 27 -54 130 -59 187 -10 180 11 180 -506 0 -562 61 -502 -509 -502 -559 0 -504 -58 -499 527 4 489 1 482 214 483 74 0 86 6 98 47 20 65 -133 98 -266 57z"></path></g></svg></span> | Share | Creates a shareable link to your current board state via a GitHub Gist. |

---



## The Panel System

Each piece of data is loaded into a specialized panel. All panels share a common set of controls in their header for management and each panel type has its own unique set of tools for visualisation or analysis.


### Creating and Uploading Panels

The colored buttons at the top are, beyond dragging and dropping, your primary way to add new data and panels to the workspace.

| Button | Name | Description |
| :----: | :--- | :---------- |
| <div style="background-color: #fef9c3; color: black; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-width: 1px; width: 80px; text-align: center;">Notepad</div> | New Notepad | Adds a new, blank Notepad panel to the canvas, ready for your notes and documentation. |
| <div style="background-color: #dcfce7; color: black; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-width: 1px;width: 80px; text-align: center;">MSA</div> | Upload MSA | Opens a file dialog to upload a sequence or multiple sequence alignment in FASTA format (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.fasta</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.fas</span>). |
| <div style="background-color: #dbeafe; color: black; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-width: 1px;width: 80px; text-align: center;">Tree</div> | Upload Tree | Opens a file dialog for uploading a phylogenetic tree in Newick (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.nwk</span>) or NHX (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.nhx</span>) format. |
| <div style="background-color: #ffedd5; color: black; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-width: 1px;width: 80px; text-align: center;">Data</div> | Upload Data | Opens a file dialog to upload tabular data (e.g., <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.tsv</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.csv</span>) or a simple list of numbers (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.txt</span>) for bar chart plotting. |
| <div style="background-color: #fee2e2; color: black; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-width: 1px;width: 80px; text-align: center;">Matrix</div> | Upload Matrix | Opens a file dialog for a distance matrix in PHYLIP format (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.phy</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.dist</span>) or any generic matrix in tabular format (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.tsv</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.csv</span>). |
| <div style="background-color: #e9d5ff; color: black; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-width: 1px;width: 84px; text-align: center;">Structure</div> | Upload Structure | Opens two sub-buttons: One opens a file dialog to upload a 3D molecular structure in PDB format (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.pdb</span>), the other allows to load a structure directly from PDB's database via its ID. |


### Common Panel Controls
Every panel in your workspace is equipped with a standard set of buttons on the top right of its header, allowing for consistent and intuitive management.

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" /></svg></span> | Duplicate | Creates an exact copy of the panel, including its data and settings, and places it on the canvas. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2" style="width: 0.8rem; height: 0.8rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg></span> | Link | Initiates linking mode. Click this, then the link icon on another eligible panel to create a dynamic connection. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span> | Remove | Deletes the panel from the workspace. This action can be reversed with the global "Undo" button. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></span> | Download | Exports the panel's data in a relevant file format (e.g., FASTA, Newick, TSV, PDB). The exact format depends on the panel type. |

#### Editable Filenames

Every panel's title can be customized: To edit a panel's filename, click the pencil icon <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.1rem; height: 1.1rem; border-radius: 0.375rem; background-color: #f3f4f6; border: 1px solid #9ca3af; vertical-align: middle;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4b5563" style="width: 0.8rem; height: 0.8rem;"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" /></svg></span> that appears next to the title. This will turn the title into an editable text field, type your new name and press <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">Enter</span> or click outside the field to save the change. The same name will be used when the panel's data is downloaded.

## Alignment Panels
*The core of sequence analysis. Upload FASTA files to visualize and interact with your sequences or multiple sequence alignments (MSAs). Link them to alignment, heatmap, tree, data, sequence logo or structure panels*

<div style="display: flex; gap: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
  <div style="flex: 1;">
    <h4>Site (default) mode</h4>
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/nucmsasite.png" alt="MSA nuc site Panel" style="width: 80%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">An alignment panel showing nucleotide sequences with codon mode disabled.</p>
  </div>
  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <h4>Codon mode</h4>
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/nucmsacodon.png" alt="MSA nuc codon Panel" style="width: 80%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">An alignment panel showing nucleotide sequences with codon mode enabled.</p>
  </div>
</div>

**Features & Controls:**

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg></span> | Search | Find a specific site index or a sequence motif (e.g., "ATTG") within the alignment. Use the arrows to navigate between hits. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="1.5" transform="rotate(90)" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></span> | Codon Mode | **(Nucleotide only)** Toggles the view between per-site and per-codon (3-site blocks) highlighting and linking. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg></span> | Translate | **(Nucleotide only)** Creates a new linked panel containing the amino acid translation of the alignment. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 1784 1744" style="width: 1rem; height: 1rem;" fill="#a21caf"><g transform="translate(-1250,2900) scale(0.56,-0.56)"><path d="M4133 5156 c-250 -267 -313 -568 -194 -923 18 -53 18 -53 -118 -53 -674 0 -934 -355 -776 -1057 5 -22 3 -23 -62 -23 -298 -1 -517 -89 -654 -263 -22 -27 -39 -54 -39 -61 0 -9 72 -69 100 -83 3 -2 39 30 80 70 135 130 269 177 504 177 134 0 134 0 165 -93 46 -136 78 -327 55 -327 -6 0 -81 51 -299 206 -162 114 -158 113 -239 73 -78 -38 -80 -31 42 -115 175 -122 393 -284 439 -327 35 -33 29 -60 -31 -142 -12 -16 -25 -35 -29 -41 -5 -9 101 -94 118 -94 2 0 25 29 50 64 151 212 163 411 48 769 -5 17 -1 18 68 11 270 -29 409 4 428 103 6 32 14 71 17 87 6 26 5 28 -12 21 -84 -34 -133 -39 -354 -40 -254 0 -232 -17 -264 203 -16 113 -22 114 133 -2 177 -131 230 -150 330 -115 44 16 38 23 -75 102 -54 39 -146 108 -204 155 -58 46 -122 94 -143 106 -43 24 -45 60 -7 155 24 63 7 72 310 -165 333 -261 306 -247 364 -199 58 47 57 52 -6 100 -29 21 -127 98 -218 170 -91 72 -202 160 -248 195 -45 35 -81 68 -79 74 6 19 170 95 232 108 60 12 438 18 449 7 23 -22 76 -299 58 -299 -20 0 -93 49 -205 136 -135 106 -159 113 -262 69 -40 -17 -40 -17 -17 -33 13 -8 80 -61 150 -116 327 -261 327 -261 402 -227 36 17 75 31 86 31 44 1 47 11 35 116 -10 81 -37 206 -67 305 -4 14 16 17 143 27 354 28 524 117 711 374 42 57 42 57 -19 108 -60 50 -60 50 -106 -12 -156 -213 -312 -285 -631 -293 -188 -5 -167 -17 -201 117 -57 224 -52 227 139 83 151 -114 180 -129 238 -120 103 15 117 39 50 81 -24 15 -95 68 -158 119 -174 138 -241 186 -273 192 -34 7 -34 67 1 159 24 67 25 67 178 -58 459 -374 468 -380 534 -318 50 47 55 43 -521 488 -97 75 -97 75 -53 135 54 73 55 67 -10 104 -54 31 -54 31 -83 -1zM4304 3445 c-449 -98 -560 -737 -171 -987 59 -37 59 -45 1 -54 -58 -8 -123 0 -200 28 -81 29 -94 23 -94 -45 0 -137 64 -176 285 -177 171 0 218 36 219 170 1 66 1 67 -56 141 -141 184 -187 412 -118 587 148 378 567 257 570 -165 1 -155 -50 -281 -197 -482 -22 -31 -24 -142 -2 -186 50 -104 414 -83 471 27 60 116 33 168 -64 123 -54 -25 -169 -34 -247 -19 -43 9 -40 16 37 72 154 112 223 220 240 379 45 398 -273 675 -674 588z" /></g></svg></span> | Predict Omega | **(Nucleotide only)** Predicts per-codon dN/dS (ω) values using an embedded neural network (Experimental). |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;" aria-hidden="true"><text x="1" y="20" fill="#be185d" font-size="22" font-weight="500">A</text><text x="14" y="10" fill="#be185d" font-size="12" font-weight="500">C</text><text x="16" y="20" fill="#be185d" font-size="10" font-weight="500">T</text></svg></span> | Sequence Logo | Creates a new linked Sequence Logo panel, showing the information content (in bits) for each site. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A2.25 2.25 0 011.5 18.75v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg></span> | Site Statistics | Generates a new linked Data panel with per-site (per-codon if codon mode is active) statistics like conservation and gap fraction. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 1516 1239.998" style="width: 1rem; height: 1rem;" fill="#524d4d"><g transform="scale(2) translate(-350,-300)"><path d="M537.999 342c-86.8.8-86.8.8-91.099 9.097-6.2 12.199-5.399 115.098 1.003 126.3 6.298 11.2-6.299 10.498 197.598 10.498 206.899.098 201.701.3 210.702-9.698 5.3-5.802 5.3-6.2 5.3-64.2 0-62.801-.098-63.602-11.898-69.699-6.2-3.198-115.201-3.999-311.601-2.299m249.002 49c30.199 3.002 33.402 5.4 32.797 24.702-.697 23.7 5.601 22.8-166.299 22.8-168.102 0-165.999.202-167.999-19.199-2.299-23.301 3.602-27.202 44.702-29.3 24.702-1.198 242.9-.397 256.799 1.003M963.499 356.9c-12.602 7.202-12.199 4.102-13 116.1-.899 116.802.501 109.9-18.997 91-27.4-26.5-41.101-29.998-52.499-13.402-11.5 16.698-8.4 22.2 40.9 71.398 57.897 57.799 51.5 57.7 108.7.5 45.1-45.099 49.1-50.4 46.5-62-2.702-11.8-13.5-20.097-25-19.297-7.503.501-12.902 4.3-34.1 23.901-18.301 16.802-16.601 23.1-17-63.1-.397-100.3-1.198-131.698-3.698-137.102-4.702-10.499-20.502-14.498-31.801-7.998M479 536.002c-19.799.8-22.501 1.602-28.5 8.2-6.897 7.698-6.799 6.7-6.897 69.098-.098 55.8-.098 55.8 5.9 61.2 12.902 11.598 2.501 11 169.503 11 168.402 0 159.8.598 171.502-11.502 4.598-4.702 6.2-33 5.1-89-.802-44.8-3.003-47.601-39.102-49.1-23.601-.898-253.6-.898-277.501.099m244 51c24.2 2.403 27.399 4.898 27.802 22.201.501 23.7-.9 24.299-69.3 25.9-47.503 1.101-145.2.398-165.499-1.198-26.102-2.098-31-5.699-31-22.899 0-21.302 4.8-23.498 52.499-25.001 33.5-1.1 172.297-.3 185.498 1.002M474.898 732c-17.2 1.002-23.9 4.2-28.799 13.8-2.898 5.6-4.402 84.702-2.097 107.1 1.4 13.2 7.502 21.798 16.998 24.102 12.901 3.1 420.7 4.102 454.299 1.1 18-1.601 25.802-5.399 30.199-14.802 2.2-4.702 3.9-52.498 3.002-85.301-1.199-44.702-1.4-44.8-53.8-46.103-42.202-1.002-401.9-.899-419.802.099m373.1 47.998c49.3 2.201 56.001 5.198 56.001 24.898 0 22.599-5.197 24.2-84.5 26.2-52.798 1.302-275.998.6-294.5-1.002-32.1-2.8-38.698-6.298-39.799-21.199-1.601-22.201 5.4-26.5 47.1-28.799 20.3-1.199 289.9-1.199 315.698-.098"/></g></svg></span> | Extract Sequences | Enter selection mode to choose a subset of sequences and create a new, filtered MSA panel. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;" fill="none" stroke="#166534" stroke-width="1.2"><path fill-rule="evenodd" d="M17.5857864,18 L17,18 C15.0670171,17.9820312 13.8323189,17.4178969 12.7754822,16.1071521 C13.1678375,15.5430536 13.5361529,14.9169672 13.8909426,14.2284294 C14.7312903,15.5397262 15.5623613,15.9865721 17.0093097,16.0000433 L17.5858172,16.0000308 L16.2928932,14.7071068 L17.7071068,13.2928932 L21.4142136,17 L17.7071068,20.7071068 L16.2928932,19.2928932 L17.5857864,18 Z M17.5858172,7.99996921 L17.0093097,7.99995666 C14.98914,8.01876471 14.1694753,8.8823321 12.8489735,11.7638223 C12.7005893,12.0884485 12.6216698,12.260889 12.5477909,12.4205132 C10.7759025,16.2488903 8.96370516,17.9389258 5,18 L3,16 L3,16 L4.98456341,16.0001192 C7.99778944,15.9535997 9.24866011,14.7870513 10.7327652,11.5804646 C10.8045503,11.4253643 10.8813338,11.257591 11.0308005,10.9306074 C12.6437651,7.41092901 13.9561072,6.02829571 17,6 L17.5857864,6 L16.2928932,4.70710678 L17.7071068,3.29289322 L21.4142136,7 L17.7071068,10.7071068 L16.2928932,9.29289322 L17.5858172,7.99996921 Z M9.2967591,9.9151484 C8.25385189,8.57493725 7.02213357,8.03133773 4.98456341,7.99988085 L3,8 L3,8 L5,6 C7.39017643,6.03682871 8.99800451,6.66599321 10.2864139,7.99918708 C9.95038887,8.57240941 9.6245452,9.21039491 9.2967591,9.9151484 Z" /></svg></span> | Reorder Sequences | Provides options to sort sequences alphabetically, reverse the current order, or restore the original file order. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg></span> | Build Distance Matrix | Calculates a pairwise distance matrix (using normalized Hamming distances, i.e. the fraction of differing residues in the sequences) and opens it in a new linked Heatmap panel. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;" fill="none" stroke="#166534" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0,2)"><path d="M12 3V21 M12 7 Q 9 7 5 2 M12 12 Q 18 12 19 5 M12 15 Q 9 15 4 12" /></g></svg></span> | Build Phylogenetic Tree | Reconstructs a phylogenetic tree from the MSA using FastME, allowing to choose from all its implemented substitution models, then opening it in a new linked Tree panel. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg></span> | Add Color Matrix | Creates a new linked, Heatmap panel where each cell is a residue from the MSA, colored by amino acid or nucleotide type: Perfect to have an overview of the entire alignment and navigate it faster. |


<div style="display: flex; gap: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
  <div style="flex: 1;">
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/msatree.png" alt="MSA nuc site Panel" style="width: 100%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">An alignment linked to a radial tree. Hovering over a sequence in the MSA highlights the corresponding tree leaf and viceversa.</p>
  </div>
  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/msacolorlogo.png" alt="MSA nuc codon Panel" style="width: 100%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">An alignment panel with its derived sequence logo and color matrix.</p>
  </div>
</div>

## Tree Panels
*Visualize evolutionary relationships. Upload Newick or NHX files. Link them to alignment, tree, heatmap or data panels*

<div style="display: flex; gap: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
  <div style="flex: 1;">
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/sametrees.png" alt="MSA nuc site Panel" style="width: 100%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">Different views of the same tree with the nodes and labels colored with different NHX metadata.</p>
  </div>
  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/treedm.png" alt="MSA nuc codon Panel" style="width: 100%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">A tree linked to its derived patristic distance matrix.</p>
  </div>
</div>

**Key Features & Controls:**

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none" stroke="#15803d" stroke-width="1.2" style="width: 1rem; height: 1rem;"><g transform="translate(-1,0)"><path d="M16 2l6 6L8 22l-6-6L16 2" /><path d="M7.5 10.5l2 2" /><path d="M10.5 7.5l2 2" /><path d="M13.5 4.5l2 2" /><path d="M4.5 13.5l2 2" /></g></svg></span> | Draw Branch Lengths | Toggles whether the tree is drawn cladogram-style (all leaves drawn equidistant from the root) or phylogram-style (using the branch lengths from the Newick file). |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span> | Radial/Rectangular | Switches the tree layout between a circular (radial) and a rectangular visualization. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><!--?xml version="1.0" standalone="no"?--><svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184.000000 176.000000" preserveAspectRatio="xMidYMid meet"><g transform="translate(-86.000000,266.000000) scale(0.200000,-0.200000)" fill="#B91C1B" stroke="none"><path d="M626 1145 c-53 -49 -60 -114 -18 -164 35 -43 104 -54 157 -25 34 18 35 18 54 -1 34 -34 32 -117 -2 -140 -22 -14 -28 -14 -69 5 -41 18 -51 19 -84 8 -45 -15 -84 -67 -84 -110 0 -91 116 -151 185 -96 33 26 57 80 50 111 -5 19 1 27 36 46 39 22 43 23 68 8 43 -25 222 -77 266 -77 45 0 82 20 71 38 -4 7 -54 39 -111 73 -58 33 -105 62 -105 64 0 2 47 31 105 64 57 34 107 66 111 73 12 19 -27 38 -76 38 -52 0 -227 -49 -266 -75 -23 -15 -27 -15 -64 6 -36 21 -40 26 -38 61 4 95 -118 156 -186 93z m119 -40 c34 -33 33 -77 -1 -104 -52 -41 -114 -13 -114 52 0 40 9 53 40 66 38 15 49 13 75 -14z m404 -99 c-20 -17 -253 -146 -257 -142 -11 12 23 68 51 82 48 25 226 77 206 60z m-71 -196 c96 -55 87 -63 -32 -25 -109 35 -114 38 -85 59 13 9 25 16 26 16 2 0 43 -22 91 -50z m-329 -46 c41 -52 13 -114 -51 -114 -44 0 -68 25 -68 71 0 67 78 95 119 43z"></path></g></svg></span> | Prune Tree | Enter pruning mode, clicking on a branch will remove it from the tree along with all its descendandts. Click again to exit pruning mode. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;" fill="none" stroke="#166534" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0,2)"><path d="M12 3V21 M12 7 Q 9 7 5 2 M12 12 Q 18 12 19 5 M12 15 Q 9 15 4 12" /></g></svg></span> | Extract Subtree | Enter selection mode to choose a set of leaves (click nodes to select or deselect all their children leaves) and create a new tree panel preserving the topology and lengths inherited by the supertree. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg></span> | Build Distance Matrix | Calculates the patristic distances between all leaves (sum of lengths of the branches in the path going from one leaf to the other) and generates a new linked Heatmap panel. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A2.25 2.25 0 011.5 18.75v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg></span> | Leaf Statistics | Generates a new linked Data panel with per-leaf statistics like distance from the root and average distance to the other leaves. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg></span> | Download Figure | Exports the rendered tree as a publication-ready PNG figure. |

<br>

**Tree Panel Controls**

Beyond the primary functions in the header, tree panels contain a set of view-specific controls accessible via the round button in the panel's bottom left corner. These offer fine-grained control over the tree's appearance and coloring, especially when working with NHX metadata.


#### Style Settings:
Sliders are available to adjust visual parameters, with separate settings saved for radial and rectangular layouts:
*   **Label Size:** Controls the font size of the leaf labels.
*   **Node Radius:** Adjusts the size of the circles representing nodes.
*   **Branch Width:** Modifies the thickness of the tree branches.
*   **Tree Radius (Radial only):** Expands or contracts the overall radius of the circular tree layout.
*   **Right Margin (Rectangular only):** Adjusts the amount of space reserved for leaf labels on the right side.

#### Color by NHX Field:
If an NHX file is loaded, this section allows you to color the tree's nodes based on metadata:
*   **Field Selection:** A list of all detected NHX fields is provided. Selecting a field will color the nodes according to their values for that attribute.
*   **Treat as Continuous:** For numeric integer fields, this switch forces them to be treated as a continuous gradient rather than discrete categories, useful for trees annotated with bootstrap values.
*   **Color Labels:** This checkbox extends the node coloring to the corresponding leaf labels.
*   **Interactive Color Bar:** When a continuous field is selected, a color gradient bar appears, as in heatmap panels the bar serves both as a legend and as a threshold selector: Clicking on the bar sets a threshold, turning the gradient into a two-color scheme (above/below the threshold), clicking on the bar again resets the threshold.

## Structure Panels
*Render 3D molecular structures from PDB files. Link them to alignment or heatmap panels.*

<div style="text-align: center; padding: 10px; background-color:white; border-radius: 8px; margin: 15px 0; max-width: 100%;">
  <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/structurechainscmap2.png" alt="Tree Panel" style="max-width: 100%; center"/>
  <p style="font-size: 0.9em; color: #666; margin-top: 8px;">A structure panel linked to its derived contact map and its chains sequences.</p>
</div>


**Key Features & Controls:**

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg></span> | Extract Sequences | Creates new linked Alignment panels, one for each chain found in the PDB file. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg></span> | Build Distance Matrix | Calculates a Cα-Cα distance matrix for a chosen chain (or all of them) and displays it in a new linked Heatmap panel. |


#### Structure Panel Controls
As tree panels, the structure panels also dispose of view-specific controls, accessible via the settings icon <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.1rem; height: 1.1rem; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.9); box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1);"><svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 269.000000 300.000000" preserveAspectRatio="xMidYMid meet"><g transform="translate(-195.000000,535.000000) scale(0.250000,-0.250000)" fill="#000000" stroke="none"><path d="M1258 1780 c-9 -6 -20 -25 -23 -43 -10 -42 -18 -46 -65 -34 -81 22 -143 -102 -83 -165 27 -28 27 -28 0 -56 -35 -36 -34 -67 3 -125 31 -49 47 -55 93 -38 31 12 41 4 56 -41 14 -42 25 -48 87 -48 59 0 81 13 89 52 9 42 19 48 60 35 83 -25 147 93 89 163 -27 31 -27 31 0 59 34 35 33 66 -4 124 -31 49 -47 55 -93 38 -31 -12 -41 -4 -56 41 -7 20 -19 39 -27 42 -24 9 -107 6 -126 -4z m124 -66 c13 -51 50 -69 105 -51 43 15 79 -60 46 -95 -35 -36 -35 -81 -1 -115 26 -26 23 -42 -18 -101 -1 -2 -19 1 -40 7 -48 13 -80 -5 -92 -52 -13 -49 -101 -50 -114 -1 -13 51 -50 69 -105 51 -43 -15 -79 60 -46 95 35 36 35 81 1 115 -26 26 -23 42 18 101 1 2 19 -1 40 -7 46 -13 80 5 90 47 10 42 13 43 62 40 42 -3 46 -6 54 -34z"></path><path d="M1284 1606 c-65 -29 -82 -96 -41 -156 72 -108 233 -7 173 109 -27 52 -79 70 -132 47z m80 -47 c45 -35 18 -119 -39 -119 -27 0 -65 41 -65 70 0 29 38 70 65 70 7 0 24 -9 39 -21z"></path></g></svg></span> in the panel's upper left corner. These provide extensive options for customizing the appearance of the 3D model.



*    **Toggle Surface:** <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 1784 1744" fill="gray" style="width: 1rem; height: 1rem;"><g transform="translate(-1010,2590) scale(0.2,-0.2)" stroke-width="20px"><path d="M8894 12530 c-235 -25 -528 -137 -754 -288 -107 -72 -143 -100 -267 -208 l-70 -61 -179 -6 c-205 -6 -336 -28 -497 -83 -223 -77 -382 -176 -543 -338 -238 -239 -373 -526 -439 -931 -41 -248 -77 -337 -217 -532 -115 -160 -173 -253 -236 -379 -146 -292 -190 -509 -179 -898 3 -119 12 -238 22 -291 35 -193 134 -430 275 -655 159 -254 161 -263 158 -621 -3 -293 4 -362 48 -519 81 -283 212 -507 419 -715 125 -126 211 -190 345 -259 202 -104 333 -144 659 -201 288 -50 339 -73 631 -279 294 -209 467 -294 744 -367 187 -49 313 -62 586 -63 275 -1 358 8 556 59 313 80 536 190 839 414 199 146 281 192 440 241 71 23 187 59 256 81 468 149 839 468 1043 899 92 196 134 352 181 675 43 302 65 360 207 570 147 216 203 341 245 551 25 128 25 494 0 614 -54 254 -178 499 -372 735 -170 206 -220 289 -244 405 -6 30 -15 145 -20 255 -7 155 -15 227 -36 320 -134 598 -568 1061 -1130 1204 -135 34 -202 42 -420 50 -173 7 -219 12 -261 28 -50 20 -135 75 -321 211 -224 163 -544 314 -743 351 -154 29 -576 47 -726 31z m606 -340 c305 -52 662 -282 699 -451 14 -61 -3 -94 -61 -123 -29 -14 -62 -26 -74 -26 -18 0 -22 7 -27 54 -10 97 -60 160 -165 209 -50 23 -82 31 -150 35 -193 11 -349 -63 -417 -197 -93 -185 -16 -440 172 -564 109 -71 148 -82 298 -82 120 0 137 3 218 32 104 36 216 102 330 193 184 145 314 218 472 266 79 24 107 27 235 28 121 1 159 -3 230 -22 434 -117 821 -512 847 -862 7 -91 5 -93 -97 -114 -151 -32 -255 -108 -318 -232 -56 -111 -68 -180 -87 -510 -14 -252 -23 -303 -57 -332 -20 -16 -23 -5 -38 138 -32 298 -85 440 -275 739 -130 205 -147 242 -148 316 0 100 46 176 136 221 77 39 137 42 232 9 101 -35 157 -38 186 -8 49 48 -23 134 -175 209 -133 65 -223 85 -381 86 -268 1 -390 -62 -480 -246 -104 -211 -63 -324 232 -636 219 -232 261 -287 307 -399 41 -100 58 -196 58 -316 -1 -336 -195 -610 -508 -719 -99 -35 -204 -54 -409 -77 -368 -40 -420 -62 -714 -307 -306 -255 -448 -334 -678 -378 -131 -24 -311 -16 -418 20 -110 37 -206 97 -285 176 -98 98 -123 145 -128 246 -5 101 15 176 65 233 37 44 91 68 217 96 182 40 245 102 246 240 0 116 -74 220 -198 278 -61 29 -75 31 -162 31 -163 -2 -317 -67 -448 -188 -216 -201 -274 -493 -152 -762 51 -113 95 -171 299 -395 118 -130 192 -236 211 -303 20 -74 10 -209 -23 -279 -35 -77 -135 -180 -251 -259 -203 -139 -263 -245 -203 -359 59 -111 220 -121 352 -21 69 52 126 126 225 292 123 206 198 286 340 363 115 63 168 75 426 97 259 23 330 35 420 75 121 53 193 128 359 370 87 127 219 260 305 308 36 20 97 43 135 52 82 19 244 22 335 5 237 -43 460 -242 500 -446 17 -88 4 -126 -69 -198 l-59 -58 -188 11 c-214 13 -257 8 -357 -39 -139 -65 -259 -185 -327 -325 -79 -161 -91 -313 -40 -500 16 -60 30 -111 30 -112 1 -26 -188 74 -290 152 -47 36 -134 103 -194 149 -59 47 -146 104 -193 128 l-86 43 -168 3 c-135 3 -180 0 -226 -13 -122 -35 -301 -165 -421 -305 -254 -295 -326 -364 -452 -434 -99 -54 -180 -69 -335 -63 -146 5 -231 28 -332 89 -77 46 -179 157 -214 233 -56 120 -71 259 -37 357 21 62 77 137 194 259 142 150 187 205 226 282 107 212 62 492 -107 675 -155 168 -319 235 -647 266 -300 29 -388 72 -494 243 -64 102 -120 128 -169 79 -77 -77 -11 -314 130 -465 91 -97 142 -123 363 -186 217 -62 287 -108 347 -225 41 -80 48 -125 30 -179 -16 -49 -77 -131 -97 -131 -6 0 -26 18 -45 40 -46 54 -150 102 -308 144 -71 19 -148 42 -170 51 -149 63 -340 273 -420 463 -67 160 -89 300 -82 522 9 292 69 499 203 700 55 84 142 186 155 182 6 -1 8 2 5 7 -6 9 92 99 131 120 26 13 60 14 67 2 3 -5 -21 -62 -54 -127 -90 -179 -110 -290 -74 -428 74 -288 345 -489 605 -449 141 22 228 81 524 359 231 216 286 260 385 310 134 67 311 114 430 114 126 0 341 -58 447 -121 74 -45 173 -137 214 -200 70 -110 109 -287 90 -407 -14 -88 -46 -150 -138 -274 -130 -171 -144 -246 -63 -322 42 -38 42 -39 109 -34 182 13 379 203 445 428 91 307 -17 702 -262 962 -163 172 -385 284 -644 324 -122 19 -354 14 -513 -11 -364 -57 -543 -168 -735 -455 -85 -126 -186 -207 -281 -225 -77 -14 -149 77 -157 199 -11 173 81 354 253 499 131 110 247 151 530 187 197 25 255 41 370 96 107 51 175 107 227 188 54 84 78 169 78 275 0 146 -43 255 -134 347 -155 154 -405 186 -622 79 -137 -67 -214 -181 -274 -405 -17 -63 -44 -144 -61 -178 -40 -82 -155 -199 -233 -237 -49 -24 -65 -27 -130 -23 -65 3 -80 7 -113 34 -21 17 -51 56 -68 89 -28 56 -30 68 -29 165 0 66 7 129 18 170 85 320 440 639 815 732 120 30 322 30 436 -1 244 -65 461 -235 578 -452 43 -78 83 -189 137 -374 23 -77 59 -177 81 -222 104 -216 347 -376 654 -430 70 -12 128 -14 260 -9 515 19 579 19 639 2 115 -34 221 -179 221 -301 -2 -204 -213 -355 -443 -316 -71 13 -119 34 -359 162 -70 37 -85 42 -110 34 -40 -14 -76 -87 -68 -140 21 -147 209 -330 426 -416 82 -32 89 -33 265 -37 221 -5 292 5 398 56 160 77 257 172 328 319 51 105 65 208 50 361 -9 85 -17 117 -47 179 -109 232 -300 398 -562 490 l-78 28 -360 -3 c-224 -2 -394 1 -450 8 -167 21 -289 104 -363 247 -22 43 -67 164 -101 268 -111 347 -210 504 -422 666 -85 65 -129 112 -129 138 0 20 43 88 69 109 112 91 331 184 501 212 72 12 497 5 580 -10z m2896 -2558 c57 -29 168 -152 204 -226 81 -164 55 -436 -52 -552 -76 -83 -184 -96 -309 -38 -113 54 -186 137 -228 261 -41 123 -34 300 18 400 28 56 86 123 135 156 38 27 46 29 116 25 50 -3 89 -12 116 -26z m-763 -955 c169 -62 284 -173 346 -337 52 -136 23 -429 -60 -599 -70 -143 -254 -305 -381 -335 -36 -8 -37 13 -3 74 105 185 127 339 76 523 -26 96 -59 144 -205 300 -72 78 -140 153 -149 167 -37 54 -12 143 55 193 69 51 203 57 321 14z m766 -742 c1 -156 -14 -300 -39 -394 -29 -108 -109 -263 -184 -357 -113 -143 -230 -218 -509 -328 -222 -87 -344 -157 -451 -257 -163 -152 -227 -273 -315 -591 -43 -158 -76 -242 -90 -234 -5 3 -12 30 -16 59 -9 75 -38 195 -78 327 -47 155 -71 301 -65 404 4 73 9 93 48 172 78 158 233 287 378 314 28 5 143 14 255 20 111 6 233 15 271 20 140 21 286 104 438 248 207 198 275 350 334 747 l7 50 8 -40 c4 -22 8 -94 8 -160z m-5752 -541 c33 -21 37 -50 22 -171 -7 -59 -13 -187 -13 -283 -1 -202 9 -252 78 -395 107 -222 220 -307 586 -441 85 -31 173 -65 194 -76 35 -18 37 -21 21 -30 -30 -17 -249 -3 -343 21 -472 123 -809 504 -839 946 -9 148 20 288 80 377 30 44 53 60 102 71 30 7 87 -3 112 -19z m2491 -696 c60 -15 161 -112 197 -190 42 -90 32 -221 -28 -351 -63 -137 -191 -283 -313 -355 -193 -114 -481 -151 -669 -84 -62 21 -135 89 -135 124 0 32 39 89 121 181 100 111 188 221 280 351 95 135 192 239 261 279 88 51 194 68 286 45z m922 -720 c41 -28 70 -81 70 -128 0 -171 -346 -399 -489 -323 -56 30 -76 65 -75 136 0 99 56 182 179 267 103 71 248 93 315 48z" /></g></svg></span> Toggles the Solvent Accessible Surface (SAS) on and off.
*   **Surface Opacity:** When the surface is visible, this slider controls its transparency.

*   **Colors:** Choose a coloring scheme for the atoms/cartoon:
    *   **Residue:** Standard amino acid coloring.
    *   **Chain:** Assigns a unique color to each polymer chain.
    *   **Element:** Colors atoms by their element type (e.g., C, N, O).
    *   **Secondary:** Colors the cartoon by secondary structure (helices, sheets, coils).
    *   **Spectrum:** Applies a rainbow gradient along the length of each polymer chain.
*   **Representation:** Change the main style of the molecular model:
    *   **Cartoon:** The default ribbon representation.
    *   **Stick:** Shows all bonds as sticks.
    *   **Sphere:** Renders all atoms as spheres.
    *   **Line:** A simple line representation of bonds.
*   **Options:**
    *   **Waters:** Toggles the visibility of water molecules (HOH).
    *   **Labels:** Toggles residue number labels along the Cα backbone.
    *   **Hydrogens:** Toggles the visibility of hydrogen atoms.
*   **Background:** Toggles the viewer background between white and black.

## Heatmap Panels
*Visualize matrices from various sources: Distance matrices in PHYLIP format
(<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.phy</span>,<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.phylip</span>,<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.dist</span>) or arbitrary matrices in tabular format (<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.tsv</span>,<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.csv</span>). Perfect for distance matrices, contact maps, correlation or mutation matrices. Link them to alignment, tree and heatmap panels*

<div style="text-align: center; padding: 10px; background-color:white; border-radius: 8px; margin: 15px 0; max-width: 100%;">
  <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/sequencematrix.png" alt="Tree Panel" style="max-width: 100%; center"/>
  <p style="font-size: 0.9em; color: #666; margin-top: 8px;">A sequence linked to a mutation matrix with per-site pathogenicity scores.</p>
</div>

**Key Features & Controls:**

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 275.000000 257.000000" preserveAspectRatio="xMidYMid meet"><g transform="translate(-65.000000,317.000000) scale(0.1500000,-0.1500000)" fill="#4D7C0F" stroke="none"><path d="M893 1823 c-71 -14 -73 -25 -73 -476 0 -630 -23 -607 606 -607 514 0 484 -15 484 248 0 221 -12 243 -141 250 -91 5 -91 6 -43 53 103 98 92 139 -79 307 -144 140 -168 146 -260 62 -68 -62 -67 -62 -67 10 0 82 -20 127 -64 145 -34 14 -301 20 -363 8z m336 -87 c21 -25 11 -783 -11 -823 -65 -118 -233 -120 -295 -3 -28 52 -37 823 -10 833 31 13 305 7 316 -7z m373 -213 c60 -59 108 -112 108 -118 0 -6 -88 -98 -195 -205 -195 -195 -195 -195 -195 46 0 241 0 241 74 312 92 90 81 92 208 -35z m218 -382 c13 -26 13 -276 0 -302 -11 -20 -550 -31 -550 -12 0 4 73 81 162 170 163 163 163 163 270 163 96 0 108 -2 118 -19z"></path><path d="M1042 1018 c-25 -25 -7 -68 29 -68 29 0 44 27 31 55 -12 27 -40 33 -60 13z"></path></g></svg></span> | Color Scheme | Opens a dialog to change the high and low colors of the heatmap gradient and to invert the color scale. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;" fill="none" stroke="#166534" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0,2)"><path d="M12 3V21 M12 7 Q 9 7 5 2 M12 12 Q 18 12 19 5 M12 15 Q 9 15 4 12" /></g></svg></span> | Build Tree from Distances | Reconstructs a phylogenetic tree from the distance matrix using the Neighbor-Joining algorithm. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 124 124" fill="none" style="width: 1rem; height: 1rem;"><g transform="translate(-8,12)"><rect x="90" y="20" width="36" height="36" rx="12" transform="rotate(-45 81.1332 80.7198)" fill="none" stroke="#7B1FA2" stroke-width="10" /><rect x="40" y="20" width="36" height="36" rx="12" transform="rotate(-45 81.1332 80.7198)" fill="none" stroke="#7B1FA2" stroke-width="10" /><rect x="90" y="70" width="36" height="36" rx="12" transform="rotate(-45 81.1332 80.7198)" fill="none" stroke="#7B1FA2" stroke-width="10" /></g></svg></span> | Diamond View **(Square matrices only)**  | Toggles the display of square matrices between a full square and a triangular "diamond" view. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg></span> | Download Figure | Exports the rendered heatmap as a PDF. Options are provided to download only the matrix canvas or the full panel figure. |

---


**Interactive Color Bar:** All heatmap panels, with the exception of alignment color matrices, have a color gradient bar that serves both as a legend and as a threshold selector: Clicking on the bar sets a threshold, turning the gradient into a two-color scheme (above/below the threshold), clicking on the bar again resets the threshold.



---

## Data Panels
*Plots tabular or numerical data from <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.tsv</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.csv</span>, or <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.txt</span> files as interactive bar charts. Link them to alignment, data, sequence logo or tree panels.*

<div style="display: flex; gap: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
  <div style="flex: 1;">
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/msadata.png" alt="MSA nuc site Panel" style="width: 100%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">An alignment linked to a data panel with the log scale toggled. Below, the same data visualised as a raw scrollable table.</p>
  </div>
  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/treedata.png" alt="MSA nuc codon Panel" style="width: 100%; border-radius: 4px;"/>
    <p style="font-size: 0.9em;">A tree linked to its derived per-leaf statistics data panels.</p>
  </div>
</div>

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;"><text x="1" y="18" fill="#c2410c" font-size="16" font-weight="500">l</text><text x="4.2" y="18" fill="#c2410c" font-size="16" font-weight="500">o</text><text x="13" y="18" fill="#c2410c" font-size="16" font-weight="500">g</text></svg></span> | Log Scale | Toggles the Y-axis between a linear and a logarithmic scale, useful for data with a large dynamic range. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></span> | Table View | Switches from the bar chart visualization to a raw, scrollable tabular view of the data. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A2.25 2.25 0 011.5 18.75v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg></span> | Bar Chart View | Switches from raw tabular view of the data to a bar chart visualisation. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg viewBox="0 0 24 24" style="width: 1rem; height: 1rem;"><text x="0" y="18" fill="#be185d" font-size="16" font-weight="500">0</text><text x="10" y="18" fill="#be185d" font-size="18" font-weight="500">/</text><text x="16" y="18" fill="#be185d" font-size="16" font-weight="500">1</text></svg></span> | Indexing Base | Switches the linking behavior between 0-based and 1-based indexing to match the source of the data. |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg></span> | To Correlation Matrix | For tabular data with multiple numeric columns, this calculates a Pearson correlation matrix and displays it in a new Heatmap panel. |

---

## Notepad Panels

A notepad like this one is a rich-text notebook that supports Markdown and LaTeX.

| Button | Name | Description |
| :----: | :--- | :---------- |
| <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 0.5rem; background-color: #f3f4f6; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg></span> | Markdown Mode | Toggles between plain text editing and a rendered HTML view of your notes, with support for Markdown syntax, LaTeX equations, and embedded HTML. When in Markdown mode click twice on the panel to edit the underlying text, press escape or click anywhere outside to render it again. |


#### LaTeX for Scientific Notation
You can write mathematical formulas using standard LaTeX syntax. Perfect for documenting methods and analyses.


#### Interactive HTML for Rich Content
For ultimate flexibility, you can embed raw HTML to create complex, styled, and interactive elements:

<details style="border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin: 15px 0;">
  <summary style="font-weight: bold; cursor: pointer; color: #333;">Click to See an Example Workflow</summary>
  <ol style="margin-top: 10px; padding-left: 20px;">
    <li>Upload a protein MSA (e.g., <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">kinases.fasta</span>).</li>
    <li>Upload a corresponding PDB file (e.g., <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">1ATP.pdb</span>).</li>
    <li>
      <strong>Link the Alignment and Structure panels.</strong>
      <div style="border-left: 4px solid #ff9800; background-color: #fff8e1; padding: 10px; margin: 10px 0; border-radius: 4px;">
        Now, hovering over a column in the alignment will highlight the corresponding residue in the 3D structure, instantly revealing the spatial location of conserved or variable sites.
      </div>
    </li>
    <li>Generate a Sequence Logo from the alignment to visualize site-specific conservation.</li>
    <li>Save your entire session to a <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.json</span> file to share.</li>
  </ol>
</details>

---

## Sequence Logo & Picture Panels
*Specialized panels for visualizing sequence conservation and displaying images.*

<div style="display: flex; gap: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
  <div style="flex: 1;">
    <h4>Sequence Logo Panel</h4>
    <p style="font-size: 0.9em;">Generated from an Alignment panel, this view displays the information content for each site in an MSA. The height of each character stack represents the conservation at that position, while the size of individual characters represents their frequency. It can be linked for interactive highlighting to alignment or data panels.</p>
    <p style="font-size: 0.9em;"><strong>Controls:</strong> Has options to download the logo as a PNG (either the visible portion or the entire logo) and to download the underlying information content data as a TSV file.</p>
  </div>
  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <h4>Picture Panels</h4>
    <p style="font-size: 0.9em;">A simple and convenient way to include images (e.g., diagrams, charts from other programs, workflow figures) directly on your canvas alongside your data panels. Drop any image into the interface to display it in a dedicated panel (supported formats: <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.png</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.jpg</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.jpeg</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.gif</span>,<span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.svg</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.webp</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.avif</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.bmp</span>, <span style="background-color: #E8E8E8; border-radius: 0.25rem; color:#A31515; padding:1px;font-weight: 500;letter-spacing: 1px;">.ico</span>)</p>
    <p style="font-size: 0.9em;">
  </div>
</div>



## Linking in Detail

The true power of MSEABOARD is unlocked when you link panels. This creates a synchronized environment where actions in one panel have immediate, visual consequences in another. The process is designed to be simple and intuitive:

1.  **Enter Linking Mode:** Click the link icon <span style="display: inline-flex; align-items: center; justify-content: center; width: 1.2rem; height: 1.2rem; border-radius: 0.375rem; background-color: #dbeafe1d; border: 1px solid #9ca3af;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" fill="none" stroke="#ca8a04" stroke-width="2" style="width: 0.8rem; height: 0.8rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg></span> on your starting panel. The panel's header will highlight, indicating it is the source.

2.  **Select a Target:** All other panels that are eligible linking partners will be highlighted with a blue ring.

3.  **Complete the Link:** Click the link icon, again highlighted with a blue ring, on one of the eligible target panels. To cancel linking mode instead, simply click the link icon on the source panel again.

<div style="border-left: 6px solid #f3ec21c5; background-color: #fdfde3de; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
  <strong>Note:</strong>
  When an alignment or a square matrix is linked to a tree its sequences/rows will be sorted to follow the same order as in the tree, for automatic links (as when a tree is created from an alignment) this automatic reordering is disabled, however, the effect can still be achieved by relinking the two panels manually.
</div>

### Managing Links with Badges

Once linked, a colored **Link Badge** appears in the top-left corner of both panels.

<div style="padding: 10px; background-color: #d5eaffcf; border-radius: 8px; margin: 15px 0;">
  <strong style="font-size: 1.1em;">Link Badges:</strong>
  <div style="display: flex; align-items: center; gap: 15px; margin-top: 10px;">
    <span style="display: inline-block; width: 1rem; height: 1rem; border-radius: 9999px; background-color: #2dd4bf; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1);"></span> <span>An <span style="color: #324f7bf9;">active</span> link. The name of the linked panel is shown on hover, click the badge to temporarily disable the link without deleting it.</span>
  </div>
  <div style="display: flex; align-items: center; gap: 15px; margin-top: 10px;">
    <span style="display: inline-block; width:1rem; height: 1rem; border-radius: 9999px; background-color: #d1d5db; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1);"></span> <span>A <span style="color: #324f7bf9;">disabled</span>  link. Click the badge to reactivate it.</span>
  </div>
</div>


# Example boards

  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <h4><a href="https://www.mseaboard.com/?board=6330d81c0e1992b045b88f5db8bd9c12">Nucleotide alignment, codon statistics, leaf statistics, tree and patristic distance matrix</a></h4>
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/nucexample.png" alt="MSA nuc codon Panel" style="width: 100%; border-radius: 4px;"/>
  </div>

  <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <h4><a href="https://www.mseaboard.com/?board=219ab0d7eb433c94d548179b37b6a432">Protein alignment, tree and model predictions</a></h4>
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/aaexample.png" alt="MSA nuc codon Panel" style="width: 100%; border-radius: 4px;"/>
  </div>
    <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 20px;">
    <h4><a href="https://mseaboard.com/?board=e37f97be033914ec936fd20d5e773d3d">Protein structure, distance/contact map and chain sequences</a></h4>
    <img src="https://raw.githubusercontent.com/lucanest/mseaboard-showcase/main/images/protein.png" alt="MSA nuc codon Panel" style="width: 100%; border-radius: 4px;"/>
  </div>


# Local setup

Run the app locally:

```bash
npm install
npm run start
```

Visit `http://localhost:3000` and upload your files.

# Project structure

```bash
├── LICENSE
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
│   ├── logo.png
│   ├── d3.min.js
│   ├── index.html
│   ├── mseaboard-example.txt
│   ├── seqmodel.onnx.gz
│   ├── wasm
│   │   ├── fastme.js
│   │   └── fastme.wasm
│   └── workers
│   │   └── distanceMatrix.worker.js
├── README.md
├── src
│   ├── App.jsx
│   ├── constants
│   │   └── colors.js
│   ├── hooks
│   │   └── useElementSize.js
│   ├── index.css
│   ├── index.jsx
│   └── main.jsx
|   ├── components
│   |   ├── Animations.jsx
│   |   ├── Buttons.jsx
│   |   ├── Heatmap.jsx
│   |   ├── Histogram.jsx
│   |   ├── MatrixView.js
│   |   ├── PhyloTreeViewer.jsx
│   |   ├── Seqlogo.jsx
│   |   ├── StructureViewer.jsx
│   |   ├── TableViewer.jsx
│   |   └── Utils.jsx
|   ├── hooks
│   |   ├── useDistanceMatrixWorker.js
│   |   ├── useElementSize.js
│   |   └── useOmegaModel.js
└── tailwind.config.js
```


# License

MSEABOARD is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License (AGPLv3)** as published by the Free Software Foundation.

This means:
- You are free to use, modify, and distribute the software for any purpose.
- **If you modify the source code and run it as a hosted service, you must make the source code of your modified version available to your users.**

See the [`LICENSE`](LICENSE) file for full details.

