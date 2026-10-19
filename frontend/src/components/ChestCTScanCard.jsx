import React, { useState } from 'react';
import { ArrowRight, Maximize2, Layers, Scan } from 'lucide-react';

export default function ChestCTScanCard({ imagingData, onOpenViewer }) {
  const [selectedSlice, setSelectedSlice] = useState(1);

  const hasImaging = imagingData?.has_imaging && imagingData?.primary_scan;
  const scan = imagingData?.primary_scan;

  // SVG representation of axial chest CT slices
  const renderCTSlice = (sliceIndex) => {
    return (
      <svg viewBox="0 0 240 180" width="100%" height="100%" style={{ background: '#020617' }}>
        <defs>
          <radialGradient id="bodyWall" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#334155" />
            <stop offset="90%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>

          <radialGradient id="lungParenchyma" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="85%" stopColor="#030712" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>
        </defs>

        {/* Outer thoracic contour */}
        <ellipse cx="120" cy="90" rx="100" ry="78" fill="url(#bodyWall)" stroke="#475569" strokeWidth="2" />

        {/* Vertebral body */}
        <ellipse cx="120" cy="150" rx="16" ry="12" fill="#e2e8f0" />
        <circle cx="120" cy="148" r="5" fill="#0f172a" />
        <polygon points="120,162 110,172 130,172" fill="#cbd5e1" />

        {/* Sternum anteriorly */}
        <rect x="110" y="16" width="20" height="6" rx="3" fill="#e2e8f0" />

        {/* Rib cross-sections */}
        {[
          [35, 60], [30, 95], [40, 130],
          [205, 60], [210, 95], [200, 130]
        ].map(([rx, ry], idx) => (
          <ellipse key={idx} cx={rx} cy={ry} rx="6" ry="3" fill="#f8fafc" />
        ))}

        {/* Mediastinum */}
        <path
          d="M 105 40 Q 120 35 135 40 Q 145 70 140 110 Q 120 125 100 110 Q 95 70 105 40 Z"
          fill="#475569"
        />

        {/* Heart & Major Vessels */}
        <circle cx="112" cy="70" r="14" fill="#64748b" />
        <circle cx="132" cy="120" r="10" fill="#334155" />

        {/* Right Lung Field */}
        <path
          d="M 98 45 C 70 45, 45 70, 45 105 C 45 140, 70 150, 95 145 C 105 130, 105 70, 98 45 Z"
          fill="url(#lungParenchyma)"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Left Lung Field */}
        <path
          d="M 142 45 C 170 45, 195 70, 195 105 C 195 140, 170 150, 145 145 C 135 130, 135 70, 142 45 Z"
          fill="url(#lungParenchyma)"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Bronchovascular Markings */}
        <path d="M 95 90 Q 75 95 60 110" stroke="#94a3b8" strokeWidth="1.2" fill="none" opacity="0.75" />
        <path d="M 95 90 Q 70 75 60 70" stroke="#94a3b8" strokeWidth="1" fill="none" opacity="0.65" />
        <path d="M 145 90 Q 165 95 180 110" stroke="#94a3b8" strokeWidth="1.2" fill="none" opacity="0.75" />
        <path d="M 145 90 Q 170 75 180 70" stroke="#94a3b8" strokeWidth="1" fill="none" opacity="0.65" />

        {/* Bronchial Wall Thickening */}
        <circle cx="165" cy="98" r="4" stroke="#e2e8f0" strokeWidth="1.5" fill="#0f172a" />
        <circle cx="75" cy="98" r="3.5" stroke="#94a3b8" strokeWidth="1" fill="#0f172a" />
      </svg>
    );
  };

  return (
    <div className="clinical-card">
      <div className="card-header-bar">
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-main)' }}>
          Chest CT Scan
        </span>
        {hasImaging && (
          <button className="card-action-link" onClick={() => onOpenViewer && onOpenViewer()}>
            <span>Launch Viewer</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {hasImaging ? (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div className="ct-viewport-box">
            {renderCTSlice(selectedSlice)}
            <div className="ct-orientation-marker ct-anterior">A</div>
            <div className="ct-orientation-marker ct-posterior">P</div>
            <div className="ct-orientation-marker ct-left">R</div>
            <div className="ct-orientation-marker ct-right">L</div>

            <button 
              className="ct-expand-btn"
              title="Open full diagnostic CT viewer"
              onClick={() => onOpenViewer && onOpenViewer()}
            >
              <Maximize2 size={13} />
            </button>

            <div className="ct-slice-counter">
              Slice {selectedSlice} of {scan.slice_count || 3}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`ct-thumb-box ${selectedSlice === idx ? 'active' : ''}`}
                onClick={() => setSelectedSlice(idx)}
                style={{ flex: 1, height: 42 }}
              >
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>
                  Slice {idx}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35 }}>
            <strong style={{ color: 'var(--text-main)' }}>Findings:</strong> {scan.findings || scan.impression}
          </div>
        </div>
      ) : (
        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: 12 }}>
            <Scan size={22} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
            No imaging study available for this patient.
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 260, lineHeight: 1.4 }}>
            No thoracic CT scans or chest radiographs are documented in this patient's longitudinal EHR.
          </div>
        </div>
      )}
    </div>
  );
}
