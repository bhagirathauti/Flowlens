'use client';
import React, { useEffect, useState } from "react";

// All possible order stages in sequence (FR-3)
export const ORDER_STAGES = [
  "ORDER_RECEIVED",
  "PICKING",
  "PACKING",
  "QUALITY_CHECK",
  "DISPATCH",
  "DELIVERY",
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export interface StageLog {
  id: string;
  orderId: string;
  stage: OrderStage;
  changedAt: string;
  processingTime: number;
}

export interface RiskFactor {
  factor: string;
  score: number;
  maxScore: number;
  weight: string;
  status: 'OPTIMAL' | 'ELEVATED' | 'HIGH_RISK';
  details: string;
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isPreDispatch: boolean;
  factors: RiskFactor[];
  recommendations: string[];
}

export interface Order {
  id: string;
  customerId: string;
  warehouse: string;
  assignedEmployee: string;
  currentStage: OrderStage;
  stageTimestamp: string;
  processingTime: number;
  slaStatus: "ON_TIME" | "AT_RISK" | "BREACHED";
  riskScore?: number;
  history?: StageLog[];
}

interface OrderLifecycleProps {
  orderId: string;
  onStageUpdated?: (updatedOrder: Order) => void;
  onClose?: () => void;
}

const STAGE_LABELS: Record<OrderStage, { name: string; icon: string; desc: string }> = {
  ORDER_RECEIVED: { name: "Order Intake", icon: "📥", desc: "Received into warehouse queue" },
  PICKING: { name: "Picking", icon: "🛒", desc: "Items picked from shelves/storage" },
  PACKING: { name: "Packing", icon: "📦", desc: "Goods packaged at packing station" },
  QUALITY_CHECK: { name: "Quality Check", icon: "🔍", desc: "QA inspection & accuracy verification" },
  DISPATCH: { name: "Dispatch Hub", icon: "🚛", desc: "Handed to courier / loading bay" },
  DELIVERY: { name: "Delivered", icon: "🏁", desc: "Successfully delivered to customer" },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const OrderLifecycle: React.FC<OrderLifecycleProps> = ({ orderId, onStageUpdated, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [riskData, setRiskData] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showRiskDrawer, setShowRiskDrawer] = useState(false);

  const fetchOrderAndRisk = async () => {
    try {
      setLoading(true);
      setError("");
      const [orderRes, riskRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders/${orderId}`),
        fetch(`${API_BASE}/api/risk/order/${orderId}`),
      ]);

      if (!orderRes.ok) {
        throw new Error("Failed to fetch order details");
      }

      const orderJson = await orderRes.json();
      setOrder(orderJson.order);

      if (riskRes.ok) {
        const riskJson = await riskRes.json();
        setRiskData(riskJson.riskAssessment);
      }
    } catch (err: any) {
      setError(err.message || "Unable to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderAndRisk();
    }
  }, [orderId]);

  const moveToNextStage = async () => {
    if (!order) return;

    const currentIndex = ORDER_STAGES.indexOf(order.currentStage);
    if (currentIndex === ORDER_STAGES.length - 1) return;

    const nextStage = ORDER_STAGES[currentIndex + 1];

    try {
      setUpdating(true);
      setError("");
      setSuccessMsg("");

      const response = await fetch(`${API_BASE}/api/orders/stage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          nextStage,
          assignedEmployee: order.assignedEmployee,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order stage");
      }

      const result = await response.json();
      setOrder(result.order);
      setSuccessMsg(`Stage advanced to ${STAGE_LABELS[nextStage].name} successfully!`);
      if (onStageUpdated) {
        onStageUpdated(result.order);
      }
      // Re-evaluate risk
      fetch(`${API_BASE}/api/risk/order/${order.id}`)
        .then((r) => r.json())
        .then((d) => setRiskData(d.riskAssessment))
        .catch(console.error);
    } catch (err: any) {
      setError(err.message || "Unable to update order stage.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
        Loading order lifecycle telemetry & AI Pre-Dispatch Risk model...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div style={{ padding: "1.5rem", backgroundColor: "#FEE2E2", color: "#991B1B", borderRadius: "8px" }}>
        ⚠️ {error}
      </div>
    );
  }

  if (!order) return null;

  const currentIndex = ORDER_STAGES.indexOf(order.currentStage);

  const slaBadgeColor =
    order.slaStatus === "BREACHED"
      ? { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" }
      : order.slaStatus === "AT_RISK"
      ? { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }
      : { bg: "#DEF7EC", text: "#03543F", border: "#A7F3D0" };

  const riskBadgeColor =
    riskData?.riskLevel === "HIGH"
      ? { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" }
      : riskData?.riskLevel === "MEDIUM"
      ? { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }
      : { bg: "#DEF7EC", text: "#03543F", border: "#A7F3D0" };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
        border: "1px solid #E2E8F0",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid #F1F5F9",
          paddingBottom: "1.25rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>📦</span>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
              Order Lifecycle Tracking
            </h2>
          </div>
          <p style={{ color: "#64748B", margin: "0.3rem 0 0 2.25rem", fontSize: "0.875rem" }}>
            Tracking Order ID: <strong style={{ color: "#2563EB" }}>{order.id}</strong>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* FR-8 AI Risk Score Badge */}
          {riskData && (
            <button
              onClick={() => setShowRiskDrawer(!showRiskDrawer)}
              style={{
                backgroundColor: riskBadgeColor.bg,
                color: riskBadgeColor.text,
                border: `1px solid ${riskBadgeColor.border}`,
                padding: "0.35rem 0.85rem",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              🤖 AI Risk: {riskData.riskScore}/100 ({riskData.riskLevel}) {showRiskDrawer ? "▲" : "▼"}
            </button>
          )}

          <span
            style={{
              backgroundColor: slaBadgeColor.bg,
              color: slaBadgeColor.text,
              border: `1px solid ${slaBadgeColor.border}`,
              padding: "0.35rem 0.85rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            SLA: {order.slaStatus.replace("_", " ")}
          </span>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontWeight: 800,
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Close modal"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            backgroundColor: "#DEF7EC",
            color: "#03543F",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginBottom: "1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#FEE2E2",
            color: "#991B1B",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginBottom: "1.25rem",
            fontSize: "0.875rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* FR-8 & FR-9 Pre-Dispatch Risk Assessment & Recommendations Panel */}
      {riskData && (
        <div
          style={{
            backgroundColor: riskData.riskLevel === "HIGH" ? "#FEF2F2" : riskData.riskLevel === "MEDIUM" ? "#FFFBEB" : "#F0FDF4",
            border: `1.5px solid ${riskData.riskLevel === "HIGH" ? "#FCA5A5" : riskData.riskLevel === "MEDIUM" ? "#FCD34D" : "#86EFAC"}`,
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>
                {riskData.riskLevel === "HIGH" ? "🚨" : riskData.riskLevel === "MEDIUM" ? "⚠️" : "🛡️"}
              </span>
              <strong
                style={{
                  fontSize: "0.95rem",
                  color: riskData.riskLevel === "HIGH" ? "#991B1B" : riskData.riskLevel === "MEDIUM" ? "#92400E" : "#166534",
                }}
              >
                FR-8 Pre-Dispatch Failure Prediction: {riskData.riskScore}/100 ({riskData.riskLevel} RISK)
              </strong>
            </div>

            <button
              onClick={() => setShowRiskDrawer(!showRiskDrawer)}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showRiskDrawer ? "Hide Factor Diagnostics" : "View Factor Diagnostics & AI Suggestions →"}
            </button>
          </div>

          {/* FR-9 Intelligent Recommendations Preview */}
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.3rem" }}>
              💡 FR-9 Proactive Recommendations:
            </div>
            {riskData.recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: "0.8rem",
                  color: riskData.riskLevel === "HIGH" ? "#991B1B" : "#1E40AF",
                  backgroundColor: "#FFFFFF",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  marginBottom: "0.3rem",
                  fontWeight: 600,
                }}
              >
                • {rec}
              </div>
            ))}
          </div>

          {/* Expandable Factor Breakdown */}
          {showRiskDrawer && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed #CBD5E1" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem" }}>
                Multi-Factor Risk Breakdown:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                {riskData.factors.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#FFFFFF",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0F172A" }}>
                      <span>{f.factor}</span>
                      <span>{f.score}/{f.maxScore}</span>
                    </div>
                    <div style={{ color: "#64748B", marginTop: "0.2rem" }}>{f.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Info Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <div style={{ color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Customer ID</div>
          <div style={{ color: "#0F172A", fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem" }}>{order.customerId}</div>
        </div>

        <div style={{ backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <div style={{ color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Warehouse Hub</div>
          <div style={{ color: "#0F172A", fontWeight: 700, fontSize: "0.95rem", marginTop: "0.25rem" }}>{order.warehouse}</div>
        </div>

        <div style={{ backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <div style={{ color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Handling Worker</div>
          <div style={{ color: "#2563EB", fontWeight: 700, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            👤 {order.assignedEmployee || "Unassigned"}
          </div>
        </div>

        <div style={{ backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <div style={{ color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Total Processing Time</div>
          <div style={{ color: "#0F172A", fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem" }}>
            ⏱️ {order.processingTime} mins
          </div>
        </div>
      </div>

      {/* Stepper Pipeline Visualizer */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1E293B", marginBottom: "1.25rem" }}>
          Workflow Stage Pipeline
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "0.5rem",
            position: "relative",
          }}
        >
          {ORDER_STAGES.map((stage, idx) => {
            const isDelivered = order.currentStage === "DELIVERY";
            const completed = isDelivered ? true : idx < currentIndex;
            const isCurrent = !isDelivered && idx === currentIndex;
            const stageMeta = STAGE_LABELS[stage];

            let bgColor = "#F1F5F9";
            let textColor = "#64748B";
            let borderColor = "#E2E8F0";

            if (completed) {
              bgColor = "#DEF7EC";
              textColor = "#03543F";
              borderColor = "#31C48D";
            } else if (isCurrent) {
              bgColor = "#EFF6FF";
              textColor = "#1D4ED8";
              borderColor = "#3B82F6";
            }

            return (
              <div
                key={stage}
                style={{
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: "12px",
                  padding: "0.85rem 0.5rem",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  boxShadow: isCurrent ? "0 4px 12px rgba(59, 130, 246, 0.15)" : "none",
                }}
              >
                <div style={{ fontSize: "1.4rem" }}>{stageMeta.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: textColor, marginTop: "0.35rem" }}>
                  {idx + 1}. {stageMeta.name}
                </div>
                <div style={{ fontSize: "0.68rem", color: completed ? "#059669" : "#64748B", marginTop: "0.2rem", fontWeight: completed ? 600 : 400 }}>
                  {completed ? (stage === "DELIVERY" ? "✓ Delivered" : "✓ Done") : isCurrent ? "● Active Stage" : "Pending"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage History Timeline */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.75rem" }}>
          Stage Transition History & Logs
        </h3>

        {order.history && order.history.length > 0 ? (
          <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <tr>
                  <th style={{ padding: "0.6rem 1rem", color: "#475569" }}>Stage</th>
                  <th style={{ padding: "0.6rem 1rem", color: "#475569" }}>Timestamp</th>
                  <th style={{ padding: "0.6rem 1rem", color: "#475569" }}>Duration in Stage</th>
                </tr>
              </thead>
              <tbody>
                {order.history.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "#0F172A" }}>
                      {STAGE_LABELS[log.stage]?.icon} {STAGE_LABELS[log.stage]?.name || log.stage}
                    </td>
                    <td style={{ padding: "0.6rem 1rem", color: "#64748B" }}>
                      {new Date(log.changedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.6rem 1rem", color: "#2563EB", fontWeight: 600 }}>
                      {log.processingTime} mins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#64748B", fontSize: "0.85rem" }}>No transition logs recorded yet.</div>
        )}
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #F1F5F9",
          paddingTop: "1.25rem",
        }}
      >
        <button
          onClick={fetchOrderAndRisk}
          style={{
            backgroundColor: "#F8FAFC",
            color: "#475569",
            border: "1px solid #CBD5E1",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔄 Refresh Order & Risk
        </button>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {currentIndex === ORDER_STAGES.length - 1 ? (
            <>
              <button
                onClick={async () => {
                  if (!order) return;
                  try {
                    setUpdating(true);
                    const res = await fetch(`${API_BASE}/api/orders/stage`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId: order.id,
                        nextStage: "ORDER_RECEIVED",
                        assignedEmployee: order.assignedEmployee,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setOrder(data.order);
                      setSuccessMsg("Workflow reset back to Order Received!");
                      if (onStageUpdated) onStageUpdated(data.order);
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setUpdating(false);
                  }
                }}
                disabled={updating}
                style={{
                  backgroundColor: "#F1F5F9",
                  color: "#475569",
                  border: "1px solid #CBD5E1",
                  padding: "0.7rem 1.2rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ↺ Restart Workflow
              </button>
              <div
                style={{
                  backgroundColor: "#DEF7EC",
                  color: "#03543F",
                  border: "1px solid #31C48D",
                  padding: "0.7rem 1.5rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                ✓ Order Fully Delivered
              </div>
            </>
          ) : (
            <button
              onClick={moveToNextStage}
              disabled={updating}
              style={{
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                padding: "0.7rem 1.5rem",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
                opacity: updating ? 0.7 : 1,
                boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {updating ? (
                "Advancing Stage..."
              ) : (
                <>
                  <span>Move to Next Stage:</span>
                  <strong>{STAGE_LABELS[ORDER_STAGES[currentIndex + 1]].name} →</strong>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderLifecycle;