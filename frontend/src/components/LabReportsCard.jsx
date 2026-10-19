import React, { useState } from 'react';
import { ArrowRight, FileText, Activity } from 'lucide-react';

export default function LabReportsCard({ labsData = [], currentObservation, baselineData, onViewHistory }) {
  const [activeTab, setActiveTab] = useState('Recent Labs');

  // Filter 1: Recent Labs (Clinical Serology / Blood tests from FHIR)
  const recentLabs = labsData || [];

  // Filter 2: Spirometry (PEF, FEV1, FVC, FEV1/FVC)
  const spirometryRecords = [];
  if (currentObservation?.peak_flow_pef_l_min) {
    const pb = baselineData?.personal_best_pef || 450;
    spirometryRecords.push({
      test_name: 'Peak Expiratory Flow (PEF)',
      value: currentObservation.peak_flow_pef_l_min,
      unit: 'L/min',
      reference_range: `>= ${Math.round(pb * 0.8)} (Ref ${pb})`,
      status: currentObservation.peak_flow_pef_l_min < pb * 0.8 ? 'low' : 'normal'
    });
  }
  if (currentObservation?.fev1_l) {
    spirometryRecords.push({
      test_name: 'Forced Expiratory Volume (FEV1)',
      value: currentObservation.fev1_l.toFixed(2),
      unit: 'L',
      reference_range: '>= 2.50 L',
      status: currentObservation.fev1_l < 2.5 ? 'low' : 'normal'
    });
  }
  if (currentObservation?.fvc_l) {
    spirometryRecords.push({
      test_name: 'Forced Vital Capacity (FVC)',
      value: currentObservation.fvc_l.toFixed(2),
      unit: 'L',
      reference_range: '>= 3.20 L',
      status: 'normal'
    });
  }
  if (currentObservation?.fev1_fvc_ratio) {
    spirometryRecords.push({
      test_name: 'FEV1 / FVC Ratio',
      value: `${(currentObservation.fev1_fvc_ratio * 100).toFixed(0)}%`,
      unit: 'ratio',
      reference_range: '>= 75%',
      status: currentObservation.fev1_fvc_ratio < 0.75 ? 'low' : 'normal'
    });
  }

  // Filter 3: All Reports (Combined laboratory and spirometry tests)
  const allReports = [...recentLabs, ...spirometryRecords];

  const getActiveRecords = () => {
    if (activeTab === 'Recent Labs') return recentLabs;
    if (activeTab === 'Spirometry') return spirometryRecords;
    return allReports;
  };

  const records = getActiveRecords();

  return (
    <div className="clinical-card">
      <div className="card-header-bar">
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-main)' }}>
          Lab Reports
        </span>
        <button className="card-action-link" onClick={() => onViewHistory && onViewHistory()}>
          <span>View Full EHR</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <div className="pill-tabs">
          {['Recent Labs', 'Spirometry', 'All Reports'].map((tab) => (
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

      <div style={{ overflowX: 'auto', flex: 1 }}>
        {records.length > 0 ? (
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Test / Diagnostic</th>
                <th>Value</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 6).map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{item.test_name}</td>
                  <td>
                    <strong>{item.value}</strong>{' '}
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{item.unit}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.reference_range}</td>
                  <td>
                    <span className={`status-pill ${item.status || 'normal'}`}>
                      {item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1)) : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div>No {activeTab.toLowerCase()} records documented for this patient.</div>
          </div>
        )}
      </div>
    </div>
  );
}
