"use client";

import React, { useEffect, useState } from 'react';
import TopHeader from '../../../components/TopHeader';

export default function RiskAnalysisDashboard() {
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [pipelineRisks, setPipelineRisks] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingOrder, setAnalyzingOrder] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchRisks();
  }, [warehouseFilter]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/risk/pipeline?warehouse=${warehouseFilter}`);
      if (res.ok) {
        const data = await res.json();
        const assessments = (data.assessments || []).sort((a: any, b: any) => b.riskScore - a.riskScore);
        setPipelineRisks(assessments);
        if (assessments.length > 0) {
          inspectOrderWithGroqAI(assessments[0].orderId, assessments[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inspectOrderWithGroqAI = async (orderId: string, initialObj?: any) => {
    if (initialObj) setSelectedOrder(initialObj);
    try {
      setAnalyzingOrder(true);
      const res = await fetch(`http://localhost:5000/api/risk/order/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.riskAssessment);
      }
    } catch (err) {
      console.error('Groq AI inspection error:', err);
    } finally {
      setAnalyzingOrder(false);
    }
  };

  const handleAdvanceStage = async (orderId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processingTime: 5 }),
      });
      if (res.ok) {
        setActionMsg(`Order ${orderId.slice(0, 8)} advanced to next stage successfully`);
        setTimeout(() => setActionMsg(''), 4000);
        fetchRisks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const meanRiskScore = pipelineRisks.length > 0
    ? Math.round(pipelineRisks.reduce((acc, r) => acc + r.riskScore, 0) / pipelineRisks.length)
    : 35;

  const highRiskThreatsCount = pipelineRisks.filter((r) => r.riskLevel === 'HIGH').length;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Predictive Risk Analysis
              </h1>
              <span style={{ backgroundColor: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ⚡ Powered by Groq Llama 3.3
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              Real-time LLM inference & heuristic failure vector identification before order dispatch.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => fetchRisks()}
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
              ⚡ Re-run Live AI Analysis
            </button>
            <button
              onClick={() => {
                const header = 'Order ID,Customer,Warehouse,Stage,Risk Score,Risk Level\n';
                const rows = pipelineRisks.map((r) => `${r.orderId},${r.customerId},${r.warehouse},${r.currentStage},${r.riskScore}%,${r.riskLevel}`).join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `flowlens_risk_assessment_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
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
              Export Report
            </button>
          </div>
        </div>

        {actionMsg && (
          <div style={{ backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
            ✅ {actionMsg}
          </div>
        )}

        {/* Top 2 Cards: Dynamic Operation Health & Risk Metrics Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
          
          {/* Card 1: Operation Health (Dynamic) */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OPERATION HEALTH
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: meanRiskScore > 50 ? '#DC2626' : '#2563EB', margin: '0.5rem 0' }}>
              {meanRiskScore}% <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Risk</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: '10px', backgroundColor: '#FEE2E2', borderRadius: '5px', overflow: 'hidden', margin: '1rem 0' }}>
              <div style={{ width: `${Math.min(100, meanRiskScore)}%`, height: '100%', backgroundColor: meanRiskScore > 50 ? '#DC2626' : '#2563EB', borderRadius: '5px' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              <span style={{ color: meanRiskScore > 50 ? '#DC2626' : '#10B981', fontWeight: 600 }}>
                {meanRiskScore > 50 ? '↑ High Risk Vector' : '✓ Normal Operating Margin'}
              </span>
              <span>Threshold: 50%</span>
            </div>
          </div>

          {/* Card 2: Risk Metrics Overview */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0F172A' }}>
              Risk Metrics Overview
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: '#94A3B8', borderBottom: '1px solid #F1F5F9', textAlign: 'left' }}>
                  <th style={{ paddingBottom: '0.5rem', fontWeight: 600 }}>Metric</th>
                  <th style={{ paddingBottom: '0.5rem', fontWeight: 600 }}>Value</th>
                  <th style={{ paddingBottom: '0.5rem', fontWeight: 600, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '0.6rem 0', color: '#334155' }}>AI Reasoning Engine</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 700, color: '#7E22CE' }}>
                    Groq Llama-3.3 70B
                  </td>
                  <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>Active ⚡</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '0.6rem 0', color: '#334155' }}>AI Model Confidence</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>
                    {selectedOrder?.aiConfidence ? `${selectedOrder.aiConfidence}%` : '96.8%'}
                  </td>
                  <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#2563EB', fontWeight: 600 }}>Optimal</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '0.6rem 0', color: '#334155' }}>Orders Evaluated</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>{pipelineRisks.length} Live</td>
                  <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#334155', fontWeight: 600 }}>Synchronized</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.6rem 0', color: '#334155' }}>Active Priority Threats</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>{highRiskThreatsCount}</td>
                  <td style={{ padding: '0.6rem 0', textAlign: 'right', color: highRiskThreatsCount > 0 ? '#DC2626' : '#10B981', fontWeight: 600 }}>
                    {highRiskThreatsCount > 0 ? 'Critical' : 'Healthy'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Bottom Section: Dynamic High Risk Queue & Selected Order Diagnostics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.65fr', gap: '1.5rem' }}>
          
          {/* Left Column: Live High Risk Queue */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>Live Order Queue</h3>
              <span style={{ backgroundColor: highRiskThreatsCount > 0 ? '#FEE2E2' : '#ECFDF5', color: highRiskThreatsCount > 0 ? '#DC2626' : '#059669', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                {pipelineRisks.length} Orders
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '560px', overflowY: 'auto' }}>
              {pipelineRisks.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>No orders in pipeline</div>
              ) : (
                pipelineRisks.map((item) => {
                  const isSelected = selectedOrder?.orderId === item.orderId;
                  return (
                    <div
                      key={item.orderId}
                      onClick={() => inspectOrderWithGroqAI(item.orderId, item)}
                      style={{
                        backgroundColor: isSelected ? '#EFF6FF' : item.riskLevel === 'HIGH' ? '#FEF2F2' : '#F8FAFC',
                        border: isSelected ? '2px solid #2563EB' : item.riskLevel === 'HIGH' ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>
                            {item.orderId ? `ORD-${item.orderId.slice(0, 6).toUpperCase()}` : 'ORDER'}
                          </strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.2rem 0' }}>
                            {item.customerId} • {item.currentStageLabel || item.currentStage}
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.35rem', borderRadius: '4px', color: '#475569' }}>
                              👤 {item.assignedEmployee || 'Unassigned'}
                            </span>
                            <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.35rem', borderRadius: '4px', color: '#475569' }}>
                              📍 {item.warehouse}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: item.riskScore >= 70 ? '#DC2626' : item.riskScore >= 40 ? '#D97706' : '#2563EB' }}>
                          {item.riskScore}% Risk
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdvanceStage(item.orderId);
                          }}
                          style={{
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '0.35rem 0.7rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Advance Stage
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Deep Diagnostic Profile & Groq AI Reasoning */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#0F172A' }}>
                  Risk Profile: {selectedOrder ? `ORD-${selectedOrder.orderId.slice(0, 6).toUpperCase()}` : 'Select Order'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                  {selectedOrder?.warehouse} • Stage: {selectedOrder?.currentStage}
                </p>
              </div>
              <span style={{ backgroundColor: selectedOrder?.riskLevel === 'HIGH' ? '#FEE2E2' : '#EFF6FF', color: selectedOrder?.riskLevel === 'HIGH' ? '#DC2626' : '#2563EB', fontWeight: 800, fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                {selectedOrder?.slaStatus || 'ON_TIME'}
              </span>
            </div>

            {/* Groq LLM AI Synthesis Card */}
            <div style={{
              backgroundColor: '#FAF5FF',
              border: '1px solid #E9D5FF',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7E22CE', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🤖</span> Groq Llama 3.3 Generative AI Reasoning
                </span>
                {analyzingOrder && <span style={{ fontSize: '0.7rem', color: '#7E22CE', fontWeight: 700 }}>Synthesizing...</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#581C87', lineHeight: 1.4, fontWeight: 500 }}>
                {selectedOrder?.aiSummary || (selectedOrder?.riskScore > 50
                  ? `High probability of fulfillment disruption. Order dwell time (${selectedOrder?.processingTime || 12}m) is nearing SLA limits in ${selectedOrder?.currentStage}.`
                  : 'Order telemetry shows optimal stage velocity and minimal failure vector likelihood.')}
              </div>
              {selectedOrder?.rootCauseReasoning && (
                <div style={{ fontSize: '0.75rem', color: '#6B21A8', marginTop: '0.4rem', borderTop: '1px solid #F3E8FF', paddingTop: '0.35rem' }}>
                  <strong>AI Root Reasoning:</strong> {selectedOrder.rootCauseReasoning}
                </div>
              )}
            </div>

            {/* Diagnostic 3-Card Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>ROOT FACTOR</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '0.2rem' }}>
                  {selectedOrder?.factors?.[0]?.factor || 'Stage Latency'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {selectedOrder?.factors?.[0]?.details || 'Processing time analysis'}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>IMPACT FACTOR</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '0.2rem' }}>
                  {selectedOrder?.factors?.[1]?.factor || 'Queue Volume'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {selectedOrder?.factors?.[1]?.details || 'Assigned queue density'}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase' }}>PROCESSING TIME</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '0.2rem' }}>
                  {selectedOrder?.processingTime ?? 0} mins
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.15rem' }}>
                  Stage: {selectedOrder?.currentStage}
                </div>
              </div>
            </div>

            {/* AI Recommendations List */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                AI RECOMMENDED INTERVENTIONS (FR-9)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {selectedOrder?.recommendations?.map((rec: string, rIdx: number) => (
                  <div key={rIdx} style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#1E40AF', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>💡</span>
                    <span>{rec}</span>
                  </div>
                )) || (
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>No critical interventions required for this order.</div>
                )}
              </div>
            </div>

            {/* Factor Scores Breakdown */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                FACTOR RISK BREAKDOWN
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {selectedOrder?.factors?.map((f: any, fIdx: number) => (
                  <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px solid #F8FAFC' }}>
                    <span style={{ color: '#334155' }}>{f.factor}</span>
                    <span style={{ fontWeight: 700, color: f.score > 10 ? '#DC2626' : '#2563EB' }}>
                      {f.score} / {f.maxScore} pts ({f.weight})
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
