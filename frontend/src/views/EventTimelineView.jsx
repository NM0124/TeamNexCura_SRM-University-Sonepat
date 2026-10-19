import React, { useState } from 'react';
import { 
  Clock, 
  Activity, 
  Wind, 
  AlertTriangle, 
  Heart, 
  LineChart, 
  UserCheck, 
  Filter, 
  Search, 
  Maximize2, 
  X, 
  Info,
  CheckCircle2
} from 'lucide-react';

export default function EventTimelineView({ 
  patientId, 
  timelineData = [], 
  onRefresh 
}) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filter events based on active category and text query
  const filteredEvents = (timelineData || []).filter(item => {
    if (filterType !== 'all') {
      if (filterType === 'respiratory' && !item.event_type?.includes('respiratory') && !item.badge?.includes('PEF')) return false;
      if (filterType === 'environmental' && !item.event_type?.includes('environmental') && !item.badge?.includes('PM')) return false;
      if (filterType === 'oximeter' && !item.event_type?.includes('oximeter') && !item.badge?.includes('SpO2')) return false;
      if (filterType === 'prediction' && !item.event_type?.includes('prediction') && !item.event_type?.includes('alert')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBadge = item.badge?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchVal = item.value_display?.toLowerCase().includes(q);
      return matchBadge || matchDesc || matchVal;
    }
    return true;
  });

  const getEventIcon = (type, severity) => {
    if (type?.includes('respiratory')) return <Activity size={16} style={{ color: severity === 'critical' ? '#dc2626' : '#d97706' }} />;
    if (type?.includes('environmental')) return <Wind size={16} style={{ color: '#d97706' }} />;
    if (type?.includes('oximeter')) return <Heart size={16} style={{ color: '#dc2626' }} />;
    if (type?.includes('prediction')) return <LineChart size={16} style={{ color: '#2563eb' }} />;
    if (type?.includes('alert')) return <AlertTriangle size={16} style={{ color: '#dc2626' }} />;
    return <Clock size={16} style={{ color: '#64748b' }} />;
  };

  const getBadgeStyle = (severity, type) => {
    if (severity === 'critical') return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
    if (severity === 'warning' || severity === 'high') return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
    if (type?.includes('prediction')) return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown time';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return String(ts);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
      <div className="patient-banner-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Chronological Clinical Event Timeline</span>
              <span className="counter-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                {patientId}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Unified reconstruction of telemetry spikes, spirometry variations, sensor desaturations, and predictive alarms.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="counter-badge" style={{ background: '#f8fafc', color: '#64748b' }}>
            {filteredEvents.length} Recorded Events
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="clinical-card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="pill-tabs">
            <button 
              className={`pill-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Events ({timelineData.length})
            </button>
            <button 
              className={`pill-tab ${filterType === 'respiratory' ? 'active' : ''}`}
              onClick={() => setFilterType('respiratory')}
            >
              Respiratory &amp; Spirometry
            </button>
            <button 
              className={`pill-tab ${filterType === 'environmental' ? 'active' : ''}`}
              onClick={() => setFilterType('environmental')}
            >
              Environmental Exposure
            </button>
            <button 
              className={`pill-tab ${filterType === 'oximeter' ? 'active' : ''}`}
              onClick={() => setFilterType('oximeter')}
            >
              Oximeter SpO₂
            </button>
            <button 
              className={`pill-tab ${filterType === 'prediction' ? 'active' : ''}`}
              onClick={() => setFilterType('prediction')}
            >
              Predictions &amp; Alerts
            </button>
          </div>

          <div className="search-box" style={{ width: '240px', background: '#f8fafc' }}>
            <Search size={14} style={{ color: 'var(--text-light)' }} />
            <input 
              type="text" 
              placeholder="Search event logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Chronological Event Stream */}
      <div className="clinical-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Clock size={16} style={{ color: '#2563eb' }} />
            <span>Synchronized Event Feed</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Showing most recent events first
          </span>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ color: '#cbd5e1', marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>No timeline events recorded</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Advance telemetry simulation steps or trigger environmental changes to generate chronological event associations.
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Vertical timeline rule */}
              <div style={{
                position: 'absolute',
                top: 10,
                bottom: 10,
                left: 7,
                width: 2,
                background: '#e2e8f0',
                borderRadius: 2
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredEvents.map((evt, idx) => {
                  const badgeStyle = getBadgeStyle(evt.severity, evt.event_type);
                  return (
                    <div 
                      key={idx}
                      style={{
                        position: 'relative',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: -24,
                        top: 16,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: evt.severity === 'critical' ? '#dc2626' : evt.severity === 'warning' ? '#d97706' : '#2563eb',
                        border: '3px solid #ffffff',
                        boxShadow: '0 0 0 1px #cbd5e1'
                      }} />

                      {/* Header Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getEventIcon(evt.event_type, evt.severity)}
                          <span style={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: 4, 
                            ...badgeStyle 
                          }}>
                            {evt.badge || evt.event_type}
                          </span>
                          {evt.value_display && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                              {evt.value_display}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatTimestamp(evt.timestamp)}
                          </span>
                          <button
                            className="card-action-link"
                            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                            onClick={() => setSelectedEvent(evt)}
                          >
                            <Maximize2 size={11} />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </div>

                      {/* Description / Content */}
                      <div style={{ fontSize: 12, color: 'var(--text-main)', lineHeight: 1.45 }}>
                        {evt.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Inspection Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {getEventIcon(selectedEvent.event_type, selectedEvent.severity)}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {selectedEvent.badge || 'Event Detail'}
                </span>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Timestamp</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {formatTimestamp(selectedEvent.timestamp)} ({selectedEvent.timestamp})
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Observed Metric</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                  {selectedEvent.value_display || 'N/A'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Clinical Narrative</span>
                <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, margin: '4px 0 0 0' }}>
                  {selectedEvent.description}
                </p>
              </div>

              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: 6, 
                padding: '10px 12px',
                fontSize: 11,
                color: '#64748b'
              }}>
                <strong style={{ color: '#0f172a' }}>Provenance &amp; Attribution:</strong> Chronologically reconstructed from synthetic EHR encounter logs, dynamic IoT ambient sensors, and digital twin state machines. Note: Associations represent empirical temporal order, not confirmed causal etiology.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
