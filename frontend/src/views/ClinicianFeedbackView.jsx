import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  FileText 
} from 'lucide-react';

export default function ClinicianFeedbackView({ patientId, currentPrediction }) {
  const [isUseful, setIsUseful] = useState(true);
  const [alertRelevance, setAlertRelevance] = useState('relevant');
  const [eventOutcome, setEventOutcome] = useState('subsequently_observed');
  const [clinicianName, setClinicianName] = useState('Attending Pulmonologist');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);

  const loadFeedback = async () => {
    try {
      const resp = await fetch(`/api/clinician/feedback?patient_id=${patientId}`);
      if (resp.ok) {
        const data = await resp.json();
        setFeedbackHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/clinician/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          prediction_id: currentPrediction?.prediction_id || 'PRED-CURRENT',
          is_useful: isUseful,
          alert_relevance: alertRelevance,
          event_outcome_verification: eventOutcome,
          clinical_notes: clinicalNotes,
          clinician_name: clinicianName,
          clinician_role: 'Reviewing Clinician'
        })
      });
      if (resp.ok) {
        setIsSubmitted(true);
        setClinicalNotes('');
        loadFeedback();
        setTimeout(() => setIsSubmitted(false), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div className="patient-banner-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="tile-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <UserCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Physician Feedback &amp; Verification Audit</span>
              <span className="counter-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                {clinicianName}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Feedback records are stored separately from ground-truth predictions and raw telemetry.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Feedback Entry Form */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <MessageSquare size={16} style={{ color: '#2563eb' }} />
              <span>Submit Clinical Evaluation</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Useful Toggle */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                Was the 2-Hour Forecast Clinically Useful?
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsUseful(true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + (isUseful ? '#22c55e' : 'var(--border-light)'),
                    background: isUseful ? '#f0fdf4' : '#ffffff',
                    color: isUseful ? '#15803d' : 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <ThumbsUp size={14} /> Useful &amp; Actionable
                </button>
                <button
                  type="button"
                  onClick={() => setIsUseful(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + (!isUseful ? '#ef4444' : 'var(--border-light)'),
                    background: !isUseful ? '#fef2f2' : '#ffffff',
                    color: !isUseful ? '#dc2626' : 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <ThumbsDown size={14} /> Not Useful / Spurious
                </button>
              </div>
            </div>

            {/* Alert Relevance */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                Alert Relevance Assessment:
              </label>
              <select
                value={alertRelevance}
                onChange={(e) => setAlertRelevance(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, background: '#fff' }}
              >
                <option value="relevant">Relevant (Triggered Appropriate Attention)</option>
                <option value="partially_relevant">Partially Relevant (Borderline Indication)</option>
                <option value="false_alarm">False Alarm (No Clinical Justification)</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>

            {/* Event Outcome Verification */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                Subsequent Event Verification:
              </label>
              <select
                value={eventOutcome}
                onChange={(e) => setEventOutcome(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, background: '#fff' }}
              >
                <option value="subsequently_observed">Subsequently Observed (PEF drop confirmed)</option>
                <option value="not_observed">Not Observed (Patient remained stable)</option>
                <option value="unresolved">Unresolved (Awaiting further clinical observations)</option>
              </select>
            </div>

            {/* Doctor Note */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                Pulmonologist Clinical Notes:
              </label>
              <textarea
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Document clinical context, inhaler counseling provided, or review notes..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none' }}
              />
            </div>

            {isSubmitted && (
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> Review record submitted successfully to audit repository.
              </div>
            )}

            <button
              type="submit"
              className="btn-ehr-view"
              style={{ background: '#2563eb', color: '#fff', justifyContent: 'center' }}
            >
              <Send size={13} />
              <span>Submit Doctor Review</span>
            </button>
          </form>
        </div>

        {/* Feedback History Log */}
        <div className="clinical-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Clock size={16} style={{ color: '#2563eb' }} />
              <span>Prior Review Records</span>
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {feedbackHistory.length > 0 ? (
              feedbackHistory.map((fb, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)' }}>
                      {fb.clinician_name} ({fb.clinician_role})
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(fb.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: fb.is_useful ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                    {fb.is_useful ? '✓ Actionable Prediction' : '✗ Marked Not Useful'} • {fb.event_outcome_verification?.replace('_', ' ')}
                  </div>
                  {fb.clinical_notes && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      "{fb.clinical_notes}"
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
                No prior clinician reviews recorded for this virtual patient.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
