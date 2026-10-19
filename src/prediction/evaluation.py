"""
Model Evaluation and Metric Calculation Subsystem.
Computes Precision, Recall, F1, PR-AUC, ROC-AUC, Brier score, and Confusion Matrix.
Provides honest evaluation documentation without fabricating results.
"""

from typing import Dict, Any, Optional, List
import numpy as np
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
)
from pydantic import BaseModel, Field


class EvaluationMetrics(BaseModel):
    model_name: str
    split_method: str  # chronological_single_patient, patient_disjoint_multi_patient
    total_samples: int
    train_samples: int
    test_samples: int
    positive_events_test: int
    negative_events_test: int
    prevalence_pct: float

    # Core Performance
    precision: float
    recall: float
    f1: float
    pr_auc: Optional[float] = None
    roc_auc: Optional[float] = None
    brier_score: Optional[float] = None

    # Confusion matrix
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int

    limitations: List[str] = Field(default_factory=list)


class ModelEvaluator:
    @staticmethod
    def evaluate_predictions(
        model_name: str,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_prob: Optional[np.ndarray],
        train_count: int,
        split_method: str = "chronological_single_patient"
    ) -> EvaluationMetrics:
        test_samples = len(y_true)
        pos_count = int(np.sum(y_true))
        neg_count = test_samples - pos_count
        prevalence = (pos_count / test_samples * 100.0) if test_samples > 0 else 0.0

        limitations = []
        if split_method == "chronological_single_patient":
            limitations.append(
                "Single-patient chronological split: Tests temporal generalizability on one individual, "
                "NOT cross-patient generalizability."
            )
        if pos_count < 10:
            limitations.append(
                f"Small positive sample count in test set ({pos_count} events). "
                "Confidence intervals are wide; metric estimates are provisional."
            )

        # Basic metrics
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))

        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

        # Probabilistic metrics
        pr_auc = None
        roc_auc = None
        brier = None

        if y_prob is not None and len(np.unique(y_true)) > 1:
            try:
                pr_auc = float(average_precision_score(y_true, y_prob))
            except Exception:
                pass
            try:
                roc_auc = float(roc_auc_score(y_true, y_prob))
            except Exception:
                pass
            try:
                brier = float(brier_score_loss(y_true, y_prob))
            except Exception:
                pass

        return EvaluationMetrics(
            model_name=model_name,
            split_method=split_method,
            total_samples=train_count + test_samples,
            train_samples=train_count,
            test_samples=test_samples,
            positive_events_test=pos_count,
            negative_events_test=neg_count,
            prevalence_pct=prevalence,
            precision=prec,
            recall=rec,
            f1=f1,
            pr_auc=pr_auc,
            roc_auc=roc_auc,
            brier_score=brier,
            true_positives=tp,
            false_positives=fp,
            true_negatives=tn,
            false_negatives=fn,
            limitations=limitations
        )
