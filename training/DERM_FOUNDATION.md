# Google Derm Foundation experiment

1. Request access to https://huggingface.co/google/derm-foundation and review the applicable terms.
2. Create a read token at https://huggingface.co/settings/tokens and add it as the repository Actions secret HF_TOKEN. Never share it in chat or commit it.
3. Open the Derm Foundation classifier workflow in Actions and rerun its failed job after adding the secret (or run manually when the workflow is available on the default branch).
4. Read the metrics.json artifact and compare macro F1, overall accuracy, class-specific metrics and evaluation population. 50% is a target, not a guaranteed result.

The public workflow publishes only aggregate metrics. Local execution saves the numeric classifier head; the foundation model itself is not distributed by this repository. Production integration would require obtaining the gated model, evaluating the raw-image inference pipeline against these embeddings, reviewing its terms, and updating privacy/consent if images are sent to a server. No production model is replaced by this experiment.

Official notebook: https://github.com/Google-Health/derm-foundation/blob/master/notebooks/train_data_efficient_classifier.ipynb
