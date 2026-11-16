# HiggsLens presentation

A ten-scene interactive presentation of the HiggsLens benchmark, built to be
projected and delivered orally. It is a separate frontend application: nothing
here is imported by the Streamlit dashboard or the experiment pipeline.

> **Scientific boundary.** The deck presents a machine-learning benchmark on
> simulated UCI HIGGS events. It makes no particle-discovery claim.

## Run it

```bash
cd presentation-site
npm install
npm run dev        # development server, prints a local URL
```

For the talk itself, use the production build:

```bash
npm run build
npm run preview    # serves dist/ on http://localhost:4173
```

Then press `F` for full screen. Requires Node 18 or newer.

## Controls

| Key | Action |
|---|---|
| `→`, `Space`, `Enter`, `PageDown` | Next step, then next scene |
| `←`, `Backspace`, `PageUp`, `Shift+Space` | Previous step, then previous scene |
| `↓` / `↑` | Jump a whole scene forward / back |
| `1` to `9`, `0` | Go to scene 1 to 9, 10 |
| `Home` / `End` | First / last scene |
| `F` | Toggle full screen |
| `R` (on scene 1) | Replay the collision |

Scrolling, swiping, the on-screen arrows and the progress bar also navigate.
The URL hash (`#6`) records the current scene, so a reload returns to it.

## Where the numbers come from

No metric is typed into a component. `npm run data` runs
`scripts/build-data.mjs`, which reads the repository's saved artifacts and
writes `src/data/benchmark.json`:

| Shown in the deck | Source |
|---|---|
| Metrics for every model, feature group and budget | `outputs/release/release_summary.json` |
| Model settings and parameter counts | `outputs/release/250k/<run>/metrics.json` |
| Operating points and calibration bins | same |
| ROC curves | `outputs/<run>/test_predictions.csv`, the exact curve subsampled to 240 points |
| Feature names and groups | `docs/feature_dictionary.csv` |

The script fails if a run is missing, if a budget does not have fifteen runs,
if the feature dictionary is not 21 + 7, or if the ROC-AUC recomputed from the
saved predictions disagrees with the release summary. Re-run it whenever the
artifacts change; the generated JSON is committed so the deck builds without
the Python environment.

The dashboard images in `public/dashboard/` are screenshots of the current
Streamlit app reading the current `outputs/` (15 runs).

## Structure

```
scripts/build-data.mjs     artifact extraction and consistency checks
src/content.ts             all copy; figures are read from the data module
src/lib/data.ts            typed access to benchmark.json, model colours
src/lib/useDeck.ts         navigation: keys, scroll, swipe, hash, full screen
src/three/                 Three.js collision field and its static fallback
src/components/            charts (SVG), model diagrams, deck controls
src/scenes/                one component per scene
```

Charts are hand-written SVG rather than a charting library, which keeps each
one art-directed and the bundle small. The stage is composed at 1600 × 900 and
scaled to the window, so the 16:9 layout is the same on every screen.
`prefers-reduced-motion` disables the animations, and the collision field falls
back to a static drawing when WebGL is unavailable.

The collision animation and the event diagrams are illustrations. They are not
drawn from the dataset and are labelled as schematic where they appear.
# higgslens-presentation
