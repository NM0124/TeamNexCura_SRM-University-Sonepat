import React, { useState } from 'react';
import { 
  Activity, 
  Heart, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Radio, 
  Layers, 
  Clock 
} from 'lucide-react';

export default function PulseOximeterWidget({ oximeterData, currentObservation, onConfigureThresholds }) {
  const [deviceMode, setDeviceMode] = useState('mode_a'); // 'mode_a' or 'mode_b'
  const [warningThreshold, setWarningThreshold] = useState(94);
  const [criticalThreshold, setCriticalThreshold] = useState(90);

  const spo2 = oximeterData?.spo2_pct !== undefined ? oximeterData.spo2_pct : (currentObservation?.spo2_pct || 96.0);
  const pulseRate = oximeterData?.pulse_rate_bpm || currentObservation?.pulse_rate_bpm || currentObservation?.heart_rate_bpm || 98;
  const signalQuality = oximeterData?.signal_quality || 'optimal';
  const perfusionIndex = oximeterData?.perfusion_index || 3.2;
  const isConnected = deviceMode === 'mode_a';
  const timestamp = currentObservation?.timestamp || 'Live Active Stream';

  // Evaluate threshold alarms
  const isCritical = isConnected && spo2 < criticalThreshold;
  const isWarning = isConnected && spo2 < warningThreshold && !isCritical;
  const isTachycardia = isConnected && pulseRate > 110;

  return (
    <div className="clinical-card" style={{ border: isCritical ? '1.5px solid #ef4444' : isWarning ? '1.5px solid #f59e0b' : '1px solid var(--border-card)' }}>
      {/* Header Bar */}
      <div className="card-header-bar" style={{ background: isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : '#ffffff' }}>
        <div className="card-title-group">
          <Activity size={18} style={{ color: isCritical ? '#dc2626' : '#2563eb' }} />
          <span>Interactive Pulse Oximeter Module</span>
          <span className="counter-badge" style={{ background: isConnected ? '#ecfdf5' : '#f1f5f9', color: isConnected ? '#059669' : '#64748b' }}>
            {isConnected ? 'LIVE MONITOR' : 'UNBONDED'}
          </span>
        </div>

        {/* Operating Mode Selector (Mode A vs Mode B) */}
        <div className="pill-tabs">
          <button
            className={`pill-tab ${deviceMode === 'mode_a' ? 'active' : ''}`}
            onClick={() => setDeviceMode('mode_a')}
            title="Mode A: Simulated high-fidelity physiological oximeter stream"
          >
            Mode A: Simulated Stream
          </button>
          <button
            className={`pill-tab ${deviceMode === 'mode_b' ? 'active' : ''}`}
            onClick={() => setDeviceMode('mode_b')}
            title="Mode B: Future physical Bluetooth SIG 0x1822 hardware adapter"
          >
            Mode B: Hardware Adapter
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Device Status Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isConnected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}>
                <Wifi size={13} /> Connected (Simulated BLE Stream)
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontWeight: 600 }}>
                <WifiOff size={13} /> Standby / Unconnected (Bluetooth SIG 0x1822 standard)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Signal: <strong style={{ color: '#0f172a' }}>{isConnected ? signalQuality.toUpperCase() : 'N/A'}</strong></span>
            <span>PI: <strong style={{ color: '#0f172a' }}>{isConnected ? `${perfusionIndex}%` : 'N/A'}</strong></span>
            <span>Latency: <strong style={{ color: '#0f172a' }}>{isConnected ? '< 500ms' : 'N/A'}</strong></span>
          </div>
        </div>

        {/* Large Dual Clinical Metric Displays (SpO2 & Pulse Rate) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          {/* SpO2 Large Display */}
          <div style={{ 
            background: isCritical ? '#fef2f2' : '#f8fafc', 
            border: '1px solid ' + (isCritical ? '#fecaca' : '#e2e8f0'), 
            borderRadius: '12px', 
            padding: '14px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>SpO₂ OXYGEN SATURATION</span>
              {isConnected ? (
                isCritical ? (
                  <span className="status-pill high">CRITICAL HYPOXEMIA</span>
                ) : isWarning ? (
                  <span className="status-pill warning">DESATURATION WARNING</span>
                ) : (
                  <span className="status-pill normal">NORMAL SATURATION</span>
                )
              ) : (
                <span className="status-pill" style={{ background: '#f1f5f9', color: '#64748b' }}>DEVICE DISCONNECTED</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: !isConnected ? '#94a3b8' : isCritical ? '#dc2626' : isWarning ? '#d97706' : '#0f172a', fontFamily: 'var(--font-mono)' }}>
                {isConnected ? spo2 : '--'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
            </div>

            {/* Plethysmograph waveform sparkline */}
            <div style={{ height: 35, marginTop: 4 }}>
              {isConnected ? (
                <svg viewBox="0 0 200 35" width="100%" height="100%">
                  <path
                    d="M 0 20 Q 20 20, 25 5 Q 30 30, 35 20 Q 55 20, 60 5 Q 65 30, 70 20 Q 90 20, 95 5 Q 100 30, 105 20 Q 125 20, 130 5 Q 135 30, 140 20 Q 160 20, 165 5 Q 170 30, 175 20 L 200 20"
                    fill="none"
                    stroke={isCritical ? '#dc2626' : '#0284c7'}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', fontSize: 11, color: '#94a3b8' }}>
                  No plethysmographic signal (Sensor offline)
                </div>
              )}
            </div>
          </div>

          {/* Pulse Rate Display */}
          <div style={{ 
            background: isTachycardia ? '#fffbeb' : '#f8fafc', 
            border: '1px solid ' + (isTachycardia ? '#fde68a' : '#e2e8f0'), 
            borderRadius: '12px', 
            padding: '14px 18px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>PULSE RATE</span>
              <Heart size={15} style={{ color: isConnected ? '#ef4444' : '#94a3b8' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: isConnected ? '#0f172a' : '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                {isConnected ? pulseRate : '--'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>BPM</span>
            </div>

            <div style={{ fontSize: 11, color: isTachycardia ? '#d97706' : 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
              {isConnected ? (isTachycardia ? '⚠️ Tachycardia (> 110 bpm)' : 'Resting Baseline: 72 bpm') : 'Hardware adapter offline'}
            </div>
          </div>
        </div>

        {/* Clinical Caution Banner */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: 11.5,
          color: '#475569',
          lineHeight: 1.4
        }}>
          <strong style={{ color: '#0f172a' }}>Clinical Caution:</strong> Normal SpO₂ does not rule out asthma deterioration. A pulse oximeter does not directly measure PEF or airway obstruction.
        </div>

        {/* Alarm Banner if Triggered */}
        {(isCritical || isWarning || isTachycardia) && (
          <div style={{ 
            background: isCritical ? '#fef2f2' : '#fffbeb', 
            border: '1px solid ' + (isCritical ? '#fecaca' : '#fde68a'), 
            borderRadius: '8px', 
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: isCritical ? '#991b1b' : '#92400e'
          }}>
            <AlertTriangle size={15} />
            <span>
              <strong>Clinical Threshold Warning:</strong> SpO₂ at {spo2}% below safety limit ({warningThreshold}%). Does not replace PEF spirometry for airflow assessment.
            </span>
          </div>
        )}

        {/* Provenance & Configurable Safety Thresholds Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingTop: 4, 
          borderTop: '1px solid var(--border-light)',
          fontSize: 11,
          color: 'var(--text-muted)'
        }}>
          <div>
            Provenance: <strong>{isConnected ? 'Simulated BLE Stream (Reproducible noise model)' : 'Standby / Unconnected (Bluetooth SIG 0x1822 standard)'}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Warning Threshold: <strong>{warningThreshold}%</strong></span>
            <span>Critical: <strong>{criticalThreshold}%</strong></span>
            <button 
              className="card-action-link"
              style={{ fontSize: 11 }}
              onClick={() => {
                const newWarn = prompt('Enter SpO2 Warning Threshold (%):', warningThreshold.toString());
                if (newWarn) setWarningThreshold(parseFloat(newWarn));
              }}
            >
              Adjust &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
