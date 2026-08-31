"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopHeader from '../../../components/TopHeader';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATIONS_MANAGER' | 'WAREHOUSE_SUPERVISOR' | 'QA_TEAM';
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  type: 'RECEIVING' | 'PICKING' | 'PACKING' | 'QUALITY_CHECK' | 'DISPATCH' | 'STORAGE';
  capacity: number;
  isActive: boolean;
  createdAt: string;
}

export interface WarehouseItem {
  id: string;
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  zones: WarehouseZone[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  uptime: number;
  timestamp: string;
  metrics: {
    totalUsers: number;
    totalWarehouses: number;
    totalOrders: number;
    activeOrders: number;
    totalComplaints: number;
    dbEngine: string;
    nodeVersion: string;
  };
}

const ROLE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  OPERATIONS_MANAGER: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  WAREHOUSE_SUPERVISOR: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  QA_TEAM: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
};

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  MAINTENANCE: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  INACTIVE: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  
  // Data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Tabs & filters
  const [activeTab, setActiveTab] = useState<'USERS' | 'WAREHOUSES' | 'HEALTH' | 'REPORTS'>('USERS');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [whSearch, setWhSearch] = useState('');

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', role: 'WAREHOUSE_SUPERVISOR' });
  const [showCreateWhModal, setShowCreateWhModal] = useState(false);
  const [newWhForm, setNewWhForm] = useState({ name: '', location: '', capacity: 500, status: 'ACTIVE' });
  const [selectedWhForZone, setSelectedWhForZone] = useState<WarehouseItem | null>(null);
  const [newZoneForm, setNewZoneForm] = useState({ name: '', code: '', type: 'PICKING', capacity: 100 });
  const [selectedWhForEditStatus, setSelectedWhForEditStatus] = useState<WarehouseItem | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<string>('ACTIVE');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error(e);
      }
    }
    loadAllData();
  }, []);

  const showNotify = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchWarehouses(), fetchHealth()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setRoleCounts(data.roleCounts || {});
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/system-health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showNotify('success', `Role updated to ${newRole.replace('_', ' ')}`);
        await fetchUsers();
      } else {
        const err = await res.json();
        showNotify('error', err.error || 'Failed to update role');
      }
    } catch (err) {
      showNotify('error', 'Network error updating user role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove user "${userName}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotify('success', `User ${userName} deleted successfully`);
        await fetchUsers();
      } else {
        const err = await res.json();
        showNotify('error', err.error || 'Failed to delete user');
      }
    } catch (err) {
      showNotify('error', 'Network error deleting user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });
      if (res.ok) {
        showNotify('success', `User ${newUserForm.name} registered successfully`);
        setShowCreateUserModal(false);
        setNewUserForm({ name: '', email: '', password: '', role: 'WAREHOUSE_SUPERVISOR' });
        await fetchUsers();
      } else {
        const err = await res.json();
        showNotify('error', err.message || err.error || 'Failed to create user');
      }
    } catch (err) {
      showNotify('error', 'Network error creating user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWhForm),
      });
      if (res.ok) {
        showNotify('success', `Warehouse ${newWhForm.name} registered successfully`);
        setShowCreateWhModal(false);
        setNewWhForm({ name: '', location: '', capacity: 500, status: 'ACTIVE' });
        await fetchWarehouses();
      } else {
        const err = await res.json();
        showNotify('error', err.error || 'Failed to create warehouse');
      }
    } catch (err) {
      showNotify('error', 'Network error creating warehouse');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWarehouseStatusDirect = async (whId: string, status: string, whName?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/warehouses/${whId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showNotify('success', `${whName || 'Warehouse'} status updated to ${status}`);
        setSelectedWhForEditStatus(null);
        await fetchWarehouses();
      } else {
        const err = await res.json();
        showNotify('error', err.error || 'Failed to update warehouse status');
      }
    } catch (err) {
      showNotify('error', 'Network error updating warehouse status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWarehouseStatus = async (wh: WarehouseItem) => {
    const nextStatus = wh.status === 'ACTIVE' ? 'MAINTENANCE' : wh.status === 'MAINTENANCE' ? 'INACTIVE' : 'ACTIVE';
    await handleUpdateWarehouseStatusDirect(wh.id, nextStatus, wh.name);
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhForZone) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/warehouses/${selectedWhForZone.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newZoneForm),
      });
      if (res.ok) {
        showNotify('success', `Zone ${newZoneForm.name} added to ${selectedWhForZone.name}`);
        setSelectedWhForZone(null);
        setNewZoneForm({ name: '', code: '', type: 'PICKING', capacity: 100 });
        await fetchWarehouses();
      } else {
        const err = await res.json();
        showNotify('error', err.error || 'Failed to add zone');
      }
    } catch (err) {
      showNotify('error', 'Network error adding zone');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const exportUsersCSV = () => {
    const header = ['User ID', 'Name', 'Email', 'Role', 'Created At'];
    const rows = users.map((u) => [u.id, u.name, u.email, u.role, u.createdAt]);
    const csvContent = [header.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    downloadCSV(csvContent, `flowlens_users_${new Date().toISOString().slice(0, 10)}.csv`);
    showNotify('success', 'User directory exported to CSV');
  };

  const exportWarehousesCSV = () => {
    const header = ['Warehouse ID', 'Name', 'Location', 'Capacity', 'Status', 'Zone Count', 'Zones'];
    const rows = warehouses.map((w) => [
      w.id,
      w.name,
      w.location,
      w.capacity,
      w.status,
      w.zones?.length || 0,
      (w.zones || []).map((z) => `${z.name}(${z.type})`).join('; '),
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    downloadCSV(csvContent, `flowlens_warehouses_${new Date().toISOString().slice(0, 10)}.csv`);
    showNotify('success', 'Warehouse topology exported to CSV');
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredWarehouses = warehouses.filter((w) => {
    return (
      w.name.toLowerCase().includes(whSearch.toLowerCase()) ||
      w.location.toLowerCase().includes(whSearch.toLowerCase())
    );
  });

  const totalZones = warehouses.reduce((acc, w) => acc + (w.zones?.length || 0), 0);
  const totalCapacity = warehouses.reduce((acc, w) => acc + (w.capacity || 0), 0);

  // RBAC Access Restriction View if user is not ADMIN
  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
        <TopHeader />
        <div style={{ padding: '4rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #FECACA', borderRadius: '16px', padding: '2.5rem', maxWidth: '480px', textAlign: 'center', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️ 🚫</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', margin: '0 0 0.5rem 0' }}>
              Access Restricted (RBAC)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              The <strong>Admin Hub</strong> is restricted to users with the <strong>ADMIN</strong> role. Your current role is <strong style={{ color: '#2563EB' }}>{currentUser.role.replace('_', ' ')}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  const adminUser = { name: 'Arthur Vance', email: 'admin@flowlens.com', role: 'ADMIN' };
                  localStorage.setItem('user', JSON.stringify(adminUser));
                  setCurrentUser(adminUser);
                  window.dispatchEvent(new Event('storage'));
                }}
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Switch to Admin Role
              </button>
              <button
                onClick={() => router.push('/dashboard/operations')}
                style={{ backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #E2E8F0', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Operations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <TopHeader />

      <div style={{ padding: '1.75rem 2rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0F172A' }}>
              Admin Governance & Topology Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
              Platform Master Control, Role-Based Access Governance & Topology Management
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                if (activeTab === 'USERS') setShowCreateUserModal(true);
                else if (activeTab === 'WAREHOUSES') setShowCreateWhModal(true);
                else exportUsersCSV();
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
              <span>➕</span> {activeTab === 'WAREHOUSES' ? 'Register Warehouse' : 'Add New User'}
            </button>
          </div>
        </div>

        {/* Notifications banner */}
        {notification && (
          <div style={{
            backgroundColor: notification.type === 'success' ? '#ECFDF5' : notification.type === 'error' ? '#FEF2F2' : '#EFF6FF',
            color: notification.type === 'success' ? '#059669' : notification.type === 'error' ? '#DC2626' : '#2563EB',
            border: `1px solid ${notification.type === 'success' ? '#A7F3D0' : notification.type === 'error' ? '#FCA5A5' : '#BFDBFE'}`,
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            {notification.type === 'success' ? '✓ ' : notification.type === 'error' ? '⚠️ ' : 'ℹ️ '}
            {notification.message}
          </div>
        )}

        {/* Top 4 KPI Summary Cards (Matching Stitch Light Theme) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.75rem' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Total System Users</span>
              <span>👥</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>{users.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{roleCounts.ADMIN || 0} Admins</span>
              <span style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{roleCounts.OPERATIONS_MANAGER || 0} Ops</span>
              <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{roleCounts.WAREHOUSE_SUPERVISOR || 0} Sup</span>
              <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>{roleCounts.QA_TEAM || 0} QA</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Managed Warehouses</span>
              <span>🏬</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>{warehouses.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, marginTop: '0.35rem' }}>
              {warehouses.filter((w) => w.status === 'ACTIVE').length} Active Facilities
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Total Zones & Capacity</span>
              <span>📦</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.35rem' }}>{totalZones} Zones</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
              {totalCapacity.toLocaleString()} Max Units/hr
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>System Telemetry</span>
              <span>⚡</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
              {health?.status || 'HEALTHY'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
              {health?.metrics?.activeOrders ?? 0} active orders in pipeline
            </div>
          </div>

        </div>

        {/* Tab Navigation Ribbon */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
          {[
            { id: 'USERS', label: 'User Directory & Access Control (RBAC)', icon: '👥' },
            { id: 'WAREHOUSES', label: 'Warehouse & Zone Topology', icon: '🏬' },
            { id: 'HEALTH', label: 'Platform Diagnostics & Telemetry', icon: '🩺' },
            { id: 'REPORTS', label: 'Export Reports & Audit Center', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: activeTab === tab.id ? '1px solid #2563EB' : '1px solid transparent',
                backgroundColor: activeTab === tab.id ? '#EFF6FF' : 'transparent',
                color: activeTab === tab.id ? '#2563EB' : '#64748B',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: USERS */}
        {activeTab === 'USERS' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            {/* Search & Filter Strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.55rem 0.85rem', borderRadius: '8px', flex: 1, fontSize: '0.85rem', outline: 'none' }}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.55rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OPERATIONS_MANAGER">Operations Manager</option>
                  <option value="WAREHOUSE_SUPERVISOR">Warehouse Supervisor</option>
                  <option value="QA_TEAM">QA Team</option>
                </select>
              </div>

              <button
                onClick={exportUsersCSV}
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#334155', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>📥</span> Export Users CSV
              </button>
            </div>

            {/* Users Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Role Assignment</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Joined Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No users match filter criteria</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = ROLE_BADGES[u.role] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F172A' }}>{u.name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="OPERATIONS_MANAGER">OPERATIONS MANAGER</option>
                            <option value="WAREHOUSE_SUPERVISOR">SUPERVISOR</option>
                            <option value="QA_TEAM">QA TEAM</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={actionLoading}
                            style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: WAREHOUSES & TOPOLOGY */}
        {activeTab === 'WAREHOUSES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search warehouse by name or city..."
                value={whSearch}
                onChange={(e) => setWhSearch(e.target.value)}
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', padding: '0.55rem 0.85rem', borderRadius: '8px', width: '320px', fontSize: '0.85rem', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={exportWarehousesCSV}
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#334155', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>📥</span> Export Topology CSV
                </button>
                <button
                  onClick={() => setShowCreateWhModal(true)}
                  style={{ backgroundColor: '#2563EB', border: 'none', color: '#FFFFFF', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  ➕ Register Warehouse
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.25rem' }}>
              {filteredWarehouses.map((wh) => {
                const sBadge = STATUS_BADGES[wh.status] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
                return (
                  <div key={wh.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#0F172A' }}>{wh.name}</h3>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>📍 {wh.location}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            backgroundColor: sBadge.bg,
                            color: sBadge.text,
                            border: `1px solid ${sBadge.border}`,
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          ● {wh.status}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedWhForEditStatus(wh);
                            setStatusToUpdate(wh.status);
                          }}
                          style={{
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title="Edit Warehouse Status"
                        >
                          ✏️ Edit Status
                        </button>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: '#64748B' }}>Capacity: <strong style={{ color: '#0F172A' }}>{wh.capacity} orders/hr</strong></span>
                      <span style={{ color: '#64748B' }}>Zones: <strong style={{ color: '#2563EB' }}>{wh.zones?.length || 0} active</strong></span>
                    </div>

                    {/* Zones List */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>ZONES</span>
                        <button
                          onClick={() => setSelectedWhForZone(wh)}
                          style={{ backgroundColor: '#EFF6FF', border: 'none', color: '#2563EB', fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          + Add Zone
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {wh.zones?.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>No zones configured</span>
                        ) : (
                          wh.zones.map((z) => (
                            <span key={z.id} style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
                              {z.name} ({z.type})
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HEALTH & TELEMETRY */}
        {activeTab === 'HEALTH' && health && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#0F172A' }}>Platform Telemetry & Health</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Database Engine</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>{health.metrics.dbEngine}</div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Runtime Environment</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }}>{health.metrics.nodeVersion}</div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Total Complaints Filed</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626', marginTop: '0.25rem' }}>{health.metrics.totalComplaints}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS */}
        {activeTab === 'REPORTS' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0F172A' }}>Export Reports & Audit Center</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>Download governance reports in CSV format.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={exportUsersCSV} style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                📥 Export Users CSV
              </button>
              <button onClick={exportWarehousesCSV} style={{ backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                📥 Export Warehouses CSV
              </button>
            </div>
          </div>
        )}

      </div>

      {/* CREATE USER MODAL */}
      {showCreateUserModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#0F172A', fontWeight: 800 }}>➕ Register New User</h2>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
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
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Assign Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#FFF' }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="OPERATIONS_MANAGER">OPERATIONS MANAGER</option>
                  <option value="WAREHOUSE_SUPERVISOR">WAREHOUSE SUPERVISOR</option>
                  <option value="QA_TEAM">QA TEAM</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateUserModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', backgroundColor: '#2563EB', border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE WAREHOUSE MODAL */}
      {showCreateWhModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#0F172A', fontWeight: 800 }}>🏬 Register New Warehouse</h2>
              <button
                type="button"
                onClick={() => setShowCreateWhModal(false)}
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
            <form onSubmit={handleCreateWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Warehouse Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BLR-HUB-01"
                  value={newWhForm.name}
                  onChange={(e) => setNewWhForm({ ...newWhForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Location / City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore North"
                  value={newWhForm.location}
                  onChange={(e) => setNewWhForm({ ...newWhForm, location: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Max Capacity (Orders/hr)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newWhForm.capacity}
                  onChange={(e) => setNewWhForm({ ...newWhForm, capacity: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateWhModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', backgroundColor: '#2563EB', border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Register Warehouse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ZONE MODAL */}
      {selectedWhForZone && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#0F172A', fontWeight: 800 }}>📦 Add Zone to {selectedWhForZone.name}</h2>
              <button
                type="button"
                onClick={() => setSelectedWhForZone(null)}
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
            <form onSubmit={handleAddZone} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zone Alpha - Cold Storage"
                  value={newZoneForm.name}
                  onChange={(e) => setNewZoneForm({ ...newZoneForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Zone Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZN-PCK-01"
                  value={newZoneForm.code}
                  onChange={(e) => setNewZoneForm({ ...newZoneForm, code: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Zone Type</label>
                <select
                  value={newZoneForm.type}
                  onChange={(e) => setNewZoneForm({ ...newZoneForm, type: e.target.value as any })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#FFF' }}
                >
                  <option value="RECEIVING">RECEIVING</option>
                  <option value="PICKING">PICKING</option>
                  <option value="PACKING">PACKING</option>
                  <option value="QUALITY_CHECK">QUALITY CHECK</option>
                  <option value="DISPATCH">DISPATCH</option>
                  <option value="STORAGE">STORAGE</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedWhForZone(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', backgroundColor: '#2563EB', border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Save Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Status Modal */}
      {selectedWhForEditStatus && (
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
                  {selectedWhForEditStatus.name} ({selectedWhForEditStatus.location})
                </p>
              </div>
              <button
                onClick={() => setSelectedWhForEditStatus(null)}
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
                  bg: statusToUpdate === 'ACTIVE' ? '#ECFDF5' : '#F8FAFC',
                  border: statusToUpdate === 'ACTIVE' ? '#10B981' : '#E2E8F0',
                  color: '#065F46',
                },
                {
                  value: 'MAINTENANCE',
                  title: '🟡 MAINTENANCE (Offline / Servicing)',
                  desc: 'Facility temporarily paused for equipment repairs, belt calibration, or system audit.',
                  bg: statusToUpdate === 'MAINTENANCE' ? '#FEFCE8' : '#F8FAFC',
                  border: statusToUpdate === 'MAINTENANCE' ? '#F59E0B' : '#E2E8F0',
                  color: '#92400E',
                },
                {
                  value: 'INACTIVE',
                  title: '🔴 INACTIVE (Decommissioned)',
                  desc: 'Facility closed or retired from the active order distribution network.',
                  bg: statusToUpdate === 'INACTIVE' ? '#FEF2F2' : '#F8FAFC',
                  border: statusToUpdate === 'INACTIVE' ? '#EF4444' : '#E2E8F0',
                  color: '#991B1B',
                },
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setStatusToUpdate(opt.value)}
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
                onClick={() => setSelectedWhForEditStatus(null)}
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
                onClick={() => handleUpdateWarehouseStatusDirect(selectedWhForEditStatus.id, statusToUpdate, selectedWhForEditStatus.name)}
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
