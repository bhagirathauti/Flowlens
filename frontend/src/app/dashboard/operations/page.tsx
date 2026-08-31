"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopHeader from '../../../components/TopHeader';

export default function OperationsDashboard() {
  const router = useRouter();
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [metrics, setMetrics] = useState<any>(null);
  const [pipelineRisks, setPipelineRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [warehouseFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, rRes] = await Promise.all([
        fetch(`http://localhost:5000/api/workflow/metrics?warehouse=${warehouseFilter}`),
        fetch(`http://localhost:5000/api/risk/pipeline?warehouse=${warehouseFilter}`),
      ]);
      if (mRes.ok) setMetrics(await mRes.json());
      if (rRes.ok) {
        const rData = await rRes.json();
        setPipelineRisks(rData.assessments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!metrics) return;
    const lines = [
      'FlowLens Dynamic Operations Overview Report',
      `Timestamp: ${new Date().toISOString()}`,
      `Warehouse Filter: ${warehouseFilter}`,
      'Total Orders,In Progress,Avg Prep Time (min),Accuracy (%),Complaints (%),High Risk Orders,Operation Risk (%)',
      `${metrics.totalOrders},${metrics.inProgressCount},${metrics.avgPrepTime},${metrics.accuracy},${metrics.complaintRate},${metrics.highRiskOrdersCount},${metrics.operationRisk}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowlens_operations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Dynamic Pipeline Flow Stages computed from database queue counts & average durations
  const stages = [
    {
      key: 'ORDER_RECEIVED',
      name: 'Received',
      count: metrics?.queueLengths?.ORDER_RECEIVED ?? 0,
      wait: `${metrics?.averageStageDurations?.ORDER_RECEIVED ?? 4.2}m wait`,
      isAlert: (metrics?.queueLengths?.ORDER_RECEIVED ?? 0) > 10,
    },
    {
      key: 'PICKING',
      name: 'Picking',
      count: metrics?.queueLengths?.PICKING ?? 0,
      wait: `${metrics?.averageStageDurations?.PICKING ?? 8.5}m wait`,
      isAlert: (metrics?.queueLengths?.PICKING ?? 0) > 5,
    },
    {
      key: 'PACKING',
      name: 'Packing',
      count: metrics?.queueLengths?.PACKING ?? 0,
      wait: `${metrics?.averageStageDurations?.PACKING ?? 6.0}m wait`,
      isAlert: (metrics?.queueLengths?.PACKING ?? 0) > 5,
    },
    {
      key: 'QUALITY_CHECK',
      name: 'Quality Check',
      count: metrics?.queueLengths?.QUALITY_CHECK ?? 0,
      wait: `${metrics?.averageStageDurations?.QUALITY_CHECK ?? 5.0}m wait`,
      isAlert: (metrics?.queueLengths?.QUALITY_CHECK ?? 0) > 3,
    },
    {
      key: 'DISPATCH',
      name: 'Loading / Dispatch',
      count: metrics?.queueLengths?.DISPATCH ?? 0,
      wait: `${metrics?.averageStageDurations?.DISPATCH ?? 3.5}m wait`,
      isAlert: false,
    },
    {
      key: 'DELIVERY',
      name: 'Delivered',
      count: metrics?.queueLengths?.DELIVERY ?? 0,
      wait: 'Completed',
      isAlert: false,
    },
  ];

  // Dynamic risk percentage and factors
  const operationRiskPct = metrics?.operationRisk ?? 45;
  const highRiskCount = metrics?.highRiskOrdersCount ?? pipelineRisks.filter((r) => r.riskLevel === 'HIGH').length;

  // Real Bottlenecks from analysis
  const bottlenecks = metrics?.bottleneckReport?.bottlenecks || [];

  // Real Alerts
  const activeAlerts = metrics?.activeAlerts || [];

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
              Operations Overview
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
              Real-time live health of {warehouseFilter === 'ALL' ? 'All Warehouses' : warehouseFilter}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={downloadCSV}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#334155',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>📥</span> Export Report
            </button>
            <button
              onClick={() => router.push('/orders')}
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
              }}
            >
              + New Order
            </button>
          </div>
        </div>

        {/* Top 6 KPI Metric Strip (Dynamic Data) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL ORDERS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
              {metrics?.totalOrders ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, marginTop: '0.25rem' }}>Live tracked</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IN PROGRESS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
              {metrics?.inProgressCount ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginTop: '0.25rem' }}>Active queue</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVG PREP TIME</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
              {metrics?.avgPrepTime ?? 0}<span style={{ fontSize: '1rem', fontWeight: 600 }}>m</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, marginTop: '0.25rem' }}>Across stages</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACCURACY</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
              {metrics?.accuracy ?? 100}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, marginTop: '0.25rem' }}>Zero-error rate</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COMPLAINTS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>
              {metrics?.complaintRate ?? 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: (metrics?.totalComplaints ?? 0) > 0 ? '#F59E0B' : '#10B981', fontWeight: 600, marginTop: '0.25rem' }}>
              {metrics?.totalComplaints ?? 0} filed
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: highRiskCount > 0 ? '1px solid #FEE2E2' : '1px solid #E2E8F0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: highRiskCount > 0 ? '#DC2626' : '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HIGH-RISK</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: highRiskCount > 0 ? '#DC2626' : '#10B981', marginTop: '0.35rem' }}>
              {highRiskCount} {highRiskCount > 0 && <span style={{ fontSize: '1rem' }}>⚠️</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: highRiskCount > 0 ? '#DC2626' : '#10B981', fontWeight: 600, marginTop: '0.25rem' }}>
              {highRiskCount > 0 ? 'Action Required' : 'All Clear'}
            </div>
          </div>
        </div>

        {/* Real-Time Workflow Pipeline Section */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: '#0F172A' }}>
                Real-Time Workflow Pipeline
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>Live capacity & order queues across all processing stages</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span> Active</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Queue Alert</span>
            </div>
          </div>

          {/* Flow Cards Line */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
            {stages.map((stg) => (
              <div
                key={stg.name}
                style={{
                  backgroundColor: stg.isAlert ? '#FFFBEB' : '#F8FAFC',
                  border: stg.isAlert ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{stg.name}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stg.isAlert ? '#D97706' : '#0F172A', margin: '0.3rem 0' }}>
                  {stg.count}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{stg.wait}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lower 3 Columns Grid: AI Risk Analysis | Bottleneck Detection | Active Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr 1fr', gap: '1.5rem' }}>
          
          {/* Col 1: Dynamic AI Risk Analysis */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ color: '#EF4444' }}>🎯</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>AI Risk Analysis</h3>
            </div>

            {/* Circular Risk Meter */}
            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
              <div style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                border: `10px solid ${operationRiskPct > 60 ? '#FEE2E2' : '#EFF6FF'}`,
                borderTopColor: operationRiskPct > 60 ? '#EF4444' : '#2563EB',
                borderRightColor: operationRiskPct > 60 ? '#EF4444' : '#2563EB',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A' }}>{operationRiskPct}%</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: operationRiskPct > 60 ? '#EF4444' : '#2563EB', letterSpacing: '0.05em' }}>
                  {operationRiskPct > 60 ? 'HIGH RISK' : 'MODERATE'}
                </span>
              </div>
            </div>

            {/* Primary Factors */}
            <div style={{ marginTop: '0.5rem', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.75rem' }}>PRIMARY FACTORS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#334155' }}>Queue Backlog</span>
                  <strong style={{ color: (metrics?.queueLengths?.PICKING ?? 0) > 2 ? '#EF4444' : '#10B981' }}>
                    +{(metrics?.queueLengths?.PICKING ?? 1) * 8}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#334155' }}>Delayed Orders Impact</span>
                  <strong style={{ color: (metrics?.delays?.totalDelayed ?? 0) > 0 ? '#F59E0B' : '#10B981' }}>
                    +{(metrics?.delays?.totalDelayed ?? 0) * 12}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#334155' }}>Complaint Probability</span>
                  <strong style={{ color: (metrics?.totalComplaints ?? 0) > 0 ? '#EF4444' : '#64748B' }}>
                    +{(metrics?.totalComplaints ?? 0) * 5}%
                  </strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard/risk')}
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.65rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginTop: '1.25rem',
              }}
            >
              👁️ Inspect Risk Orders ({pipelineRisks.length})
            </button>
          </div>

          {/* Col 2: Dynamic Bottleneck Detection */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0F172A' }}>
              Bottleneck Detection
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {bottlenecks.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10B981', backgroundColor: '#ECFDF5', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}>
                  ✅ No critical bottlenecks detected across active stages
                </div>
              ) : (
                bottlenecks.slice(0, 3).map((b: any) => (
                  <div key={b.stage} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          backgroundColor: b.severity === 'CRITICAL' ? '#FEE2E2' : b.severity === 'WARNING' ? '#FEF3C7' : '#EFF6FF',
                          color: b.severity === 'CRITICAL' ? '#DC2626' : b.severity === 'WARNING' ? '#D97706' : '#2563EB',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                        }}>
                          {b.severity}
                        </span>
                        <strong style={{ fontSize: '0.875rem' }}>{b.stageLabel}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>{b.queueCount} orders queued</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: b.severity === 'CRITICAL' ? '#DC2626' : '#D97706' }}>
                        {b.avgDurationMinutes}m avg
                      </div>
                      <button
                        onClick={() => router.push('/dashboard/workflow')}
                        style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.25rem' }}
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Optimization Tip */}
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '0.85rem', display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <span>💡</span>
                <div style={{ fontSize: '0.8rem', color: '#1E40AF', lineHeight: 1.4 }}>
                  <strong>FlowLens Optimization Tip:</strong> {bottlenecks[0]?.suggestedAction || 'All stages operating within optimal SLA limits.'}
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: Dynamic Active Alerts */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Active Alerts</h3>
              <span style={{ backgroundColor: activeAlerts.length > 0 ? '#FEE2E2' : '#ECFDF5', color: activeAlerts.length > 0 ? '#DC2626' : '#059669', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '10px' }}>
                {activeAlerts.length} ACTIVE
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
              {activeAlerts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                  No active warnings in this warehouse.
                </div>
              ) : (
                activeAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    style={{
                      backgroundColor: alert.severity === 'CRITICAL' ? '#FFF5F5' : '#FFFAF0',
                      border: alert.severity === 'CRITICAL' ? '1px solid #FED7D7' : '1px solid #FEEBC8',
                      borderRadius: '10px',
                      padding: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: alert.severity === 'CRITICAL' ? '#C53030' : '#DD6B20', fontWeight: 700, fontSize: '0.85rem' }}>
                      <span>{alert.severity === 'CRITICAL' ? '🚨' : '⚠️'}</span> {alert.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4A5568', marginTop: '0.3rem' }}>
                      {alert.description}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#A0AEC0', marginTop: '0.3rem' }}>{alert.timeAgo}</div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => router.push('/dashboard/qa')}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#475569',
                padding: '0.55rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginTop: '1rem',
              }}
            >
              View QA History
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
