"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function OperationsDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Operations Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
      </div>
      <p>Welcome Operations Manager. Monitor warehouse performance and workflow efficiency here.</p>
    </div>
  );
}
