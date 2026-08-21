"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Zone {
  id: string;
  name: string;
  code: string;
  type: string;
  capacity: number;
  isActive: boolean;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
  status: string;
  zones: Zone[];
  createdAt: string;
}

export default function WarehouseDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '', capacity: 10000 });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newWarehouse),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create warehouse');
      } else {
        setSuccessMsg('Warehouse registered successfully!');
        setShowAddModal(false);
        setNewWarehouse({ name: '', location: '', capacity: 10000 });
        fetchWarehouses();
      }
    } catch (err) {
      setErrorMsg('Network error while registering warehouse');
    }
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || wh.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCapacity = warehouses.reduce((acc, curr) => acc + curr.capacity, 0);
  const totalZones = warehouses.reduce((acc, curr) => acc + (curr.zones?.length || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
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
                backgroundColor: '#10B981',
                display: 'inline-block',
              }}
            ></span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Warehouse Intelligence Operations
            </h1>
          </div>
          <p style={{ color: '#64748B', margin: '0.25rem 0 0 1.5rem', fontSize: '0.95rem' }}>
            Logged in as <strong style={{ color: '#0F172A' }}>{user?.name || 'Supervisor'}</strong> ({user?.role || 'WAREHOUSE_SUPERVISOR'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>+ Register Warehouse</span>
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

      {/* Messages */}
      {successMsg && (
        <div
          style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #A7F3D0',
          }}
        >
          {successMsg}
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
          {errorMsg}
        </div>
      )}

      {/* KPI Cards Grid */}
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
          <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Active Warehouses</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563EB', marginTop: '0.5rem' }}>
            {warehouses.length}
          </div>
          <div style={{ color: '#10B981', fontSize: '0.8rem', marginTop: '0.25rem' }}>● All Hubs Operational</div>
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
          <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Total Storage Capacity</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginTop: '0.5rem' }}>
            {totalCapacity.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500 }}>units</span>
          </div>
          <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.25rem' }}>Multi-region distribution</div>
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
          <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Configured Workflow Zones</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7C3AED', marginTop: '0.5rem' }}>
            {totalZones}
          </div>
          <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.25rem' }}>Receiving, Picking & Packing</div>
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
          <div style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>Workflow Bottlenecks</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.5rem' }}>
            0 <span style={{ fontSize: '1rem', fontWeight: 500 }}>alerts</span>
          </div>
          <div style={{ color: '#10B981', fontSize: '0.8rem', marginTop: '0.25rem' }}>✓ SLA Processing Normal</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Search warehouse by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.95rem',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Warehouses List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          Loading live warehouse telemetry...
        </div>
      ) : filteredWarehouses.length === 0 ? (
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
          No warehouses match your criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {filteredWarehouses.map((wh) => (
            <div
              key={wh.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {wh.name}
                  </h3>
                  <div style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    📍 {wh.location} | Capacity: <strong>{wh.capacity.toLocaleString()} units</strong>
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: wh.status === 'ACTIVE' ? '#DEF7EC' : '#FDE8E8',
                    color: wh.status === 'ACTIVE' ? '#03543F' : '#9B1C1C',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {wh.status}
                </span>
              </div>

              {/* Zones Section */}
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
                  Operational Zones ({wh.zones?.length || 0})
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {wh.zones && wh.zones.length > 0 ? (
                    wh.zones.map((zone) => (
                      <div
                        key={zone.id}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '0.75rem',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1E293B' }}>
                          {zone.name}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '0.4rem',
                            fontSize: '0.75rem',
                            color: '#64748B',
                          }}
                        >
                          <span>Code: {zone.code}</span>
                          <span style={{ color: '#2563EB', fontWeight: 600 }}>{zone.type}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>No zones registered yet.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#0F172A' }}>
              Register New Warehouse
            </h2>
            <form onSubmit={handleCreateWarehouse}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Warehouse Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Coast Distribution Hub"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Boston, MA"
                  value={newWarehouse.location}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Capacity (Units)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newWarehouse.capacity}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
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
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
