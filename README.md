# MSEAVIEW

Upload and view multiple sequence alignments, phylogenetic trees and more in your browser.

## Setup

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` and upload your files.

## Project structure

```bash
frontend/
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
