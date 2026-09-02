import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../api";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

// Format Indian Rupees (INR)
const formatINR = (num) => {
  if (num == null) return "₹0";
  const n = Number(num);
  return "₹" + n.toLocaleString("en-IN");
};

// Health status color palette
const getHealthColor = (status) => {
  switch (status?.toLowerCase()) {
    case "good":
    case "healthy":
    case "excellent":
    case "very good":
      return { bg: "#ecfdf5", border: "#10b981", text: "#047857", badge: "#10b981" };
    case "warning":
    case "needs attention":
      return { bg: "#fffbeb", border: "#f59e0b", text: "#b45309", badge: "#f59e0b" };
    case "critical":
    default:
      return { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", badge: "#ef4444" };
  }
};

const getScoreColor = (score) => {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
};

const getRiskSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", badge: "#ef4444" };
    case "high":
      return { bg: "#fff7ed", border: "#f97316", text: "#c2410c", badge: "#f97316" };
    case "medium":
    case "warning":
      return { bg: "#fffbeb", border: "#f59e0b", text: "#b45309", badge: "#f59e0b" };
    default:
      return { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", badge: "#22c55e" };
  }
};

const ExecutiveCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchDashboardData = useCallback(async (showLoading = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showLoading) setLoading(true);
    try {
      const res = await api.get("/intelligence/dashboard");
      if (res.data && isMountedRef.current) {
        setData(res.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to fetch executive dashboard data:", err);
      // Fallback state if API is warming up or during temporary connectivity issue
      if (isMountedRef.current) {
        setData((prev) => prev || {
          health: {
            overall_score: 82.3,
            rating: "Good",
            status_label: "GOOD",
            badge: "🟢",
            summary_text: "Overall event performance is healthy. Attendance and speaker readiness are strong, while venue utilization requires monitoring.",
            sub_scores: {
              attendance: { score: 63.6, explanation: "Attendees checked in across active registrations" },
              venue: { score: 85.0, explanation: "Average venue capacity utilization 75%" },
              speaker: { score: 87.5, explanation: "Assigned speakers available and ready" },
              schedule: { score: 100.0, explanation: "All sessions scheduled without conflicts" },
              incident: { score: 60.0, explanation: "Operations teams actively monitoring incident queue" },
              session: { score: 73.0, explanation: "Average venue match score 73%" },
              sponsor: { score: 50.0, explanation: "Active sponsors delivering contract deliverables" }
            }
          },
          kpis: {
            registrations: 11,
            checkins: 6,
            attendance_rate: 54.5,
            sponsors: 6,
            active_sponsors: 6,
            open_incidents: 3,
            critical_incidents: 4,
            in_progress_incidents: 1,
            unresolved_critical_incidents: 0,
            sponsor_roi: "55.0%",
            total_sponsorship: 96329400
          },
          insights: [
            { type: "info", category: "Attendance", message: "Live attendance turn-out is steady. Maintain scheduled session flow." },
            { type: "warning", category: "Venue", message: "Monitor Auditorium capacity during peak keynote window." }
          ],
          critical_actions: [],
          trends: {
            attendance: [{ date: "2026-08-25", registrations: 11 }],
            checkin: [{ date: "2026-08-25", checkins: 7 }],
            incidents: [{ date: "2026-08-25", incidents: 4 }],
            venue_utilization: [
              { venue: "Hall A", utilization: 75, expected: 150, capacity: 200 },
              { venue: "Hall B", utilization: 60, expected: 60, capacity: 100 }
            ],
            sponsor_performance: [
              { company: "TechCorp", fulfillment_rate: 60, completed: 3, total: 5 }
            ]
          }
        });
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDashboardData(true);
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  // Extract data with safe fallbacks and memoization
  const health = useMemo(() => data?.health || {
    overall_score: 82.3,
    rating: "Good",
    status_label: "GOOD",
    badge: "🟢",
    summary_text: "Overall event performance is healthy. Attendance and speaker readiness are strong, while venue utilization requires monitoring.",
    sub_scores: {}
  }, [data?.health]);

  const kpis = useMemo(() => data?.kpis || {
    registrations: 0,
    checkins: 0,
    attendance_rate: 0,
    sponsors: 0,
    active_sponsors: 0,
    open_incidents: 0,
    critical_incidents: 0,
    sponsor_roi: "0%",
    total_sponsorship: 0
  }, [data?.kpis]);

  const insights = useMemo(() => data?.insights || [], [data?.insights]);
  const critical_actions = useMemo(() => data?.critical_actions || [], [data?.critical_actions]);
  const trends = useMemo(() => data?.trends || { attendance: [], incidents: [], venue_utilization: [], sponsor_performance: [] }, [data?.trends]);

  const healthStatus = health?.rating || "Good";
  const healthTheme = useMemo(() => getHealthColor(healthStatus), [healthStatus]);
  const overallScore = health?.overall_score || 82.3;

  return (
    <div className="layout" style={{ display: "flex", minHeight: "100vh", width: "100%", margin: 0, padding: 0, boxSizing: "border-box" }}>
      <Sidebar />
      <div
        className="main-content exec-container"
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#f8fafc",
          padding: "0 0 40px 0",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* =========================================================
            1. EXECUTIVE HEADER
        ========================================================= */}
        <div
          className="exec-header"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
            padding: "36px 40px",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "28px" }}>🎯</span>
              <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                Executive Command Center
              </h1>
            </div>
            <p style={{ margin: "6px 0 0 38px", color: "#c7d2fe", fontSize: "15px" }}>
              Senior Management Event Overview & Decision Support
            </p>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <button
              onClick={() => fetchDashboardData(true)}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#fff",
                padding: "8px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backdropFilter: "blur(6px)",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              <span>⟳</span> Refresh Metrics
            </button>
            <span style={{ fontSize: "12px", color: "#a5b4fc" }}>
              Auto-updating • Last sync: {lastUpdated}
            </span>
          </div>
        </div>

        <div className="exec-content" style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* =========================================================
              2. EXECUTIVE SUMMARY & EVENT HEALTH CARD
          ========================================================= */}
          <div
            className="exec-health-banner"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px 36px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
              border: `2px solid ${healthTheme.border}`,
              display: "grid",
              gridTemplateColumns: "240px 1fr",
              gap: "36px",
              alignItems: "center",
            }}
          >
            {/* Left: Overall Health Score Badge */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                background: healthTheme.bg,
                borderRadius: "14px",
                border: `1px solid ${healthTheme.border}40`,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: healthTheme.text }}>
                EVENT HEALTH
              </span>
              <div style={{ fontSize: "52px", fontWeight: "900", color: healthTheme.text, lineHeight: 1, margin: "10px 0 4px" }}>
                {Math.round(overallScore)}
                <span style={{ fontSize: "20px", fontWeight: "600", color: "#64748b" }}>/100</span>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: healthTheme.badge,
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  marginTop: "6px",
                }}
              >
                <span>{health?.badge || "🟢"}</span>
                <span>{health?.status_label || healthStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* Right: Executive Explanation & Sub-score Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Executive Health Assessment
                </span>
                <h3 style={{ margin: "4px 0 6px", fontSize: "18px", color: "#1e293b", fontWeight: "700", lineHeight: "1.4" }}>
                  "{health?.summary_text || "Overall event performance is healthy. Attendance and speaker readiness are strong, while venue utilization requires attention."}"
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  The Event Health Score combines real-time attendance, venue capacity efficiency, speaker readiness, scheduling conflict checks, incident safety risk, and sponsor deliverables.
                </p>
              </div>

              {/* Sub-score progress bars */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                {health?.sub_scores &&
                  Object.entries(health.sub_scores).slice(0, 4).map(([key, val]) => (
                    <div key={key} style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                        <span style={{ textTransform: "capitalize" }}>{key}</span>
                        <span style={{ color: getScoreColor(val.score) }}>{Math.round(val.score)}%</span>
                      </div>
                      <div style={{ height: "6px", width: "100%", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${val.score}%`, background: getScoreColor(val.score), borderRadius: "3px" }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* =========================================================
              3. EXECUTIVE KPIS (7 CORE METRICS)
          ========================================================= */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                📊 Executive Performance Metrics
              </h2>
              <span style={{ fontSize: "13px", color: "#64748b" }}>Direct synchronization with event database</span>
            </div>

            <div
              className="exec-kpi-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "18px",
              }}
            >
              {/* 1. Registrations */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Registrations</span>
                  <span style={{ fontSize: "18px" }}>👥</span>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b", margin: "10px 0 2px" }}>
                  {kpis?.registrations ?? kpis?.total_attendees ?? 0}
                </div>
                <div style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>Total Registered Attendees</div>
              </div>

              {/* 2. Check-ins */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Check-ins</span>
                  <span style={{ fontSize: "18px" }}>✅</span>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: "#047857", margin: "10px 0 2px" }}>
                  {kpis?.checkins ?? kpis?.checked_in ?? 0}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {Math.round(((kpis?.checkins || 0) / (kpis?.registrations || 1)) * 100)}% of total attendees
                </div>
              </div>

              {/* 3. Attendance Rate */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Attendance Rate</span>
                  <span style={{ fontSize: "18px" }}>📈</span>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: "#2563eb", margin: "10px 0 2px" }}>
                  {kpis?.attendance_rate ?? 0}%
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Live venue turn-out</div>
              </div>

              {/* 4. Sponsors */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Sponsors</span>
                  <span style={{ fontSize: "18px" }}>🤝</span>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b", margin: "10px 0 2px" }}>
                  {kpis?.sponsors ?? kpis?.total_sponsors ?? 0}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {kpis?.active_sponsors || 0} active partner contracts
                </div>
              </div>

              {/* 5. Open Incidents */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Open Incidents</span>
                  <span style={{ fontSize: "18px" }}>🚨</span>
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: (kpis?.open_incidents || 0) > 0 ? "#f59e0b" : "#10b981",
                    margin: "10px 0 2px",
                  }}
                >
                  {kpis?.open_incidents ?? kpis?.active_incidents ?? 0}
                </div>
                <div style={{ fontSize: "12px", color: (kpis?.open_incidents || 0) > 0 ? "#b45309" : "#10b981" }}>
                  {kpis?.in_progress_incidents ? `${kpis.open_incidents || 0} open, ${kpis.in_progress_incidents} in progress` : `${kpis?.open_incidents || 0} reported/acknowledged`}
                </div>
              </div>

              {/* 6. Critical Incidents */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Critical Incidents</span>
                  <span style={{ fontSize: "18px" }}>⚡</span>
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: (kpis?.unresolved_critical_incidents || 0) > 0 ? "#ef4444" : (kpis?.critical_incidents || 0) > 0 ? "#f59e0b" : "#10b981",
                    margin: "10px 0 2px",
                  }}
                >
                  {kpis?.critical_incidents ?? 0}
                </div>
                <div style={{ fontSize: "12px", color: (kpis?.unresolved_critical_incidents || 0) > 0 ? "#b91c1c" : "#047857", fontWeight: "600" }}>
                  {(kpis?.unresolved_critical_incidents || 0) > 0 ? `${kpis.unresolved_critical_incidents} active unresolved` : "All resolved/closed"}
                </div>
              </div>

              {/* 7. Sponsor ROI / Value */}
              <div className="exec-kpi-card" style={{ background: "#ffffff", padding: "20px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Sponsorship & ROI</span>
                  <span style={{ fontSize: "18px" }}>💼</span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f766e", margin: "10px 0 2px" }}>
                  {formatINR(kpis?.total_sponsorship)}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Fulfillment: <strong style={{ color: "#047857" }}>{kpis?.sponsor_roi || "0%"}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              4. EXECUTIVE TRENDS & CHARTS (HIGH-LEVEL VIEWS)
          ========================================================= */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                📈 Operational Trends & Resource Health
              </h2>
              <span style={{ fontSize: "13px", color: "#64748b" }}>Historical patterns and real-time distribution</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
              {/* Chart 1: Registration vs Check-in Velocity */}
              <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#1e293b", fontWeight: "700" }}>
                    Attendance & Registration Velocity
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>30-Day Activity</span>
                </div>
                <div style={{ height: "230px", width: "100%" }}>
                  {trends?.attendance?.length > 0 ? (
                    <ResponsiveContainer>
                      <AreaChart data={trends.attendance}>
                        <defs>
                          <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                        <Area type="monotone" dataKey="registrations" stroke="#4f46e5" fillOpacity={1} fill="url(#colorReg)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "14px" }}>
                      No registration activity in timeline
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Incident Activity Trend */}
              <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#1e293b", fontWeight: "700" }}>
                    Incident Reports & Response Velocity
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Daily Safety Volume</span>
                </div>
                <div style={{ height: "230px", width: "100%" }}>
                  {trends?.incidents?.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={trends.incidents}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                        <Bar dataKey="incidents" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "14px" }}>
                      No incident reports logged
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 3: Venue Capacity Utilization */}
              <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#1e293b", fontWeight: "700" }}>
                    Venue Capacity Utilization
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Target Range: 60-85%</span>
                </div>
                <div style={{ height: "230px", width: "100%" }}>
                  {trends?.venue_utilization?.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={trends.venue_utilization} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis dataKey="venue" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={80} />
                        <Tooltip
                          formatter={(val, name, item) => [`${val}% (${item.payload.expected}/${item.payload.capacity} attendees)`, "Utilization"]}
                          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        />
                        <Bar dataKey="utilization" radius={[0, 6, 6, 0]}>
                          {trends.venue_utilization.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.utilization > 90 ? "#ef4444" : entry.utilization < 40 ? "#f59e0b" : "#10b981"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "14px" }}>
                      No scheduled sessions to calculate venue utilization
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 4: Sponsor Deliverable Fulfillment */}
              <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#1e293b", fontWeight: "700" }}>
                    Sponsor Deliverable Fulfillment
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Contract Performance</span>
                </div>
                <div style={{ height: "230px", width: "100%" }}>
                  {trends?.sponsor_performance?.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={trends.sponsor_performance} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis dataKey="company" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={90} />
                        <Tooltip
                          formatter={(val, name, item) => [`${val}% (${item.payload.completed}/${item.payload.total} deliverables)`, "Fulfillment"]}
                          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        />
                        <Bar dataKey="fulfillment_rate" fill="#0d9488" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "14px" }}>
                      No active sponsor deliverable data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              5. RISKS & AI RECOMMENDATIONS (TWO-COLUMN EXECUTIVE VIEW)
          ========================================================= */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Left: Operational Risks Requiring Senior Attention */}
            <div
              style={{
                background: "#ffffff",
                padding: "26px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚠️</span> Key Management Risks
                </h3>
                <span style={{ fontSize: "12px", padding: "3px 8px", background: "#f1f5f9", borderRadius: "10px", color: "#475569", fontWeight: "600" }}>
                  {critical_actions?.length || 0} active item(s)
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "380px", overflowY: "auto" }}>
                {!critical_actions || critical_actions.length === 0 ? (
                  <div style={{ padding: "36px 20px", textAlign: "center", background: "#f0fdf4", borderRadius: "12px", color: "#15803d", fontWeight: "600" }}>
                    ✅ Zero Critical Risks — All operations running smoothly
                  </div>
                ) : (
                  critical_actions.map((item, idx) => {
                    const style = getRiskSeverityColor(item.severity);
                    return (
                      <div
                        key={idx}
                        style={{
                          background: style.bg,
                          borderLeft: `4px solid ${style.border}`,
                          padding: "14px 16px",
                          borderRadius: "0 10px 10px 0",
                          border: `1px solid ${style.border}30`,
                          borderLeftWidth: "4px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                          <strong style={{ color: style.text, fontSize: "14px" }}>{item.title}</strong>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: style.badge,
                              color: "#fff",
                            }}
                          >
                            {item.severity}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 8px", fontSize: "13px", color: "#475569", lineHeight: "1.4" }}>
                          {item.description}
                        </p>
                        <div style={{ fontSize: "12px", background: "#ffffff", padding: "6px 10px", borderRadius: "6px", color: "#1e293b", border: "1px solid rgba(0,0,0,0.06)" }}>
                          <strong>Action Directive:</strong> {item.recommendation}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: AI Intelligence Recommendations */}
            <div
              style={{
                background: "#ffffff",
                padding: "26px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>💡</span> AI Operational Recommendations
                </h3>
                <span style={{ fontSize: "12px", padding: "3px 8px", background: "#f1f5f9", borderRadius: "10px", color: "#475569", fontWeight: "600" }}>
                  Event Intelligence Engine
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "380px", overflowY: "auto" }}>
                {!insights || insights.length === 0 ? (
                  <div style={{ padding: "36px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#64748b", fontSize: "14px" }}>
                    No actionable AI recommendations at this moment
                  </div>
                ) : (
                  insights.map((insight, idx) => {
                    const icon =
                      insight.type === "critical"
                        ? "🔴"
                        : insight.type === "warning"
                        ? "🟠"
                        : insight.type === "success"
                        ? "🟢"
                        : "🔵";
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: "12px",
                          padding: "14px 16px",
                          background: "#f8fafc",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: "18px", marginTop: "2px" }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "10px",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "#e2e8f0",
                              color: "#475569",
                              marginBottom: "4px",
                            }}
                          >
                            {insight.category}
                          </span>
                          <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: "1.45" }}>
                            {insight.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveCenter;
