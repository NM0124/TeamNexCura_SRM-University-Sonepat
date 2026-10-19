# Data Dictionary: Asthma Digital Twin Time-Series & EHR

This data dictionary documents all variables utilized across the Environment-Aware Asthma Digital Twin platform, including wearable/environmental streaming observations, normalized EHR demographics, and model-derived features.

---

## 1. Streaming & Replay Observations Schema (`synthetic_apple_health_asthma_timeseries.csv`)

| Variable Name | Data Type | Physical Unit | Plausible Range | Description & Clinical Semantics |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | Datetime (ISO 8601) | `YYYY-MM-DD HH:MM:SS` | Sequential | Hourly observation timestamp. |
| `pm25_ug_m3` | Float | $\mu\text{g/m}^3$ | $0.0 - 500.0$ | Fine airborne particulate matter ($\le 2.5\mu\text{m}$). WHO 24h safety guideline is $15\,\mu\text{g/m}^3$. |
| `pm10_ug_m3` | Float | $\mu\text{g/m}^3$ | $0.0 - 1000.0$ | Inhalable coarse particulate matter ($\le 10\mu\text{m}$). |
| `temperature_c` | Float | $^{\circ}\text{C}$ | $-20.0 - 55.0$ | Ambient air temperature. Cold air is a recognized bronchoconstrictive stimulus. |
| `humidity_pct` | Float | $\%$ | $0.0 - 100.0$ | Relative atmospheric humidity. |
| `pollen_level_0_10` | Float | Scale $0 - 10$ | $0.0 - 10.0$ | Airborne aeroallergen exposure index ($0=\text{none}$, $10=\text{extreme}$). |
| `dust_exposure_level` | Integer | Scale $0 - 3$ | $0 - 3$ | Indoor dust / particulate exposure level ($0=\text{low}$, $3=\text{heavy}$). |
| `exercise_flag` | Binary | $\{0, 1\}$ | $0 \text{ or } 1$ | Exercise-induced hyperventilation indicator. |
| `wheezing` | Binary | $\{0, 1\}$ | $0 \text{ or } 1$ | Audible whistling breath sounds during exhalation. |
| `coughing` | Binary | $\{0, 1\}$ | $0 \text{ or } 1$ | Persistent paroxysmal cough report. |
| `shortness_of_breath` | Binary | $\{0, 1\}$ | $0 \text{ or } 1$ | Subjective dyspnea at rest or with minimal exertion. |
| `chest_tightness` | Binary | $\{0, 1\}$ | $0 \text{ or } 1$ | Constrictive thoracic sensation signaling active bronchospasm. |
| `symptom_severity_0_3` | Integer | Scale $0 - 3$ | $0 - 3$ | Composite symptom score: $0=\text{None}$, $1=\text{Mild}$, $2=\text{Moderate}$, $3=\text{Severe}$. |
| `heart_rate_bpm` | Integer | Beats/min | $35 - 220$ | Resting or ambulatory heart rate from photoplethysmography (PPG). |
| `respiratory_rate_bpm` | Integer | Breaths/min | $6 - 60$ | Measured respiratory frequency. Values $> 20$ indicate tachypnea. |
| `spo2_pct` | Float | $\%$ | $60.0 - 100.0$ | Peripheral capillary blood oxygen saturation. Values $<92\%$ represent critical hypoxemia. |
| `peak_flow_pef_l_min` | Integer | $\text{L/min}$ | $50 - 950$ | Peak Expiratory Flow rate (maximum airflow speed during forced expiration). |
| `fev1_l` | Float | Liters ($\text{L}$) | $0.5 - 7.0$ | Forced Expiratory Volume in 1 second. |
| `rescue_inhaler_uses` | Integer | Puffs / doses | $0 - 20$ | Short-acting beta-2 agonist (SABA / Albuterol) inhaler actuations within observation hour. |
| `synthetic_flareup_risk` | Categorical | `low`, `moderate`, `high` | N/A | Contemporaneous synthetic risk label from raw source dataset. (Not a future label). |

---

## 2. Derived Feature Engineering Schema

| Feature Name | Origin / Window | Purpose |
| :--- | :--- | :--- |
| `pef_pct_of_reference` | Current PEF / Baseline Ref | Core ratio for GINA Green/Yellow/Red zone classification. |
| `pef_6h_min` | $\min(PEF_{t-6h \dots t})$ | Captures recent downward respiratory dips. |
| `pef_6h_slope` | Linear slope over 6 hours | Detects rapidly deteriorating expiration trajectories. |
| `respiratory_rate_6h_delta` | $RR_t - \text{mean}(RR_{t-6h \dots t})$ | Identifies respiratory distress onset. |
| `spo2_6h_min` | $\min(SpO2_{t-6h \dots t})$ | Detects episodic desaturation events. |
| `rescue_inhaler_6h_sum` | $\sum \text{inhaler}_{t-6h \dots t}$ | Quantifies short-term rescue medication reliance. |
| `rescue_inhaler_24h_sum` | $\sum \text{inhaler}_{t-24h \dots t}$ | Indicator of day-level loss of asthma control. |
| `pm25_3h_mean` | Moving avg 3 hours | Measures sustained acute particulate burden. |
| `pm25_pollen_interaction` | $PM2.5 \times (Pollen / 10)$ | Multiplicative hazard of allergen binding to fine particles. |
| `dust_exercise_interaction` | $Dust \times Exercise$ | Compounding airway irritation during high-ventilation exertion. |

---

## 3. Normalized EHR Schema (Synthea FHIR Mappings)

* **Patient Demographics:** `patient_id` (UUID or string), `birth_date` (Date), `age` (Years), `gender` (Administrative sex: `male`, `female`, `unknown`).
* **Asthma Diagnosis:** SNOMED CT `195967001` (Asthma disorder), `233678006` (Childhood asthma), `413839001` (Chronic asthma), ICD-10 `J45.*`.
* **Encounters:** Class code (`ambulatory`, `emergency`, `inpatient`, `urgentcare`), start/end timestamps, reason coding.
* **Medications:** RxNorm coding, brand/generic title, prescription date, status (`active`, `completed`, `unknown`).
* **Allergies:** Substance identifier, criticality tier (`low`, `high`, `unable-to-assess`, `unknown`), reaction text.
* **Clinical Personal Best:** Clinician-documented maximal PEF in clinic (distinct from automated rolling medians).
