"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TopHeaderProps {
  warehouseFilter?: string;
  onWarehouseChange?: (wh: string) => void;
  title?: string;
  subtitle?: string;
  onSearch?: (term: string) => void;
  actionButton?: React.ReactNode;
}

export default function TopHeader({
  warehouseFilter = 'ALL',
  onWarehouseChange,
  title,
  subtitle,
  onSearch,
  actionButton,
}: TopHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }

    fetch('http://localhost:5000/api/warehouses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.warehouses) {
          setWarehouses(data.warehouses);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleRoleChange = (newRole: string) => {
    const defaultUsers: Record<string, { name: string; email: string }> = {
      ADMIN: { name: 'Arthur Vance', email: 'admin@flowlens.com' },
      OPERATIONS_MANAGER: { name: 'Sarah Connor', email: 'ops@flowlens.com' },
      WAREHOUSE_SUPERVISOR: { name: 'Marcus Miller', email: 'supervisor@flowlens.com' },
      QA_TEAM: { name: 'Dr. Emily Watson', email: 'qa@flowlens.com' },
    };

    const updatedUser = {
      ...(defaultUsers[newRole] || { name: 'User', email: 'user@flowlens.com' }),
      role: newRole,
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new Event('storage'));

    // Optional smart redirect based on role
    if (newRole === 'QA_TEAM') {
      router.push('/dashboard/qa');
    } else if (newRole === 'WAREHOUSE_SUPERVISOR') {
      router.push('/dashboard/warehouse');
    } else if (newRole === 'ADMIN') {
      router.push('/dashboard/admin');
    } else {
      router.push('/dashboard/operations');
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      case 'OPERATIONS_MANAGER':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      case 'WAREHOUSE_SUPERVISOR':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'QA_TEAM':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
      default:
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
    }
  };

  const badge = getRoleBadgeStyle(user?.role);

  return (
    <header style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      padding: '0.85rem 1.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '400px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.45rem 0.75rem' }}>
        <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>🔍</span>
        <input
          type="text"
          placeholder="Search orders, stages, or IDs..."
          onChange={(e) => onSearch && onSearch(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            fontSize: '0.85rem',
            color: '#1E293B',
          }}
        />
      </div>

      {/* Right Controls: Warehouse Selector, Time Filter, Role Switcher, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Warehouse Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
          <span>🏢</span>
          <select
            value={warehouseFilter}
            onChange={(e) => onWarehouseChange && onWarehouseChange(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}
          >
            <option value="ALL">ALL WAREHOUSES</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.name}>{w.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
          <span>📅</span>
          <span>Last 24 Hours</span>
        </div>

        {/* Interactive RBAC Role Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          backgroundColor: badge.bg,
          border: `1px solid ${badge.border}`,
          borderRadius: '8px',
          padding: '0.35rem 0.65rem',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: badge.color }}>🛡️ RBAC:</span>
          <select
            value={user?.role || 'ADMIN'}
            onChange={(e) => handleRoleChange(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: badge.color,
              cursor: 'pointer',
            }}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATIONS_MANAGER">OPERATIONS MANAGER</option>
            <option value="WAREHOUSE_SUPERVISOR">SUPERVISOR</option>
            <option value="QA_TEAM">QA TEAM</option>
          </select>
        </div>

        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '1rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.65rem', color: badge.color, fontWeight: 700 }}>
              {user?.role?.replace('_', ' ') || 'ADMIN'}
            </div>
          </div>
        </div>

        {actionButton}
      </div>
    </header>
  );
}
