# Asthra — Asthma Digital Twin Platform

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/frontend-React-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/ML-scikit--learn-orange.svg)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/tests-20%20passed-brightgreen.svg)]()
[![Status](https://img.shields.io/badge/PoC-Synthetic%20Research-informational.svg)]()

> **RESEARCH & SOFTWARE PROOF OF CONCEPT:** This system is an evidence-grounded research software prototype developed with synthetic time-series and synthetic EHR data. It does **not** provide medical diagnosis, does not prescribe treatments, and is not a cleared medical device.

---

## Team & Institution Information

| Field | Details |
|---|---|
| **Team Name** | Team NexCura |
| **Project Title** | Asthra — Asthma Digital Twin Platform |
| **College / Institution** | SRM University Delhi-NCR, Sonepat, Haryana, India |
| **Incubation Centre** | CIIE (Center of Innovation, Incubation and Entrepreneurship) |
| **Department / Specialization** | Computer Science and Engineering (CSE) — Data Science and Artificial Intelligence |
| **Academic Year** | Third Year |

### Team Members

| Role | Name |
|---|---|
| Team Leader | Nikhil Mehlawat |
| Member | Janis Malhotra |
| Member | Krithika Meenakshi |
| Member | Sakshi Kaushik |

---

## 1. Project Overview

The **Athra - Asthma Digital Twin Platform** creates a dynamic virtual representation of an asthma patient by fusing static electronic health record (EHR) medical histories with continuous physiological measurements (PEF, SpO₂, heart rate, respiratory rate), patient-reported symptoms, and localized environmental exposures (PM2.5, PM10, pollen, temperature, humidity).

The platform continuously maintains a patient-specific personalized baseline, assesses incoming data quality, forecasts 6-hour deterioration risks, explains active environmental trigger fingerprints, and provides an interactive "what-if" scenario simulation lab for clinicians.

---

## 2. Problem Statement

Asthma is a chronic inflammatory airway disease affecting over 300 million people globally. Conventional clinical asthma care is predominantly episodic and reactive: patients visit clinics every few months, while sudden environmental surges (fine particulate air pollution, aeroallergens, abrupt weather shifts) trigger severe bronchospasms and acute exacerbations outside the clinic.

Existing remote patient monitoring systems present disconnected sensor graphs without context. They lack:
* Fused baseline awareness (distinguishing personal best from population averages).
* Predictive early warning (forecasting deterioration hours before severe symptoms).
* Environmental attribution (identifying which ambient exposures provoked the decline).
* Safe algorithmic abstention (preventing confident predictions on corrupted or stale sensor data).

---

## 2b. 🩺 Healthcare Use Case

Asthra explores a patient-specific asthma-monitoring workflow for respiratory clinicians and researchers. It combines synthetic historical Electronic Health Records (EHRs) with simulated respiratory measurements, symptom observations, and environmental time-series data to demonstrate how a patient's evolving virtual state could be monitored.

The prototype explores the following use cases:

* **Personalized respiratory monitoring:** Review changes in respiratory measurements relative to a patient's available baseline.
* **Deterioration risk estimation:** Estimate the risk of a defined future decline in Peak Expiratory Flow (PEF).
* **Environmental trigger analysis:** Examine temporal associations between environmental exposures and subsequent respiratory changes.
* **What-if scenario simulation:** Explore hypothetical changes using an isolated copy of a virtual patient's state.
* **Clinical decision-support research:** Present patient history, measurements, trends, and model estimates through a clinician-oriented dashboard.

> **Disclaimer:** Asthra is a synthetic-data research prototype, not a clinically validated medical device. Its outputs must not be used for diagnosis, treatment decisions, medication adjustments, or emergency triage.

---

## 3. Proposed Solution

This platform addresses these shortcomings through:
1. **Longitudinal EHR Fusion:** Integrates Synthea FHIR records to ground the digital twin in the patient's verified diagnosis date, hospitalization history, active controller medications, and known allergies.
2. **Stepped Time-Series Replay Engine:** Replays hourly wearable and ambient environmental observations without leaking future observations.
3. **Personalized Robust Baseline:** Automatically computes rolling medians and MAD statistics, clearly flagging provisional baselines (< 24h) and maintaining clinician-documented clinical personal bests.
4. **Time-Aware Deterioration Prediction:** Estimates 6-hour risk of significant PEF decline ($< 80\%$ reference value) using only past observations.
5. **Personalized Trigger Fingerprint & Explainability:** Quantifies lag associations between particulate/pollen spikes and subsequent airway constriction.
6. **Scenario Simulation Lab ("What-If"):** Enables clinicians to simulate hypothetical exposure surges or medication interventions on an isolated clone of the twin.
7. **Safe Abstention & Quality Gate:** Explicitly withholds predictions when data are missing, out of physiological range, or stale.

---

## 4. Digital Twin Concept & Implementation

A **Digital Twin** in healthcare is a computational counterpart of an individual patient that mirrors their current state, updates dynamically as new observations arrive, and enables predictive forecasting and scenario simulation.

In this platform, each patient's twin is encapsulated as an independent `PatientTwin` entity:
* **State Isolation:** Observations for Patient A never alter Patient B's state or baselines.
* **Dual Time Awareness:** Maintains real-world observation timestamps strictly separated from simulated arrival timestamps.
* **Provisional vs. Established:** Baselines are marked provisional during the first 24 hours of data.
* **Idempotent Persistence:** All observations, predictions, and alerts are stored idempotently in a local SQLite database.

---

## 5. Architecture

```
TeamNexCura_SRM-University-Sonepat/
│
├── server.py                          # FastAPI backend & static React bundle server
├── frontend/                          # React doctor dashboard application
│   ├── src/                           # React components, views, styles
│   └── package.json                   # Frontend dependencies & build script
├── requirements.txt                   # Project Python dependencies
├── README.md                          # Comprehensive system documentation
├── .env.example                       # Environment configuration template
├── .gitignore                         # Git exclusion rules
│
├── config/
│   └── settings.py                    # Global path resolution & configuration
│
├── data/
│   ├── raw/
│   │   ├── synthetic_apple_health_asthma_timeseries.csv  # 720h continuous observations
│   │   └── synthea/                   # Sample Synthea FHIR JSON patient bundles
│   ├── processed/                     # SQLite database & trained model joblib files
│   ├── generated/                     # Synthetic multi-patient cohorts & metadata
│   └── DATA_DICTIONARY.md             # Complete 20-variable schema documentation
│
├── src/
│   ├── ingestion/
│   │   ├── csv_loader.py              # CSV schema validator & range checker
│   │   ├── csv_stream_replay.py       # Time-series replay stepping engine
│   │   ├── fhir_parser.py             # Synthea HL7 FHIR bundle parser
│   │   ├── schema_normalizer.py       # Normalized internal EHR profile schema
│   │   └── synthea_importer.py        # Directory scanner & asthma cohort selector
│   │
│   ├── digital_twin/
│   │   ├── patient_twin.py            # Patient digital twin virtual state representation
│   │   ├── patient_registry.py        # Multi-patient registry enforcing state isolation
│   │   ├── baseline_manager.py        # Robust rolling median & MAD baseline calculator
│   │   ├── data_quality.py            # Sensor quality evaluator & safe abstention gate
│   │   └── feature_engineering.py     # Leakage-safe time-aware feature extractor
│   │
│   ├── simulation/
│   │   ├── synthetic_patient_generator.py # Multi-patient longitudinal trajectory generator
│   │   ├── scenario_engine.py         # What-if simulation engine on cloned twin states
│   │   └── SIMULATION_METHOD.md       # Simulation mathematics & assumptions
│   │
│   ├── prediction/
│   │   ├── label_builder.py           # Forward-looking 6h deterioration label constructor
│   │   ├── train.py                   # Chronological model training pipeline
│   │   ├── predictor.py               # Risk predictor & clinical rules evaluator
│   │   ├── explainability.py          # Delta explanation & trigger fingerprinting
│   │   ├── evaluation.py              # Precision, recall, PR-AUC & Brier score evaluation
│   │   └── model_registry.py          # Model artifact loader & caching
│   │
│   ├── services/
│   │   ├── patient_service.py         # Coordinator between registry, EHR, and database
│   │   ├── monitoring_service.py      # Replay driver feeding observations into twin
│   │   ├── alert_service.py           # Clinical alert generator & deduplicator
│   │   └── report_service.py          # Text/PDF clinical summary & CSV exporter
│   │
│   └── storage/
│       ├── database.py                # SQLite engine & session management
│       ├── models.py                  # SQLAlchemy models (observations, predictions, alerts)
│       └── repositories.py            # Clean CRUD repository interfaces
│
├── dashboard/
│   ├── styles.py                      # Glassmorphic clinical CSS & alert banner
│   ├── overview.py                    # Page 1: Cohort surveillance & KPI metrics
│   ├── patient_detail.py              # Page 2: Fused EHR profile, vitals & event timeline
│   ├── monitoring.py                  # Page 3: Live replay controls & interactive Plotly charts
│   ├── risk_explorer.py               # Page 4: 6h risk forecast, top drivers & trigger analysis
│   ├── scenario_lab.py                # Page 5: What-if parameter simulator (isolated clone)
│   ├── model_evaluation.py            # Page 6: Chronological validation metrics & confusion matrix
│   └── data_sources.py                # Page 7: Data provenance, cohort generator & report export
│
├── tests/
│   ├── test_csv_loader.py             # CSV validation & duplicate detection tests
│   ├── test_stream_replay.py          # Replay stepping, seek & reset tests
│   ├── test_synthea_importer.py       # FHIR parsing & missing-data tests
│   ├── test_feature_engineering.py    # Temporal cutoff & target exclusion tests
│   ├── test_prediction.py             # Label construction & safe abstention tests
│   ├── test_patient_isolation.py      # Patient isolation & non-mutation tests
│   └── test_synthetic_generator.py    # Seed reproducibility & bounds tests
│
└── docs/
    ├── ARCHITECTURE.md                # System architecture & component flow
    ├── DATA_SOURCES.md                # Provenance of CSV, Synthea, and generated cohorts
    ├── MODEL_CARD.md                  # Detailed model performance & intended use
    ├── LIMITATIONS.md                 # Clinical governance & scientific limitations
    ├── SIMULATION_METHOD.md           # Diurnal cycle & episode generation math
    └── API_AND_EXTENSION_GUIDE.md     # Extension guide for external feeds & databases
    └── submission/
        ├── Presentation.pptx
        ├── Architecture_Diagram.png
```

---

## 6. Technology Stack

* **Frontend:** React 19+, Vite, Lucide-React, Custom Modular CSS (recreating the design and clinical workflow of `ui.png`).
* **Backend:** FastAPI, Uvicorn, Python 3.10+, Pandas, NumPy, Pydantic 2+.
* **Machine Learning:** scikit-learn (Logistic Regression, HistGradientBoostingClassifier, StandardScaler, Pipeline).
* **Storage:** SQLite3 via SQLAlchemy 2.0+ ORM.
* **Data Standards:** HL7 FHIR R4 (Patient, Condition, Encounter, Observation, MedicationRequest, AllergyIntolerance).
* **Testing:** pytest 8.0+.

---

## 6b. 🤖 AI/ML Models and Frameworks

* **Machine Learning Framework:** scikit-learn
  * **Logistic Regression:** Used for the historical EHR-only comparison baseline.
  * **HistGradientBoostingClassifier:** Used for dynamic time-series and fused-data model comparisons, as documented in the project evaluation.
* **Data Preprocessing:** `StandardScaler` and scikit-learn `Pipeline`.
* **Feature Engineering:** Time-aware features, rolling baseline statistics, and environmental lag features based on observations available at the prediction cut-off.
* **Model Evaluation:** F1 score, Precision-Recall Area Under the Curve (PR-AUC), and Brier score.
* **Rule-Based Baseline:** A rule-based approach for comparison with machine-learning models.

The project documentation reports the following results from synthetic data:

| Model Approach | F1 Score | PR-AUC | Brier Score |
|---|---|---|---|
| Historical EHR only | 0.000 | 0.028 | 0.0251 |
| Dynamic time-series only | 0.870 | 0.785 | 0.0045 |
| Fused EHR and dynamic data | 0.870 | 0.798 | 0.0045 |
| Rule-based baseline | 0.853 | N/A | N/A |

> These are reported prototype evaluation results on synthetic data. They do not establish clinical validity or real-world predictive performance.

---

## 7. Installation & Setup

### Prerequisites
* Python 3.10, 3.11, 3.12, 3.13, or 3.14.
* Node.js & npm (for building frontend).
* Git.

### Step 1: Clone the repository
```bash
git clone https://github.com/NM0124/TeamNexCura_SRM-University-Sonepat.git
cd TeamNexCura_SRM-University-Sonepat
```

### Step 2: Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Build the Frontend (Optional if pre-built)
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 4: Configure Environment
Copy `.env.example` to `.env` (optional, defaults run locally out of the box):
```bash
cp .env.example .env
```

---

## 8. Running the Application

Start the unified FastAPI server which serves both the REST API and the production-built React Doctor Dashboard:
```bash
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```
Open your browser to `http://127.0.0.1:8000`.

---

## 9. Demonstrating Primary Features

The doctor-facing dashboard provides an integrated, professional clinical workflow:
* **Anatomical Respiratory Visualizer:** 3 distinct sub-tabs (Lungs with regional ventilation dynamics, CT Scan with DICOM study viewer, and 3D View with rotatable thoracic ribcage model).
* **Future-Event Prediction Card:** Displays 2-hour deterioration probability (e.g., 19% Low / 96% High), model confidence score, delta vs. previous observation, and top contributing feature bars.
* **Diagnostic Lab Reports:** Complete genuine panels (Eosinophils, Total IgE, CRP, Vitamin D, Serum IgA) with reference ranges and abnormal flags parsed from Synthea FHIR records.
* **Diagnostic CT Chest Viewer Modal:** High-resolution axial CT chest slices with window presets (Lung -600/1500 vs Mediastinal 40/400), slice navigation slider, orientation markers, and diagnostic radiology report.
* **Pulse Oximeter Module:** Interactive dual-mode interface (Mode A simulated BLE stream vs Mode B hardware Bluetooth SIG `0x1822` adapter standby), plethysmograph waveform, and clinical caution notes.
* **Innovation A: Personalized Environmental Trigger Fingerprint:** Multi-lag (30m, 1h, 2h, 6h) statistical correlation table with Indian urban air quality intelligence (Bengaluru, Delhi, Mumbai, Kolkata, Hyderabad) with non-causal language.
* **Innovation B: Evidence-Traceable Prediction Audit Log:** Cutoff timestamps, immutable feature attributions, and post-horizon ground-truth outcome resolution (`Awaiting future observations`, `Event observed`, `Event not observed`).
* **Innovation C: Forecast Reliability Lab:** Honest 70/30 holdout comparison of 4 models (EHR-only, Dynamic-only, Fused, and Clinical Rule-Based) with sensor degradation stress tests.
* **Hypothetical Scenario Lab ("What-If"):** Non-destructive slider perturbations for PEF, PM2.5, pollen, and respiratory rate with instant in-silico counterfactual risk assessment.
* **Chronological Clinical Event Timeline:** Dedicated timeline page tracking environmental exposure spikes, respiratory deterioration, rescue medication actuations, and oximeter desaturations.
* **Clinician Feedback Review:** Audit capture interface allowing reviewing clinicians to evaluate, confirm, or annotate digital twin alerts.

---

## 10. Automated Test Suite

Run the full pytest suite:
```bash
python -m pytest tests/ -v
```

All 20 unit and integration tests validate:
* CSV loading, range checking, and duplicate timestamp handling.
* Step-by-step stream replay, seeking, and resetting.
* Synthea FHIR parsing and unrecorded clinical field preservation.
* Strict past-only feature extraction (no future leakage).
* Forward-looking label construction ($t_{\text{pred}} < t \le t_{\text{pred}} + 2\text{h}$) and safe abstention.
* Strict patient isolation and scenario non-mutation.
* Multi-patient generator seed reproducibility and bounded distributions.
* Multi-patient stream manager isolation and state synchronization.

---

## 11. Technical Deterioration Endpoint & Model Validation

* **Technical Adverse Event Endpoint:** At least 2 consecutive future readings within a 2-hour forward horizon where $\text{PEF} < 80\%$ of baseline reference.
* **Separation from Source Labels:** The source CSV column `synthetic_flareup_risk` reflects contemporaneous synthetic severity; it is excluded from model features and separated from forward deterioration targets.
* **Fair 70/30 Holdout Comparison:**
  * **Historical EHR Only (Logistic Regression):** F1: 0.000, PR-AUC: 0.028, Brier: 0.0251 (Baseline demographic anchor).
  * **Dynamic IoT Stream Only (HistGradientBoosting):** F1: 0.870, PR-AUC: 0.785, Brier: 0.0045 (Dynamic telemetry sensitivity).
  * **Fused Historical EHR + Dynamic Stream:** F1: 0.870, PR-AUC: 0.798, Brier: 0.0045 (Highest discriminative power).
  * **Clinical Rule-Based Baseline:** F1: 0.853, PR-AUC: N/A, Brier: N/A (Standard clinical threshold heuristic).
* **Degradation Stress Tests:** Safe abstention on corrupt data, graceful fallback on environmental dropout, and latency warnings on stale streams (> 4h).

---

## 12. Known Limitations & Clinical Boundary

1. **Synthetic Data:** The continuous wearable and environmental readings are generated mathematically; they do not capture complex in-vivo immunological inflammation.
2. **Prototype Boundary:** Evaluated on synthetic physiological cohorts; demonstrates mathematical and algorithmic software pipeline integrity, NOT cleared medical device efficacy.
3. **Association vs. Causation:** Trigger fingerprints strictly describe temporal statistical association, not clinical etiology or allergy diagnosis. Non-causal language is strictly maintained across all user interfaces.
4. **Non-Diagnostic:** Must not be used for autonomous drug adjustments or emergency triaging.

---

## 13. 📑 Submission Deliverables & Documentation Links

### Project Repository

* **GitHub Repository:** [https://github.com/NM0124/TeamNexCura_SRM-University-Sonepat](https://github.com/NM0124/TeamNexCura_SRM-University-Sonepat)
* **Prototype Demo** [https://teamnexcura-srm-university-sonepat.onrender.com](https://teamnexcura-srm-university-sonepat.onrender.com)

### Project Resources

| Resource | Link |
|---|---|
| YouTube Demonstration Video | [Watch](https://youtu.be/wn8XU9k5enw?si=Rl9Dejd_8RctbuM0) |
| Project Presentation (PPTX) | [View](https://github.com/NM0124/TeamNexCura_SRM-University-Sonepat/blob/main/docs/submission/Presentation.pptx) |
| System Architecture Diagram (PDF) | [View](https://github.com/NM0124/TeamNexCura_SRM-University-Sonepat/blob/main/docs/submission/Architecture_Diagram.pdf) |
| Documents (Google Drive) | [Open](https://drive.google.com/drive/folders/1wAE_r-JBrkR5AqjI_3NMf3ODpQsigVbT?usp=sharing) |

---

## 14. 📄 Open-Source License Details

The project's original code is distributed under the **MIT License**. See the [`LICENSE`](LICENSE) file in the repository for the complete license text and copyright attribution.

| Field | Details |
|---|---|
| **Project License** | MIT License |
| **License File** | [`LICENSE`](LICENSE) |
| **Copyright Year** | 2026 |
| **Synthea** | Distributed under the Apache License 2.0. |

> **Important:** The project's MIT License does not automatically replace the licenses of third-party dependencies, datasets, or other assets. Review the applicable license and attribution requirements for each third-party component and dataset.
