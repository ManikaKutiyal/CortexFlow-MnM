"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useGlobalRefresh } from "@/providers/refresh-provider";

type ProviderPatient = {
  id: string;
  name: string;
};

type ProviderTask = {
  id: string;
  patient_id: string;
  patient_name: string;
  title: string;
  description: string | null;
  task_type: "medication" | "appointment" | "exercise" | "checkin" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  due_at: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  created_at: string;
};

type TaskFormState = {
  patientId: string;
  title: string;
  description: string;
  taskType: ProviderTask["task_type"];
  priority: ProviderTask["priority"];
  dueAt: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function ProviderOrdersPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [tasks, setTasks] = useState<ProviderTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>({
    patientId: "",
    title: "",
    description: "",
    taskType: "medication",
    priority: "medium",
    dueAt: "",
  });

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/provider/orders", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load orders");
      }

      const data = await res.json() as { patients?: ProviderPatient[]; tasks?: ProviderTask[] };
      setPatients(data.patients ?? []);
      setTasks(data.tasks ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load orders";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void loadOrders();
  }, [loadOrders, idToken, isReady]);

  useGlobalRefresh(() => {
    if (isReady) void loadOrders();
  });

  const summary = useMemo(() => {
    if (!tasks.length) return "No orders yet.";
    const openCount = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
    return `${openCount} active order${openCount === 1 ? "" : "s"}.`;
  }, [tasks]);

  const canSubmit = formState.title.trim().length > 1 && Boolean(formState.patientId);

  const submitOrder = useCallback(async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);

    const payload = {
      patientId: formState.patientId,
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      taskType: formState.taskType,
      priority: formState.priority,
      dueAt: formState.dueAt || null,
    };

    try {
      const res = await authFetch("/api/provider/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to create order");
      }

      const data = await res.json() as { task?: ProviderTask };
      if (data.task) {
        setTasks((prev) => [data.task as ProviderTask, ...prev]);
      }

      setFormState((prev) => ({
        ...prev,
        title: "",
        description: "",
        taskType: "medication",
        priority: "medium",
        dueAt: "",
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create order";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [canSubmit, formState]);

  const updateTaskStatus = useCallback(async (taskId: string, status: ProviderTask["status"]) => {
    const res = await authFetch(`/api/provider/orders/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const message = await res.text();
      setError(message || "Failed to update order");
      return;
    }

    const data = await res.json() as { task?: ProviderTask };
    if (data.task) {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? (data.task as ProviderTask) : task)));
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Orders & To-dos
          </h1>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-lg px-3 py-1 text-[11px]"
            style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
          >
            Refresh
          </button>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{summary}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}>
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Create Order</div>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Assign to patient</span>
          </div>
          <div className="grid gap-2">
            <select
              value={formState.patientId}
              onChange={(event) => setFormState((prev) => ({ ...prev, patientId: event.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
            <input
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Order title"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            />
            <textarea
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Clinical notes"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 80 }}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={formState.taskType}
                onChange={(event) => setFormState((prev) => ({ ...prev, taskType: event.target.value as ProviderTask["task_type"] }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              >
                <option value="medication">Medication</option>
                <option value="appointment">Appointment</option>
                <option value="exercise">Exercise</option>
                <option value="checkin">Check-in</option>
                <option value="general">General</option>
              </select>
              <select
                value={formState.priority}
                onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value as ProviderTask["priority"] }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <input
              value={formState.dueAt}
              onChange={(event) => setFormState((prev) => ({ ...prev, dueAt: event.target.value }))}
              type="datetime-local"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            />
            <button
              type="button"
              onClick={() => void submitOrder()}
              disabled={!canSubmit || saving}
              className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
            >
              {saving ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Active Orders</div>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Latest first</span>
          </div>
          {isLoading ? (
            <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading orders...</div>
          ) : tasks.length === 0 ? (
            <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No orders yet.</div>
          ) : (
            <div className="grid gap-2">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                      {task.title}
                    </div>
                    <span className="text-[10px] uppercase" style={{ color: "var(--nt-text-ghost)" }}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 4 }}>
                    {task.patient_name} · {task.task_type}
                  </div>
                  {task.description && (
                    <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{task.description}</div>
                  )}
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                    {task.due_at ? `Due ${new Date(task.due_at).toLocaleString()}` : "No due date"}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {task.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => void updateTaskStatus(task.id, "completed")}
                        className="rounded-lg px-2 py-1 text-[10px]"
                        style={{ border: "1px solid rgba(29,158,117,0.35)", color: "#1D9E75" }}
                      >
                        Mark done
                      </button>
                    )}
                    {task.status === "completed" && (
                      <span className="text-[10px]" style={{ color: "#1D9E75" }}>Completed</span>
                    )}
                    {task.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => void updateTaskStatus(task.id, "cancelled")}
                        className="rounded-lg px-2 py-1 text-[10px]"
                        style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
