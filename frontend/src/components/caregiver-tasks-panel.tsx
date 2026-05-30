"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type CareTask = {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  task_type: "medication" | "appointment" | "exercise" | "checkin" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  due_at: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  created_at: string;
};

type TaskFormState = {
  title: string;
  description: string;
  taskType: CareTask["task_type"];
  priority: CareTask["priority"];
  dueAt: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function CaregiverTasksPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>({
    title: "",
    description: "",
    taskType: "medication",
    priority: "medium",
    dueAt: "",
  });

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/caregiver/tasks", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load tasks");
      }

      const data = await res.json() as { tasks?: CareTask[] };
      setTasks(data.tasks ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void loadTasks();
  }, [loadTasks, idToken, isReady]);

  const summary = useMemo(() => {
    if (!tasks.length) return "No tasks yet.";
    const openCount = tasks.filter((task) => task.status !== "completed").length;
    return `${openCount} active task${openCount === 1 ? "" : "s"}.`;
  }, [tasks]);

  const canSubmit = formState.title.trim().length > 1;

  const submitTask = useCallback(async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      taskType: formState.taskType,
      priority: formState.priority,
      dueAt: formState.dueAt || null,
    };

    try {
      const res = await authFetch("/api/caregiver/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to create task");
      }

      const data = await res.json() as { task?: CareTask };
      if (data.task) {
        setTasks((prev) => [data.task as CareTask, ...prev]);
      }

      setFormState({
        title: "",
        description: "",
        taskType: "medication",
        priority: "medium",
        dueAt: "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [canSubmit, formState]);

  const updateTaskStatus = useCallback(async (taskId: string, status: CareTask["status"]) => {
    const res = await authFetch(`/api/caregiver/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const message = await res.text();
      setError(message || "Failed to update task");
      return;
    }

    const data = await res.json() as { task?: CareTask };
    if (data.task) {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? (data.task as CareTask) : task)));
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Care Tasks
          </h1>
          <button
            type="button"
            onClick={() => void loadTasks()}
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
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Create Task</div>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Care plan</span>
          </div>
          <div className="grid gap-2">
            <input
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Task title"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            />
            <textarea
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Notes"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 80 }}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={formState.taskType}
                onChange={(event) => setFormState((prev) => ({ ...prev, taskType: event.target.value as CareTask["task_type"] }))}
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
                onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value as CareTask["priority"] }))}
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
              onClick={() => void submitTask()}
              disabled={!canSubmit || saving}
              className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
            >
              {saving ? "Saving..." : "Save Task"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Task Board</div>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Latest first</span>
          </div>
          {isLoading ? (
            <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No tasks yet.</div>
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
                  {task.description && (
                    <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{task.description}</div>
                  )}
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                    {task.task_type} {task.due_at ? `· due ${new Date(task.due_at).toLocaleString()}` : ""}
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
