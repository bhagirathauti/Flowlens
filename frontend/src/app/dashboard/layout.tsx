"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar / Navigation could go here */}
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
