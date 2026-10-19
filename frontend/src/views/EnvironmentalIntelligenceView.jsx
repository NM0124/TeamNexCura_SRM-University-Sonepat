import React, { useState } from 'react';
import { 
  Wind, 
  Sun, 
  Flower2, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  MapPin, 
  Info, 
  Clock, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function EnvironmentalIntelligenceView({ 
  patientId, 
  currentObservation, 
  triggerData, 
  timelineData,
  selectedCity = 'Bengaluru, KA',
  onChangeCity
}) {
  const [selectedLag, setSelectedLag] = useState('1h');

  const cityProfiles = {
    'Bengaluru, KA': {
      baseline_pm25: 45,
      peak_pm25: 85,
      climate: 'Tropical savanna / Elevated plateau (920m)',
      pollen_profile: 'High (Parthenium & Eucalyptus)',
      winter_risk: 'Low to Moderate',
      primary_sources: 'Vehicular transit, construction dust, tree pollen'
    },
    'Delhi NCR': {
      baseline_pm25: 110,
      peak_pm25: 280,
      climate: 'Semi-arid / Extreme continental winter inversion',
      pollen_profile: 'Moderate',
      winter_risk: 'Severe (Stubble burning & dense fog stagnation)',
      primary_sources: 'Biomass burning, thermal plants, vehicular emissions'
    },
    'Mumbai, MH': {
      baseline_pm25: 42,
      peak_pm25: 75,
      climate: 'Tropical coastal / High relative humidity',
      pollen_profile: 'Low to Moderate',
      winter_risk: 'Moderate coastal stagnation',
      primary_sources: 'Marine aerosols, traffic, port operations'
    },
    'Kolkata, WB': {
      baseline_pm25: 78,
      peak_pm25: 160,
      climate: 'Gangetic plain / High seasonal inversion',
      pollen_profile: 'Moderate',
      winter_risk: 'High nocturnal entrapment',
      primary_sources: 'Solid fuel, industrial transit, dense traffic'
    },
    'Hyderabad, TS': {
      baseline_pm25: 48,
      peak_pm25: 92,
      climate: 'Semi-arid Deccan plateau',
      pollen_profile: 'Moderate',
      winter_risk: 'Moderate',
      primary_sources: 'Urban dust, vehicular corridors, industrial suburbs'
    }
  };

  const currentCityInfo = cityProfiles[selectedCity] || cityProfiles['Bengaluru, KA'];
  const associations = triggerData?.associations || [];
  const primaryTrigger = triggerData?.primary_suspected_trigger || 'PM2.5 Exposure';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* City & Environment Banner */}
      <div className="patient-banner-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <MapPin size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Indian Urban Environmental Intelligence</span>
              <span className="counter-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                {selectedCity}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Micro-climate: {currentCityInfo.climate} • Dominant Triggers: {currentCityInfo.primary_sources}
            </div>
          </div>
        </div>

        {/* City Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>City Preset:</span>
          <select
            value={selectedCity}
            onChange={(e) => onChangeCity && onChangeCity(e.target.value)}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-light)', 
              fontSize: 12, 
              fontWeight: 600,
              color: 'var(--text-main)',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            {Object.keys(cityProfiles).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Innovation A: Personalized Environmental Trigger Fingerprint Card */}
      <div className="clinical-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Wind size={16} style={{ color: '#2563eb' }} />
            <span>Personalized Environmental Trigger Fingerprint (Innovation A)</span>
          </div>

          {/* Lag window selector */}
          <div className="pill-tabs">
            {['30m', '1h', '2h', '6h'].map((lag) => (
              <button
                key={lag}
                className={`pill-tab ${selectedLag === lag ? 'active' : ''}`}
                onClick={() => setSelectedLag(lag)}
              >
                Lag: {lag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Non-causal Summary Banner */}
          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid var(--border-light)', 
            borderRadius: '10px', 
            padding: '12px 16px',
            fontSize: 12.5,
            color: 'var(--text-main)',
            lineHeight: 1.45
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
              <Info size={14} style={{ color: '#2563eb' }} />
              <span>Descriptive Exposure Association</span>
            </div>
            <p>
              {triggerData?.non_causal_summary || 
               `Possible association between elevated PM2.5 exposure (> 50 µg/m³) and subsequent PEF decline within 1-2 hours in this synthetic patient record. Empirical correlation does not establish clinical causation.`}
            </p>
          </div>

          {/* Environmental Trigger Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Environmental Factor</th>
                  <th>Exposure Threshold</th>
                  <th>Evaluated Observations</th>
                  <th>Correlation (Lag {selectedLag})</th>
                  <th>Evidence Level</th>
                  <th>Non-Causal Clinical Association</th>
                </tr>
              </thead>
              <tbody>
                {associations.length > 0 ? (
                  associations.map((assoc, i) => {
                    const lagData = assoc.lag_breakdown?.[selectedLag] || {};
                    const corr = lagData.correlation !== undefined ? lagData.correlation : assoc.peak_correlation;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{assoc.label}</td>
                        <td style={{ color: 'var(--text-muted)' }}>&gt; {assoc.threshold}</td>
                        <td>{assoc.exposure_observations}</td>
                        <td>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: 700, 
                            color: corr > 0.3 ? '#dc2626' : corr > 0.15 ? '#d97706' : '#2563eb' 
                          }}>
                            {corr > 0 ? `+${corr.toFixed(2)}` : corr.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${assoc.evidence_level?.includes('Strong') ? 'high' : assoc.evidence_level?.includes('Moderate') ? 'warning' : 'normal'}`}>
                            {assoc.evidence_level}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 280 }}>
                          {assoc.non_causal_statement}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                      Evaluating continuous longitudinal stream... Minimum 10 observations required for descriptive fingerprinting.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Synchronized Exposure-to-Deterioration Timeline */}
      <div className="clinical-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Clock size={16} style={{ color: '#2563eb' }} />
            <span>Synchronized Exposure-to-Deterioration Timeline</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Showing temporal delay between environmental exposures &amp; subsequent PEF decline
          </span>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {timelineData && timelineData.length > 0 ? (
            timelineData.slice(0, 10).map((event, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 14, 
                  padding: '10px 14px', 
                  background: '#f8fafc', 
                  borderRadius: 10, 
                  border: '1px solid #f1f5f9' 
                }}
              >
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 8, 
                  background: event.event_type === 'respiratory_deterioration' ? '#fef2f2' : event.event_type === 'environmental_exposure' ? '#fff7ed' : '#eff6ff', 
                  color: event.event_type === 'respiratory_deterioration' ? '#dc2626' : event.event_type === 'environmental_exposure' ? '#ea580c' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {event.event_type === 'respiratory_deterioration' ? <Activity size={16} /> :
                   event.event_type === 'environmental_exposure' ? <Wind size={16} /> : <AlertTriangle size={16} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }}>{event.badge}</span>
                      <span className="counter-badge" style={{ fontSize: 10 }}>{event.value_display}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {event.description}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 12.5 }}>
              No recorded exposure or deterioration milestones in selected window.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
