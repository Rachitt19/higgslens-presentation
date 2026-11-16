// All presentation copy lives here, separate from rendering. Numbers are not
// typed into this file: wherever a figure appears it is read from the
// artifact-derived data (src/lib/data.ts) so that copy and charts cannot drift.
import { data, getRun, f4, int, cfg, type ModelId } from "./lib/data";

const R = data.run;
const b250 = data.budgets["250k"];

export const TEAM = ["Saumya Mishra", "Aditya Rana", "Rachit Gupta", "Ronit Singh", "Krishna"];

export const SCENE_TITLES = [
  "The collision",
  "The problem",
  "From events to features",
  "The experimental pipeline",
  "The models",
  "The results",
  "Scaling with data",
  "HiggsLens workbench",
  "Reproducibility and limitations",
  "Conclusion",
];

export const BOUNDARY = "Simulated Monte Carlo events from the UCI HIGGS benchmark. Not a particle-discovery analysis.";

export const PROBLEM = {
  headline: "Two processes leave the same particles in the detector.",
  signal: {
    name: "Signal",
    body: "A hypothetical heavy Higgs boson decaying through W bosons and a charged Higgs to a light Higgs, which decays to a pair of b quarks.",
  },
  background: {
    name: "Background",
    body: "Standard Model top-quark pair production, which ends in the same visible final state.",
  },
  finalState: "One charged lepton, missing transverse energy and four jets, two of them b-tagged.",
  why: "Counting particles cannot separate them. The difference is in how the momenta are correlated.",
  question:
    "Can a model learn that separation from raw kinematics, do the physicists' invariant masses add measurable value, and what does the model family change in discrimination, calibration and compute?",
};

export const FEATURE_STAGES = [
  {
    title: "Collision event",
    body: `One simulated event. The UCI archive holds ${int(R.sourceRows)} of them, each with a binary label.`,
  },
  {
    title: "Reconstructed measurements",
    body: "What the detector simulation reports for each object: momentum, direction and, for jets, a b-tag.",
  },
  {
    title: "Feature representation",
    body: "21 low-level kinematic features, plus 7 high-level invariant masses that physicists compute from them.",
  },
  {
    title: "Machine-learning input",
    body: "Each model is trained three times: on the low-level group, the high-level group, and all 28.",
  },
];

export const MEASUREMENTS = [
  { object: "Lepton", fields: ["pT", "η", "φ"], count: 3 },
  { object: "Missing energy", fields: ["magnitude", "φ"], count: 2 },
  { object: "Jets 1 to 4", fields: ["pT", "η", "φ", "b-tag"], count: 16 },
];

export const PIPELINE = [
  { title: "Acquire", body: `Full UCI HIGGS archive, ${int(R.sourceRows)} rows.` },
  { title: "Validate", body: "29 columns, labels in {0, 1}, every value finite." },
  { title: "Deduplicate", body: `${int(R.duplicateRowsRemoved)} duplicate events removed, then nested seeded samples drawn.` },
  { title: "Split", body: `Stratified 70 / 15 / 15 with seed ${R.seed}, shared by every model.` },
  { title: "Preprocess", body: "StandardScaler fitted on training rows only." },
  { title: "Train", body: "Five models on three feature groups; early stopping on validation." },
  { title: "Set threshold", body: "Chosen on validation for 50% signal efficiency (recorded for the classical runs)." },
  { title: "Test", body: "Held-out test set scored once, with the threshold frozen." },
  { title: "Export", body: "metrics.json and test_predictions.csv per run, read by the dashboard." },
];

const params = (m: ModelId) => {
  const n = data.configs[m].parameterCount;
  return n ? `${int(n)} parameters` : null;
};

export const MODELS: Record<ModelId, { role: string; why: string; specs: string[] }> = {
  logreg: {
    role: "Linear reference",
    why: "One weighted sum of the inputs. It shows how much separation exists without any interaction between features.",
    specs: [`L-BFGS solver, C = ${cfg<number>("logreg", "C").toFixed(1)}`, "StandardScaler fitted on training rows", `Up to ${int(cfg<number>("logreg", "max_iter"))} iterations`],
  },
  xgboost: {
    role: "Tuned tree ensemble",
    why: "Boosted trees capture nonlinear interactions and are the strong classical opponent, tuned on validation so the comparison is fair.",
    specs: [
      `Up to ${int(cfg<number>("xgboost", "n_estimators"))} trees of depth ${cfg<number>("xgboost", "max_depth")}`,
      `Learning rate ${cfg<number>("xgboost", "learning_rate")}, row and column subsample ${cfg<number>("xgboost", "subsample")}`,
      `Early stopping after ${cfg<number>("xgboost", "early_stopping_rounds")} rounds on validation`,
    ],
  },
  mlp: {
    role: "Shallow network, the mid-semester baseline",
    why: "Two small hidden layers. A shallow control: it shows what a network without depth can do with the same data.",
    specs: [
      `Hidden layers ${cfg<number[]>("mlp", "hidden_sizes").join(" → ")}`,
      `BatchNorm, ReLU, dropout ${cfg<number>("mlp", "dropout").toFixed(2)}, AdamW`,
      `${params("mlp")}, up to ${cfg<number>("mlp", "max_epochs")} epochs`,
    ],
  },
  deep_mlp: {
    role: "Depth and width of Baldi et al. (2014)",
    why: "Five wide layers can build the nonlinear combinations of momenta that the invariant masses encode by hand.",
    specs: [
      `${cfg<number[]>("deep_mlp", "hidden_sizes").length} hidden layers of ${cfg<number[]>("deep_mlp", "hidden_sizes")[0]} units`,
      `BatchNorm, ReLU, dropout ${cfg<number>("deep_mlp", "dropout").toFixed(2)}, cosine schedule`,
      `${params("deep_mlp")}, up to ${cfg<number>("deep_mlp", "max_epochs")} epochs, patience ${cfg<number>("deep_mlp", "early_stopping_patience")}`,
    ],
  },
  resnet_mlp: {
    role: "Residual blocks after Gorishniy et al. (2021)",
    why: "Skip connections let each block refine the representation instead of rebuilding it, which keeps a deep stack trainable.",
    specs: [
      `${cfg<number[]>("resnet_mlp", "hidden_sizes").length} residual blocks of width ${cfg<number[]>("resnet_mlp", "hidden_sizes")[0]}`,
      "Block: BatchNorm → Linear 512 → ReLU → Linear 256, plus skip",
      `${params("resnet_mlp")}, same optimiser and stopping rule as the deep MLP`,
    ],
  },
};

const best250 = getRun("250k", "resnet_mlp", "all");
export const RESULTS = {
  headline: "At 250k events the residual network leads.",
  sub: `Held-out test set of ${int(b250.splitChecks.split_sizes.test)} events, identical for every model.`,
  hero: [
    { label: "ROC-AUC", value: best250.rocAuc, note: "ranking quality; 0.5 is chance" },
    { label: "PR-AUC", value: best250.prAuc, note: "average precision" },
    { label: "Brier score", value: best250.brier, note: "probability error; lower is better" },
  ],
  views: ["Leaderboard", "ROC curves", "Feature groups"],
};

export const SCALING = {
  headline: "More data widens the gap.",
  views: ["All 28 features", "21 low-level features", "Cost"],
};

export const WORKBENCH = {
  headline: "Every result can be opened.",
  body: "A Streamlit dashboard that reads the saved run packages. It never trains a model at startup.",
  views: [
    { file: "overview.png", name: "Artifact registry", body: "Discovers the saved runs, validates each against the artifact contract and reports the top observed run." },
    { file: "dataset.png", name: "Dataset observatory", body: "Saved exploratory analysis: class balance, feature summaries, distributions and correlations." },
    { file: "experiments.png", name: "Experiment comparison", body: "Leaderboard, feature-group comparison and training time across the loaded runs." },
    { file: "validation.png", name: "Validation workbench", body: "ROC, precision-recall and calibration curves, training history and a threshold explorer on saved test predictions." },
  ],
};

export const REPRO = {
  headline: "What is fixed, and what this does not show.",
  fixed: [
    { k: "Seed", v: String(R.seed), note: "one seed for sampling, splitting and training" },
    { k: "Split", v: "70 / 15 / 15", note: "stratified on the label; same indices for every model" },
    { k: "Split protocol", v: data.configs.resnet_mlp.splitProtocol, note: "recorded in every run" },
    { k: "Artifact contract", v: data.configs.resnet_mlp.schemaVersion, note: "metrics.json and test_predictions.csv" },
    {
      k: "Train/test overlap",
      v: String(Math.max(...Object.values(data.budgets).map((b) => b.splitChecks.events_shared_by_train_and_test))),
      note: `events shared at any budget, after removing ${int(R.duplicateRowsRemoved)} duplicates`,
    },
    {
      k: "Determinism",
      v: R.determinism.max_abs_probability_diff.toFixed(1),
      note: "largest difference in test probability between two CPU trainings of the compact MLP",
    },
  ],
  leakage: "The scaler is fitted on training rows only, thresholds and early stopping use validation only, and the test set is scored once.",
  limits: [
    "The events are simulated. A higher score here is a better classifier on this benchmark, not evidence about a real detector.",
    `About ${Math.round(b250.splitChecks.signal_fraction * 100)}% of events are signal, unlike a real rare-event search.`,
    "One seed per budget: run-to-run variance is not measured, so differences below about 0.002 should not be ranked.",
    `Training times come from one ${R.gpu} GPU and compare only within this run.`,
    "At 2.5M events several deep runs reached the 60-epoch cap while still improving.",
    "Network scores are less well calibrated than XGBoost's and would need recalibration before use as probabilities.",
  ],
};

const r25 = getRun("2.5m", "resnet_mlp", "all");
const x25 = getRun("2.5m", "xgboost", "all");
const rLow = getRun("2.5m", "resnet_mlp", "low_level");
export const FINDINGS = [
  {
    title: "The benchmark is reproducible end to end.",
    body: "45 runs from one script and one seed, on deduplicated data, with no event shared between training and test.",
  },
  {
    title: "Architecture and feature representation change the result.",
    body: `At 2.5M events the residual MLP reaches ${f4(r25.rocAuc)} ROC-AUC against ${f4(x25.rocAuc)} for XGBoost, and ${f4(rLow.rocAuc)} from the low-level features alone.`,
  },
  {
    title: "The results are inspectable.",
    body: "Every run exports its metrics and test predictions, and the dashboard shows exactly those files.",
  },
];

export const REFERENCES = [
  "Baldi, Sadowski and Whiteson, Nature Communications 5, 4308 (2014)",
  "Gorishniy, Rubachev, Khrulkov and Babenko, NeurIPS (2021)",
  "UCI Machine Learning Repository, HIGGS, dataset 280",
];
