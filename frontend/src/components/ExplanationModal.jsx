import React from 'react';
import { X, Sparkles, AlertTriangle, ArrowRight, CheckCircle, ShieldAlert, Activity, Wind, Info } from 'lucide-react';

export default function ExplanationModal({ isOpen, onClose, predictionData, patientId = 'PAT-001' }) {
  if (!isOpen) return null;

  const riskPct = predictionData?.risk_percentage !== undefined ? predictionData.risk_percentage : 68;
  const confidence = predictionData?.model_confidence !== undefined ? predictionData.model_confidence : 0.72;
  const delta = predictionData?.delta_vs_previous_pct !== undefined ? predictionData.delta_vs_previous_pct : 32;
  const factors = predictionData?.top_contributing_factors || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                Evidence-Traceable Prediction Explanation
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Patient: <strong>{patientId}</strong> • Model: {predictionData?.model_name || 'Fused HistGradientBoosting v2.4'}
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Narrative Box */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid var(--border-light)', 
            borderRadius: '10px', 
            padding: '14px 16px',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--text-main)'
          }}>
            <strong style={{ color: '#0f172a' }}>Clinical Explanation:</strong>
            <p style={{ marginTop: 4 }}>
              {predictionData?.explanation || 
               `Risk increased by +${delta}% vs. previous baseline evaluation. Primary drivers are a downward PEF trajectory (-18% below personal best) coinciding with elevated ambient PM2.5 exposure (82 µg/m³), accompanied by mild compensatory tachypnea (22 breaths/min).`}
            </p>
          </div>

          {/* Technical Target Definition */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', fontSize: 11.5, color: '#1e3a8a' }}>
            <strong>Target Event Endpoint:</strong> PEF falling below 80% of personal best reference value in at least two consecutive observations within the subsequent 2-hour window.
          </div>

          {/* Contributing Feature Breakdown */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
              Ranked Feature Attributions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {factors.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{f.feature}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{f.description || `Relative attribution weight: ${f.weight}`}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? '#dc2626' : '#2563eb', fontFamily: 'var(--font-mono)' }}>
                      +{(f.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Uncertainty & Safety Disclaimer */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
            <span style={{ fontWeight: 600, color: '#64748b' }}>Research Prototype Notice:</span> This algorithmic forecast provides engineering surveillance and decision support. It must not replace clinical judgement or emergency protocols.
          </div>
        </div>
      </div>
    </div>
  );
}
