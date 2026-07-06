# Protein Explorer

A relaxed, modern educational website for discovering real proteins. The app uses public biological databases instead of mock data, with a curated starter set of interesting UniProt accessions and live search against UniProt.

## Features

- Responsive homepage with search, Protein of the Day, and a prominent Random Protein button
- Real protein data fetched from UniProt
- Search by protein name, gene, organism, or UniProt accession
- Simple organism filtering
- Source-derived category tags such as enzyme, hormone, receptor, antibody, and structural protein
- Individual protein pages with function summaries, sequence details, molecular weight, structures, citations, and source links
- Did you know? boxes when UniProt provides a source-backed detail
- Copy UniProt ID and share buttons on protein pages
- PDB, AlphaFold, and InterPro links or badges when UniProt provides those cross-references
- Favorites saved in `localStorage`
- Recently viewed proteins saved in `localStorage`
- Light and dark mode
- Friendly loading, empty, and error states

## Data Sources

- [UniProt](https://www.uniprot.org/) for protein names, genes, organisms, function comments, sequence length, molecular weight, citations, and database cross-references
- [RCSB PDB](https://www.rcsb.org/) links when PDB cross-references are present in UniProt
- [AlphaFold Protein Structure Database](https://alphafold.ebi.ac.uk/) links when AlphaFoldDB cross-references are present in UniProt
- [InterPro](https://www.ebi.ac.uk/interpro/) links when InterPro cross-references are present in UniProt

The starter collection lives in `src/data/seedProteins.js` and stores 36 UniProt accessions only. Biological facts are fetched from public source data at runtime.

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Scripts

- `npm run dev` starts the local Vite dev server
- `npm run build` creates a production build in `dist/`
- `npm run preview` serves the production build locally

## Production Build

```bash
npm run build
npm run preview
```

## GitHub Pages Deployment

This project is configured for GitHub Pages at:

`https://Yifitt.github.io/ProteinWebsite/`

Deployment is handled by `.github/workflows/deploy-pages.yml`. On every push to `main`, GitHub Actions installs dependencies, builds the Vite app, uploads `dist/`, and deploys it to Pages.

To enable it on GitHub:

1. Open the repository on GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` and wait for the **Deploy to GitHub Pages** workflow to finish.

The Vite `base` path is set to `/ProteinWebsite/` in `vite.config.js`, which is required for this repository URL.

## Notes

Fetched API responses are cached in `localStorage` for 24 hours to keep browsing snappy while still making the data layer easy to refresh and extend.

No API keys or secrets are required. Generated folders such as `node_modules/` and `dist/` are intentionally ignored and should not be committed.
