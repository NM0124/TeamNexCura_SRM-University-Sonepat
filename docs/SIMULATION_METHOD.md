# Simulation Methodology, Synthetic Cohorts & Digital Twin Documentation

## 1. Overview and Core Motivation

Developing digital twin systems for episodic chronic respiratory diseases such as asthma presents severe clinical data scarcity and strict privacy constraints. Longitudinal time-series data combining continuous spirometry, wearable photoplethysmography (pulse oximetry), activity tracking, and localized environmental telemetry are rarely publicly accessible.

This platform bridges this gap through a dual-stream architecture:
1. **Static/Historical EHR Data:** Synthetic Electronic Health Records generated using **Synthea** in standardized HL7 FHIR R4 format, encompassing patient demographics, asthma onset dates, encounters, medications, allergies, diagnostic laboratory reports, and chest CT imaging metadata.
2. **Dynamic Time-Series Data:** High-fidelity simulated wearable and environmental IoT streams, capturing 15-minute observations of Peak Expiratory Flow (PEF), FEV1, SpO₂, pulse rate, respiratory rate, cough, wheeze, rescue inhaler actuations, sleep, steps, and ambient pollutants (PM2.5, PM10, pollen, dust, temperature, humidity).

Both streams fuse into a patient-specific **Digital Twin**, forecasting adverse deterioration events within a defined 2-hour window and explaining predictions through transparent feature attributions.

---

## 2. Coordinated Patient Mapping (`PAT-001` through `PAT-005`)

To avoid arbitrary association, the synthetic cohort coordinates historical EHR records and dynamic time-series streams under shared synthetic patient identifiers:

| Patient ID | Age / Gender | City / Micro-Climate | Asthma Diagnosis | Baseline PEF | Primary Environmental Sensitivity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PAT-001** | 28F | Bengaluru, Karnataka | Extrinsic Asthma (J45.9) Since 2015 | 450 L/min | Particulate matter (PM2.5) & Tree Pollen |
| **PAT-002** | 34M | Delhi NCR | Moderate Persistent Asthma Since 2018 | 480 L/min | Winter Smog & Extreme PM2.5 Inversion |
| **PAT-003** | 19M | Mumbai, Maharashtra | Mild Intermittent Asthma Since 2021 | 520 L/min | High Coastal Humidity & Dust |
| **PAT-004** | 42F | Kolkata, West Bengal | Severe Persistent Asthma Since 2010 | 390 L/min | Industrial Dust & Seasonal Stagnation |
| **PAT-005** | 31F | Hyderabad, Telangana | Mild Persistent Asthma Since 2017 | 460 L/min | Urban Dust & Ambient Particulates |
| **CSV_PATIENT_001** | 38F | Bengaluru, Karnataka | Moderate Persistent Demo Record | 480 L/min | Preserved CSV Replay Stream |

Each patient maintains independent virtual state in the `PatientRegistry`, ensuring observations from one patient never contaminate another patient's baseline, predictions, or history.

---

## 3. Synthetic Physiological & Wearable IoT Generator (`src/simulation/synthetic_patient_generator.py`)

### 3.1 Physiological Measurements Emulated
* **Respiratory Spirometry (simulated medical devices):**
  * Peak Expiratory Flow (PEF), L/min ($\text{Range: } 100 - 800\,\text{L/min}$)
  * Forced Expiratory Volume in 1 second (FEV1), Litres ($\text{FEV1} \approx \text{PEF} \times 0.0068$)
* **Continuous Wearable Vitals:**
  * Peripheral Capillary Oxygen Saturation (SpO₂), % ($\text{Nominal: } 97 - 99\%$)
  * Pulse Rate / Heart Rate, BPM ($\text{Nominal: } 60 - 85\,\text{bpm}$)
  * Resting Heart Rate estimate ($\text{Range: } 50 - 95\,\text{bpm}$)
  * Respiratory Rate, breaths/min ($\text{Nominal: } 14 - 18\,\text{breaths/min}$)
  * Heart Rate Variability (HRV), ms ($\text{Nominal: } 40 - 60\,\text{ms}$)
* **Activity & Sleep Tracking (Apple Health / Google Fit compatible format):**
  * Step Count, Activity Duration, Sedentary Time
  * Sleep Duration (hours) and Nocturnal Sleep Interruptions
* **Symptom Telemetry:**
  * Cough indicator ($0/1$), Wheezing indicator ($0/1$)
  * Shortness of breath ($0/1$), Chest tightness ($0/1$)
  * Composite Symptom Severity ($0 - 3$ scale)
  * Rescue Inhaler Actuation count ($0 - 3$ puffs)
* **Environmental Sensor Measurements:**
  * PM2.5 ($\mu\text{g/m}^3$) and PM10 ($\mu\text{g/m}^3$)
  * Temperature ($^\circ\text{C}$) and Relative Humidity ($\%$)
  * Pollen Concentration Index ($0 - 10$ scale)
  * Dust Exposure Level ($0=\text{Low}, 1=\text{Moderate}, 2=\text{High}$)

### 3.2 Diurnal Patterns & Stochastic Deterioration Injection
Environmental and physiological parameters follow circadian diurnal oscillations:
$$\text{Temperature}(h) = 22.0 + 6.0 \sin\left(\frac{(h - 8)\pi}{12}\right) + \epsilon_{\text{temp}}$$
$$\text{PM2.5}(h) = \max\left(5.0, 18.0 + 8.0 \sin\left(\frac{(h - 7)\pi}{12}\right) + \text{Exp}(6.0)\right)$$

Deterioration episodes model acute bronchoconstriction:
* **PEF:** Drops by $20\% - 35\%$ from individual baseline.
* **SpO₂:** Desaturates by $2.5\% - 5.0\%$ toward critical levels ($89\% - 93\%$).
* **Respiratory Rate:** Accelerates by $+4 \text{ to } +8\,\text{breaths/min}$ (compensatory tachypnea).
* **Heart Rate:** Accelerates by $+12 \text{ to } +25\,\text{bpm}$.
* **Symptoms:** Acute wheezing ($p=0.75$), persistent cough ($p=0.85$), severe composite score ($2 \text{ or } 3$).
* **Rescue Medication:** Self-administration of $1 - 2$ puffs of short-acting beta-agonist (Albuterol).

---

## 4. Pulse Oximeter Module Architecture (`src/ingestion/oximeter_adapter.py`)

The dedicated pulse oximeter module operates under two clearly separated contracts:
* **Mode A: Simulated Oximeter Stream (Active Prototype):** Generates evolving SpO₂ and pulse-rate observations with plethysmograph waveform modeling, perfusion index (PI: $2.2\% - 4.8\%$), signal quality grading (`optimal`, `acceptable`, `artifact`), and configurable warning thresholds ($\text{SpO}_2 < 94\%$ warning, $< 90\%$ critical; $\text{Pulse Rate} > 110\,\text{bpm}$ or $< 50\,\text{bpm}$). Missing or disconnected readings are flagged (`sensor_off_finger`) and never interpreted as normal oxygenation.
* **Mode B: Future Hardware Adapter Interface:** Implements the standard Bluetooth Low Energy GATT Pulse Oximeter Service (`0x1822` / IEEE 11073-10404). Pluggable interface ready for physical sensor binding without claiming physical connectivity in the software demonstration.

---

## 5. Adverse-Event Technical Endpoint & Label Construction

* **Target Event Technical Definition:**  
  $$\text{PEF} < 0.80 \times \text{Reference Value in } \ge 2 \text{ consecutive observations within the subsequent 2-hour window.}$$
* **Reference Value:** Clinically documented personal best PEF from Synthea EHR when available, or stable 85th percentile personal reference.
* **Leakage-Safe Ground Truth Builder (`src/prediction/label_builder.py`):**
  * Evaluates strictly forward-looking observations ($t_{\text{pred}} < t \le t_{\text{pred}} + 2\,\text{hours}$).
  * Features are computed strictly using data available at or before $t_{\text{pred}}$.
  * Future PEF, symptoms, environment, and internal generator state are strictly excluded from the feature space.
  * Observations within 2 hours of the trajectory terminus are labeled as unresolvable until future observations arrive.

---

## 6. Three Core Differentiating Innovations

### Innovation A: Personalized Environmental Trigger Fingerprint (`src/prediction/trigger_fingerprint.py`)
Analyzes empirical temporal associations between localized environmental exposures (PM2.5, PM10, pollen, dust, temperature, humidity) and subsequent respiratory deterioration.
* Evaluates lag windows: **30 minutes, 1 hour, 2 hours, and 6 hours**.
* Computes Pearson/Spearman correlation coefficients, exposure sample counts, and subsequent flare rates.
* Strictly enforces **non-causal language** (e.g., *"Possible temporal association between elevated PM2.5 exposure and subsequent PEF decline within 1-2 hours in this synthetic patient record."*).
* Automatically marks evidence as *"Insufficient Events"* when deterioration counts are below statistical threshold.

### Innovation B: Evidence-Traceable Prediction History (`src/prediction/evidence_tracer.py`)
Maintains an immutable structured audit log for every generated forecast:
* `prediction_id`, `patient_id`, `prediction_timestamp`, `model_version`, `prediction_horizon`.
* `input_cutoff_time` and exact feature values ($20+$ physiological, symptom, and environmental features).
* Ranked feature attributions with relative importance weights.
* Contextual narrative explaining why the risk score changed vs. previous forecast.
* **Outcome Resolution Tracker:** Once the 2-hour forward observation window elapses, the record resolves to `true_positive`, `false_positive`, `true_negative`, or `false_negative`.

### Innovation C: Forecast Accuracy & Reliability Lab (`src/prediction/reliability_lab.py`)
Rigorous 4-way comparative evaluation conducted on a fair 70/30 chronological holdout split:
1. **Historical EHR Features Only:** Baseline Logistic Regression using static demographics and encounter history.
2. **Dynamic IoT Features Only:** HistGradientBoosting using continuous wearable and environmental telemetry.
3. **Fused Multimodal Model:** HistGradientBoosting combining historical EHR context with dynamic telemetry.
4. **Clinical Rule-Based Baseline:** Heuristic threshold alert based on standard clinical guidelines ($\text{PEF} < 80\% \lor [\text{RR} \ge 22 \land \text{Symptoms} \ge 2]$).

Metrics calculated and reported honestly without fabrication: Precision, Recall, F1-Score, PR-AUC, Brier Score, and full Confusion Matrices. Includes stress testing under:
* Environmental sensor dropout (graceful fallback).
* Respiratory sensor failure (triggers **Safe Abstention** where model safely withholds prediction).
* Wearable sensor noise (Gaussian jitter injection).
* Data staleness / latency ($> 4$ hours old).

---

## 7. Starting the Application

### 7.1 Backend API Server (FastAPI)
The backend loads models, Synthea EHR profiles, and simulation trajectories:
```bash
# In project root:
.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000
```
API documentation is accessible at `http://localhost:8000/docs`.

### 7.2 Frontend React Dashboard (Vite)
```bash
# In frontend directory:
cd frontend
npm run dev
```
Open `http://localhost:3000` to interact with the doctor-facing React dashboard. The frontend automatically proxies `/api` calls to the FastAPI backend.

Alternatively, the production bundle (`npm run build`) is automatically served directly by FastAPI at `http://localhost:8000/`.

---

## 8. Limitations & Clinical Research Disclaimer

1. **Synthetic Data Only:** All patient records, physiological streams, laboratory reports, and CT scan findings are synthetically generated for software prototype demonstration. Performance metrics demonstrate mathematical pipeline integrity, **not** clinical safety or diagnostic efficacy.
2. **Non-Causal Associations:** Environmental trigger fingerprints represent temporal associations and must not replace clinical allergy/provocation testing.
3. **Software Prototype:** This system is an investigational decision-support prototype and must never be used as a substitute for professional medical judgement.
