export type ConditionId =
  | "eczema_dermatitis"
  | "psoriasis"
  | "fungal_infection"
  | "urticaria"
  | "insect_bite"
  | "acne_folliculitis"
  | "other";

export interface ModelInfo {
  trained: boolean;
  version: string;
  backbone: string;
  inputSize: number;
  classes: ConditionId[];
  dataset: string;
  trainedOn: string;
  rejectThreshold: number;
  images: { train: number; val: number; test: number };
  metrics: {
    test_accuracy: number;
    test_macro_f1: number;
    majority_class_baseline_accuracy: number;
    test_coverage_at_threshold: number;
    test_accuracy_on_accepted: number | null;
    per_class: Record<string, { precision: number; recall: number; "f1-score": number; support: number }>;
    train_class_counts: Record<string, number>;
    test_class_counts: Record<string, number>;
  };
}

export interface ScoredCategory {
  id: ConditionId;
  score: number; // raw softmax output, 0..1 (NOT a calibrated probability)
}

export interface QualityIssue {
  code: "too_small" | "too_dark" | "overexposed" | "blurry" | "low_contrast";
  severity: "warning" | "blocking";
  message: string;
}

export interface QualityReport {
  issues: QualityIssue[];
  blocking: boolean;
  brightness: number;
  sharpness: number;
}

export interface PredictionResult {
  ranked: ScoredCategory[]; // all categories, highest first
  top: ScoredCategory;
  reliable: boolean; // false -> show "unable to assess reliably"
  threshold: number;
  quality: QualityReport;
  inferenceMs: number;
  modelCount?: number;
  disagreement?: boolean;
}
