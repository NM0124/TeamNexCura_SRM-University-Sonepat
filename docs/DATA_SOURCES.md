# Data Sources & Provenance Documentation

This document describes all data sources ingested, generated, and transformed by the Environment-Aware Asthma Digital Twin.

---

## 1. Primary Time-Series Dataset (`data/raw/synthetic_apple_health_asthma_timeseries.csv`)

### Provenance and Nature
* **Source:** Provided benchmark CSV representing continuous ambulatory observations across 30 days (720 hourly records).
* **Date Range:** `2026-09-18 00:00:00` to `2026-10-17 23:00:00`.
* **Patient Identity:** Single synthetic patient representation, mapped to internal ID `CSV_PATIENT_001`.
* **Sensors Simulated:** Apple Watch / wearable optical PPG (heart rate, respiratory rate, SpO2), electronic peak flow meter (PEF, FEV1), environmental air quality monitoring (PM2.5, PM10, pollen, temperature, humidity), and patient-reported symptoms.
* **Label Column (`synthetic_flareup_risk`):** Contemporaneous 3-tier risk assigned by the source generator (`low`: 594, `moderate`: 123, `high`: 3). This column describes current-hour risk, **not** a future deterioration event. It is excluded from the input feature matrix.

### Validation & Cleaning Decisions
* All 720 rows are validated against physiological bounds.
* Timestamps are verified as sequential and non-duplicate.
* No rows are silently dropped. Incomplete or outlier rows retain quality flags (`valid`, `implausible_measurement`, `missing_fields`).

---

## 2. Historical EHR Ingestion (Synthea Synthetic Health Records)

### Provenance and Technology
* **Source:** Synthea™ Synthetic Patient Generator ([GitHub](https://github.com/synthetichealth/synthea)).
* **Format:** HL7 FHIR R4 JSON bundles (`data/raw/synthea/*.json`).
* **Clinical Concept Terminologies:**
  * Asthma Diagnosis: SNOMED CT `195967001`, `233678006`, `413839001`, ICD-10 `J45.*`.
  * Medications: RxNorm codes for Albuterol (`745679`), Fluticasone/Salmeterol (`310291`).
  * Comorbidities: Allergic rhinitis (SNOMED `61582004`), Eczema (SNOMED `24079001`).
  * Observations: LOINC codes for spirometry and vital signs.

### Integration Path
1. Place generated Synthea FHIR JSON files into `data/raw/synthea/`.
2. The `SyntheaImporter` automatically parses resources into normalized profiles.
3. Patients with confirmed asthma diagnoses are loaded into the patient selector cohort.
4. If Synthea files are absent, the application starts normally and provisions an illustrative demonstration EHR profile for `CSV_PATIENT_001`.

---

## 3. Synthetic Multi-Patient Trajectory Generator (`data/generated/`)

### Generator Engine (`src/simulation/synthetic_patient_generator.py`)
* Independent synthetic longitudinal generator capable of creating multi-patient cohorts with distinct physiological baselines, diurnal environmental cycles, and acute exacerbation episodes.
* **Output:** `data/generated/multi_patient_synthetic_cohort.csv` and `data/generated/multi_patient_cohort_metadata.json`.
* **Reproducibility:** Seed-locked via `RandomState(seed)`. Stores generator version, timestamp, patient phenotypes, and simulation parameters.
* **Clinical Boundary:** Generated data is explicitly documented as simulated algorithm validation material, not verified in-vivo human physiology.
