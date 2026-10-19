import React, { useState } from 'react';
import { 
  Activity, 
  Heart, 
  Wind, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Sliders, 
  AlertTriangle,
  Droplets,
  Calendar
} from 'lucide-react';
import PulseOximeterWidget from '../components/PulseOximeterWidget';

export default function LiveMonitoringView({ 
  patientId, 
  currentObservation, 
  monitoringHistory, 
  onStepSimulation, 
  onResetSimulation,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed
}) {
  const [selectedMetric, setSelectedMetric] = useState('pef');

  const history = monitoringHistory?.recent_observations || [];
  const latest = currentObservation || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Controls Bar */}
      <div className="patient-banner-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box">
            <Activity size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
              Respiratory &amp; IoT Telemetry Stream
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              High-frequency multi-sensor playback • Patient: <strong>{patientId}</strong> • Total Points: {history.length}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sim-controls-pill">
            <button 
              className={`sim-btn ${isPlaying ? 'active' : ''}`}
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause stream' : 'Start live playback'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button 
              className="sim-btn"
              onClick={() => onStepSimulation && onStepSimulation(1)}
              title="Step forward +1 observation"
            >
              <FastForward size={14} />
            </button>
            <button 
              className="sim-btn"
              onClick={onResetSimulation}
              title="Reset stream to beginning"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Speed:</span>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                className={`pill-tab ${playbackSpeed === spd ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => onChangeSpeed && onChangeSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pulse Oximeter Dedicated Card alongside Principal Respiratory Measurements */}
      <PulseOximeterWidget currentObservation={latest} />

      {/* Interactive Time-Series Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* PEF & FEV1 Spirometry Trend */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Activity size={16} style={{ color: '#2563eb' }} />
              <span>Peak Expiratory Flow (PEF) &amp; FEV1</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
              Current: {latest.peak_flow_pef_l_min || 320} L/min
            </span>
          </div>

          <div style={{ padding: '16px 20px', height: 210 }}>
            <svg viewBox="0 0 450 160" width="100%" height="100%">
              {/* Guidelines */}
              <line x1="40" y1="30" x2="430" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="430" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="430" y2="130" stroke="#f1f5f9" strokeWidth="1" />

              {/* 80% Personal Best Threshold Line */}
              <line x1="40" y1="75" x2="430" y2="75" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
              <text x="45" y="70" fill="#ef4444" fontSize="9" fontWeight="bold">80% Reference Threshold (360 L/min)</text>

              {/* Y labels */}
              <text x="10" y="34" fontSize="10" fill="#94a3b8">500</text>
              <text x="10" y="84" fontSize="10" fill="#94a3b8">350</text>
              <text x="10" y="134" fontSize="10" fill="#94a3b8">200</text>

              {/* PEF Trend Path */}
              <path
                d="M 40 50 Q 100 45, 160 55 T 260 95 T 350 115 T 430 100"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="430" cy="100" r="4" fill="#2563eb" />
            </svg>
          </div>
        </div>

        {/* Respiratory Rate & Symptoms Trend */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Activity size={16} style={{ color: '#f59e0b' }} />
              <span>Respiratory Rate &amp; Symptom Severity</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
              Current: {latest.respiratory_rate_bpm || 22} /min
            </span>
          </div>

          <div style={{ padding: '16px 20px', height: 210 }}>
            <svg viewBox="0 0 450 160" width="100%" height="100%">
              <line x1="40" y1="30" x2="430" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="430" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="430" y2="130" stroke="#f1f5f9" strokeWidth="1" />

              <text x="15" y="34" fontSize="10" fill="#94a3b8">35</text>
              <text x="15" y="84" fontSize="10" fill="#94a3b8">22</text>
              <text x="15" y="134" fontSize="10" fill="#94a3b8">12</text>

              {/* Tachypnea Threshold Line */}
              <line x1="40" y1="80" x2="430" y2="80" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />

              {/* RR Trend Path */}
              <path
                d="M 40 120 Q 100 115, 160 110 T 260 75 T 350 60 T 430 70"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="430" cy="70" r="4" fill="#f59e0b" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
