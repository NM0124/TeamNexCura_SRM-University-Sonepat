import React from 'react';
import { 
  Sun, 
  Wind, 
  Flower2, 
  Thermometer, 
  Droplets, 
  AlertTriangle,
  ChevronRight 
} from 'lucide-react';

export default function EnvironmentalExposureCard({ 
  currentObservation, 
  monitoringHistory, 
  onNavigateEnvironmental, 
  city = 'Bengaluru, KA' 
}) {
  const latest = currentObservation || {};
  const pm25 = latest.pm25_ug_m3 !== undefined && latest.pm25_ug_m3 !== null ? latest.pm25_ug_m3 : 0;
  const pm10 = latest.pm10_ug_m3 !== undefined && latest.pm10_ug_m3 !== null ? latest.pm10_ug_m3 : 0;
  const temp = latest.temperature_c !== undefined && latest.temperature_c !== null ? latest.temperature_c : '--';
  const humidity = latest.humidity_pct !== undefined && latest.humidity_pct !== null ? latest.humidity_pct : '--';
  const pollenLevel = latest.pollen_level_0_10 !== undefined && latest.pollen_level_0_10 !== null 
    ? latest.pollen_level_0_10 
    : (latest.pollen_level !== undefined && latest.pollen_level !== null ? latest.pollen_level : 0);
  const dust = latest.dust_exposure_level !== undefined ? latest.dust_exposure_level : 0;

  const pm25Status = pm25 >= 75 ? 'High' : pm25 >= 35 ? 'Moderate' : 'Good';
  const pm10Status = pm10 >= 100 ? 'High' : pm10 >= 50 ? 'Moderate' : 'Good';
  const pollenStatus = pollenLevel >= 6 ? 'High' : pollenLevel >= 3 ? 'Moderate' : 'Low';
  const dustStatus = dust >= 2 ? 'High' : dust === 1 ? 'Moderate' : 'Low';

  const history = monitoringHistory?.recent_observations || (latest.timestamp ? [latest] : []);

  // Compute points for PM2.5, PM10, and Pollen (scaled x10 for visual congruence)
  const chartData = React.useMemo(() => {
    if (!history || history.length === 0) return { pm25Path: '', pm10Path: '', pollenPath: '', fillPath: '', pts: [], isElevated: false, peakPt: null, maxVal: 120 };

    const width = 320;
    const height = 75;
    const padLeft = 25;
    const padRight = 10;
    const padTop = 15;
    const padBottom = 15;
    const usableW = width - padLeft - padRight;
    const usableH = height - padTop - padBottom;

    const maxVal = Math.max(120, ...history.map(h => Math.max(Number(h.pm25_ug_m3) || 0, Number(h.pm10_ug_m3) || 0)));

    const pts = history.map((h, i) => {
      const x = history.length === 1 ? padLeft + usableW / 2 : padLeft + (i / (history.length - 1)) * usableW;
      const v25 = Number(h.pm25_ug_m3) || 0;
      const v10 = Number(h.pm10_ug_m3) || 0;
      const vPol = (Number(h.pollen_level_0_10) || Number(h.pollen_level) || 0) * 12; // Scale 0-10 to ~0-120

      const y25 = padTop + usableH - (Math.min(maxVal, v25) / maxVal) * usableH;
      const y10 = padTop + usableH - (Math.min(maxVal, v10) / maxVal) * usableH;
      const yPol = padTop + usableH - (Math.min(maxVal, vPol) / maxVal) * usableH;

      return { x, y25, y10, yPol, v25, v10, timestamp: h.timestamp };
    });

    const pm25Path = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x.toFixed(1)} ${p.y25.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y25.toFixed(1)}`, '');
    const pm10Path = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x.toFixed(1)} ${p.y10.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y10.toFixed(1)}`, '');
    const pollenPath = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x.toFixed(1)} ${p.yPol.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.yPol.toFixed(1)}`, '');

    // Area fill under PM2.5
    const baselineY = padTop + usableH;
    const fillPath = pts.length > 0 
      ? `${pm25Path} L ${pts[pts.length - 1].x.toFixed(1)} ${baselineY} L ${pts[0].x.toFixed(1)} ${baselineY} Z`
      : '';

    // Find peak PM2.5 point for risk elevated callout
    let maxP = pts[0];
    pts.forEach(p => {
      if (p.v25 > (maxP?.v25 || 0)) maxP = p;
    });

    const isElevated = (maxP?.v25 || 0) >= 60;

    return { pm25Path, pm10Path, pollenPath, fillPath, pts, isElevated, peakPt: maxP, maxVal };
  }, [history]);

  return (
    <div className="clinical-card">
      {/* Header Bar */}
      <div className="card-header-bar">
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-main)' }}>
          Environmental Exposure (Last 24h)
        </span>
        <button 
          className="card-action-link"
          onClick={() => onNavigateEnvironmental && onNavigateEnvironmental()}
        >
          <span>{city}</span>
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="env-exposure-body">
        {/* 2x3 Grid */}
        <div className="env-metrics-grid">
          {/* PM2.5 */}
          <div className="env-metric-cell">
            <div className="env-cell-top">
              <Sun size={13} style={{ color: '#ef4444' }} />
              <span>PM2.5</span>
            </div>
            <div className="env-cell-val">
              {pm25} <span>µg/m³</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="status-pill high">High</span>
            </div>
          </div>

          {/* PM10 */}
          <div className="env-metric-cell">
            <div className="env-cell-top">
              <Sun size={13} style={{ color: '#f97316' }} />
              <span>PM10</span>
            </div>
            <div className="env-cell-val">
              {pm10} <span>µg/m³</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="status-pill high">High</span>
            </div>
          </div>

          {/* Pollen */}
          <div className="env-metric-cell">
            <div className="env-cell-top">
              <Flower2 size={13} style={{ color: '#eab308' }} />
              <span>Pollen</span>
            </div>
            <div className="env-cell-val">
              {pollenStatus}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="status-pill warning">{pollenStatus}</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="env-metric-cell">
            <div className="env-cell-top">
              <Thermometer size={13} style={{ color: '#f97316' }} />
              <span>Temperature</span>
            </div>
            <div className="env-cell-val">
              {temp}°C
            </div>
          </div>

          {/* Humidity */}
          <div className="env-metric-cell">
            <div className="env-cell-top">
              <Droplets size={13} style={{ color: '#0284c7' }} />
              <span>Humidity</span>
            </div>
            <div className="env-cell-val">
              {humidity}%
            </div>
          </div>

          {/* Dust Level */}
          <div className="env-metric-cell">
            <div className="env-cell-top">
              <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
              <span>Dust Level</span>
            </div>
            <div className="env-cell-val" style={{ fontSize: 13.5 }}>
              {dustStatus}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="status-pill warning">{dustStatus}</span>
            </div>
          </div>
        </div>

        {/* Multi-line chart (PM2.5, PM10, Pollen) with Risk Elevated Indicator */}
        <div className="env-chart-box">
          {/* Chart Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10.5, marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 600 }}>
              <span style={{ width: 8, height: 2.5, backgroundColor: '#ef4444', borderRadius: 2 }} /> PM2.5
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f97316', fontWeight: 600 }}>
              <span style={{ width: 8, height: 2.5, backgroundColor: '#f97316', borderRadius: 2 }} /> PM10
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600 }}>
              <span style={{ width: 8, height: 2.5, backgroundColor: '#10b981', borderRadius: 2 }} /> Pollen
            </span>
          </div>

          <svg viewBox="0 0 320 85" width="100%" height="75" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="pm25Fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            <line x1="20" y1="20" x2="310" y2="20" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="20" y1="45" x2="310" y2="45" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="20" y1="70" x2="310" y2="70" stroke="#f1f5f9" strokeWidth="1" />

            {/* Y axis labels */}
            <text x="5" y="24" fontSize="8.5" fill="#94a3b8">{chartData.maxVal}</text>
            <text x="10" y="49" fontSize="8.5" fill="#94a3b8">{Math.round(chartData.maxVal / 2)}</text>
            <text x="15" y="74" fontSize="8.5" fill="#94a3b8">0</text>

            {/* PM2.5 Area and Line (Red) */}
            {chartData.fillPath && (
              <path
                d={chartData.fillPath}
                fill="url(#pm25Fill)"
              />
            )}
            {chartData.pm25Path && (
              <path
                d={chartData.pm25Path}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}

            {/* PM10 Line (Orange) */}
            {chartData.pm10Path && (
              <path
                d={chartData.pm10Path}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}

            {/* Pollen Line (Green) */}
            {chartData.pollenPath && (
              <path
                d={chartData.pollenPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}

            {/* Risk Elevated Indicator at Peak Point */}
            {chartData.isElevated && chartData.peakPt && (
              <g>
                <line 
                  x1={chartData.peakPt.x} 
                  y1={12} 
                  x2={chartData.peakPt.x} 
                  y2={70} 
                  stroke="#ef4444" 
                  strokeWidth="1.5" 
                  strokeDasharray="3,3" 
                />
                <circle cx={chartData.peakPt.x} cy={chartData.peakPt.y25} r="3.5" fill="#ef4444" />
                <g transform={`translate(${Math.max(40, Math.min(270, chartData.peakPt.x))}, 10)`}>
                  <rect x="-35" y="-14" width="70" height="15" rx="7.5" fill="#fef2f2" stroke="#fca5a5" strokeWidth="1" />
                  <text x="0" y="-3.5" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="700">Risk elevated</text>
                </g>
              </g>
            )}

            {/* X axis time ticks */}
            <text x="25" y="82" fontSize="8.5" fill="#94a3b8">Past</text>
            <text x="160" y="82" fontSize="8.5" fill="#94a3b8" textAnchor="middle">12h ago</text>
            <text x="300" y="82" fontSize="8.5" fill="#94a3b8" textAnchor="end">Current</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
