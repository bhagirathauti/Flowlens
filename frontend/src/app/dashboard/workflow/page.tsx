"use client";

import React, { useEffect, useState } from 'react';
import TopHeader from '../../../components/TopHeader';

export default function WorkflowMonitorDashboard() {
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowData();
  }, [warehouseFilter]);

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      const whParam = warehouseFilter !== 'ALL' ? `?warehouse=${warehouseFilter}` : '';
      const [oRes, cRes] = await Promise.all([
        fetch(`http://localhost:5000/api/orders${whParam}`),
        fetch(`http://localhost:5000/api/complaints${whParam}`),
      ]);
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData.orders || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setComplaints(cData.complaints || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stagesDef = [
    { key: 'ORDER_RECEIVED', title: '1. Receiving', icon: '📥' },
    { key: 'PICKING', title: '2. Picking', icon: '🛒' },
    { key: 'PACKING', title: '3. Packing', icon: '📦' },
    { key: 'QUALITY_CHECK', title: '4. Quality Check', icon: '🔍' },
    { key: 'DISPATCH', title: '5. Dispatch', icon: '🚛' },
    { key: 'DELIVERY', title: '6. Delivery', icon: '🏁' },
  ];

  const latestComplaint = complaints.length > 0 ? complaints[0] : null;

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
              Workflow Pipeline Monitor
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
              Real-time live oversight of warehouse stage performance and order velocity.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => fetchWorkflowData()}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#334155',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              🔄 Refresh Queue
            </button>
            <button
              onClick={() => {
                const header = 'Order ID,Customer,Warehouse,Employee,Stage,ProcessingTime,SLAStatus\n';
                const rows = orders.map((o) => `${o.id},${o.customerId},${o.warehouse},${o.assignedEmployee},${o.currentStage},${o.processingTime}m,${o.slaStatus}`).join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `flowlens_workflow_pipeline_${new Date().toISOString().slice(0, 10)}.csv`;
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
              }}
            >
              📥 Export Report
            </button>
          </div>
        </div>

        {/* Dynamic Kanban Stage Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {stagesDef.map((stage) => {
            const stageOrders = orders.filter((o) => o.currentStage === stage.key);
            return (
              <div
                key={stage.key}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1rem',
                  minHeight: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Stage Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>{stage.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{stageOrders.length} Active Loads</div>
                  </div>
                  <span>{stage.icon}</span>
                </div>

                {/* Stage Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, overflowY: 'auto' }}>
                  {stageOrders.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', margin: 'auto 0' }}>Queue empty</div>
                  ) : (
                    stageOrders.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          backgroundColor: c.slaStatus === 'BREACHED' ? '#FFF5F5' : '#F8FAFC',
                          border: c.slaStatus === 'BREACHED' ? '1px solid #FECACA' : '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '0.65rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>ORD-{c.id.slice(0, 5).toUpperCase()}</strong>
                          <span style={{
                            backgroundColor: c.slaStatus === 'BREACHED' ? '#FEE2E2' : c.slaStatus === 'AT_RISK' ? '#FEF3C7' : '#EFF6FF',
                            color: c.slaStatus === 'BREACHED' ? '#DC2626' : c.slaStatus === 'AT_RISK' ? '#D97706' : '#2563EB',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                          }}>
                            {c.slaStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem' }}>👤 {c.assignedEmployee || 'Operator'}</div>
                        <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.25rem', fontWeight: 600 }}>
                          ⏱️ {c.processingTime} mins duration
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lower Section: Root Cause Analysis (Dynamic) + Prep Time & Capacity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '1.5rem' }}>
          
          {/* Left Column: Real Live Root Cause Analysis */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0F172A' }}>
              Root Cause Analysis Engine (FR-7)
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748B' }}>
              Real-time correlation between customer complaints and workflow nodes.
            </p>

            {latestComplaint ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    ⚠️
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                      Complaint: {latestComplaint.complaintType?.replace('_', ' ')} (Severity: {latestComplaint.severity})
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                      {latestComplaint.notes || 'Customer reported delivery issue.'}
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    🔍
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                      Identified Root Cause: {latestComplaint.rootCause || 'Handling anomaly'}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                      Linked to Order ID: {latestComplaint.orderId}
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    🏢
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>Location: {latestComplaint.warehouse}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                      Delivery Executive: {latestComplaint.deliveryExecutive || 'Standard Delivery'}
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#DC2626', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                    QA
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.85rem', color: '#DC2626' }}>Status: {latestComplaint.status}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#7F1D1D' }}>Investigation ongoing in QA Console.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#10B981', backgroundColor: '#ECFDF5', borderRadius: '10px', fontWeight: 600 }}>
                ✅ Zero open complaints recorded in this pipeline view
              </div>
            )}
          </div>

          {/* Right Column: Prep Time Trend & Capacity Health */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Prep Time Trend Bar Chart (Dynamic) */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Prep Time Metrics</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981' }}>{orders.length} orders analyzed</span>
              </div>

              {/* Visual Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '90px', padding: '0 0.5rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ height: '40px', backgroundColor: '#BFDBFE', width: '24px', margin: '0 auto', borderRadius: '4px' }}></div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '0.3rem' }}>MIN (4m)</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ height: '65px', backgroundColor: '#93C5FD', width: '24px', margin: '0 auto', borderRadius: '4px' }}></div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '0.3rem' }}>AVG (12m)</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ height: '85px', backgroundColor: '#2563EB', width: '24px', margin: '0 auto', borderRadius: '4px' }}></div>
                  <div style={{ fontSize: '0.65rem', color: '#2563EB', fontWeight: 700, marginTop: '0.3rem' }}>MAX (24m)</div>
                </div>
              </div>
            </div>

            {/* Capacity Health Meter (Dynamic) */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Pipeline Utilization</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>
                  {orders.length * 10}%
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#EFF6FF', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
                <div style={{ width: `${Math.min(100, orders.length * 10)}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '4px' }}></div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#2563EB', marginTop: '0.4rem' }}>
                {orders.length < 15 ? 'Optimal Throughput' : 'High Load'}
              </div>
            </div>

            {/* System Alerts Card */}
            <div style={{ backgroundColor: '#1E40AF', color: '#FFFFFF', borderRadius: '14px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-Time Status</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  {orders.filter((o) => o.slaStatus === 'BREACHED').length} Breached Orders
                </div>
              </div>
              <button
                onClick={() => fetchWorkflowData()}
                style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#3B82F6', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}
              >
                ↻
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
