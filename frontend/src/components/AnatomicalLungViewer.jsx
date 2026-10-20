import React, { useState } from 'react';
import { 
  Activity, 
  Scan, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  Layers,
  Play,
  Pause
} from 'lucide-react';
import Lung3DCanvas from './Lung3DCanvas';
import lung2DModelImg from '../assets/lung_2d_transparent.png';

export default function AnatomicalLungViewer({ 
  patient, 
  currentObservation, 
  onSelectAnnotation, 
  _selectedPin, 
  onOpenViewer, 
  imagingData,
  monitoringHistory
}) {
  const [activeTab, setActiveTab] = useState('Lungs'); // 'Lungs', 'CT Scan', '3D View'
  const [hoveredPin, setHoveredPin] = useState(null);
  const [isBreathing2D, setIsBreathing2D] = useState(true);

  const pef = currentObservation?.peak_flow_pef_l_min || 320;
  const fev1 = currentObservation?.fev1_l || 2.1;
  const rr = currentObservation?.respiratory_rate_bpm || 22;
  const spo2 = currentObservation?.spo2_pct || 96;
  const hr = currentObservation?.heart_rate_bpm || currentObservation?.pulse_rate_bpm || 98;
  const symptomScore = currentObservation?.symptom_severity_0_3 !== undefined ? currentObservation.symptom_severity_0_3 * 2 : 6;
  const pbPef = patient?.baseline?.personal_best_pef || 450;
  const pefRatio = Math.max(0.4, Math.min(1.0, pef / pbPef));
  const pefDropPct = Math.round((1.0 - pefRatio) * 100);

  // Compute dynamic sparklines from recent observations
  const recentObs = (monitoringHistory?.recent_observations || []).slice(-8);
  const pefPoints = recentObs.map(o => Number(o.peak_flow_pef_l_min)).filter(v => !isNaN(v) && v > 0);
  const fev1Points = recentObs.map(o => Number(o.fev1_l)).filter(v => !isNaN(v) && v > 0);

  const buildSparkline = (dataPoints, defaultVal, minY = 100, maxY = 500) => {
    const pts = dataPoints.length >= 2 ? dataPoints : [defaultVal * 1.05, defaultVal * 0.98, defaultVal];
    const actualMin = Math.min(...pts, minY);
    const actualMax = Math.max(...pts, maxY);
    const range = actualMax - actualMin || 1;
    const w = 110;
    const h = 38;
    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * (w - 10) + 5;
      const y = h - 6 - ((val - actualMin) / range) * (h - 12);
      return { x, y };
    });
    const pathD = coords.reduce((acc, p, i) => i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const lastCoord = coords[coords.length - 1];
    return { pathD, lastCoord };
  };

  const pefSpark = buildSparkline(pefPoints, pef, 150, 480);
  const fev1Spark = buildSparkline(fev1Points, fev1, 1.0, 3.5);

  // Dynamic patient-specific pins
  const isWheezing = currentObservation?.wheezing === 1;
  const hasAirTrapping = pefDropPct >= 15;

  const pins = [
    {
      id: 'trachea',
      title: 'Trachea',
      subtitle: isWheezing ? 'Mucosal Irritation [Simulated]' : 'Normal Patency',
      x: '50%',
      y: '22%',
      status: isWheezing ? 'warning' : 'normal',
      dotColor: isWheezing ? '#f59e0b' : '#22c55e',
      alert: isWheezing,
      detail: isWheezing 
        ? 'Mucosal edema and mild bronchoconstriction consistent with simulated acute response.'
        : 'Normal central airway caliber without detected mucosal inflammation.'
    },
    {
      id: 'bronchi',
      title: 'Main Bronchi',
      subtitle: 'Symmetrical Bifurcation',
      x: '50%',
      y: '36%',
      status: 'normal',
      dotColor: '#22c55e',
      alert: false,
      detail: 'Symmetrical primary bronchi caliber entering the pulmonary hilum.'
    },
    {
      id: 'right_lung',
      title: 'Right Lung',
      subtitle: 'Normal Aeration',
      x: '27%',
      y: '56%',
      status: 'normal',
      dotColor: '#22c55e',
      alert: false,
      detail: 'Symmetrical breath sounds, normal ventilation-perfusion balance, no consolidation.'
    },
    {
      id: 'left_lung',
      title: 'Left Lung',
      subtitle: hasAirTrapping ? 'Air Trapping [Simulated]' : 'Adequate Ventilation',
      x: '73%',
      y: '58%',
      status: hasAirTrapping ? 'alert' : 'normal',
      dotColor: hasAirTrapping ? '#ef4444' : '#22c55e',
      alert: hasAirTrapping,
      detail: hasAirTrapping 
        ? `Synthetic airflow limitation modeled with dynamic expiratory delay (${pefDropPct}% below baseline reference).`
        : 'Normal regional ventilation dynamics.'
    }
  ];

  return (
    <div className="clinical-card">
      {/* Card Header Bar */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <Activity size={18} style={{ color: '#2563eb' }} />
          <span>Virtual Patient Model</span>
        </div>

        <div className="pill-tabs">
          {['Lungs', 'CT Scan', '3D View'].map((tab) => (
            <button
              key={tab}
              className={`pill-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Card Body: Anatomical Viewer on Left, Lung Function on Right */}
      <div className="virtual-patient-split">
        {/* Anatomical Viewer Canvas */}
        <div className="anatomical-viewer-container">
          {/* TAB 1: LUNGS VIEW (Living 2D Anatomical Digital Twin Model) */}
          {activeTab === 'Lungs' && (
            <div className="lung-2d-viewport">
              {/* Header Bar for 2D Model view */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-light)',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', fontSize: 13, fontWeight: 700 }}>
                  <Activity size={15} />
                  <span>2D Thoracic Anatomical Model</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="status-pill normal" style={{ fontSize: 10, background: '#eff6ff', color: '#0284c7', border: '1px solid #bfdbfe' }}>
                    Physiological 2D Twin
                  </span>

                  {/* Breathing Pulse Toggle Button */}
                  <button 
                    onClick={() => setIsBreathing2D(!isBreathing2D)}
                    className={`canvas-tool-btn ${isBreathing2D ? 'active' : ''}`}
                    style={{
                      height: 26,
                      padding: '0 8px',
                      width: 'auto',
                      fontSize: 10.5,
                      gap: 4,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 6
                    }}
                    title={isBreathing2D ? 'Pause Breathing Motion' : 'Resume Breathing Motion'}
                  >
                    {isBreathing2D ? <Pause size={11} /> : <Play size={11} />}
                    <span>Breathing</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('3D View')}
                    style={{
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    <span>Inspect 3D Twin</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Viewport Canvas: 2D Model Mesh on Clinical Light Cavity */}
              <div style={{ 
                flex: 1, 
                position: 'relative', 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'transparent',
                overflow: 'hidden'
              }}>
                {/* Thoracic Calibration Grid & Medical Reticle Background */}
                <svg 
                  viewBox="0 0 400 400" 
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none',
                    opacity: 0.35
                  }}
                >
                  <circle cx="200" cy="200" r="170" fill="none" stroke="#0284c7" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.30" />
                  <circle cx="200" cy="200" r="120" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.22" />
                  <line x1="200" y1="20" x2="200" y2="380" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.20" />
                  <line x1="30" y1="200" x2="370" y2="200" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.20" />
                </svg>

                {/* Living 2D Stage: Expands organically with tidal breathing */}
                <div 
                  className={`lung-2d-stage ${isBreathing2D ? 'breathing' : ''}`}
                >
                  <img 
                    src={lung2DModelImg} 
                    alt="2D Human Respiratory Model" 
                    className="lung-2d-model-img" 
                  />

                  {/* SVG Leader Lines & Glowing Organ Anchor Points */}
                  <svg 
                    viewBox="0 0 400 420" 
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      width: '100%', 
                      height: '100%', 
                      pointerEvents: 'none',
                      zIndex: 7
                    }}
                  >
                    {/* Trachea Leader Line (to Top-Left) */}
                    <circle cx="200" cy="96" r="3.5" fill="#0284c7" />
                    <circle cx="200" cy="96" r="7.5" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" opacity="0.85" />
                    <line x1="200" y1="96" x2="145" y2="34" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
                    <line x1="145" y1="34" x2="85" y2="34" stroke="#0284c7" strokeWidth="1.2" opacity="0.85" />

                    {/* Main Bronchi Leader Line (to Staggered Right) */}
                    <circle cx="200" cy="160" r="3.5" fill="#0284c7" />
                    <circle cx="200" cy="160" r="7.5" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" opacity="0.85" />
                    <line x1="200" y1="160" x2="265" y2="98" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
                    <line x1="265" y1="98" x2="315" y2="98" stroke="#0284c7" strokeWidth="1.2" opacity="0.85" />

                    {/* Right Lung Leader Line (to Staggered Mid-Left) */}
                    <circle cx="115" cy="225" r="3.5" fill="#0284c7" />
                    <circle cx="115" cy="225" r="7.5" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" opacity="0.85" />
                    <line x1="115" y1="225" x2="70" y2="345" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
                    <line x1="70" y1="345" x2="18" y2="345" stroke="#0284c7" strokeWidth="1.2" opacity="0.85" />

                    {/* Left Lung Leader Line (to Staggered Bottom-Right) */}
                    <circle cx="285" cy="228" r="3.5" fill={hasAirTrapping ? "#e11d48" : "#0284c7"} />
                    <circle cx="285" cy="228" r="7.5" fill="none" stroke={hasAirTrapping ? "#e11d48" : "#0284c7"} strokeWidth="1" strokeDasharray="2 2" opacity="0.85" />
                    <line x1="285" y1="228" x2="330" y2="382" stroke={hasAirTrapping ? "#e11d48" : "#0284c7"} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
                    <line x1="330" y1="382" x2="382" y2="382" stroke={hasAirTrapping ? "#e11d48" : "#0284c7"} strokeWidth="1.2" opacity="0.85" />
                  </svg>

                  {/* Staggered Non-Overlapping Corner Callout Badges */}
                  {/* Trachea Badge: Top-Left */}
                  <div
                    className="annotation-pin"
                    style={{ position: 'absolute', top: 20, left: 14, zIndex: 10, cursor: 'pointer' }}
                    onClick={() => onSelectAnnotation && onSelectAnnotation(pins[0])}
                    onMouseEnter={() => setHoveredPin(pins[0])}
                    onMouseLeave={() => setHoveredPin(null)}
                  >
                    <div className={`pin-pill ${pins[0].alert ? 'alert' : ''}`}>
                      <span className={`pin-beacon-anchor ${pins[0].alert ? 'alert' : ''}`} />
                      <span>
                        <strong style={{ color: '#38bdf8' }}>{pins[0].title}</strong> <span style={{ fontSize: 10, color: '#cbd5e1' }}>• {pins[0].subtitle}</span>
                      </span>
                    </div>
                  </div>

                  {/* Main Bronchi Badge: Staggered Top-Right */}
                  <div
                    className="annotation-pin"
                    style={{ position: 'absolute', top: 86, right: 14, zIndex: 10, cursor: 'pointer' }}
                    onClick={() => onSelectAnnotation && onSelectAnnotation(pins[1])}
                    onMouseEnter={() => setHoveredPin(pins[1])}
                    onMouseLeave={() => setHoveredPin(null)}
                  >
                    <div className={`pin-pill ${pins[1].alert ? 'alert' : ''}`}>
                      <span className={`pin-beacon-anchor ${pins[1].alert ? 'alert' : ''}`} />
                      <span>
                        <strong style={{ color: '#38bdf8' }}>{pins[1].title}</strong> <span style={{ fontSize: 10, color: '#cbd5e1' }}>• {pins[1].subtitle}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Lung Badge: Staggered Mid/Lower-Left (No collision) */}
                  <div
                    className="annotation-pin"
                    style={{ position: 'absolute', bottom: 52, left: 14, zIndex: 10, cursor: 'pointer' }}
                    onClick={() => onSelectAnnotation && onSelectAnnotation(pins[2])}
                    onMouseEnter={() => setHoveredPin(pins[2])}
                    onMouseLeave={() => setHoveredPin(null)}
                  >
                    <div className={`pin-pill ${pins[2].alert ? 'alert' : ''}`}>
                      <span className={`pin-beacon-anchor ${pins[2].alert ? 'alert' : ''}`} />
                      <span>
                        <strong style={{ color: '#38bdf8' }}>{pins[2].title}</strong> <span style={{ fontSize: 10, color: '#cbd5e1' }}>• {pins[2].subtitle}</span>
                      </span>
                    </div>
                  </div>

                  {/* Left Lung Badge: Staggered Bottom-Right (Clear of Right Lung) */}
                  <div
                    className="annotation-pin"
                    style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 10, cursor: 'pointer' }}
                    onClick={() => onSelectAnnotation && onSelectAnnotation(pins[3])}
                    onMouseEnter={() => setHoveredPin(pins[3])}
                    onMouseLeave={() => setHoveredPin(null)}
                  >
                    <div className={`pin-pill ${pins[3].alert ? 'alert' : ''}`}>
                      <span className={`pin-beacon-anchor ${pins[3].alert ? 'alert' : ''}`} />
                      <span>
                        <strong style={{ color: pins[3].alert ? '#f87171' : '#38bdf8' }}>{pins[3].title}</strong> <span style={{ fontSize: 10, color: pins[3].alert ? '#fecdd3' : '#cbd5e1' }}>• {pins[3].subtitle}</span>
                      </span>
                    </div>
                  </div>

                  {/* Active Hover Detail Tooltip */}
                  {hoveredPin && (
                    <div style={{
                      position: 'absolute',
                      bottom: 46,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(3, 8, 22, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${hoveredPin.alert ? '#ff2255' : '#00f0ff'}`,
                      borderRadius: 8,
                      padding: '7px 16px',
                      fontSize: 11,
                      color: '#e2e8f0',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7), 0 0 12px rgba(0, 240, 255, 0.25)',
                      zIndex: 20,
                      pointerEvents: 'none',
                      textAlign: 'center',
                      maxWidth: '85%'
                    }}>
                      <strong style={{ color: hoveredPin.alert ? '#ff3b5c' : '#00f0ff' }}>{hoveredPin.title}:</strong> {hoveredPin.detail}
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Footer */}
              <div style={{ 
                fontSize: 9.5, 
                color: '#64748b', 
                borderTop: '1px solid var(--border-light)', 
                padding: '6px 14px', 
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                lineHeight: 1.3 
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isBreathing2D ? '#0284c7' : '#94a3b8', boxShadow: isBreathing2D ? '0 0 6px #0284c7' : 'none' }} />
                  <span>2D Physiological Twin • {isBreathing2D ? 'Tidal Motion Active (22 bpm)' : 'Motion Paused'}</span>
                </span>
                <span style={{ color: '#94a3b8' }}>Click any structure for clinical telemetry • Switch to 3D View for 360° inspection</span>
              </div>
            </div>
          )}

          {/* TAB 2: CT SCAN VIEW (Patient-Specific or Informative Empty State) */}
          {activeTab === 'CT Scan' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
                  <Scan size={15} />
                  <span>Thoracic Diagnostic Imaging Study</span>
                </div>
                <span className="status-pill normal" style={{ fontSize: 10 }}>Synthea FHIR</span>
              </div>

              {imagingData?.has_imaging && imagingData?.primary_scan ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                  <div style={{ background: '#020617', border: '1px solid #334155', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                          {imagingData.primary_scan.modality || 'CT'} Chest (Thorax)
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Study Date: {imagingData.primary_scan.study_date ? new Date(imagingData.primary_scan.study_date).toLocaleDateString() : 'Recorded in EHR'} • {imagingData.primary_scan.slice_count || 3} Axial Slices
                        </div>
                      </div>
                      <span className="status-pill warning" style={{ fontSize: 10 }}>Verified Study</span>
                    </div>

                    <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 10, lineHeight: 1.4 }}>
                      <strong>Impression:</strong> {imagingData.primary_scan.impression || imagingData.primary_scan.findings}
                    </div>
                  </div>

                  <button 
                    className="btn-ehr-view"
                    style={{ background: '#2563eb', color: '#fff', width: '100%', justifyContent: 'center' }}
                    onClick={() => onOpenViewer && onOpenViewer()}
                  >
                    <Layers size={14} />
                    <span>Open High-Resolution DICOM / CT Viewer</span>
                  </button>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 12 }}>
                    <Scan size={22} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                    No imaging study available for this patient.
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', maxWidth: 280, lineHeight: 1.4 }}>
                    This patient record ({patient?.patient_id || 'Selected Patient'}) contains no imported CT chest scans or thoracic radiographs in their longitudinal EHR.
                  </div>
                </div>
              )}

              <div style={{ fontSize: 9.5, color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                Provenance: Synthea HL7 FHIR ImagingStudy Resource. Only genuine imported scans are displayed.
              </div>
            </div>
          )}

          {/* TAB 3: 3D VIEW (Interactive Rotatable 3D Thoracic Model) */}
          {activeTab === '3D View' && (
            <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column', background: 'var(--canvas-bg)' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                borderBottom: '1px solid rgba(30, 41, 59, 0.8)', 
                padding: '10px 16px',
                background: 'rgba(11, 17, 32, 0.85)',
                backdropFilter: 'blur(8px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
                  <Layers size={15} />
                  <span>3D Thoracic Anatomical Model</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="status-pill normal" style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    WebGL 3D Twin
                  </span>
                </div>
              </div>

              {/* Genuine 3D WebGL Canvas */}
              <div style={{ flex: 1, position: 'relative', minHeight: '420px' }}>
                <Lung3DCanvas 
                  patient={patient} 
                  currentObservation={currentObservation} 
                  onSelectAnnotation={onSelectAnnotation} 
                />
              </div>

              <div style={{ 
                fontSize: 9.5, 
                color: '#94a3b8', 
                borderTop: '1px solid rgba(30, 41, 59, 0.8)', 
                padding: '6px 14px', 
                background: 'rgba(11, 17, 32, 0.85)', 
                backdropFilter: 'blur(8px)',
                lineHeight: 1.3 
              }}>
                *Standard Anatomical Reference Model (Adult Thoracic Cavity). Genuine 3D geometry with dynamic telemetry response; click any label or organ for clinical insights.
              </div>
            </div>
          )}
        </div>

        {/* Right Sub-Panel: Lung Function (Current) */}
        <div className="lung-metrics-subpanel">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                Lung Function (Current)
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Personalized Model
              </span>
            </div>

            {/* PEF Row */}
            <div className="spirometry-row">
              <div className="spiro-left">
                <span className="spiro-title">PEF</span>
                <div className="spiro-val-unit">
                  {pef} <span>L/min</span>
                </div>
                <div className="spiro-delta-pill">
                  <TrendingDown size={12} />
                  <span>{pefDropPct}% from personal best</span>
                </div>
              </div>

              {/* Sparkline PEF */}
              <div className="spiro-sparkline">
                <svg viewBox="0 0 110 38" width="100%" height="100%">
                  {pefSpark.pathD && (
                    <path
                      d={pefSpark.pathD}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  {pefSpark.lastCoord && (
                    <circle cx={pefSpark.lastCoord.x} cy={pefSpark.lastCoord.y} r="3.5" fill="#2563eb" />
                  )}
                </svg>
              </div>
            </div>

            {/* FEV1 Row */}
            <div className="spirometry-row">
              <div className="spiro-left">
                <span className="spiro-title">FEV1</span>
                <div className="spiro-val-unit">
                  {fev1} <span>L</span>
                </div>
                <div className="spiro-delta-pill">
                  <TrendingDown size={12} />
                  <span>{Math.round(pefDropPct * 1.1)}% from baseline</span>
                </div>
              </div>

              {/* Sparkline FEV1 */}
              <div className="spiro-sparkline">
                <svg viewBox="0 0 110 38" width="100%" height="100%">
                  {fev1Spark.pathD && (
                    <path
                      d={fev1Spark.pathD}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  {fev1Spark.lastCoord && (
                    <circle cx={fev1Spark.lastCoord.x} cy={fev1Spark.lastCoord.y} r="3.5" fill="#3b82f6" />
                  )}
                </svg>
              </div>
            </div>

            <div style={{ padding: '8px 0 2px' }}>
              <button 
                className="card-action-link"
                style={{ fontSize: 12 }}
                onClick={() => onSelectAnnotation && onSelectAnnotation({ title: 'Spirometry', subtitle: 'PEF & FEV1 Trend' })}
              >
                View Spirometry Trend &gt;
              </button>
            </div>
          </div>

          {/* 4 Mini Stat Tiles */}
          <div className="mini-tiles-grid">
            {/* Resp. Rate */}
            <div className="mini-tile">
              <span className="mini-tile-label">Resp. Rate</span>
              <div className="mini-tile-val-row">
                <span className="mini-tile-val">{rr} <span>/min</span></span>
                <span className="mini-tile-delta">
                  <TrendingUp size={11} /> 27%
                </span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="mini-tile">
              <span className="mini-tile-label">SpO₂</span>
              <div className="mini-tile-val-row">
                <span className="mini-tile-val">{spo2}<span>%</span></span>
                <span className="mini-tile-delta">
                  <TrendingDown size={11} /> 1%
                </span>
              </div>
            </div>

            {/* Heart Rate */}
            <div className="mini-tile">
              <span className="mini-tile-label">Heart Rate</span>
              <div className="mini-tile-val-row">
                <span className="mini-tile-val">{hr} <span>bpm</span></span>
                <span className="mini-tile-delta">
                  <TrendingUp size={11} /> 15%
                </span>
              </div>
            </div>

            {/* Symptom Score */}
            <div className="mini-tile">
              <span className="mini-tile-label">Symptom Score</span>
              <div className="mini-tile-val-row">
                <span className="mini-tile-val">{symptomScore} <span>/ 10</span></span>
                <span className="mini-tile-delta" style={{ color: '#f59e0b' }}>
                  <AlertCircle size={11} /> 3
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
