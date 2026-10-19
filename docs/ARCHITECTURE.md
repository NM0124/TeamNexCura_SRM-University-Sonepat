# System Architecture: Environment-Aware Asthma Digital Twin

## 1. Architectural Philosophy

The Asthma Digital Twin platform models the continuous physiological, symptomatic, and environmental reality of an individual asthma patient over time. It adheres to these architectural invariants:

1. **Evidence-Grounded Fused Representations:** The patient's virtual state fuses static longitudinal EHR data (diagnoses, hospitalizations, baseline prescriptions) with continuous dynamic streams (PEF, SpO2, PM2.5, pollen).
2. **Strict Patient Isolation:** Each patient twin maintains independent in-memory state and separate persistent relational boundaries. No baseline, symptom, or prediction can cross between patient twins.
3. **Strict Temporal Integrity (No Future Leakage):** When computing predictions or baselines at observation timestamp $t$, the system enforces $t_{\text{data}} \le t$. Future observations are inaccessible to feature extractors.
4. **Safe Algorithmic Abstention:** When incoming streams are corrupt, incomplete, or stale, the platform withholds predictions with explicit rationale rather than hallucinating confident numbers.
5. **Scenario Simulation Isolation:** "What-if" simulations operate on isolated deep copies of the twin state (`is_hypothetical=True`) and never mutate the actual replay state.

---

## 2. Component Pipeline Overview

```mermaid
graph TD
    A[Raw Data: CSV & Synthea FHIR] --> B[Ingestion Layer: CSVLoader & FHIRParser]
    B --> C[Patient Registry & Schema Normalizer]
    C --> D[Patient Digital Twin]
    
    subgraph Digital Twin Core
        D --> E[Data Quality & Abstention Evaluator]
        D --> F[Personalized Robust Baseline Manager]
        D --> G[Time-Aware Feature Engineering]
    end
    
    Digital Twin Core --> H[Prediction Engine: Logistic Baseline & HistGB]
    Digital Twin Core --> I[Alerting & Clinical Rules Engine]
    Digital Twin Core --> J[Explainability & Trigger Analysis]
    Digital Twin Core --> K[Scenario Simulation Engine]
    
    H --> L[Doctor-Facing React Dashboard]
    I --> L
    J --> L
    K --> L
    
    Digital Twin Core --> M[(SQLite Storage & Audit Repository)]
```

---

## 3. Layer Breakdown

### 3.1 Ingestion Layer (`src/ingestion/`)
* **`csv_loader.py`**: Validates structural schema, parses ISO-8601 datetimes, sorts chronologically, flags duplicates, performs numerical range checks against physiological boundaries, and assigns data quality status flags.
* **`csv_stream_replay.py`**: Stepping replay engine that yields one observation at a time with simulated arrival timestamps, supporting start, pause, resume, step, and seek.
* **`fhir_parser.py`**: Decouples FHIR Bundles and discrete resource JSON files, mapping SNOMED-CT / ICD-10 codes for asthma and comorbidities.
* **`schema_normalizer.py`**: Produces a standardized `NormalizedEHRProfile` with explicit placeholders (`not_recorded`, `unknown`) to prevent fabricating absent medical history.
* **`synthea_importer.py`**: Directory scanner that isolates patients matching clinical asthma criteria and computes cohort summary statistics.

### 3.2 Digital Twin Core (`src/digital_twin/`)
* **`patient_twin.py`**: Virtual patient representation containing observation buffers, EHR profile, baseline state, latest prediction, active alerts, quality flags, and timeline. Supports deep-copy cloning for hypothetical scenarios.
* **`patient_registry.py`**: Thread-safe multi-patient manager enforcing isolation between virtual twins.
* **`baseline_manager.py`**: Computes rolling median and Median Absolute Deviation (MAD) over a historical window (default 72h). Distinguishes clinician-documented clinical personal bests from rolling statistical baselines, tagging $<24$h baselines as `provisional`.
* **`data_quality.py`**: Evaluates measurement completeness, out-of-range readings, and sudden implausible drops, triggering safe abstention when warranted.
* **`feature_engineering.py`**: Extracts time-aware rolling features, ratios, and environmental interactions strictly up to $t_{\text{pred}}$. Excludes target labels from feature vectors.

### 3.3 Prediction & Explainability (`src/prediction/`)
* **`label_builder.py`**: Constructs forward-looking deterioration targets over a future horizon $H$ (e.g. 6 hours) based on consecutive PEF drops below 80% reference.
* **`train.py`**: Chronological 70/30 train/test split. Fits regularized Logistic Regression (interpretable baseline) and HistGradientBoosting (candidate comparison).
* **`predictor.py`**: Executes inference during replay or falls back to transparent clinical action-plan rules when data are insufficient or models are withheld.
* **`explainability.py`**: Quantifies feature contribution drivers, computes prediction deltas between steps, and derives empirical trigger fingerprints with lag analysis.
* **`evaluation.py`**: Calculates Precision, Recall, F1, PR-AUC, ROC-AUC, Brier score, and confusion matrices with explicit limitation reporting.

### 3.4 Simulation & Scenario Lab (`src/simulation/`)
* **`synthetic_patient_generator.py`**: Configurable multi-patient cohort generator producing distinct phenotypes, diurnal rhythms, environmental sensitivities, and acute deterioration episodes with metadata tracking.
* **`scenario_engine.py`**: Doctor-facing what-if simulator testing hypothetical surges (+PM2.5, +Pollen, exercise, inhaler) on cloned twin state.

### 3.5 Storage & Persistence (`src/storage/`)
* SQLite database with SQLAlchemy repository abstractions (`ObservationRepository`, `PredictionRepository`, `AlertRepository`, `TimelineRepository`). Fully decoupled for PostgreSQL/MySQL migrations.

### 3.6 Doctor-Facing React Dashboard (`frontend/` & `server.py`)
* Modern modular React dashboard designed for clinicians, recreating the visual layout of `ui.png`. Features interactive anatomical lung views, DICOM chest CT viewer, pulse oximeter monitoring, environmental intelligence, timeline reconstruction, in-silico scenario testing, and forecast reliability evaluation.
