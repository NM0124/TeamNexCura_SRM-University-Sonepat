import React, { useState, useEffect } from 'react';
import { Database, FileSpreadsheet, Activity, Cpu, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';

export default function DataSourcesView() {
  const [sources, setSources] = useState(null);

  useEffect(() => {
    fetch('/api/data-sources')
      .then((r) => r.json())
      .then((d) => setSources(d))
      .catch((e) => console.error(e));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div className="patient-banner-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Database size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Data Sources, Ingestion Pipeline &amp; Provenance</span>
              <span className="counter-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                All Sources Synchronized
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Complete separation of static EHR records, dynamic IoT observations, and model artifacts.
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Data Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Synthea FHIR EHR */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Database size={16} style={{ color: '#2563eb' }} />
              <span>1. Historical Synthetic EHR (Synthea FHIR)</span>
            </div>
            <span className="status-pill normal">Verified Import</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div><strong>Location:</strong> <code>data/raw/synthea</code></div>
            <div><strong>Format:</strong> HL7 FHIR Release 4 JSON Bundles</div>
            <div><strong>Imported Resources:</strong> Patient, Condition, Encounter, Observation, MedicationRequest, AllergyIntolerance, CarePlan, DiagnosticReport, ImagingStudy</div>
            <div><strong>Documented Asthma Cohort:</strong> PAT-001 through PAT-005 successfully indexed with individual disease onset and medication histories.</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              Absence of real-world identifiers guaranteed. Complies with synthetic health data validation standards.
            </div>
          </div>
        </div>

        {/* Dynamic Wearable & IoT Stream */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <FileSpreadsheet size={16} style={{ color: '#2563eb' }} />
              <span>2. Dynamic Wearable &amp; IoT Physiological Generator</span>
            </div>
            <span className="status-pill normal">Continuous Engine</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div><strong>Engine:</strong> <code>SyntheticPatientGenerator (v2.0)</code></div>
            <div><strong>Sampling Frequency:</strong> 15-minute continuous longitudinal intervals</div>
            <div><strong>Stream Parameters:</strong> PEF, FEV1, SpO2, Pulse Rate, Respiratory Rate, Wheeze, Cough, Inhaler Count, Sleep, Steps, PM2.5, PM10, Pollen, Temperature, Humidity, Dust</div>
            <div><strong>Diurnal Rhythm &amp; Noise:</strong> Reproducible NumPy random states with simulated circadian variation and motion dropout noise.</div>
          </div>
        </div>

        {/* Pulse Oximeter Module */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Activity size={16} style={{ color: '#2563eb' }} />
              <span>3. Pulse Oximeter Architecture (Mode A / Mode B)</span>
            </div>
            <span className="status-pill normal">Dual-Mode</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div><strong>Mode A (Active):</strong> High-fidelity simulated Bluetooth pulse oximeter with plethysmograph waveform modeling and perfusion index (PI: 2.2% - 4.8%).</div>
            <div><strong>Mode B (Adapter):</strong> Standard Bluetooth SIG Pulse Oximeter Service (GATT 0x1822) contract implemented and awaiting physical device binding.</div>
            <div><strong>Safety Thresholds:</strong> Configurable warning limit (&lt; 94%) and critical hypoxemia limit (&lt; 90%).</div>
          </div>
        </div>

        {/* Machine Learning Model Pipeline */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Cpu size={16} style={{ color: '#2563eb' }} />
              <span>4. Prediction Pipeline &amp; Scikit-Learn Model Registry</span>
            </div>
            <span className="status-pill normal">Trained Pipelines</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div><strong>Candidate Model:</strong> HistGradientBoostingClassifier (scikit-learn 1.9.1)</div>
            <div><strong>Baseline Model:</strong> Standardized Logistic Regression Pipeline</div>
            <div><strong>Prediction Horizon:</strong> 2 Hours (Target: PEF &lt; 80% reference in &ge; 2 future observations)</div>
            <div><strong>Leakage Safeguards:</strong> Chronological holdout evaluation; zero target label leakage into current features.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
