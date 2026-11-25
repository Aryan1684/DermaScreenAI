# Quick accuracy experiment: existing EfficientNet-B0

Target: at least 50% overall image-level test accuracy without reducing macro F1. This is a target, not a measured result.

The experiment reuses the shipped TF.js model, averages predictions on original and flipped views (test-time augmentation), and evaluates small class-prior adjustments. A candidate is selected only using validation accuracy with a macro-F1 safeguard. The held-out test set is then used once to compare the locked candidate with the original model. The previous test set has already been used for historic reporting; fresh independent evaluation remains necessary.

From the repository root after preparing the SCIN dataset with the existing instructions:

```bash
python training/evaluate_existing.py --data /tmp/scin/data --out /tmp/scin/quick_eval
npm ci
node training/evaluate_existing.mjs public/models/skin /tmp/scin/quick_eval
```

The optional native TF.js Node backend can accelerate inference if installed and compatible with your Node version; otherwise the standard CPU backend is used. The full evaluation can be slow. The report is written to /tmp/scin/quick_eval/quick_evaluation.json. It includes baseline and candidate accuracy, macro-F1 and confusion matrices, with a targetMet flag.

The experiment does not change production model weights, screening threshold, or published metrics. Do not claim 50% until the result is measured. If targetMet is false, do not retune using the test results; collect more training data and train a new model, then evaluate on a fresh test set. Even if targetMet is true, validate on fresh cases and review class-wise errors before changing browser inference.
