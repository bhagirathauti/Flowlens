"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OrderLifecycle, { Order, ORDER_STAGES } from '../../components/OrderLifecycle';
import AppShell from '../../components/AppShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const STAGE_LABELS: Record<string, { name: string; icon: string }> = {
  ORDER_RECEIVED: { name: 'Order Intake', icon: '📥' },
  PICKING: { name: 'Picking', icon: '🛒' },
  PACKING: { name: 'Packing', icon: '📦' },
  QUALITY_CHECK: { name: 'Quality Check', icon: '🔍' },
  DISPATCH: { name: 'Dispatch Hub', icon: '🚛' },
  DELIVERY: { name: 'Delivered', icon: '🏁' },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');

  // Modals & Selected Order
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerId: '',
    warehouse: 'Central Grocery Hub - North',
    assignedEmployee: '',
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const params = new URLSearchParams();
      if (warehouseFilter !== 'ALL') params.append('warehouse', warehouseFilter);
      if (stageFilter !== 'ALL') params.append('stage', stageFilter);
      if (slaFilter !== 'ALL') params.append('slaStatus', slaFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`${API_BASE}/api/orders?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch orders from server');
      }

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Network error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [warehouseFilter, stageFilter, slaFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newOrder.customerId.trim()) {
      setErrorMsg('Customer ID is required');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      setSuccessMsg(`Order ${data.order.id} registered into workflow!`);
      setShowCreateModal(false);
      setNewOrder({
        customerId: '',
        warehouse: 'Central Grocery Hub - North',
        assignedEmployee: '',
      });
      fetchOrders();
      setSelectedOrderId(data.order.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg('Order removed.');
        if (selectedOrderId === orderId) setSelectedOrderId(null);
        fetchOrders();
      }
    } catch (err) {
      setErrorMsg('Failed to delete order');
    }
  };

  // Summary KPI computations
  const totalOrders = orders.length;
  const activeInPipeline = orders.filter((o) => o.currentStage !== 'DELIVERY').length;
  const delayedOrRisk = orders.filter(
    (o) => o.slaStatus === 'BREACHED' || o.slaStatus === 'AT_RISK'
  ).length;
  const deliveredOrders = orders.filter((o) => o.currentStage === 'DELIVERY').length;

  return (
    <AppShell>
      <div
        style={{
          padding: '2rem',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                display: 'inline-block',
              }}
            ></span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              FR-3 Order Lifecycle Tracking Hub
            </h1>
          </div>
          <p style={{ color: '#64748B', margin: '0.25rem 0 0 1.75rem', fontSize: '0.95rem' }}>
            End-to-end warehouse stage monitoring, SLA metrics, and stage transitions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => router.push('/dashboard/operations')}
            style={{
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📊 Operations Monitor
          </button>
          <button
            onClick={() => router.push('/dashboard/warehouse')}
            style={{
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🏢 Warehouses
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
            }}
          >
            + New Order
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            backgroundColor: '#DEF7EC',
            color: '#03543F',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #A7F3D0',
            fontWeight: 600,
          }}
        >
          ✓ {successMsg}
        </div>
      )}
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
          ⚠️ {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>Total Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginTop: '0.4rem' }}>
            {totalOrders}
          </div>
          <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.2rem' }}>All-time registered</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>Active in Pipeline</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563EB', marginTop: '0.4rem' }}>
            {activeInPipeline}
          </div>
          <div style={{ color: '#3B82F6', fontSize: '0.75rem', marginTop: '0.2rem' }}>Stages 1 - 5 in progress</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>SLA At Risk / Breached</div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: delayedOrRisk > 0 ? '#EF4444' : '#10B981',
              marginTop: '0.4rem',
            }}
          >
            {delayedOrRisk}
          </div>
          <div style={{ color: delayedOrRisk > 0 ? '#EF4444' : '#10B981', fontSize: '0.75rem', marginTop: '0.2rem' }}>
            {delayedOrRisk > 0 ? '⚠️ Action Required' : '✓ Normal Operations'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>Delivered Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', marginTop: '0.4rem' }}>
            {deliveredOrders}
          </div>
          <div style={{ color: '#10B981', fontSize: '0.75rem', marginTop: '0.2rem' }}>✓ Lifecycle Complete</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            placeholder="Search by Order ID, Customer ID, Worker, Warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Warehouses</option>
              <option value="Central Grocery Hub - North">Central Grocery Hub - North</option>
              <option value="Metro Fulfillment Hub - South">Metro Fulfillment Hub - South</option>
            </select>
          </div>

          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Stages</option>
              {ORDER_STAGES.map((stg) => (
                <option key={stg} value={stg}>
                  {STAGE_LABELS[stg]?.icon} {STAGE_LABELS[stg]?.name || stg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All SLA Statuses</option>
              <option value="ON_TIME">🟢 On Time</option>
              <option value="AT_RISK">🟡 At Risk</option>
              <option value="BREACHED">🔴 Breached</option>
            </select>
          </div>

          <button
            onClick={fetchOrders}
            style={{
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>
          Loading order lifecycle telemetry...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px border-dashed #CBD5E1',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#64748B',
          }}
        >
          No orders found matching your filter criteria. Click "+ New Order" to register one.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  Order ID
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  Customer
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  Warehouse
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  Assigned Employee
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  Current Stage
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  Processing Time
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  SLA Status
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  🤖 AI Risk Score
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600, textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const stageInfo = STAGE_LABELS[ord.currentStage];
                const isDelivered = ord.currentStage === 'DELIVERY';
                const score = ord.riskScore ?? 0;
                const riskLevel = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

                return (
                  <tr
                    key={ord.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                      <span style={{ fontFamily: 'monospace', color: '#2563EB' }}>{ord.id.slice(0, 8)}...</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      {ord.customerId}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                      {ord.warehouse}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155' }}>
                      👤 {ord.assignedEmployee || 'Unassigned'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          backgroundColor: isDelivered ? '#DEF7EC' : '#EFF6FF',
                          color: isDelivered ? '#03543F' : '#1D4ED8',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>{stageInfo?.icon}</span>
                        <span>{stageInfo?.name || ord.currentStage}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                      ⏱️ {ord.processingTime} mins
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          backgroundColor:
                            ord.slaStatus === 'BREACHED'
                              ? '#FEE2E2'
                              : ord.slaStatus === 'AT_RISK'
                              ? '#FEF3C7'
                              : '#DEF7EC',
                          color:
                            ord.slaStatus === 'BREACHED'
                              ? '#991B1B'
                              : ord.slaStatus === 'AT_RISK'
                              ? '#92400E'
                              : '#03543F',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {ord.slaStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          backgroundColor:
                            riskLevel === 'HIGH' ? '#FEE2E2' : riskLevel === 'MEDIUM' ? '#FEF3C7' : '#DEF7EC',
                          color:
                            riskLevel === 'HIGH' ? '#991B1B' : riskLevel === 'MEDIUM' ? '#92400E' : '#03543F',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        {score}/100 ({riskLevel})
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setSelectedOrderId(ord.id)}
                          style={{
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🔍 Track Lifecycle
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            border: '1px solid #FCA5A5',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                          title="Delete Order"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Order Lifecycle Modal */}
      {selectedOrderId && (
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
          <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <OrderLifecycle
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
              onStageUpdated={() => fetchOrders()}
            />
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
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
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '2rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0F172A', fontWeight: 800 }}>
                Register New Order
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
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
            <form onSubmit={handleCreateOrder}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Customer ID / Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-8492"
                  value={newOrder.customerId}
                  onChange={(e) => setNewOrder({ ...newOrder, customerId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Warehouse Hub
                </label>
                <select
                  value={newOrder.warehouse}
                  onChange={(e) => setNewOrder({ ...newOrder, warehouse: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Central Grocery Hub - North">Central Grocery Hub - North</option>
                  <option value="Metro Fulfillment Hub - South">Metro Fulfillment Hub - South</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Assigned Employee (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={newOrder.assignedEmployee}
                  onChange={(e) => setNewOrder({ ...newOrder, assignedEmployee: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Register Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
