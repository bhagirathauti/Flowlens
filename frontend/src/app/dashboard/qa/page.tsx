"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface StageLog {
  id: string;
  stage: string;
  changedAt: string;
  processingTime: number;
}

export interface OrderInfo {
  id: string;
  customerId: string;
  warehouse: string;
  assignedEmployee: string;
  currentStage: string;
  stageTimestamp: string;
  processingTime: number;
  slaStatus: string;
  history?: StageLog[];
}

export interface Complaint {
  id: string;
  orderId: string;
  complaintType: 'WRONG_ITEM' | 'MISSING_ITEM' | 'DAMAGED_ITEM' | 'LATE_DELIVERY';
  warehouse: string;
  deliveryExecutive: string | null;
  rootCause: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  order?: OrderInfo;
}

export interface ComplaintSummary {
  totalComplaints: number;
  openCount: number;
  investigatingCount: number;
  resolvedCount: number;
  resolutionRate: number;
  byType: Record<string, number>;
  byWarehouse: Record<string, number>;
}

export interface RCATraceResult {
  complaintId: string;
  orderId: string;
  complaintType: string;
  responsibleWarehouse: string;
  responsibleStage: string;
  responsibleStageLabel: string;
  responsibleShift: string;
  responsibleEmployee: string;
  confidenceScore: number;
  failureMechanism: string;
  escapePoint: string;
  preventiveRecommendation: string;
  traceTimeline: Array<{
    stage: string;
    employee: string;
    durationMinutes: number;
    timestamp: string;
    shift: string;
    isCulpritStage: boolean;
    isEscapePoint: boolean;
  }>;
}

export interface RCAAnalytics {
  totalComplaintsAnalyzed: number;
  stageFailures: Record<string, number>;
  shiftFailures: Record<string, number>;
  employeeIncidence: Array<{ employeeName: string; count: number; types: string[] }>;
  recurringCauses: Array<{ title: string; count: number; stage: string; recommendation: string }>;
}

export default function QADashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [summary, setSummary] = useState<ComplaintSummary | null>(null);
  const [rcaAnalytics, setRcaAnalytics] = useState<RCAAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'COMPLAINTS_LIST' | 'RCA_INTELLIGENCE'>('COMPLAINTS_LIST');

  // Filters
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [rcaResult, setRcaResult] = useState<RCATraceResult | null>(null);
  const [rcaLoading, setRcaLoading] = useState(false);

  // New Complaint Form
  const [newOrderId, setNewOrderId] = useState('');
  const [newType, setNewType] = useState<'WRONG_ITEM' | 'MISSING_ITEM' | 'DAMAGED_ITEM' | 'LATE_DELIVERY'>('WRONG_ITEM');
  const [newSeverity, setNewSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newWarehouse, setNewWarehouse] = useState('WH-BOSTON-01');
  const [newExecutive, setNewExecutive] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available orders for lookup dropdown
  const [availableOrders, setAvailableOrders] = useState<OrderInfo[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    fetchComplaints();
    fetchSummary();
    fetchRCAAnalytics();
    fetchOrdersList();
  }, [warehouseFilter, typeFilter, statusFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = `http://localhost:5000/api/complaints?warehouse=${warehouseFilter}&complaintType=${typeFilter}&status=${statusFilter}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      } else {
        setErrorMsg('Failed to load complaints list');
      }
    } catch (err) {
      console.error('Fetch complaints error:', err);
      setErrorMsg('Network error connecting to complaints API');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/summary?warehouse=${warehouseFilter}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Fetch summary error:', err);
    }
  };

  const fetchRCAAnalytics = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/rca/analytics?warehouse=${warehouseFilter}`);
      if (res.ok) {
        const data = await res.json();
        setRcaAnalytics(data);
      }
    } catch (err) {
      console.error('Fetch RCA analytics error:', err);
    }
  };

  const fetchOrdersList = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/orders');
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  };

  const handleRunRCA = async (complaintId: string) => {
    try {
      setRcaLoading(true);
      setRcaResult(null);
      const res = await fetch(`http://localhost:5000/api/rca/trace/${complaintId}`);
      if (res.ok) {
        const data = await res.json();
        setRcaResult(data.rcaResult);
      } else {
        setErrorMsg('Failed to execute RCA back-trace');
      }
    } catch (err) {
      console.error('Run RCA error:', err);
      setErrorMsg('Network error during RCA analysis');
    } finally {
      setRcaLoading(false);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderId.trim()) {
      setErrorMsg('Please select or specify an Order ID');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newOrderId.trim(),
          complaintType: newType,
          severity: newSeverity,
          warehouse: newWarehouse,
          deliveryExecutive: newExecutive.trim() || undefined,
          rootCause: newRootCause.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Complaint #${data.complaint.id.slice(0, 8)} registered successfully!`);
        setShowCreateModal(false);
        // Reset form
        setNewOrderId('');
        setNewRootCause('');
        setNewNotes('');
        setNewExecutive('');
        fetchComplaints();
        fetchSummary();
        fetchRCAAnalytics();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message || 'Failed to file complaint');
      }
    } catch (err) {
      console.error('Create complaint error:', err);
      setErrorMsg('Network error while filing complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (complaintId: string, nextStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setComplaints((prev) =>
          prev.map((c) => (c.id === complaintId ? { ...c, status: nextStatus as any } : c))
        );
        fetchSummary();
        if (selectedComplaint && selectedComplaint.id === complaintId) {
          setSelectedComplaint({ ...selectedComplaint, status: nextStatus as any });
        }
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!confirm('Are you sure you want to delete this complaint record?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${complaintId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComplaints((prev) => prev.filter((c) => c.id !== complaintId));
        if (selectedComplaint?.id === complaintId) {
          setSelectedComplaint(null);
        }
        if (rcaResult?.complaintId === complaintId) {
          setRcaResult(null);
        }
        fetchSummary();
        fetchRCAAnalytics();
        setSuccessMsg('Complaint record removed');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportQAReportCSV = () => {
    const header = [
      'Complaint ID',
      'Order ID',
      'Warehouse',
      'Complaint Type',
      'Severity',
      'Status',
      'Root Cause',
      'Logged At'
    ];
    const rows = complaints.map((c) => [
      c.id,
      c.orderId,
      c.warehouse,
      c.complaintType,
      c.severity,
      c.status,
      (c.rootCause || 'Unspecified').replace(/"/g, '""'),
      c.createdAt
    ]);
    const summaryLines = [
      'FlowLens Quality Assurance & RCA Root Cause Report',
      `Generated At: ${new Date().toISOString()}`,
      `Total Complaints: ${summary?.totalComplaints || 0}`,
      `Resolution Rate: ${summary?.resolutionRate || 0}%`,
      '',
      header.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))
    ];
    downloadCSV(summaryLines.join('\n'), `flowlens_qa_rca_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  const typeConfig: Record<string, { label: string; icon: string; bg: string; color: string }> = {
    WRONG_ITEM: { label: 'Wrong Item', icon: '❌', bg: '#FEE2E2', color: '#991B1B' },
    MISSING_ITEM: { label: 'Missing Item', icon: '❓', bg: '#FEF3C7', color: '#92400E' },
    DAMAGED_ITEM: { label: 'Damaged Item', icon: '💥', bg: '#EDE9FE', color: '#6D28D9' },
    LATE_DELIVERY: { label: 'Late Delivery', icon: '⏳', bg: '#DBEAFE', color: '#1E40AF' },
  };

  const severityColors: Record<string, { bg: string; color: string }> = {
    LOW: { bg: '#F1F5F9', color: '#475569' },
    MEDIUM: { bg: '#FEF3C7', color: '#92400E' },
    HIGH: { bg: '#FFEDD5', color: '#C2410C' },
    CRITICAL: { bg: '#FEE2E2', color: '#991B1B' },
  };

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    OPEN: { bg: '#FEE2E2', color: '#991B1B', label: 'Open' },
    INVESTIGATING: { bg: '#FEF3C7', color: '#92400E', label: 'Investigating' },
    RESOLVED: { bg: '#DCFCE7', color: '#166534', label: 'Resolved' },
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', padding: '1.5rem', color: '#0F172A' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#7C3AED',
                display: 'inline-block',
                boxShadow: '0 0 10px rgba(124, 58, 237, 0.4)',
              }}
            ></span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              FR-6 & FR-7 QA & Root Cause Analysis Engine
            </h1>
          </div>
          <p style={{ color: '#64748B', margin: '0.25rem 0 0 1.75rem', fontSize: '0.9rem' }}>
            Logged in as <strong style={{ color: '#0F172A' }}>{user?.name || 'QA Specialist'}</strong> ({user?.role || 'QA_TEAM'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#7C3AED',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.875rem',
              boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>➕</span> Log New Complaint
          </button>
          <button
            onClick={() => router.push('/dashboard/operations')}
            style={{
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            📊 Operations & Bottlenecks
          </button>
          <button
            onClick={() => router.push('/orders')}
            style={{
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            📦 Orders Hub
          </button>
          <button
            onClick={exportQAReportCSV}
            style={{
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            📥 Export Report (CSV)
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            color: '#166534',
            padding: '0.875rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1px solid #86EFAC',
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
            padding: '0.875rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1px solid #FCA5A5',
            fontWeight: 600,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* KPI Analytics Ribbon */}
      {summary && (
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Complaints Filed
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0F172A', marginTop: '0.4rem' }}>
              {summary.totalComplaints}
            </div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Across all recorded orders
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Active / Open Investigations
            </div>
            <div
              style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                color: summary.openCount + summary.investigatingCount > 0 ? '#EF4444' : '#10B981',
                marginTop: '0.4rem',
              }}
            >
              {summary.openCount + summary.investigatingCount}
            </div>
            <div style={{ color: '#991B1B', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 600 }}>
              {summary.openCount} Open • {summary.investigatingCount} Investigating
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Resolution Rate
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#10B981', marginTop: '0.4rem' }}>
              {summary.resolutionRate}%
            </div>
            <div style={{ color: '#10B981', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 600 }}>
              ✓ {summary.resolvedCount} complaints resolved
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Breakdown By Failure Type
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              {Object.keys(typeConfig).map((k) => (
                <span
                  key={k}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    backgroundColor: typeConfig[k]?.bg,
                    color: typeConfig[k]?.color,
                    fontWeight: 700,
                  }}
                >
                  {typeConfig[k]?.icon} {summary.byType[k] || 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Filters Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('COMPLAINTS_LIST')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'COMPLAINTS_LIST' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'COMPLAINTS_LIST' ? '#7C3AED' : '#64748B',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'COMPLAINTS_LIST' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📋 Complaints Registry ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('RCA_INTELLIGENCE')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'RCA_INTELLIGENCE' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'RCA_INTELLIGENCE' ? '#7C3AED' : '#64748B',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'RCA_INTELLIGENCE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🔬 FR-7 Root Cause Intelligence Hub
          </button>
        </div>

        {/* Global Warehouse Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filter Hub:</label>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Warehouses (Global)</option>
            <option value="WH-BOSTON-01">WH-BOSTON-01</option>
            <option value="WH-NYC-02">WH-NYC-02</option>
            <option value="WH-SEATTLE-03">WH-SEATTLE-03</option>
          </select>
        </div>
      </div>

      {/* TAB 1: COMPLAINTS REGISTRY & RCA ACTIONS */}
      {activeTab === 'COMPLAINTS_LIST' && (
        <div>
          {/* Filter and Search Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Category */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>
                  Category:
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    backgroundColor: '#F8FAFC',
                    fontWeight: 600,
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="WRONG_ITEM">❌ Wrong Item</option>
                  <option value="MISSING_ITEM">❓ Missing Item</option>
                  <option value="DAMAGED_ITEM">💥 Damaged Item</option>
                  <option value="LATE_DELIVERY">⏳ Late Delivery</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>
                  Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    backgroundColor: '#F8FAFC',
                    fontWeight: 600,
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search Order ID, courier, cause..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchComplaints()}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  width: '240px',
                }}
              />
              <button
                onClick={fetchComplaints}
                style={{
                  padding: '0.45rem 0.85rem',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Complaints Table */}
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>
              Loading registered complaints and quality records...
            </div>
          ) : complaints.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
                color: '#64748B',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0F172A', fontWeight: 700 }}>No Complaints Recorded</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                All deliveries in this warehouse are meeting quality standards.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  marginTop: '1.25rem',
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ➕ Register Sample Complaint
              </button>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Complaint ID</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Order Ref</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Warehouse</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Severity</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>RCA Engine Diagnostics</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => {
                    const conf = typeConfig[c.complaintType];
                    const sc = statusColors[c.status];
                    const sevc = severityColors[c.severity];

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                          #{c.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#2563EB', fontWeight: 600 }}>{c.orderId.slice(0, 8)}...</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              backgroundColor: conf?.bg,
                              color: conf?.color,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            {conf?.icon} {conf?.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#334155' }}>
                          {c.warehouse}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              backgroundColor: sevc?.bg,
                              color: sevc?.color,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                            }}
                          >
                            {c.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select
                            value={c.status}
                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                            style={{
                              backgroundColor: sc?.bg,
                              color: sc?.color,
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <option value="OPEN">🔴 Open</option>
                            <option value="INVESTIGATING">🟡 Investigating</option>
                            <option value="RESOLVED">🟢 Resolved</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button
                            onClick={() => handleRunRCA(c.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: '#F3E8FF',
                              color: '#6B21A8',
                              border: '1px solid #D8B4FE',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            🔬 Run RCA Trace
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => setSelectedComplaint(c)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              📋 Info
                            </button>
                            <button
                              onClick={() => handleDeleteComplaint(c.id)}
                              style={{
                                padding: '0.3rem 0.5rem',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              🗑️
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
        </div>
      )}

      {/* TAB 2: FR-7 RCA INTELLIGENCE HUB */}
      {activeTab === 'RCA_INTELLIGENCE' && rcaAnalytics && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
              FR-7 Root Cause Vulnerability Intelligence
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Automated correlation of complaints with warehouse workflow history to identify failing stages, vulnerable shifts, and recurring defect mechanisms.
            </p>
          </div>

          {/* Grid of RCA Aggregate Insights */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Stage Culprit Distribution */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
              }}
            >
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                📍 Stage Culprit Distribution
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {Object.keys(rcaAnalytics.stageFailures).map((stageKey) => {
                  const count = rcaAnalytics.stageFailures[stageKey] || 0;
                  const total = rcaAnalytics.totalComplaintsAnalyzed || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={stageKey}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                        <strong style={{ color: '#1E293B' }}>{stageKey}</strong>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{count} faults ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor:
                              stageKey === 'PICKING' ? '#EF4444' : stageKey === 'PACKING' ? '#F59E0B' : '#3B82F6',
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shift Vulnerability */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
              }}
            >
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                ⏰ Shift Quality Vulnerability
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', color: '#991B1B' }}>
                    <span>🌅 Morning Shift (06:00 - 14:00)</span>
                    <span>{rcaAnalytics.shiftFailures.MORNING || 0} defects</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#B91C1C' }}>
                    Peak intake volume period; susceptible to rush picking SKU mismatches.
                  </p>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', color: '#92400E' }}>
                    <span>🌇 Evening Shift (14:00 - 22:00)</span>
                    <span>{rcaAnalytics.shiftFailures.EVENING || 0} defects</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#B45309' }}>
                    High dispatch tempo; carton compression and void fill omissions peak.
                  </p>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                    <span>🌙 Night Shift (22:00 - 06:00)</span>
                    <span>{rcaAnalytics.shiftFailures.NIGHT || 0} defects</span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                    Batch restocking and scheduled replenishment maintenance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recurring Root Cause Patterns & Mitigation */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              🛠️ Identified Recurring Root Cause Patterns & Prevention Protocols
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {rcaAnalytics.recurringCauses.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>
                      {item.stage}
                    </span>
                    <span
                      style={{
                        backgroundColor: '#EDE9FE',
                        color: '#6B21A8',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      {item.count} Incidents
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#0F172A', display: 'block', marginBottom: '0.5rem' }}>
                    {item.title}
                  </strong>
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#1E40AF',
                    }}
                  >
                    <strong>💡 Prevention:</strong> {item.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RCA TRACE DEEP-DIVE MODAL */}
      {rcaResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔬</span>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                    Root Cause Analysis (RCA) Diagnosis
                  </h2>
                </div>
                <p style={{ margin: '0.2rem 0 0 1.8rem', fontSize: '0.85rem', color: '#64748B' }}>
                  Automated historical back-trace for Order #{rcaResult.orderId.slice(0, 8)} ({rcaResult.complaintType})
                </p>
              </div>
              <button
                onClick={() => setRcaResult(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Confidence Score Bar */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                    Diagnostic Confidence Level
                  </span>
                  <span style={{ backgroundColor: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE', padding: '0.1rem 0.45rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800 }}>
                    ⚡ Groq Llama 3.3
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '0.2rem' }}>
                  {rcaResult.confidenceScore}% High Confidence
                </div>
              </div>
              <div
                style={{
                  width: '120px',
                  height: '10px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${rcaResult.confidenceScore}%`,
                    height: '100%',
                    backgroundColor: '#10B981',
                  }}
                ></div>
              </div>
            </div>

            {/* RCA Primary Attribution Matrix */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                  🚨 Responsible Culprit Stage
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991B1B', marginTop: '0.25rem' }}>
                  {rcaResult.responsibleStageLabel}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '0.2rem' }}>
                  Origin point where defect occurred
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                  🔍 Escape Point (Failed Check)
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400E', marginTop: '0.25rem' }}>
                  {rcaResult.escapePoint}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '0.2rem' }}>
                  Audit station where defect was missed
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  ⏰ Responsible Shift
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: '0.25rem' }}>
                  {rcaResult.responsibleShift}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  👤 Staff Involved & Hub
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: '0.25rem' }}>
                  {rcaResult.responsibleEmployee} ({rcaResult.responsibleWarehouse})
                </div>
              </div>
            </div>

            {/* Failure Mechanism & Prevention Strategy */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  ⚙️ How The Failure Occurred (Mechanistic Diagnosis):
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.4' }}>
                  {rcaResult.failureMechanism}
                </div>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', border: '1.5px solid #93C5FD', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1D4ED8', marginBottom: '0.25rem' }}>
                  💡 Corrective & Preventive Action Plan:
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1E40AF', lineHeight: '1.4', fontWeight: 600 }}>
                  {rcaResult.preventiveRecommendation}
                </div>
              </div>
            </div>

            {/* Step-by-step Reconstruction Timeline */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                📜 Reconstructed Workflow Timeline (StageLogs Trace)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rcaResult.traceTimeline.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: item.isCulpritStage
                        ? '#FEF2F2'
                        : item.isEscapePoint
                        ? '#FFFBEB'
                        : '#FFFFFF',
                      border: `1.5px solid ${
                        item.isCulpritStage
                          ? '#F87171'
                          : item.isEscapePoint
                          ? '#FCD34D'
                          : '#E2E8F0'
                      }`,
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: item.isCulpritStage ? '#991B1B' : '#7C3AED',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <strong style={{ color: item.isCulpritStage ? '#991B1B' : '#0F172A' }}>
                        {item.stage}
                      </strong>
                      {item.isCulpritStage && (
                        <span
                          style={{
                            backgroundColor: '#EF4444',
                            color: '#FFFFFF',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '6px',
                          }}
                        >
                          CULPRIT STAGE
                        </span>
                      )}
                      {item.isEscapePoint && (
                        <span
                          style={{
                            backgroundColor: '#F59E0B',
                            color: '#FFFFFF',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '6px',
                          }}
                        >
                          ESCAPE POINT
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748B' }}>
                      {item.durationMinutes} mins • {item.shift}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setRcaResult(null)}
                style={{
                  padding: '0.6rem 1.4rem',
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
                }}
              >
                Close Diagnosis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COMPLAINT MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                📝 Log Customer Order Complaint
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

            <form onSubmit={handleCreateComplaint}>
              {/* Order Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Target Order ID *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter order UUID or choose below"
                    value={newOrderId}
                    onChange={(e) => setNewOrderId(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                    }}
                  />
                  {availableOrders.length > 0 && (
                    <select
                      onChange={(e) => {
                        const sel = availableOrders.find((o) => o.id === e.target.value);
                        if (sel) {
                          setNewOrderId(sel.id);
                          setNewWarehouse(sel.warehouse);
                        }
                      }}
                      style={{
                        padding: '0.55rem 0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        backgroundColor: '#F8FAFC',
                      }}
                    >
                      <option value="">Quick Select...</option>
                      {availableOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id.slice(0, 8)} ({o.customerId} - {o.warehouse})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Complaint Category & Severity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Complaint Category *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="WRONG_ITEM">❌ Wrong Item Delivered</option>
                    <option value="MISSING_ITEM">❓ Missing Item in Package</option>
                    <option value="DAMAGED_ITEM">💥 Damaged / Broken Item</option>
                    <option value="LATE_DELIVERY">⏳ Late Delivery SLA Breach</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Severity Level *
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Warehouse & Delivery Executive */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Warehouse Hub *
                  </label>
                  <select
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="WH-BOSTON-01">WH-BOSTON-01</option>
                    <option value="WH-NYC-02">WH-NYC-02</option>
                    <option value="WH-SEATTLE-03">WH-SEATTLE-03</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Delivery Executive (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Courier / Driver name"
                    value={newExecutive}
                    onChange={(e) => setNewExecutive(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              {/* Root Cause Hypothesis */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Initial Root Cause Hypothesis
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mislabeled barcode in Picking, Seal tape missing in Packing station"
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Customer Notes & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Customer feedback details..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    backgroundColor: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
                  }}
                >
                  {submitting ? 'Registering...' : 'Register Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLAINT DETAILS MODAL */}
      {selectedComplaint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#7C3AED' }}>
                  Complaint Record
                </span>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                  #{selectedComplaint.id.slice(0, 8)} - {typeConfig[selectedComplaint.complaintType]?.label}
                </h2>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: typeConfig[selectedComplaint.complaintType]?.bg,
                  color: typeConfig[selectedComplaint.complaintType]?.color,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {typeConfig[selectedComplaint.complaintType]?.icon} {typeConfig[selectedComplaint.complaintType]?.label}
              </span>
              <span
                style={{
                  backgroundColor: severityColors[selectedComplaint.severity]?.bg,
                  color: severityColors[selectedComplaint.severity]?.color,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                {selectedComplaint.severity} SEVERITY
              </span>
            </div>

            {/* Info Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Order ID: </span>
                  <strong style={{ color: '#0F172A' }}>{selectedComplaint.orderId}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Warehouse: </span>
                  <strong style={{ color: '#0F172A' }}>{selectedComplaint.warehouse}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Delivery Executive: </span>
                  <strong style={{ color: '#0F172A' }}>
                    {selectedComplaint.deliveryExecutive || 'Not assigned'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Logged At: </span>
                  <strong style={{ color: '#0F172A' }}>
                    {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </strong>
                </div>
              </div>

              {selectedComplaint.rootCause && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Root Cause: </span>
                  <div style={{ fontSize: '0.9rem', color: '#991B1B', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedComplaint.rootCause}
                  </div>
                </div>
              )}

              {selectedComplaint.notes && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Notes: </span>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem' }}>
                    {selectedComplaint.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  const cid = selectedComplaint.id;
                  setSelectedComplaint(null);
                  handleRunRCA(cid);
                }}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔬 Run Full RCA Diagnostic
              </button>
              <button
                onClick={() => setSelectedComplaint(null)}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
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
