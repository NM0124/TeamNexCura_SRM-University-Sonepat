import React, { useState } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Eye, 
  ShieldAlert,
  ArrowRight,
  Database
} from 'lucide-react';

export default function PredictionsView({ 
  patientId, 
  currentPrediction, 
  predictionHistory = [],
  onSelectEvidenceRecord 
}) {
  const [selectedRecord, setSelectedRecord] = useState(null);

  const activePred = currentPrediction || {};
  const historyList = predictionHistory || [];

  const getOutcomeStatusBadge = (status) => {
    if (status === 'Event observed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
          <AlertTriangle size={12} /> Event Observed
        </span>
      );
    }
    if (status === 'Event not observed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
          <CheckCircle2 size={12} /> Event Not Observed
        </span>
      );
    }
    if (status === 'Awaiting future observations') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: '#2563eb' }}>
          <Clock size={12} /> Awaiting Future Observations
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
        <HelpCircle size={12} /> {status || 'Unresolved due to insufficient data'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Prediction Summary Banner */}
      <div className="patient-banner-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Asthma Deterioration Forecasting Engine</span>
              <span className="counter-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                2-Hour Horizon
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Endpoint: PEF &lt; 80% Personal Best in &ge; 2 consecutive readings • Strict leakage-safe cutoff
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current Probability:</span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
              {activePred.risk_score !== undefined ? `${(activePred.risk_score * 100).toFixed(0)}%` : '--'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence:</span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
              {activePred.model_confidence !== undefined ? activePred.model_confidence : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Evidence-Traceable Prediction Audit Log */}
      <div className="clinical-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Sparkles size={16} style={{ color: '#2563eb' }} />
            <span>Evidence-Traceable Prediction Audit Log</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Recorded Forecasts: {historyList.length}
          </span>
        </div>

        <div style={{ padding: '12px 16px', overflowX: 'auto' }}>
          {historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <Database size={28} style={{ color: '#cbd5e1', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>No historical forecast records logged yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Advance simulation steps to log leakage-safe inference records and trace subsequent outcomes.
              </div>
            </div>
          ) : (
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Prediction ID</th>
                  <th>Cutoff Timestamp</th>
                  <th>Model Horizon</th>
                  <th>Estimated Risk</th>
                  <th>Forecast Change</th>
                  <th>Data Quality</th>
                  <th>Outcome Status</th>
                  <th>Audit Action</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((rec, i) => {
                  const delta = rec.delta_from_previous ? (rec.delta_from_previous * 100).toFixed(1) : null;
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {rec.prediction_id || `PRED-${i + 1}`}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {rec.observation_cutoff_time 
                          ? new Date(rec.observation_cutoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : (rec.prediction_timestamp ? new Date(rec.prediction_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent')}
                      </td>
                      <td>2 Hours</td>
                      <td>
                        <span style={{ 
                          fontWeight: 700, 
                          color: rec.risk_score >= 0.65 ? '#dc2626' : rec.risk_score >= 0.30 ? '#d97706' : '#16a34a',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {rec.risk_score !== null && rec.risk_score !== undefined ? `${(rec.risk_score * 100).toFixed(0)}%` : 'Withheld'}
                        </span>
                      </td>
                      <td>
                        {delta ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: parseFloat(delta) > 0 ? '#dc2626' : '#16a34a' }}>
                            {parseFloat(delta) > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Baseline</span>
                        )}
                      </td>
                      <td>
                        <span className="status-pill normal" style={{ fontSize: 10 }}>
                          {rec.data_quality_status || 'Nominal'}
                        </span>
                      </td>
                      <td>
                        {getOutcomeStatusBadge(rec.outcome_status)}
                      </td>
                      <td>
                        <button 
                          className="btn-open-viewer"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Selected Prediction Inspection Card */}
      {selectedRecord && (
        <div className="clinical-card" style={{ border: '1.5px solid #bfdbfe' }}>
          <div className="card-header-bar" style={{ background: '#eff6ff' }}>
            <div className="card-title-group">
              <Sparkles size={16} style={{ color: '#2563eb' }} />
              <span>Inspecting Audit Record: {selectedRecord.prediction_id}</span>
            </div>
            <button 
              className="card-action-link"
              onClick={() => setSelectedRecord(null)}
            >
              Close Inspector
            </button>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cutoff Timestamp:</span>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {selectedRecord.observation_cutoff_time || selectedRecord.prediction_timestamp || 'N/A'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Model Architecture:</span>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {selectedRecord.model_version || 'Fused Multimodal GBDT'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Outcome Status:</span>
                <div>{getOutcomeStatusBadge(selectedRecord.outcome_status)}</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, fontSize: 12 }}>
              <strong>Clinical Rationale:</strong> {selectedRecord.explanation || 'Prediction evaluated over multimodal feature snapshot.'}
            </div>

            {selectedRecord.feature_snapshot && (
              <div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Input Feature Values at Cutoff (No Data Leakage):</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6 }}>
                  {Object.entries(selectedRecord.feature_snapshot).slice(0, 12).map(([k, v]) => (
                    <div key={k} style={{ background: '#f1f5f9', padding: '6px 8px', borderRadius: 6, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
                      <strong>{typeof v === 'number' ? v.toFixed(2) : String(v)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
