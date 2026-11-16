import { SCENE_TITLES } from "../content";
import { data, f4, getRun, int } from "./data";

export interface SceneNote {
  duration: string;
  script: string;
  keyPoints: [string, string, string];
  viva: {
    question: string;
    answer: string;
  };
  transition: string;
}

const R = data.run;
const b250 = data.budgets["250k"];
const res250 = getRun("250k", "resnet_mlp", "all");
const xgb250 = getRun("250k", "xgboost", "all");
const log250 = getRun("250k", "logreg", "all");
const res25m = getRun("2.5m", "resnet_mlp", "all");
const xgb25m = getRun("2.5m", "xgboost", "all");
const resLow25m = getRun("2.5m", "resnet_mlp", "low_level");

export const SPEAKER_NOTES: SceneNote[] = [
  {
    // 01 The collision
    duration: "~35s",
    script:
      "Welcome to HiggsLens—our reproducible machine-learning benchmark on the simulated UCI HIGGS dataset. Before we look at a single metric, let's set the scientific boundary clearly: these are simulated Monte Carlo events from a public benchmark, not real detector measurements or a particle-discovery claim. What we are asking is fundamentally a representation and modelling question: when two physical processes look identical in what particles they leave behind, how well can different machine-learning families learn the hidden kinematic correlations?",
    keyPoints: [
      "Reproducible ML benchmark on simulated UCI HIGGS Monte Carlo events—not a discovery claim.",
      "Compares five distinct model families under one shared split and artifact contract.",
      "Press R anytime on this opening slide to replay the conceptual collision animation.",
    ],
    viva: {
      question: "Why use the simulated UCI HIGGS dataset instead of raw CERN Open Data?",
      answer:
        "UCI HIGGS provides a standardized, 11-million-event benchmark introduced by Baldi et al. (2014) with both 21 detector kinematics and 7 physicist-derived invariant masses, making it ideal for isolating feature-representation and scaling effects cleanly.",
    },
    transition: "Let's look at why separating signal from background in this benchmark is genuinely difficult.",
  },
  {
    // 02 The problem
    duration: "~45s",
    script:
      "Here is the core physics classification problem. The signal process—a hypothetical heavy Higgs cascade—and the Standard Model top-quark pair background both decay into the exact same visible final state: one charged lepton, missing transverse energy from an undetected neutrino, and four jets, two of which are b-tagged. That means simple particle counting tells you nothing. Both classes have identical object inventories. The separation lives entirely in nonlinear correlations between momenta and angles—which gives us three clear questions: can models learn those correlations from raw kinematics, do hand-crafted invariant masses still help, and how do model families trade off accuracy, calibration, and compute?",
    keyPoints: [
      "Signal and background share the exact same visible final state: 1 lepton, MET, and 4 jets (2 b-tagged).",
      "Simple cut-based counting cannot separate them; discrimination depends on momentum correlations.",
      "Frames our three research questions: raw kinematics vs. invariant masses, model family, and compute cost.",
    ],
    viva: {
      question: "If signal and background leave the exact same final particles, what makes them separable at all?",
      answer:
        "Different intermediate decay chains impart distinct energy-momentum correlations and invariant-mass peaks across subsets of the final-state four-momenta, which nonlinear models or engineered mass features can exploit.",
    },
    transition: "Next, let's see how each collision event is converted into the 28 numbers our models actually read.",
  },
  {
    // 03 From events to features
    duration: "~50s",
    script: `The full UCI archive contains ${int(R.sourceRows)} simulated events, each with a binary label and 28 continuous input features. Those 28 numbers split into two deliberate groups. First, 21 low-level kinematic measurements: transverse momentum pT, pseudorapidity eta, and azimuth phi for the lepton, missing energy, and four jets—plus b-tags on the jets. Second, 7 high-level invariant masses computed by physicists from those raw four-momenta. Crucially, we train every model three separate times: once on the 21 low-level features alone, once on the 7 high-level features alone, and once on all 28 combined.`,
    keyPoints: [
      "21 low-level detector kinematics (lepton, MET, 4 jets) + 7 physics-derived invariant masses = 28 inputs.",
      "Every model is evaluated across all three feature groups: low_level, high_level, and all.",
      "Testing low_level alone directly tests whether deep networks rediscover invariant-mass physics.",
    ],
    viva: {
      question: "Why train on the 7 high-level features alone as well as all 28?",
      answer:
        "Running all three subsets acts as an ablation: it shows how much signal lives solely in domain-engineered invariant masses versus raw kinematics, and whether combining both still helps or becomes redundant at larger sample sizes.",
    },
    transition: "To make that three-group comparison fair across five model families, every run follows one strict nine-step protocol.",
  },
  {
    // 04 The experimental pipeline
    duration: "~45s",
    script: `This nine-step pipeline enforces identical experimental conditions across all 45 runs. Starting from ${int(R.sourceRows)} source rows, we validate all 29 columns and remove ${int(R.duplicateRowsRemoved)} duplicate events before drawing nested seeded samples at 250k, 1M, and 2.5M rows. Every budget uses the same stratified 70/15/15 split with seed ${R.seed}. StandardScaler is fitted strictly on training rows, early stopping and classical operating thresholds use validation only, and the held-out test set is scored exactly once—exporting a standardized metrics.json and test_predictions.csv contract for the dashboard.`,
    keyPoints: [
      `Deduplication removes ${int(R.duplicateRowsRemoved)} duplicate events before nested 250k, 1M, and 2.5M sampling.`,
      `Shared stratified 70/15/15 split (seed ${R.seed}); scalers and early stopping never touch the test set.`,
      "Every run emits a uniform metrics.json and test_predictions.csv artifact package.",
    ],
    viva: {
      question: "How did you verify there is no train/test data leakage from duplicate events in UCI HIGGS?",
      answer:
        "We deduplicated the full source archive first (removing 278,698 duplicate rows) before sampling and splitting, and recorded an automated split check confirming zero shared events between train and test at every budget.",
    },
    transition: "With the protocol locked down, let's inspect the five model architectures we benchmarked.",
  },
  {
    // 05 The models
    duration: "~55s",
    script:
      "We compare five models spanning linear, tree-based, and neural paradigms. Logistic Regression gives our linear baseline, showing what a single weighted sum can separate. XGBoost serves as our tuned gradient-boosted tree ensemble. Then we step through three neural networks: a compact 64-to-32 MLP baseline, Baldi et al.'s 5-by-300 Deep MLP, and a 4-block Residual MLP after Gorishniy et al. Notice the difference in the comparison view: in an ordinary Deep MLP, every layer has to transform and re-encode the entire representation sequentially. In the Residual MLP, each block keeps an identity skip arc—the magenta path—carrying x straight forward to a plus junction where it adds a 512-to-256 learned refinement F(x).",
    keyPoints: [
      "Five models span linear (LogReg), tree ensemble (XGBoost), shallow (64→32), deep (5×300), and residual (4×256).",
      "Ordinary Deep MLP transforms representations sequentially (y = F(x)) across five 300-unit layers.",
      "Residual MLP adds identity skip paths (y = x + F(x)), letting each block refine features without gradient bottleneck.",
    ],
    viva: {
      question: "Why does a 4-block Residual MLP (1.06M parameters) outperform a 5×300 Deep MLP (373k parameters) on tabular kinematics?",
      answer:
        "Skip connections allow gradients to flow directly across blocks during optimization while letting each block specialize on small nonlinear corrections F(x), avoiding optimization degradation as depth and width grow.",
    },
    transition: "Let's see how these five architectures actually perform on the 250k held-out test set.",
  },
  {
    // 06 The results
    duration: "~55s",
    script: `At 250k events—scored on the exact same ${int(b250.splitChecks.split_sizes.test)} held-out test events—the Residual MLP leads in discrimination with ${f4(res250.rocAuc)} ROC-AUC, ${f4(res250.prAuc)} PR-AUC, and ${f4(res250.brier)} Brier score. In plain terms, ROC-AUC is the probability a random signal outranks a random background; PR-AUC averages precision across thresholds; and Brier score measures probability error. Now look at the practical trade-off in the leaderboard: Residual MLP reaches the highest ROC-AUC at ${f4(res250.rocAuc)} in ${res250.trainSeconds.toFixed(1)} seconds, whereas XGBoost reaches ${f4(xgb250.rocAuc)} in just ${xgb250.trainSeconds.toFixed(1)} seconds—nearly twelve times faster, while Logistic Regression sits far behind at ${f4(log250.rocAuc)}.`,
    keyPoints: [
      `Residual MLP achieves the highest 250k ROC-AUC (${f4(res250.rocAuc)}) in ${res250.trainSeconds.toFixed(1)}s on one Tesla T4.`,
      `XGBoost delivers a strong performance/time trade-off: ${f4(xgb250.rocAuc)} ROC-AUC in ${xgb250.trainSeconds.toFixed(1)}s (~12× faster).`,
      "ROC-AUC measures pairwise ranking, PR-AUC precision-recall balance, and Brier score probability calibration error.",
    ],
    viva: {
      question: "Why evaluate Brier score and ECE alongside ROC-AUC if physicists often cut on a score threshold?",
      answer:
        "ROC-AUC only evaluates rank ordering, whereas Brier score and Expected Calibration Error verify whether predicted scores behave as trustworthy probabilities—important whenever downstream likelihood ratios or weighted analyses are used.",
    },
    transition: "Next, what happens to that narrow lead when we scale the training budget tenfold from 250k to 2.5M events?",
  },
  {
    // 07 Scaling with data
    duration: "~50s",
    script: `Across our three discrete seeded budgets—250k, 1M, and 2.5M events—scaling data widens the gap between deep neural networks and classical baselines. On all 28 features, the deep-network lead over XGBoost grows from +0.015 at 250k, to +0.020 at 1M, to +0.023 at 2.5M, where Residual MLP reaches ${f4(res25m.rocAuc)} versus ${f4(xgb25m.rocAuc)} for XGBoost. Even more telling, on the 21 low-level features alone, Residual MLP reaches ${f4(resLow25m.rocAuc)} at 2.5M—beating XGBoost given all 28 features. Two caveats are critical: these are three discrete runs with one seed (${R.seed}) per budget, so intermediate points and run-to-run variance are not measured, and in the Cost tab Residual MLP takes ${Math.round(res25m.trainSeconds / xgb25m.trainSeconds)}× longer than XGBoost with worse calibration.`,
    keyPoints: [
      `Deep lead over XGBoost widens across 250k (+0.015), 1M (+0.020), and 2.5M (+0.023) seeded budgets.`,
      `On 21 raw kinematics alone at 2.5M, Residual MLP (${f4(resLow25m.rocAuc)}) surpasses 28-feature XGBoost (${f4(xgb25m.rocAuc)}).`,
      `Strict limitation: one seed (${R.seed}) per budget; no intermediate interpolation or variance bars are claimed.`,
    ],
    viva: {
      question: "Why does XGBoost lag behind deep networks as sample size grows to 2.5M?",
      answer:
        "Axis-aligned tree splits struggle to smoothly approximate high-dimensional oblique combinations of four-momenta—like invariant masses—whereas deep continuous representations benefit directly from extra training examples.",
    },
    transition: "Rather than leaving these results in static tables, we built a Streamlit workbench so anyone can inspect every saved artifact.",
  },
  {
    // 08 HiggsLens workbench
    duration: "~45s",
    script:
      "This is our Streamlit evidence workbench, which reads directly from the saved run artifacts and never trains models on startup. We walk through four views. First, the Dataset Observatory displays the 21 low-level and 7 high-level feature dictionary alongside saved distributions and class balance. Second, the Experiment Registry validates all 15 saved 250k runs against the higgs-split-v1 contract. Third, Model Comparison lets users filter across models and feature groups on the leaderboard. Finally, the Validation Workbench overlays ROC, precision-recall, and calibration curves plus an interactive threshold explorer on saved held-out predictions.",
    keyPoints: [
      "Artifact-backed Streamlit app: reads saved outputs/ directly with zero startup training.",
      "Guided four-stage flow: Dataset Observatory → Experiment Registry → Model Comparison → Validation Workbench.",
      "Supports multi-run curve overlays, calibration inspection, and threshold exploration on saved test predictions.",
    ],
    viva: {
      question: "How do you prevent someone using the interactive threshold workbench from leaking test-set tuning?",
      answer:
        "The dashboard explicitly labels the test-set workbench as exploratory only; official benchmark thresholds and early stopping are frozen on the validation split inside the pipeline before test scoring.",
    },
    transition: "That separation brings us directly to what is fixed by our protocol and what this benchmark does not claim.",
  },
  {
    // 09 Reproducibility and limitations
    duration: "~45s",
    script: `Scientific credibility rests as much on stating limitations as reporting top scores. On the left is everything fixed by protocol: seed ${R.seed}, shared 70/15/15 splits, schema contract ${data.configs.resnet_mlp.schemaVersion}, zero overlapping events between train and test after deduplication, and exact CPU determinism (0.0 max probability diff across two compact-MLP runs). On the right are six explicit boundaries: the events are simulated with an artificial ~${Math.round(b250.splitChecks.signal_fraction * 100)}% signal fraction, we ran one seed per budget so differences below ~0.002 should not be ranked, GPU timings apply only to this ${R.gpu}, several 2.5M deep runs hit the 60-epoch cap, and neural probabilities need recalibration compared to XGBoost.`,
    keyPoints: [
      `Fixed protocol: seed ${R.seed}, 0 train/test overlap after removing ${int(R.duplicateRowsRemoved)} duplicates, strict validation-only tuning.`,
      `Simulated ~${Math.round(b250.splitChecks.signal_fraction * 100)}% balanced classes—not a realistic rare-event collider signal-to-background ratio.`,
      "One seed per budget (gaps < 0.002 unranked); 2.5M deep runs hit the 60-epoch cap and require recalibration.",
    ],
    viva: {
      question: "If you had more compute, what single follow-up experiment would strengthen these conclusions most?",
      answer:
        "Running 3–5 independent seeds per budget to quantify variance, lifting the 60-epoch cap at 2.5M, and adding post-hoc temperature or isotonic recalibration on the validation split.",
    },
    transition: "Let's bring these three findings together to close.",
  },
  {
    // 10 Conclusion
    duration: "~35s",
    script: `To summarize: first, the benchmark is reproducible end to end—45 runs from one protocol, deduplicated data, and zero train-test overlap. Second, architecture and feature representation meaningfully change the outcome: at 2.5M events Residual MLP reaches ${f4(res25m.rocAuc)} ROC-AUC versus ${f4(xgb25m.rocAuc)} for XGBoost, and ${f4(resLow25m.rocAuc)} from raw kinematics alone—while XGBoost remains dramatically faster and better calibrated. Third, every metric and prediction file is open and inspectable in the workbench. Thank you—we'd be glad to take your questions.`,
    keyPoints: [
      "End-to-end reproducibility across 45 runs, deduplicated data, and zero train/test overlap.",
      `At 2.5M events: Residual MLP leads (${f4(res25m.rocAuc)} all, ${f4(resLow25m.rocAuc)} low-level) while XGBoost (${f4(xgb25m.rocAuc)}) wins on speed & calibration.`,
      "All metrics, predictions, and exploratory plots are backed by exported artifact contracts.",
    ],
    viva: {
      question: "What is the main takeaway for practitioners choosing between XGBoost and Residual MLPs on physics tabular data?",
      answer:
        "At moderate budgets or strict latency/calibration constraints, XGBoost is hard to beat for the compute cost; at million-event scale with rich raw kinematics, residual neural architectures extract measurable extra separation.",
    },
    transition: "Thank you — happy to open the floor for questions or jump to any slide or chart.",
  },
];

export function getNoteMeta(scene: number) {
  return {
    title: SCENE_TITLES[scene] ?? "",
    note: SPEAKER_NOTES[scene],
  };
}
