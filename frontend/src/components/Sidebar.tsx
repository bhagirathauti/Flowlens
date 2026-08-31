"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('ADMIN');

  useEffect(() => {
    const updateRole = () => {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u?.role) setUserRole(u.role);
        } catch (e) {
          console.error(e);
        }
      }
    };
    updateRole();
    window.addEventListener('storage', updateRole);
    return () => window.removeEventListener('storage', updateRole);
  }, []);

  // Define RBAC-allowed links for each role
  const allNavItems = [
    { label: 'Dashboard', path: '/dashboard/operations', icon: '📊', roles: ['ADMIN', 'OPERATIONS_MANAGER'] },
    { label: 'Warehouses', path: '/dashboard/warehouse', icon: '🏢', roles: ['ADMIN', 'OPERATIONS_MANAGER', 'WAREHOUSE_SUPERVISOR'] },
    { label: 'Orders', path: '/orders', icon: '📦', roles: ['ADMIN', 'OPERATIONS_MANAGER', 'WAREHOUSE_SUPERVISOR', 'QA_TEAM'] },
    { label: 'Workflow Monitor', path: '/dashboard/workflow', icon: '⚡', roles: ['ADMIN', 'OPERATIONS_MANAGER', 'WAREHOUSE_SUPERVISOR', 'QA_TEAM'] },
    { label: 'Risk Analysis', path: '/dashboard/risk', icon: '📈', roles: ['ADMIN', 'OPERATIONS_MANAGER'] },
    { label: 'Complaints & QA', path: '/dashboard/qa', icon: '⚠️', roles: ['ADMIN', 'OPERATIONS_MANAGER', 'QA_TEAM'] },
    { label: 'Admin Hub', path: '/dashboard/admin', icon: '🛡️', roles: ['ADMIN'] },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  return (
    <aside style={{
      width: '240px',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* Brand Header */}
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
          }}>
            FL
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', lineHeight: 1.1 }}>
              FlowLens
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Warehouse Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Main RBAC Navigation Menu */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', padding: '0 0.5rem 0.5rem 0.5rem', letterSpacing: '0.05em' }}>
          Navigation ({userRole.replace('_', ' ')})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#475569',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer / Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
