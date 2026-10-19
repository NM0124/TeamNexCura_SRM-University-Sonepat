"""
Patient Monitoring Report Generation Service.
Generates structured CSV and clinical summary text/PDF exports.
Visibly labels all outputs as synthetic proofs of concept.
"""

from typing import Dict, Any, List
from datetime import datetime
import io
import pandas as pd

from src.digital_twin.patient_twin import PatientTwin


class ReportService:
    @staticmethod
    def generate_text_report(twin: PatientTwin) -> str:
        """Generates a structured clinical summary report."""
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        curr = twin.current_observation
        ehr = twin.ehr_profile

        lines = [
            "=" * 78,
            "ENVIRONMENT-AWARE ASTHMA DIGITAL TWIN: PATIENT MONITORING REPORT",
            "RESEARCH & SOFTWARE PROOF OF CONCEPT (NOT A VALIDATED CLINICAL RECORD)",
            "=" * 78,
            f"Generated: {now_str}",
            f"Patient Identifier: {twin.patient_id}",
            f"Data Provenance: {'Illustrative Demo Profile' if (ehr and ehr.is_demo_profile) else 'Imported Synthetic EHR'}",
            "-" * 78,
            "1. DEMOGRAPHIC & HISTORICAL EHR SUMMARY",
        ]

        if ehr:
            lines.extend([
                f" - Age: {ehr.demographics.age or 'Not recorded'}",
                f" - Sex: {ehr.demographics.gender}",
                f" - Documented Asthma: {'Yes' if ehr.asthma_history.has_asthma_diagnosis else 'No'}",
                f" - Diagnosis Code/Desc: {ehr.asthma_history.diagnosis_code or 'N/A'} - {ehr.asthma_history.diagnosis_description or 'N/A'}",
                f" - Clinical Personal Best PEF: {ehr.asthma_history.clinical_personal_best_pef or 'Not recorded by clinician'}",
                f" - Historical Encounters: {len(ehr.encounters)} (Emergency: {ehr.asthma_history.emergency_visits_count})",
                f" - Active Prescriptions: {', '.join([m.name for m in ehr.medications]) or 'None recorded'}",
                f" - Known Allergies: {', '.join([a.substance for a in ehr.allergies]) or 'None recorded'}",
            ])
        else:
            lines.append(" - No historical EHR profile attached.")

        lines.extend([
            "-" * 78,
            "2. CURRENT VIRTUAL STATE & BASELINE",
            f" - Total Observations Ingested: {len(twin.observations)}",
            f" - Baseline Status: {'Provisional (< 24h)' if twin.baseline_state.is_provisional else 'Stable'}",
            f" - Baseline PEF Reference: {twin.baseline_state.pef_reference_value:.1f} L/min ({twin.baseline_state.reference_source})",
            f" - Baseline Median SpO2: {twin.baseline_state.median_spo2 or 'N/A'}%",
            f" - Baseline Median Respiratory Rate: {twin.baseline_state.median_respiratory_rate or 'N/A'} bpm",
            f" - Data Quality Assessment: {twin.quality_assessment.status.upper()}",
        ])

        if curr:
            pef = curr.get("peak_flow_pef_l_min")
            pef_pct = (pef / twin.baseline_state.pef_reference_value * 100) if pef else 0
            lines.extend([
                "-" * 78,
                "3. LATEST OBSERVED MEASUREMENTS",
                f" - Timestamp: {curr.get('timestamp')}",
                f" - Peak Expiratory Flow: {pef} L/min ({pef_pct:.1f}% of reference)",
                f" - SpO2: {curr.get('spo2_pct')}%",
                f" - Respiratory Rate: {curr.get('respiratory_rate_bpm')} bpm",
                f" - Heart Rate: {curr.get('heart_rate_bpm')} bpm",
                f" - Symptoms: Wheeze={curr.get('wheezing')}, Cough={curr.get('coughing')}, Shortness of Breath={curr.get('shortness_of_breath')}, Severity={curr.get('symptom_severity')}/3",
                f" - Rescue Inhaler Uses: {curr.get('rescue_inhaler_uses')}",
                f" - Environmental Exposures: PM2.5={curr.get('pm25_ug_m3')} µg/m³, PM10={curr.get('pm10_ug_m3')} µg/m³, Pollen={curr.get('pollen_level', curr.get('pollen_level_0_10'))}/10",
            ])

        lines.extend([
            "-" * 78,
            "4. FUTURE DETERIORATION RISK & ALERTS",
        ])

        if twin.latest_prediction:
            pred = twin.latest_prediction
            lines.extend([
                f" - Latest Risk Category: {pred.get('risk_category', 'unassessed').upper()}",
                f" - Model Estimated Score: {pred.get('risk_score', 'N/A')}",
                f" - Prediction Cutoff Time: {pred.get('observation_cutoff_time')}",
                f" - Model Name: {pred.get('model_name')}",
                f" - Contributing Feature Drivers: {list(pred.get('feature_contributions', {}).items())[:4]}",
            ])
        else:
            lines.append(" - No prediction generated.")

        lines.extend([
            f" - Total Logged Alerts: {len(twin.active_alerts)}",
            f" - Unacknowledged Alerts: {len([a for a in twin.active_alerts if not a.get('acknowledged', False)])}",
            "-" * 78,
            "5. REGULATORY & CLINICAL LIMITATIONS DISCLAIMER",
            "CRITICAL: This digital twin report is generated by a software-only research prototype",
            "using synthetic data. It has NOT been evaluated in prospective clinical trials, is NOT FDA/CE",
            "cleared, and does NOT provide medical advice, diagnosis, or treatment recommendations.",
            "=" * 78,
        ])

        return "\n".join(lines)

    @staticmethod
    def generate_observations_csv(twin: PatientTwin) -> str:
        """Exports all recorded observations for the patient as a CSV string."""
        if not twin.observations:
            return "patient_id,timestamp,status\n"
        df = pd.DataFrame(twin.observations)
        return df.to_csv(index=False)
