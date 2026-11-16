// Builds src/data/benchmark.json from the repository's saved artifacts.
//
// Every number shown in the presentation comes from this file, and this file
// is derived only from:
//   outputs/release/release_summary.json          (all budgets, all runs)
//   outputs/release/<budget>/<run>/metrics.json   (configs, calibration, history)
//   outputs/<run>/test_predictions.csv            (250k ROC curves, accuracy)
//   docs/feature_dictionary.csv                   (feature names and groups)
//
// Run with `npm run data` from presentation-site/. Nothing is invented,
// interpolated or smoothed: ROC curves are subsampled from the exact curve.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const readJson = (p) => JSON.parse(readFileSync(join(repo, p), "utf8"));

const MODELS = ["logreg", "xgboost", "mlp", "deep_mlp", "resnet_mlp"];
const GROUPS = ["low_level", "high_level", "all"];
const BUDGETS = ["250k", "1m", "2.5m"];

const summary = readJson("outputs/release/release_summary.json");

// The release summary names the compact MLP "compact_mlp"; run ids use "mlp".
const modelOfRun = (run) => MODELS.slice().sort((a, b) => b.length - a.length).find((m) => run.startsWith(m + "_"));

const budgets = {};
for (const b of BUDGETS) {
  const src = summary.budgets[b];
  if (!src) throw new Error(`release summary has no budget ${b}`);
  const runs = src.results.map((r) => {
    const model = modelOfRun(r.run);
    if (!model || !GROUPS.includes(r.group)) throw new Error(`unrecognised run ${r.run}`);
    return {
      run: r.run,
      model,
      group: r.group,
      rocAuc: r.roc_auc,
      prAuc: r.pr_auc,
      brier: r.brier,
      ece: r.ece,
      trainSeconds: r.train_seconds,
      epochs: r.epochs,
      parameters: r.parameters,
    };
  });
  if (runs.length !== 15) throw new Error(`${b}: expected 15 runs, found ${runs.length}`);
  budgets[b] = { rows: src.rows, splitChecks: src.split_checks, runs };
}

// ---- per-run detail from metrics.json -------------------------------------
const configs = {};
for (const m of MODELS) {
  const d = readJson(`outputs/release/250k/${m}_all/metrics.json`);
  const { history, feature_importances, ...training } = d.training;
  configs[m] = {
    family: d.model.family,
    config: training.config,
    parameterCount: training.parameter_count ?? null,
    schemaVersion: d.schema_version,
    splitProtocol: d.split.protocol_version,
  };
}

const operatingPoints = {};
const calibration = {};
for (const m of MODELS) {
  const d = readJson(`outputs/release/250k/${m}_all/metrics.json`);
  operatingPoints[m] = d.evaluation.operating_point
    ? {
        validationThreshold: d.evaluation.operating_point.validation_threshold,
        testSignalEfficiency: d.evaluation.operating_point.test_actual_signal_efficiency,
        testBackgroundRejection: d.evaluation.operating_point.test_background_rejection,
      }
    : null;
  const c = d.evaluation.test.calibration;
  calibration[m] = c.mean_predicted_value.map((x, i) => ({ predicted: x, observed: c.fraction_positives[i] }));
}

// ---- exact ROC curves from the saved 250k test predictions -----------------
function rocFromCsv(path) {
  const lines = readFileSync(join(repo, path), "utf8").trim().split("\n");
  const header = lines[0].split(",");
  const yi = header.indexOf("class_label");
  const si = header.indexOf("score");
  const rows = lines.slice(1).map((l) => {
    const c = l.split(",");
    return [Number(c[si]), Number(c[yi])];
  });
  rows.sort((a, b) => b[0] - a[0]);
  const P = rows.reduce((s, r) => s + r[1], 0);
  const N = rows.length - P;
  const curve = [[0, 0]];
  let tp = 0, fp = 0, auc = 0, prevF = 0, prevT = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 1) tp++; else fp++;
    if (i === rows.length - 1 || rows[i + 1][0] !== rows[i][0]) {
      const f = fp / N, t = tp / P;
      auc += (f - prevF) * (t + prevT) / 2;
      curve.push([f, t]);
      prevF = f; prevT = t;
    }
  }
  let correct = 0;
  for (const [s, y] of rows) if ((s >= 0.5 ? 1 : 0) === y) correct++;
  // Subsample: keep the real curve point nearest to each of 240 FPR targets.
  const keep = new Set([0, curve.length - 1]);
  let j = 0;
  for (let k = 1; k < 240; k++) {
    const target = k / 240;
    while (j < curve.length - 1 && curve[j][0] < target) j++;
    keep.add(j);
  }
  const points = [...keep].sort((a, b) => a - b).map((i) => [Number(curve[i][0].toFixed(5)), Number(curve[i][1].toFixed(5))]);
  return { points, auc, accuracy: correct / rows.length, testRows: rows.length };
}

const roc = {};
const accuracy = {};
for (const m of MODELS) {
  for (const g of GROUPS) {
    const run = `${m}_${g}`;
    const csv = `outputs/${run}/test_predictions.csv`;
    if (!existsSync(join(repo, csv))) throw new Error(`missing ${csv}`);
    const r = rocFromCsv(csv);
    const reported = budgets["250k"].runs.find((x) => x.run === run).rocAuc;
    if (Math.abs(r.auc - reported) > 5e-4) {
      throw new Error(`${run}: ROC-AUC from predictions ${r.auc} disagrees with release summary ${reported}`);
    }
    accuracy[run] = r.accuracy;
    if (g === "all") roc[m] = r.points;
  }
}

// ---- feature dictionary ----------------------------------------------------
const features = readFileSync(join(repo, "docs/feature_dictionary.csv"), "utf8")
  .trim().split("\n").slice(1)
  .map((line) => {
    const m = line.match(/^(\d+),(\d*),([^,]+),([^,]+),([^,]+),"?(.*?)"?$/);
    return { name: m[3], group: m[4], description: m[6] };
  })
  .filter((f) => f.group !== "target");
const low = features.filter((f) => f.group === "low_level").length;
const high = features.filter((f) => f.group === "high_level").length;
if (low !== 21 || high !== 7) throw new Error(`feature dictionary has ${low} low-level and ${high} high-level features`);

const out = {
  generatedFrom: "outputs/release/release_summary.json and per-run artifacts",
  run: {
    seed: summary.seed,
    sourceRows: summary.source_rows,
    duplicateRowsRemoved: summary.duplicate_rows_removed,
    gpu: summary.cuda,
    python: summary.python,
    torch: summary.torch,
    started: summary.started,
    finished: summary.finished,
    determinism: summary.determinism,
  },
  budgets,
  configs,
  operatingPoints,
  calibration,
  roc,
  accuracy,
  features,
};

const target = join(here, "..", "src", "data", "benchmark.json");
writeFileSync(target, JSON.stringify(out));
console.log(`wrote ${target}`);
console.log(`budgets: ${BUDGETS.map((b) => `${b}=${budgets[b].runs.length} runs`).join(", ")}; ROC curves verified against reported AUC for 15 runs`);
