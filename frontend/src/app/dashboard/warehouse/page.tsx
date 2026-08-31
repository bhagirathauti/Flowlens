"use client";

import React, { useEffect, useState } from 'react';
import TopHeader from '../../../components/TopHeader';

export default function WarehousePerformanceDashboard() {
  const [activeTab, setActiveTab] = useState<'REALTIME' | 'HISTORICAL'>('REALTIME');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [performanceCards, setPerformanceCards] = useState<any[]>([]);
  const [slaHeatmap, setSlaHeatmap] = useState<any[]>([]);
  const [throughputs, setThroughputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedWhForEdit, setSelectedWhForEdit] = useState<any | null>(null);
  const [statusToSet, setStatusToSet] = useState<string>('ACTIVE');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchWarehousePerformance();
  }, [warehouseFilter]);

  const fetchWarehousePerformance = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/warehouses/performance/analytics');
      if (res.ok) {
        const data = await res.json();
        setPerformanceCards(data.performanceCards || []);
        setSlaHeatmap(data.slaHeatmap || []);
        setThroughputs(data.throughputs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWarehouseStatus = async (whId: string, status: string, whName: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/warehouses/${whId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setActionMsg(`✅ ${whName} status updated to ${status}`);
        setTimeout(() => setActionMsg(''), 4000);
        setSelectedWhForEdit(null);
        await fetchWarehousePerformance();
      }
    } catch (err) {
      console.error('Failed to update warehouse status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getHeatmapColor = (val: string) => {
    const num = parseInt(val, 10);
    if (num >= 95) return { bg: '#1D4ED8', text: '#FFFFFF' };
    if (num >= 90) return { bg: '#3B82F6', text: '#FFFFFF' };
    if (num >= 85) return { bg: '#60A5FA', text: '#FFFFFF' };
    if (num >= 80) return { bg: '#93C5FD', text: '#1E3A8A' };
    return { bg: '#BFDBFE', text: '#1E3A8A' };
  };

  const filteredCards = performanceCards.filter((c) =>
    warehouseFilter === 'ALL' || c.name === warehouseFilter
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <TopHeader
        warehouseFilter={warehouseFilter}
        onWarehouseChange={setWarehouseFilter}
      />

      <div style={{ padding: '1.75rem 2rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0F172A' }}>
              Warehouse Performance
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
              {/* Tab selector */}
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
                <button
                  onClick={() => setActiveTab('REALTIME')}
                  style={{
                    backgroundColor: activeTab === 'REALTIME' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'REALTIME' ? '#0F172A' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'REALTIME' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Real-time
                </button>
                <button
                  onClick={() => setActiveTab('HISTORICAL')}
                  style={{
                    backgroundColor: activeTab === 'HISTORICAL' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'HISTORICAL' ? '#0F172A' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Historical
                </button>
              </div>

              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Region: <strong>All Global</strong></span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Shift: <strong>Live Shifts</strong></span>
            </div>
          </div>

          <button
            onClick={() => {
              const header = 'Warehouse,Capacity,Score,PrepTime,Accuracy,Complaints\n';
              const rows = performanceCards.map((w) => `${w.name},${w.capacity},${w.score},${w.prepTime},${w.accuracy},${w.complaints}`).join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `flowlens_warehouse_performance_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            style={{
              backgroundColor: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>📥</span> Export Report
          </button>
        </div>

        {actionMsg && (
          <div style={{ backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {actionMsg}
          </div>
        )}

        {/* Dynamic Warehouse Performance Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {filteredCards.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>No warehouses match selection</div>
          ) : (
            filteredCards.map((wh) => (
              <div
                key={wh.name}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* Card Title & Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#0F172A' }}>
                      {wh.name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{wh.location} • {wh.zoneCount} Zones</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.7rem', color: wh.statusColor, fontWeight: 700 }}>
                        ● {wh.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedWhForEdit(wh);
                          setStatusToSet(wh.status || 'ACTIVE');
                        }}
                        style={{
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#1D4ED8',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Edit Warehouse Status"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563EB', lineHeight: 1.1, marginTop: '0.2rem' }}>{wh.score}</div>
                  </div>
                </div>

                {/* Load & Capacity Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Capacity Utilization</div>
                    <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{wh.capacity}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Current Flow</div>
                    <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{wh.currentLoad}</strong>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Mean Prep Time</span>
                    <strong style={{ color: '#0F172A' }}>{wh.prepTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Packing Accuracy</span>
                    <strong style={{ color: '#0F172A' }}>{wh.accuracy}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Complaint Rate</span>
                    <strong style={{ color: '#0F172A' }}>{wh.complaints}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 24-hr SLA Compliance Matrix */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0F172A' }}>
            24-hr SLA Compliance Heatmap Matrix
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748B' }}>
            Percentage compliance of 10-minute maximum stage processing threshold aggregated hourly.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Facility</th>
                  {['00-04h', '04-08h', '08-12h', '12-16h', '16-20h', '20-24h'].map((b) => (
                    <th key={b} style={{ padding: '0.5rem', fontWeight: 600 }}>{b}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaHeatmap.map((row) => (
                  <tr key={row.facility} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 600, color: '#334155' }}>
                      {row.facility}
                    </td>
                    {[row.h1, row.h2, row.h3, row.h4, row.h5, row.h6].map((val, idx) => {
                      const color = getHeatmapColor(val);
                      return (
                        <td key={idx} style={{ padding: '0.4rem' }}>
                          <span
                            style={{
                              backgroundColor: color.bg,
                              color: color.text,
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              display: 'inline-block',
                              minWidth: '45px',
                            }}
                          >
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Order Throughput Comparison */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0F172A' }}>
            Real-Time Order Throughput Comparison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {throughputs.map((tp) => (
              <div key={tp.facility}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{tp.facility}</span>
                  <strong style={{ color: '#2563EB' }}>{tp.actual} / {tp.target} orders/hr</strong>
                </div>
                <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${tp.percentage}%`,
                      height: '100%',
                      backgroundColor: tp.percentage >= 90 ? '#10B981' : tp.percentage >= 70 ? '#2563EB' : '#F59E0B',
                      borderRadius: '4px',
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Edit Warehouse Status Modal */}
      {selectedWhForEdit && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#0F172A' }}>
                  ✏️ Edit Warehouse Status
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                  {selectedWhForEdit.name} ({selectedWhForEdit.location})
                </p>
              </div>
              <button
                onClick={() => setSelectedWhForEdit(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              {[
                {
                  value: 'ACTIVE',
                  title: '🟢 ACTIVE (Operational)',
                  desc: 'Facility is online, accepting incoming intake, active picking & live order dispatch.',
                  bg: statusToSet === 'ACTIVE' ? '#ECFDF5' : '#F8FAFC',
                  border: statusToSet === 'ACTIVE' ? '#10B981' : '#E2E8F0',
                  color: '#065F46',
                },
                {
                  value: 'MAINTENANCE',
                  title: '🟡 MAINTENANCE (Offline / Servicing)',
                  desc: 'Facility temporarily paused for equipment repairs, belt calibration, or system audit.',
                  bg: statusToSet === 'MAINTENANCE' ? '#FEFCE8' : '#F8FAFC',
                  border: statusToSet === 'MAINTENANCE' ? '#F59E0B' : '#E2E8F0',
                  color: '#92400E',
                },
                {
                  value: 'INACTIVE',
                  title: '🔴 INACTIVE (Decommissioned)',
                  desc: 'Facility closed or retired from the active order distribution network.',
                  bg: statusToSet === 'INACTIVE' ? '#FEF2F2' : '#F8FAFC',
                  border: statusToSet === 'INACTIVE' ? '#EF4444' : '#E2E8F0',
                  color: '#991B1B',
                },
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setStatusToSet(opt.value)}
                  style={{
                    backgroundColor: opt.bg,
                    border: `2px solid ${opt.border}`,
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: opt.color }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                    {opt.desc}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedWhForEdit(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateWarehouseStatus(selectedWhForEdit.id, statusToSet, selectedWhForEdit.name)}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '6px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                }}
              >
                {actionLoading ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
