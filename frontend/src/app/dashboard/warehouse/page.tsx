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
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.35rem' }}>
              {/* Tab Pills */}
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '0.2rem', borderRadius: '6px' }}>
                <button
                  onClick={() => setActiveTab('REALTIME')}
                  style={{
                    backgroundColor: activeTab === 'REALTIME' ? '#2563EB' : 'transparent',
                    color: activeTab === 'REALTIME' ? '#FFF' : '#64748B',
                    border: 'none',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Real-time
                </button>
                <button
                  onClick={() => setActiveTab('HISTORICAL')}
                  style={{
                    backgroundColor: activeTab === 'HISTORICAL' ? '#2563EB' : 'transparent',
                    color: activeTab === 'HISTORICAL' ? '#FFF' : '#64748B',
                    border: 'none',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
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
                    <div style={{ fontSize: '0.7rem', color: wh.statusColor, fontWeight: 700 }}>{wh.status}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563EB', lineHeight: 1.1 }}>{wh.score}</div>
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

        {/* Lower Grid: SLA Compliance Heatmap & Throughput Comparison (Dynamic) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '1.5rem' }}>
          
          {/* Left: Dynamic SLA Compliance Heatmap Table */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#0F172A' }}>
              SLA Compliance Matrix
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748B' }}>
              Hourly performance against 4-hour fulfillment target
            </p>

            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: '#64748B', fontSize: '0.75rem' }}>
                  <th style={{ textAlign: 'left', padding: '0.4rem', fontWeight: 600 }}>Warehouse</th>
                  <th style={{ padding: '0.4rem', fontWeight: 600 }}>00:00 - 04:00</th>
                  <th style={{ padding: '0.4rem', fontWeight: 600 }}>04:00 - 08:00</th>
                  <th style={{ padding: '0.4rem', fontWeight: 600 }}>08:00 - 12:00</th>
                  <th style={{ padding: '0.4rem', fontWeight: 600 }}>12:00 - 16:00</th>
                  <th style={{ padding: '0.4rem', fontWeight: 600 }}>16:00 - 20:00</th>
                  <th style={{ padding: '0.4rem', fontWeight: 600 }}>20:00 - 24:00</th>
                </tr>
              </thead>
              <tbody>
                {slaHeatmap.map((row) => (
                  <tr key={row.fullName || row.hub}>
                    <td style={{ textAlign: 'left', fontWeight: 700, padding: '0.4rem', color: '#0F172A' }}>{row.hub}</td>
                    {[row.b1, row.b2, row.b3, row.b4, row.b5, row.b6].map((b, bIdx) => {
                      const colors = getHeatmapColor(b);
                      return (
                        <td
                          key={bIdx}
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            padding: '0.6rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}
                        >
                          {b}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: Dynamic Throughput Comparison */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: '#0F172A' }}>
              Throughput Comparison
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', flex: 1 }}>
              {throughputs.map((item) => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{item.name}</span>
                    <strong style={{ color: '#0F172A' }}>{item.val}</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trend Footer */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Live Database Telemetry</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10B981', marginTop: '0.2rem' }}>
                All {performanceCards.length} facilities connected
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
