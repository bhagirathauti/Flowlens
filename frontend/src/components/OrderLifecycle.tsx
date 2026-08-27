'use client';
import React, { useEffect, useState } from "react";

// All possible order stages
const STAGES = [
  "ORDER_RECEIVED",
  "PICKING",
  "PACKING",
  "QUALITY_CHECK",
  "DISPATCH",
  "DELIVERY",
] as const;

type OrderStage = (typeof STAGES)[number];

// Order data returned by the API
interface Order {
  id: string;
  customerId: string;
  warehouse: string;
  assignedEmployee: string;
  currentStage: OrderStage;
  stageTimestamp: string;
  processingTime: number;
  slaStatus: "ON_TIME" | "AT_RISK" | "BREACHED";
}

// Component accepts orderId as a prop
interface OrderLifecycleProps {
  orderId: string;
}

const OrderLifecycle: React.FC<OrderLifecycleProps> = ({ orderId }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  /**
   * Fetch order details
   */
  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError("");

    //   const response = await fetch(`/api/orders/${orderId}`);
    const response = await fetch(`http://localhost:5001/api/orders/${orderId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch order");
      }

      const data = await response.json();

      // API returns { order: {...} }
      setOrder(data.order);
    } catch (err) {
      setError("Unable to load order details.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch order whenever orderId changes
  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  /**
   * Move the order to the next stage
   */
  const moveToNextStage = async () => {
    if (!order) return;

    // Find the current stage position
    const currentIndex = STAGES.indexOf(order.currentStage);

    // Prevent transition if already at DELIVERY
    if (currentIndex === STAGES.length - 1) {
      return;
    }

    // Get the next stage
    const nextStage = STAGES[currentIndex + 1];

    try {
      setUpdating(true);
      setError("");

    //   const response = await fetch("/api/orders/stage", {
    //     method: "PATCH",

    //     headers: {
    //       "Content-Type": "application/json",
    //     },

    //     body: JSON.stringify({
    //       orderId: order.id,
    //       nextStage,
    //     }),
    //   });
    const response = await fetch("http://localhost:5001/api/orders/stage", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    orderId: order.id,
    nextStage,
  }),
});

      if (!response.ok) {
        throw new Error("Failed to update order stage");
      }

      // Refresh the order after updating
      await fetchOrder();
    } catch (err) {
      setError("Unable to update order stage.");
    } finally {
      setUpdating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }

  // Error state
  if (error && !order) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (!order) {
    return null;
  }

  // Find current stage index
  const currentIndex = STAGES.indexOf(order.currentStage);

  // SLA badge styling
  const slaStyles = {
    ON_TIME: "bg-green-100 text-green-700",
    AT_RISK: "bg-yellow-100 text-yellow-700",
    BREACHED: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-md">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Order Lifecycle
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Track the progress of order {order.id}
        </p>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoItem label="Order ID" value={order.id} />

        <InfoItem
          label="Customer ID"
          value={order.customerId}
        />

        <InfoItem
          label="Warehouse"
          value={order.warehouse}
        />

        <InfoItem
          label="Assigned Employee"
          value={order.assignedEmployee}
        />

        <InfoItem
          label="Processing Time"
          value={`${order.processingTime.toFixed(2)} minutes`}
        />

        <div>
          <p className="text-sm text-gray-500">SLA Status</p>

          <span
            className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${
              slaStyles[order.slaStatus]
            }`}
          >
            {order.slaStatus.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <div className="mt-10">
        <h3 className="mb-6 text-lg font-semibold text-gray-800">
          Order Progress
        </h3>

        <div className="flex items-center">
          {STAGES.map((stage, index) => {
            const completed = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <React.Fragment key={stage}>
                {/* Stage Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      completed
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    } ${
                      isCurrent
                        ? "ring-4 ring-blue-100"
                        : ""
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Stage Name */}
                  <span
                    className={`mt-2 text-center text-xs ${
                      completed
                        ? "font-semibold text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {stage.replace("_", " ")}
                  </span>
                </div>

                {/* Connecting Line */}
                {index < STAGES.length - 1 && (
                  <div
                    className={`mx-2 h-1 flex-1 ${
                      index < currentIndex
                        ? "bg-blue-600"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Next Stage Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={moveToNextStage}
          disabled={
            updating ||
            currentIndex === STAGES.length - 1
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {updating
            ? "Updating..."
            : currentIndex === STAGES.length - 1
            ? "Order Delivered"
            : `Move to ${STAGES[currentIndex + 1].replace(
                "_",
                " "
              )}`}
        </button>
      </div>
    </div>
  );
};

/**
 * Reusable component for displaying
 * order information.
 */
interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
};

export default OrderLifecycle;