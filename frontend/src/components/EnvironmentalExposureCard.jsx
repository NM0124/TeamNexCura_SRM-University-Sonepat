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

export default function EnvironmentalExposureCard({ currentObservation, onNavigateEnvironmental, city = 'Bengaluru, KA' }) {
  const pm25 = currentObservation?.pm25_ug_m3 || 82;
  const pm10 = currentObservation?.pm10_ug_m3 || 120;
  const temp = currentObservation?.temperature_c || 32;
  const humidity = currentObservation?.humidity_pct || 68;
  const pollenLevel = currentObservation?.pollen_level_0_10 || 7.2;
  const dust = currentObservation?.dust_exposure_level !== undefined ? currentObservation.dust_exposure_level : 1;

  const pollenStatus = pollenLevel >= 6 ? 'High' : pollenLevel >= 3 ? 'Moderate' : 'Low';
  const dustStatus = dust >= 2 ? 'High' : dust === 1 ? 'Moderate' : 'Low';

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
            <text x="5" y="24" fontSize="8.5" fill="#94a3b8">150</text>
            <text x="10" y="49" fontSize="8.5" fill="#94a3b8">75</text>
            <text x="15" y="74" fontSize="8.5" fill="#94a3b8">0</text>

            {/* PM2.5 Area and Line (Red) */}
            <path
              d="M 25 50 Q 80 40 140 28 T 240 18 T 310 32 L 310 70 L 25 70 Z"
              fill="url(#pm25Fill)"
            />
            <path
              d="M 25 50 Q 80 40 140 28 T 240 18 T 310 32"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* PM10 Line (Orange) */}
            <path
              d="M 25 60 Q 80 50 140 38 T 240 28 T 310 42"
              fill="none"
              stroke="#f97316"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Pollen Line (Green) */}
            <path
              d="M 25 68 Q 80 62 140 54 T 240 60 T 310 65"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Vertical Indicator Line at 19:00 with Risk Elevated Callout */}
            <line x1="240" y1="12" x2="240" y2="70" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" />
            <circle cx="240" cy="18" r="3.5" fill="#ef4444" />

            {/* "Risk elevated" pill */}
            <g transform="translate(240, 10)">
              <rect x="-35" y="-14" width="70" height="15" rx="7.5" fill="#fef2f2" stroke="#fca5a5" strokeWidth="1" />
              <text x="0" y="-3.5" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="700">Risk elevated</text>
            </g>

            {/* X axis time ticks */}
            <text x="25" y="82" fontSize="8.5" fill="#94a3b8">00:00</text>
            <text x="95" y="82" fontSize="8.5" fill="#94a3b8">06:00</text>
            <text x="165" y="82" fontSize="8.5" fill="#94a3b8">12:00</text>
            <text x="235" y="82" fontSize="8.5" fill="#94a3b8">18:00</text>
            <text x="295" y="82" fontSize="8.5" fill="#94a3b8">24:00</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
