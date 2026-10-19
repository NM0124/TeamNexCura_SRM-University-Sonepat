import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  FlaskConical, 
  RotateCcw, 
  ArrowRight, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function ScenarioLabView({ patientId, currentObservation }) {
  // Capture frozen baseline upon mount or patientId switch so live playback doesn't mutate scenario baseline
  const [frozenBaseline, setFrozenBaseline] = useState({
    pef: currentObservation?.peak_flow_pef_l_min || 320,
    pm25: currentObservation?.pm25_ug_m3 || 82,
    pollen: currentObservation?.pollen_level_0_10 || 5.0,
    dust: currentObservation?.dust_exposure_level || 1,
    rr: currentObservation?.respiratory_rate_bpm || 22,
    symptom: currentObservation?.symptom_severity_0_3 || 1
  });

  const lastPatientIdRef = useRef(patientId);

  useEffect(() => {
    if (patientId !== lastPatientIdRef.current) {
      lastPatientIdRef.current = patientId;
      setFrozenBaseline({
        pef: currentObservation?.peak_flow_pef_l_min || 320,
        pm25: currentObservation?.pm25_ug_m3 || 82,
        pollen: currentObservation?.pollen_level_0_10 || 5.0,
        dust: currentObservation?.dust_exposure_level || 1,
        rr: currentObservation?.respiratory_rate_bpm || 22,
        symptom: currentObservation?.symptom_severity_0_3 || 1
      });
      handleReset();
    }
  }, [patientId, currentObservation]);

  const [pefDelta, setPefDelta] = useState(0);
  const [pm25Delta, setPm25Delta] = useState(0);
  const [pollenDelta, setPollenDelta] = useState(0);
  const [dustDelta, setDustDelta] = useState(0);
  const [rrDelta, setRrDelta] = useState(0);
  const [symptomDelta, setSymptomDelta] = useState(0);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const basePef = frozenBaseline.pef;
  const basePm25 = frozenBaseline.pm25;
  const baseRr = frozenBaseline.rr;
  const basePollen = frozenBaseline.pollen;

  const hypoPef = Math.max(50, basePef + pefDelta);
  const hypoPm25 = Math.max(5, basePm25 + pm25Delta);
  const hypoRr = Math.max(10, baseRr + rrDelta);
  const hypoPollen = Math.max(0, Math.min(10, basePollen + pollenDelta));

  const handleSimulate = async () => {
    setIsRunning(true);
    try {
      const resp = await fetch(`/api/patients/${patientId}/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pef_delta: pefDelta,
          pm25_delta: pm25Delta,
          pollen_delta: pollenDelta,
          dust_delta: dustDelta,
          rr_delta: rrDelta,
          symptom_delta: symptomDelta
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setScenarioResult(data);
      }
    } catch (e) {
      console.error('Error simulating scenario:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setPefDelta(0);
    setPm25Delta(0);
    setPollenDelta(0);
    setDustDelta(0);
    setRrDelta(0);
    setSymptomDelta(0);
    setScenarioResult(null);
  };

  const handleSyncToLive = () => {
    setFrozenBaseline({
      pef: currentObservation?.peak_flow_pef_l_min || 320,
      pm25: currentObservation?.pm25_ug_m3 || 82,
      pollen: currentObservation?.pollen_level_0_10 || 5.0,
      dust: currentObservation?.dust_exposure_level || 1,
      rr: currentObservation?.respiratory_rate_bpm || 22,
      symptom: currentObservation?.symptom_severity_0_3 || 1
    });
    handleReset();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div className="patient-banner-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <FlaskConical size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Hypothetical Clinical Scenario Lab</span>
              <span className="counter-badge" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                Isolated Digital Twin Clone
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Non-destructive in silico simulation. Perturbations are evaluated in an isolated deep copy; actual patient trajectory is preserved.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            className="btn-ehr-view"
            style={{ fontSize: 12 }}
            onClick={handleSyncToLive}
            title="Snap scenario baseline to current live observation"
          >
            <span>Sync Live Baseline</span>
          </button>
          <button 
            className="btn-ehr-view"
            style={{ borderColor: '#7c3aed', color: '#7c3aed', fontSize: 12 }}
            onClick={handleReset}
          >
            <RotateCcw size={13} />
            <span>Reset Sliders</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sliders on Left, Impact Comparison on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Sliders Card */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Sliders size={16} style={{ color: '#7c3aed' }} />
              <span>Configure Hypothetical Perturbations</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Frozen Baseline for {patientId}
            </span>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* PEF Delta Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                <span>Peak Expiratory Flow (PEF)</span>
                <span style={{ color: pefDelta > 0 ? '#16a34a' : pefDelta < 0 ? '#dc2626' : 'var(--text-muted)' }}>
                  Adjustment: {pefDelta > 0 ? `+${pefDelta}` : pefDelta} L/min | Baseline PEF: {basePef} L/min | Hypothetical PEF: {hypoPef} L/min
                </span>
              </div>
              <input 
                type="range" 
                min="-150" 
                max="150" 
                step="10"
                value={pefDelta} 
                onChange={(e) => setPefDelta(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: 6 }}
              />
            </div>

            {/* PM2.5 Delta Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                <span>Ambient PM2.5 Exposure</span>
                <span style={{ color: pm25Delta < 0 ? '#16a34a' : pm25Delta > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                  Adjustment: {pm25Delta > 0 ? `+${pm25Delta}` : pm25Delta} µg/m³ | Baseline: {basePm25} µg/m³ | Hypothetical: {hypoPm25} µg/m³
                </span>
              </div>
              <input 
                type="range" 
                min="-60" 
                max="120" 
                step="5"
                value={pm25Delta} 
                onChange={(e) => setPm25Delta(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: 6 }}
              />
            </div>

            {/* Pollen Delta Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                <span>Pollen Index (0-10)</span>
                <span>
                  Adjustment: {pollenDelta > 0 ? `+${pollenDelta}` : pollenDelta} | Baseline: {basePollen.toFixed(1)} | Hypothetical: {hypoPollen.toFixed(1)}
                </span>
              </div>
              <input 
                type="range" 
                min="-5" 
                max="5" 
                step="1"
                value={pollenDelta} 
                onChange={(e) => setPollenDelta(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: 6 }}
              />
            </div>

            {/* Respiratory Rate Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                <span>Respiratory Rate</span>
                <span>
                  Adjustment: {rrDelta > 0 ? `+${rrDelta}` : rrDelta} /min | Baseline: {baseRr} /min | Hypothetical: {hypoRr} /min
                </span>
              </div>
              <input 
                type="range" 
                min="-8" 
                max="15" 
                step="1"
                value={rrDelta} 
                onChange={(e) => setRrDelta(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: 6 }}
              />
            </div>

            <button 
              className="btn-ehr-view"
              style={{ background: '#7c3aed', color: '#fff', borderColor: '#7c3aed', justifyContent: 'center' }}
              onClick={handleSimulate}
              disabled={isRunning}
            >
              <span>{isRunning ? 'Calculating In Silico Response...' : 'Simulate In Silico Scenario'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Results Card */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Activity size={16} style={{ color: '#7c3aed' }} />
              <span>Comparative In Silico Outcome</span>
            </div>
            <span className="status-pill warning">Hypothetical Result</span>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {scenarioResult ? (
              <>
                <div style={{ 
                  background: scenarioResult.counterfactual_risk?.risk_category === 'high' ? '#fef2f2' : '#ecfdf5',
                  border: '1px solid ' + (scenarioResult.counterfactual_risk?.risk_category === 'high' ? '#fecaca' : '#a7f3d0'),
                  borderRadius: 10,
                  padding: '14px 16px'
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Predicted 2-Hour Deterioration Risk:</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: scenarioResult.counterfactual_risk?.risk_category === 'high' ? '#dc2626' : '#059669', fontFamily: 'var(--font-mono)' }}>
                      {(scenarioResult.counterfactual_risk?.risk_score * 100).toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      Category: {scenarioResult.counterfactual_risk?.risk_category?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, marginTop: 8, color: 'var(--text-main)' }}>
                    <strong>Scenario Delta:</strong> {(scenarioResult.risk_delta * 100).toFixed(1)}% compared to baseline risk.
                  </div>
                </div>

                {/* Comparative Metrics Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 12px' }}>Parameter</th>
                        <th style={{ padding: '8px 12px' }}>Baseline</th>
                        <th style={{ padding: '8px 12px' }}>Hypothetical</th>
                        <th style={{ padding: '8px 12px' }}>Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>Peak Flow (PEF)</td>
                        <td style={{ padding: '8px 12px' }}>{basePef} L/min</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb' }}>{hypoPef} L/min</td>
                        <td style={{ padding: '8px 12px', color: pefDelta >= 0 ? '#16a34a' : '#dc2626' }}>
                          {pefDelta >= 0 ? `+${pefDelta}` : pefDelta} L/min
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>Ambient PM2.5</td>
                        <td style={{ padding: '8px 12px' }}>{basePm25} µg/m³</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb' }}>{hypoPm25} µg/m³</td>
                        <td style={{ padding: '8px 12px', color: pm25Delta <= 0 ? '#16a34a' : '#dc2626' }}>
                          {pm25Delta >= 0 ? `+${pm25Delta}` : pm25Delta} µg/m³
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>Respiration Rate</td>
                        <td style={{ padding: '8px 12px' }}>{baseRr} bpm</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb' }}>{hypoRr} bpm</td>
                        <td style={{ padding: '8px 12px', color: rrDelta <= 0 ? '#16a34a' : '#dc2626' }}>
                          {rrDelta >= 0 ? `+${rrDelta}` : rrDelta} /min
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                  <strong>Safety Notice:</strong> Simulated results represent exploratory algorithmic projections and do not guarantee clinical efficacy of interventions. Original patient trajectory is unchanged.
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                Adjust sliders on the left and click <strong>Simulate In Silico Scenario</strong> to inspect the virtual response.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
