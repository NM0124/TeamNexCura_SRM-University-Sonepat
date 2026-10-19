# System Limitations & Clinical Governance

This document details the known limitations, risk boundaries, and governance considerations of the Environment-Aware Asthma Digital Twin prototype.

---

## 1. Clinical Scope & Non-Diagnostic Status

> [!CAUTION]
> This platform is an experimental software research prototype. It is NOT a medical device, is NOT FDA 510(k) cleared or CE marked, and does NOT provide medical advice, diagnosis, or treatment plans.

* **No Automated Interventions:** The platform must never autonomously adjust medication dosages or initiate emergency responses.
* **Clinician in the Loop:** All predictions, baseline summaries, and trigger fingerprints are intended strictly as decision-support heuristics for qualified healthcare providers.
* **Reference Personal Best:** A statistical rolling median PEF cannot replace a clinically determined, spirometry-verified personal best.

---

## 2. Data & Algorithmic Limitations

1. **Synthetic Data Substrate:**
   * In-vivo human asthma involves complex immune cascades (eosinophilic/neutrophilic inflammation, airway remodeling, epithelial alarmins) that are not modeled in mathematical synthetics.
   * Model outputs trained on synthetic datasets must never be interpreted as real clinical predictive validity.

2. **Single-Patient Continuous Stream:**
   * The primary time-series represents one synthetic individual. While the system architecture enforces multi-patient isolation and supports synthetic multi-patient generation, cross-patient machine learning generalization requires large clinical cohorts.

3. **Causality vs. Association:**
   * The trigger fingerprint and lag analysis identify temporal co-occurrences between particulate/pollen spikes and subsequent PEF declines. Co-occurrence does not establish clinical causality, and must not be communicated to patients as an allergy diagnosis.

4. **Class Imbalance & Small Positive Sample Size:**
   * Forward deterioration episodes are rare events ($<10\%$ of time windows). Metric estimates (such as F1 and precision) exhibit wide variance.

5. **Wearable Optical Sensor Reliability:**
   * In real-world deployments, photoplethysmography (PPG) heart rate and SpO2 are vulnerable to motion artifacts, skin pigmentation variations, and poor perfusion. The current prototype assumes idealized hourly readings with simulated noise.

---

## 3. Data Governance & Privacy Safeguards

* **Zero External Data Exfiltration:** All computations, model inferences, and SQLite operations occur locally. No patient data or EHR attributes are transmitted over the network.
* **Deterministic Seeds & Repeatability:** Synthetic generation uses explicit random seeds to ensure clinical traceability and auditability.
