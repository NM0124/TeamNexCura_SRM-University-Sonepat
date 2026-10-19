import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  Wind, 
  Activity, 
  AlertCircle, 
  Moon, 
  ChevronDown,
  Sparkles,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function FutureEventPredictionCard({ predictionData, onOpenExplanation, onViewAllFeatures }) {
  const [horizon, setHorizon] = useState('Next 2 Hours');

  const riskPct = predictionData?.risk_percentage !== undefined ? predictionData.risk_percentage : 68;
  const riskCategory = predictionData?.risk_category || 'HIGH RISK';
  const confidence = predictionData?.model_confidence !== undefined ? predictionData.model_confidence : 0.72;
  const deltaVsPrev = predictionData?.delta_vs_previous_pct !== undefined ? predictionData.delta_vs_previous_pct : 32;

  const defaultFactors = [
    { feature: 'PEF decline (recent trend)', weight: 0.32, colorClass: 'coral', icon: Activity },
    { feature: 'PM2.5 exposure', weight: 0.21, colorClass: 'orange', icon: Wind },
    { feature: 'Increased respiratory rate', weight: 0.18, colorClass: 'orange', icon: Activity },
    { feature: 'Symptom severity', weight: 0.17, colorClass: 'amber', icon: AlertCircle },
    { feature: 'Low sleep duration', weight: 0.12, colorClass: 'blue', icon: Moon }
  ];

  const factors = predictionData?.top_contributing_factors?.length > 0 
    ? predictionData.top_contributing_factors.map((f, i) => ({
        ...f,
        colorClass: i === 0 ? 'coral' : i < 3 ? 'orange' : i === 3 ? 'amber' : 'blue',
        icon: f.feature?.toLowerCase().includes('pm2') ? Wind :
              f.feature?.toLowerCase().includes('sleep') ? Moon :
              f.feature?.toLowerCase().includes('symptom') ? AlertCircle : Activity
      }))
    : defaultFactors;

  return (
    <div className="clinical-card">
      {/* Header Bar */}
      <div className="card-header-bar">
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-main)' }}>
          Future Event Prediction
        </span>

        <button 
          className="pill-tab active"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4, 
            background: '#f1f5f9', 
            color: 'var(--text-main)',
            border: '1px solid #e2e8f0',
            fontSize: 11.5,
            padding: '3px 10px'
          }}
        >
          <span>{horizon}</span>
          <ChevronDown size={12} />
        </button>
      </div>

      <div className="prediction-card-body">
        {/* Pink/Red Alert Box */}
        <div className="risk-callout-box">
          <div className="risk-callout-left">
            <div className="risk-icon-pill">
              <AlertTriangle size={18} />
            </div>
            <div className="risk-text-info">
              <span className="risk-level-title">
                {riskCategory === 'HIGH' || riskCategory === 'HIGH RISK' ? 'High Risk' : riskCategory}
              </span>
              <span className="risk-desc">
                Probability of PEF falling below 80% within next 2 hours
              </span>
            </div>
          </div>

          <div className="risk-stat-right">
            <span className="risk-percentage-val">{riskPct}%</span>
            <span className="risk-delta-caption">
              ↑ +{Math.abs(deltaVsPrev)}% vs. previous
            </span>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="confidence-row">
          <span className="confidence-label">Model Confidence</span>
          <div className="confidence-bar-track">
            <div 
              className="confidence-bar-fill" 
              style={{ width: `${Math.round(confidence * 100)}%` }} 
            />
          </div>
          <span className="confidence-val-text">{confidence}</span>
        </div>

        {/* Action Button */}
        <button 
          className="btn-explain-cta"
          onClick={() => onOpenExplanation && onOpenExplanation()}
        >
          <span>View Explanation &amp; Contributing Factors</span>
          <ArrowRight size={14} />
        </button>

        {/* Top Contributing Factors */}
        <div className="factors-section">
          <span className="factors-heading">Top Contributing Factors</span>

          {factors.slice(0, 5).map((factor, idx) => {
            const IconComponent = factor.icon || Activity;
            const barPct = Math.min(100, Math.round(factor.weight * 180));
            return (
              <div key={idx} className="factor-item">
                <div className="factor-meta-row">
                  <div className="factor-name-icon">
                    <IconComponent size={13} style={{ color: factor.colorClass === 'coral' ? '#ef4444' : '#f97316' }} />
                    <span>{factor.feature}</span>
                  </div>
                  <span className="factor-val">{factor.weight}</span>
                </div>
                <div className="factor-track">
                  <div 
                    className={`factor-fill ${factor.colorClass}`} 
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div style={{ paddingTop: 4 }}>
            <button 
              className="card-action-link"
              onClick={() => onViewAllFeatures && onViewAllFeatures()}
            >
              View All Features &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
