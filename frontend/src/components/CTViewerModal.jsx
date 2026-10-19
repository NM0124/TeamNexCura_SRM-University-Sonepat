import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Sliders, Layers, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CTViewerModal({ isOpen, onClose, patientId = 'PAT-001' }) {
  const [windowPreset, setWindowPreset] = useState('lung'); // 'lung' or 'mediastinal'
  const [sliceIndex, setSliceIndex] = useState(2);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '880px', width: '92%', background: '#0b1120', color: '#ffffff', border: '1px solid #1e293b' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid #1e293b' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} style={{ color: '#38bdf8' }} />
              <span>High-Resolution Diagnostic Chest CT Viewer</span>
              <span className="counter-badge" style={{ background: '#1e293b', color: '#38bdf8' }}>
                {patientId}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Study Date: 12 Mar 2026 • Modality: Axial HRCT Thorax • Protocol: Inspiratory / Expiratory Pair
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewer Body Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginTop: 16 }}>
          {/* Left: High-Res Axial CT Screen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ 
              position: 'relative', 
              height: '340px', 
              background: '#000000', 
              borderRadius: '12px', 
              overflow: 'hidden',
              border: '1.5px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Orientation tags */}
              <span style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>A (Anterior)</span>
              <span style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>P (Posterior)</span>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>R</span>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>L</span>

              {/* CT Metadata Overlay */}
              <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4, fontFamily: 'monospace' }}>
                <div>kVp: 120</div>
                <div>mA: 180</div>
                <div>Thick: 1.25mm</div>
                <div style={{ color: '#38bdf8' }}>Slice {sliceIndex} / 3</div>
              </div>

              <div style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4, textAlign: 'right', fontFamily: 'monospace' }}>
                <div>W: {windowPreset === 'lung' ? 1500 : 400}</div>
                <div>L: {windowPreset === 'lung' ? -600 : 40}</div>
                <div style={{ color: '#22c55e' }}>Zoom: {(zoomLevel * 100).toFixed(0)}%</div>
              </div>

              {/* Axial CT Rendering with Zoom */}
              <div style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease', width: '85%', height: '85%' }}>
                <svg viewBox="0 0 240 180" width="100%" height="100%">
                  <defs>
                    <radialGradient id="ctWallBig" cx="50%" cy="50%" r="50%">
                      <stop offset="65%" stopColor={windowPreset === 'lung' ? '#334155' : '#475569'} />
                      <stop offset="95%" stopColor={windowPreset === 'lung' ? '#64748b' : '#94a3b8'} />
                      <stop offset="100%" stopColor="#1e293b" />
                    </radialGradient>
                    <radialGradient id="ctLungBig" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#020617" />
                      <stop offset="85%" stopColor="#090d16" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </radialGradient>
                  </defs>

                  <ellipse cx="120" cy="90" rx="100" ry="78" fill="url(#ctWallBig)" stroke="#64748b" strokeWidth="2" />
                  <ellipse cx="120" cy="150" rx="16" ry="12" fill="#ffffff" />
                  <circle cx="120" cy="148" r="5" fill="#0f172a" />
                  <polygon points="120,162 110,172 130,172" fill="#e2e8f0" />
                  <rect x="110" y="16" width="20" height="6" rx="3" fill="#ffffff" />

                  {/* Ribs */}
                  {[[35, 60], [30, 95], [40, 130], [205, 60], [210, 95], [200, 130]].map(([rx, ry], idx) => (
                    <ellipse key={idx} cx={rx} cy={ry} rx="6" ry="3" fill="#ffffff" />
                  ))}

                  {/* Mediastinal heart/aorta */}
                  <path d="M 105 40 Q 120 35 135 40 Q 145 70 140 110 Q 120 125 100 110 Q 95 70 105 40 Z" fill="#64748b" />
                  <circle cx="112" cy="70" r="14" fill="#94a3b8" />
                  <circle cx="132" cy="120" r="10" fill="#475569" />

                  {/* Lungs */}
                  <path d="M 98 45 C 70 45, 45 70, 45 105 C 45 140, 70 150, 95 145 C 105 130, 105 70, 98 45 Z" fill="url(#ctLungBig)" stroke="#475569" strokeWidth="1.5" />
                  <path d="M 142 45 C 170 45, 195 70, 195 105 C 195 140, 170 150, 145 145 C 135 130, 135 70, 142 45 Z" fill="url(#ctLungBig)" stroke="#475569" strokeWidth="1.5" />

                  {/* Bronchial markings */}
                  <path d="M 95 90 Q 75 95 60 110" stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.8" />
                  <path d="M 145 90 Q 165 95 180 110" stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.8" />

                  {/* Air trapping ring & bronchial thickening */}
                  <circle cx="165" cy="98" r="4.5" stroke="#f43f5e" strokeWidth="2" fill="#0f172a" />
                  <line x1="165" y1="92" x2="190" y2="75" stroke="#f43f5e" strokeWidth="1" strokeDasharray="2,2" />
                  <text x="195" y="75" fill="#fca5a5" fontSize="7" fontWeight="bold">Air Trapping</text>
                </svg>
              </div>
            </div>

            {/* Viewer Controls Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '6px 12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Window:</span>
                <button 
                  onClick={() => setWindowPreset('lung')}
                  style={{ background: windowPreset === 'lung' ? '#2563eb' : '#334155', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                >
                  Lung
                </button>
                <button 
                  onClick={() => setWindowPreset('mediastinal')}
                  style={{ background: windowPreset === 'mediastinal' ? '#2563eb' : '#334155', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                >
                  Mediastinum
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  onClick={() => setSliceIndex(Math.max(1, sliceIndex - 1))}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: 4, borderRadius: 4, cursor: 'pointer' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 11, fontFamily: 'monospace' }}>Slice {sliceIndex}/3</span>
                <button 
                  onClick={() => setSliceIndex(Math.min(3, sliceIndex + 1))}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: 4, borderRadius: 4, cursor: 'pointer' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button 
                  onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.2))}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: 4, borderRadius: 4, cursor: 'pointer' }}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button 
                  onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.2))}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: 4, borderRadius: 4, cursor: 'pointer' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button 
                  onClick={() => setZoomLevel(1.0)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: 4, borderRadius: 4, cursor: 'pointer' }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Formal Clinical Radiology Report */}
          <div style={{ background: '#111827', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} style={{ color: '#38bdf8' }} />
              <span>Diagnostic Radiology Report</span>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <strong style={{ color: '#e2e8f0' }}>CLINICAL INDICATION:</strong>
                <p>28-year-old female with long-standing extrinsic asthma, recurrent seasonal wheezing, and post-exposure dyspnea. Evaluation for small airways remodeling.</p>
              </div>

              <div>
                <strong style={{ color: '#e2e8f0' }}>TECHNIQUE:</strong>
                <p>Axial volumetric high-resolution CT (HRCT) of the chest acquired at full inspiration and dynamic end-expiration without contrast.</p>
              </div>

              <div>
                <strong style={{ color: '#e2e8f0' }}>FINDINGS:</strong>
                <p>1. Mild bronchial wall thickening noted bilaterally, most evident in the left lower and right middle lobes.</p>
                <p>2. Expiratory phase confirms mild patchy lobular air trapping in the left retrocardiac parenchyma without architectural distortion.</p>
                <p>3. Normal cardiac size and great vessels. No mediastinal or hilar lymphadenopathy. No pleural effusion.</p>
              </div>

              <div>
                <strong style={{ color: '#38bdf8' }}>IMPRESSION:</strong>
                <p style={{ color: '#f1f5f9' }}>Mild small-airways air trapping and bronchial wall thickening consistent with reactive airways disease / asthma. No consolidation or bronchiectasis. (Demonstration Synthetic Scan).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
