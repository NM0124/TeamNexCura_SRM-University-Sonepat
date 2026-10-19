# Model Card: Asthma Deterioration Risk Predictor

## 1. Model Details
* **Model Name:** Asthma Deterioration Early Warning Predictor
* **Version:** 1.0.0-poc
* **Model Architectures:**
  1. **Interpretable Baseline:** L2-Regularized Logistic Regression with Standard Scaler and balanced class weighting.
  2. **Candidate Comparison:** Histogram-based Gradient Boosting Classifier (`HistGradientBoostingClassifier`) with balanced class weighting.
* **Output:** Estimated probability $[0.0, 1.0]$ of an impending deterioration event within a 6-hour forward window.
* **Risk Categorization:** Low ($<0.25$), Moderate ($0.25 - 0.65$), High ($\ge 0.65$).
* **Safe Abstention:** Model prediction is withheld if inputs fail physiological range checks or data freshness standards.

---

## 2. Intended Use & Clinical Scope
* **Intended Purpose:** Research proof-of-concept demonstrating how streaming wearable observations, environmental exposures, and baseline statistics can anticipate respiratory deterioration.
* **Out of Scope & Prohibited Uses:**
  * Must NOT be used for autonomous medical diagnosis.
  * Must NOT be used to prescribe, modify, or discontinue prescription medications.
  * Must NOT replace emergency clinical triaging.

---

## 3. Technical Event Definition
* **Prediction Horizon:** Next 6 hours ($t_{\text{pred}} < t \le t_{\text{pred}} + 6\text{h}$).
* **Target Endpoint:** At least 2 consecutive hourly observations showing Peak Expiratory Flow (PEF) $< 80\%$ of baseline reference value (clinical personal best or rolling median).
* **Information Boundary:** Predictor accesses observations strictly available at or before $t_{\text{pred}}$. Future measurements and target labels are rigorously excluded.

---

## 4. Training and Evaluation Data
* **Data Source:** Synthetic time series of 720 hourly records (714 evaluable 6-hour windows).
* **Train / Test Split:** Chronological split (70% training, 30% testing). Overlapping windows are not randomized.
* **Label Distribution:**
  * Total evaluable samples: 714
  * Positive deterioration events: 44 (6.16% overall prevalence)
  * Test set positive events: 17 out of 215 test windows (7.91% test prevalence)

---

## 5. Quantitative Performance (Chronological Single-Patient Split)

| Evaluation Metric | Interpretable Baseline (Logistic Regression) | Candidate Model (HistGradientBoosting) |
| :--- | :--- | :--- |
| **Precision** | $0.000$ | $1.000$ |
| **Recall** | $0.000$ | $0.059$ |
| **F1-Score** | $0.000$ | $0.111$ |
| **PR-AUC (Average Precision)** | $0.052$ | $0.139$ |
| **ROC-AUC** | $0.250$ | $0.507$ |
| **Brier Score** | $0.216$ | $0.077$ |
| **Confusion Matrix (TN / FP / FN / TP)** | $162 \;/ \; 36 \; / \; 17 \; / \; 0$ | $198 \; / \; 0 \; / \; 16 \; / \; 1$ |

---

## 6. Honest Evaluation & Key Limitations
1. **Single-Patient Generalization:** Because the primary continuous series contains 1 synthetic individual, a chronological split tests temporal forecasting on that individual, but cannot establish patient-disjoint generalizability across unseen humans.
2. **Extreme Class Imbalance:** With only 17 positive events in the test split, confidence intervals around precision and recall are wide.
3. **Synthetic Provenance:** Metrics reflect synthetic algorithmic patterns, not prospectively validated clinical trials.
