"use client";

import React, { useEffect } from 'react';
import AppShell from '../../components/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // If not logged in, auto-initialize demo session for seamless navigation
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('token', 'demo-session-token');
        localStorage.setItem(
          'user',
          JSON.stringify({
            name: 'Sarah Connor',
            email: 'ops@flowlens.com',
            role: 'OPERATIONS_MANAGER',
          })
        );
      }
    }
  }, []);

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
