import React, { useState, useMemo } from 'react';
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
  Calendar,
  Filter
} from 'lucide-react';
import PulseOximeterWidget from '../components/PulseOximeterWidget';

export default function LiveMonitoringView({ 
  patientId, 
  currentObservation, 
  monitoringHistory, 
  patientProfile,
  onStepSimulation, 
  onResetSimulation,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed
}) {
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'last10', 'last20', 'flare_only'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const rawHistory = monitoringHistory?.recent_observations || [];
  const latest = currentObservation || {};

  // Personal Best Reference for PEF threshold
  const pbPef = patientProfile?.baseline?.personal_best_pef || 450;
  const threshold80 = Math.round(pbPef * 0.80);

  // Filter and validate observations
  const filteredHistory = useMemo(() => {
    let list = [...rawHistory];
    if (timeFilter === 'last10') list = list.slice(-10);
    else if (timeFilter === 'last20') list = list.slice(-20);
    else if (timeFilter === 'flare_only') {
      list = list.filter(o => (o.peak_flow_pef_l_min && o.peak_flow_pef_l_min < threshold80) || (o.respiratory_rate_bpm && o.respiratory_rate_bpm >= 22));
    }
    return list;
  }, [rawHistory, timeFilter, threshold80]);

  // Dynamic SVG path generator helper
  const createChartPath = (data, valueKey, minY, maxY, width = 400, height = 120, padLeft = 45, padRight = 20, padTop = 15, padBottom = 25) => {
    if (!data || data.length === 0) return { pathD: '', points: [], yMin: minY, yMax: maxY };

    const validPoints = data.map((d, idx) => ({
      val: d[valueKey] !== undefined && d[valueKey] !== null ? Number(d[valueKey]) : null,
      raw: d,
      idx
    })).filter(p => p.val !== null && !isNaN(p.val));

    if (validPoints.length === 0) return { pathD: '', points: [], yMin: minY, yMax: maxY };

    const actualMin = Math.min(minY, ...validPoints.map(p => p.val));
    const actualMax = Math.max(maxY, ...validPoints.map(p => p.val));
    const range = (actualMax - actualMin) || 1;

    const usableWidth = width - padLeft - padRight;
    const usableHeight = height - padTop - padBottom;

    const coords = validPoints.map((p, i) => {
      const x = validPoints.length === 1 
        ? padLeft + usableWidth / 2 
        : padLeft + (i / (validPoints.length - 1)) * usableWidth;
      const normY = (p.val - actualMin) / range;
      const y = padTop + usableHeight - (normY * usableHeight);
      return { x, y, val: p.val, raw: p.raw, idx: p.idx };
    });

    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    return { pathD, points: coords, yMin: actualMin, yMax: actualMax };
  };

  const pefChart = useMemo(() => {
    return createChartPath(filteredHistory, 'peak_flow_pef_l_min', 150, Math.max(500, pbPef + 20), 440, 150);
  }, [filteredHistory, pbPef]);

  const rrChart = useMemo(() => {
    return createChartPath(filteredHistory, 'respiratory_rate_bpm', 10, 35, 440, 150);
  }, [filteredHistory]);

  const currentPef = latest.peak_flow_pef_l_min !== undefined ? latest.peak_flow_pef_l_min : '--';
  const currentRr = latest.respiratory_rate_bpm !== undefined ? latest.respiratory_rate_bpm : '--';

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
              Patient Scope: <strong>{patientId}</strong> • Baseline Ref: {pbPef} L/min • Rendered Observations: {filteredHistory.length} of {rawHistory.length}
            </div>
          </div>
        </div>

        {/* Playback & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Window Filter */}
          <div className="pill-tabs" style={{ background: '#f1f5f9' }}>
            {[
              { id: 'all', label: 'All Observations' },
              { id: 'last20', label: 'Last 20' },
              { id: 'last10', label: 'Last 10' },
              { id: 'flare_only', label: 'Alert Events Only' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`pill-tab ${timeFilter === tab.id ? 'active' : ''}`}
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setTimeFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

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
      <PulseOximeterWidget 
        patientId={patientId}
        currentObservation={latest} 
      />

      {/* Interactive Time-Series Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* PEF & Spirometry Trend */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Activity size={16} style={{ color: '#2563eb' }} />
              <span>Peak Expiratory Flow (PEF) Telemetry</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: currentPef < threshold80 ? '#dc2626' : '#2563eb' }}>
              Current: {currentPef} L/min {currentPef < threshold80 ? '(Below 80% Ref)' : ''}
            </span>
          </div>

          <div style={{ padding: '16px 20px', height: 210, position: 'relative' }}>
            {filteredHistory.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12 }}>
                No telemetry points recorded for patient {patientId}. Advance simulation steps to stream data.
              </div>
            ) : (
              <svg viewBox="0 0 450 160" width="100%" height="100%" style={{ overflow: 'visible' }}>
                {/* Guidelines */}
                <line x1="45" y1="20" x2="430" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="65" x2="430" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="110" x2="430" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                {/* 80% Personal Best Threshold Line (Dynamic calculation based on patient) */}
                {(() => {
                  const range = pefChart.yMax - pefChart.yMin;
                  const norm = (threshold80 - pefChart.yMin) / (range || 1);
                  const threshY = Math.max(15, Math.min(135, 15 + 110 - (norm * 110)));
                  return (
                    <g>
                      <line x1="45" y1={threshY} x2="430" y2={threshY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                      <text x="50" y={threshY - 5} fill="#ef4444" fontSize="9" fontWeight="bold">
                        80% Reference ({threshold80} L/min)
                      </text>
                    </g>
                  );
                })()}

                {/* Y labels */}
                <text x="8" y="24" fontSize="9.5" fill="#94a3b8">{Math.round(pefChart.yMax)}</text>
                <text x="8" y="69" fontSize="9.5" fill="#94a3b8">{Math.round((pefChart.yMax + pefChart.yMin) / 2)}</text>
                <text x="8" y="114" fontSize="9.5" fill="#94a3b8">{Math.round(pefChart.yMin)}</text>

                {/* PEF Dynamic Trend Path */}
                {pefChart.pathD && (
                  <path
                    d={pefChart.pathD}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points & Interactive Tooltips */}
                {pefChart.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === pefChart.points.length - 1 ? 5 : 3}
                    fill={pt.val < threshold80 ? '#dc2626' : '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint({ ...pt, type: 'PEF', unit: 'L/min' })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X labels (First & Last) */}
                {filteredHistory[0]?.timestamp && (
                  <text x="45" y="145" fontSize="9" fill="#94a3b8">
                    {new Date(filteredHistory[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                )}
                {filteredHistory[filteredHistory.length - 1]?.timestamp && (
                  <text x="390" y="145" fontSize="9" fill="#94a3b8" textAnchor="end">
                    {new Date(filteredHistory[filteredHistory.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                )}
              </svg>
            )}

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div style={{
                position: 'absolute',
                top: 10,
                right: 20,
                background: '#0f172a',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none'
              }}>
                <strong>{hoveredPoint.type}:</strong> {hoveredPoint.val} {hoveredPoint.unit} • {hoveredPoint.raw?.timestamp ? new Date(hoveredPoint.raw.timestamp).toLocaleTimeString() : ''}
              </div>
            )}
          </div>
        </div>

        {/* Respiratory Rate & Symptoms Trend */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Activity size={16} style={{ color: '#f59e0b' }} />
              <span>Respiratory Rate &amp; Symptom Severity</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: currentRr >= 22 ? '#dc2626' : '#f59e0b' }}>
              Current: {currentRr} /min {currentRr >= 22 ? '(Tachypnea)' : ''}
            </span>
          </div>

          <div style={{ padding: '16px 20px', height: 210, position: 'relative' }}>
            {filteredHistory.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12 }}>
                No telemetry points recorded for patient {patientId}.
              </div>
            ) : (
              <svg viewBox="0 0 450 160" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <line x1="45" y1="20" x2="430" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="65" x2="430" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="45" y1="110" x2="430" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                {/* Tachypnea Threshold Line (22 bpm) */}
                {(() => {
                  const range = rrChart.yMax - rrChart.yMin;
                  const norm = (22 - rrChart.yMin) / (range || 1);
                  const threshY = Math.max(15, Math.min(135, 15 + 110 - (norm * 110)));
                  return (
                    <g>
                      <line x1="45" y1={threshY} x2="430" y2={threshY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
                      <text x="50" y={threshY - 4} fill="#f59e0b" fontSize="9" fontWeight="bold">Tachypnea Threshold (22 /min)</text>
                    </g>
                  );
                })()}

                <text x="12" y="24" fontSize="9.5" fill="#94a3b8">{Math.round(rrChart.yMax)}</text>
                <text x="12" y="69" fontSize="9.5" fill="#94a3b8">{Math.round((rrChart.yMax + rrChart.yMin) / 2)}</text>
                <text x="12" y="114" fontSize="9.5" fill="#94a3b8">{Math.round(rrChart.yMin)}</text>

                {/* RR Dynamic Trend Path */}
                {rrChart.pathD && (
                  <path
                    d={rrChart.pathD}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points */}
                {rrChart.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === rrChart.points.length - 1 ? 5 : 3}
                    fill={pt.val >= 22 ? '#dc2626' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint({ ...pt, type: 'Resp Rate', unit: 'bpm' })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X labels */}
                {filteredHistory[0]?.timestamp && (
                  <text x="45" y="145" fontSize="9" fill="#94a3b8">
                    {new Date(filteredHistory[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                )}
                {filteredHistory[filteredHistory.length - 1]?.timestamp && (
                  <text x="390" y="145" fontSize="9" fill="#94a3b8" textAnchor="end">
                    {new Date(filteredHistory[filteredHistory.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                )}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
