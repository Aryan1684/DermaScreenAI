# Experimental multi-model extension

The shipped model remains EfficientNet-B0. MobileNetV2 and ResNet50 are independently trainable candidates, not currently trained or deployed. The ensemble is disabled by default.

1. Prepare SCIN using the existing prepare_data.py instructions and use a GPU runtime.
2. Run `python training/train_ensemble.py --data /tmp/scin/data --out /tmp/scin/ensemble`.
3. Review evaluation.json: compare overall accuracy, macro-F1, accepted accuracy and coverage against the current model and majority baseline. Do not enable if validation could not establish a threshold or if held-out performance is inadequate. External validation is still needed.
4. Copy the two exported directories into public/models/ensemble/. Verify browser outputs against Python on representative images (including quantization effects).
5. Set rejectThreshold in config.json to the validation-selected value, and enabled to true only after review.

The experimental mode averages MobileNetV2 and ResNet50 scores and requires unanimous top-class agreement. It replaces rather than mixes with EfficientNet-B0 because the existing model lacks aligned validation predictions for a three-way ensemble. Missing enabled model assets cause an error rather than silent fallback. No photos leave the browser. Do not claim clinical reliability or improved accuracy without evidence.
