"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface WorkflowMetrics {
  totalOrders: number;
  queueLengths: Record<string, number>;
  averageStageDurations: Record<string, number>;
  employeeWorkloads: Array<{
    employeeName: string;
    activeOrders: number;
    totalProcessed: number;
  }>;
  delays: {
    totalDelayed: number;
    delayedOrders: Array<{
      id: string;
      customerId: string;
      warehouse: string;
      stage: string;
      assignedEmployee: string;
      processingTime: number;
      slaStatus: string;
    }>;
  };
}

export default function OperationsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    fetchMetrics();
  }, [warehouseFilter]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`http://localhost:5000/api/workflow/metrics?warehouse=${warehouseFilter}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      } else {
        setErrorMsg('Failed to load workflow metrics');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setErrorMsg('Network error connecting to telemetry server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  const stageDisplayNames: Record<string, { label: string; icon: string }> = {
    ORDER_RECEIVED: { label: '1. Order Intake', icon: '📥' },
    PICKING: { label: '2. Item Picking', icon: '🛒' },
    PACKING: { label: '3. Packing Station', icon: '📦' },
    QUALITY_CHECK: { label: '4. Quality Audit', icon: '🔍' },
    DISPATCH: { label: '5. Dispatch Hub', icon: '🚛' },
    DELIVERY: { label: '6. In Transit / Delivery', icon: '🏁' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', padding: '1rem' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                display: 'inline-block',
              }}
            ></span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              FR-4 Operations & Workflow Monitor
            </h1>
          </div>
          <p style={{ color: '#64748B', margin: '0.25rem 0 0 1.5rem', fontSize: '0.95rem' }}>
            Logged in as <strong style={{ color: '#0F172A' }}>{user?.name || 'Operations Manager'}</strong> ({user?.role || 'OPERATIONS_MANAGER'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => router.push('/dashboard/warehouse')}
            style={{
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🏢 Warehouses
          </button>
          <button
            onClick={fetchMetrics}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            🔄 Refresh Telemetry
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #FCA5A5',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
          Real-Time Workflow Telemetry
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Filter Hub:</label>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Warehouses</option>
            <option value="WH-BOSTON-01">WH-BOSTON-01</option>
            <option value="WH-NYC-02">WH-NYC-02</option>
            <option value="WH-SEATTLE-03">WH-SEATTLE-03</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>
          Computing stage durations, queue lengths, and SLA delay telemetry...
        </div>
      ) : metrics ? (
        <div>
          {/* Summary KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Active Orders in Pipeline</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563EB', marginTop: '0.5rem' }}>
                {metrics.totalOrders}
              </div>
              <div style={{ color: '#10B981', fontSize: '0.8rem', marginTop: '0.25rem' }}>● Tracking active workflow</div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Processing Delays / At Risk</div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: metrics.delays.totalDelayed > 0 ? '#EF4444' : '#10B981',
                  marginTop: '0.5rem',
                }}
              >
                {metrics.delays.totalDelayed} <span style={{ fontSize: '1rem', fontWeight: 500 }}>orders</span>
              </div>
              <div style={{ color: metrics.delays.totalDelayed > 0 ? '#EF4444' : '#10B981', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {metrics.delays.totalDelayed > 0 ? '⚠️ Action Required' : '✓ SLA Target Normal'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Active Warehouse Workers</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7C3AED', marginTop: '0.5rem' }}>
                {metrics.employeeWorkloads.length}
              </div>
              <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.25rem' }}>Handling active shifts</div>
            </div>
          </div>

          {/* Workflow Stage Pipeline Visualizer */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '1rem' }}>
              Workflow Stage Queues & Average Processing Duration
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '1rem',
              }}
            >
              {Object.keys(stageDisplayNames).map((stageKey) => {
                const stageInfo = stageDisplayNames[stageKey];
                const queueCount = metrics.queueLengths[stageKey] || 0;
                const avgDuration = metrics.averageStageDurations[stageKey] || 0;
                const isHighQueue = queueCount > 5;

                return (
                  <div
                    key={stageKey}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `2px solid ${isHighQueue ? '#F59E0B' : '#E2E8F0'}`,
                      borderRadius: '12px',
                      padding: '1.25rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{stageInfo?.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E293B' }}>{stageInfo?.label}</div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Queue Length
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isHighQueue ? '#D97706' : '#0F172A' }}>
                        {queueCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>orders</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 600 }}>Avg Stage Duration</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2563EB', marginTop: '0.15rem' }}>
                        ⏱️ {avgDuration} mins
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Processing Delays Table */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '1rem' }}>
              Processing Delays & Waiting Time Alerts ({metrics.delays.totalDelayed})
            </h3>
            {metrics.delays.delayedOrders.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                ✓ No processing delays or SLA breaches detected. All workflow stages running on schedule.
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Order ID</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Customer</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Warehouse</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Current Stage</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Processing Duration</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Handling Worker</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>SLA Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.delays.delayedOrders.map((ord) => (
                      <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                          {ord.id.slice(0, 8)}...
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#334155' }}>{ord.customerId}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#334155' }}>{ord.warehouse}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#2563EB', fontWeight: 600 }}>
                          {ord.stage}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#D97706', fontWeight: 700 }}>
                          ⚠️ {ord.processingTime} mins
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#334155' }}>
                          {ord.assignedEmployee || 'Unassigned'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              backgroundColor: ord.slaStatus === 'BREACHED' ? '#FEE2E2' : '#FEF3C7',
                              color: ord.slaStatus === 'BREACHED' ? '#991B1B' : '#92400E',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {ord.slaStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Employee Workload Section */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '1rem' }}>
              Employee Handling & Active Workload Distribution
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {metrics.employeeWorkloads.map((emp) => (
                <div
                  key={emp.employeeName}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>👤 {emp.employeeName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748B' }}>Active Assignments:</span>
                    <strong style={{ color: '#2563EB' }}>{emp.activeOrders} orders</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748B' }}>Total Processed:</span>
                    <strong style={{ color: '#0F172A' }}>{emp.totalProcessed} orders</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
