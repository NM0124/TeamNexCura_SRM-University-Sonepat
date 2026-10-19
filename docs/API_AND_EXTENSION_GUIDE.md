# API & Extension Guide: Asthma Digital Twin

This guide explains how to extend data sources, integrate new EHR formats, plug in advanced machine learning models, or connect external hardware sensors.

---

## 1. Adding a New Data Source

To add a new wearable device or environmental stream (e.g. Fitbit, Garmin, or EPA AirNow):

1. **Implement an Ingestion Adapter:**
   Create `src/ingestion/your_source_loader.py` inheriting from or adhering to the standard schema:
   ```python
   class ExternalStreamAdapter:
       def parse_to_normalized_dict(self, raw_reading: dict) -> dict:
           return {
               "patient_id": raw_reading["user_id"],
               "timestamp": raw_reading["datetime"],
               "peak_flow_pef_l_min": raw_reading.get("pef"),
               "spo2_pct": raw_reading.get("blood_oxygen"),
               "pm25_ug_m3": raw_reading.get("air_pm25"),
               "quality_status": "valid"
           }
   ```
2. **Ingest via PatientTwin:**
   Feed the record directly to `twin.ingest_observation(normalized_dict)`.
   The twin automatically runs quality checks, updates baselines, and recalculates features.

---

## 2. Integrating External EHR / Hospital Systems

The system uses `NormalizedEHRProfile` (`src/ingestion/schema_normalizer.py`) to isolate the twin from proprietary hospital formats.

To connect an Epic / Cerner FHIR API:
1. Fetch patient FHIR bundles using standard OAuth2 FHIR endpoints.
2. Pass the bundle JSON to `FHIRParser.parse_bundle(bundle_json)`.
3. Register the resulting profile: `patient_service.registry.register_patient(patient_id, normalized_profile)`.

---

## 3. Plugging in Advanced Prediction Models

To evaluate deep learning, XGBoost, or custom neural models:

1. **Feature Alignment:**
   Ensure your model consumes the exact feature ordering defined in `FEATURE_NAMES` (`src/digital_twin/feature_engineering.py`).
2. **Scikit-Learn Interface:**
   Ensure the model implements `predict_proba(X) -> np.ndarray[:, 1]`.
3. **Registering the Artifact:**
   Save your model via `joblib.dump(your_model, "data/processed/candidate_hgb.joblib")`.
   `ModelRegistry.load_models()` will automatically detect, load, and run inference with it in the dashboard and monitoring engine.

---

## 4. Migrating from SQLite to PostgreSQL / MySQL

The storage layer uses SQLAlchemy ORM (`src/storage/models.py`). To migrate to PostgreSQL:
1. Update `SQLITE_DB_PATH` in `.env` to:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/asthma_twin
   ```
2. In `src/storage/database.py`, read `DATABASE_URL` directly in `get_engine()`.
