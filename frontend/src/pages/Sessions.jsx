import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api";
import Swal from "sweetalert2";
import Modal from "react-modal";
import "../App.css";

// Configure react-modal root
if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

const modalStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "680px",
    maxWidth: "92%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    border: "none",
    backgroundColor: "#ffffff",
  },
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
  },
};

// Helper: Format default datetime-local string (tomorrow at given hour)
const getDefaultDateTime = (daysAhead, hours, minutes) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, minutes, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hours)}:${pad(minutes)}`;
};

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    event: "Smart Event Summit 2026",
    session_title: "",
    session_type: "Technical",
    description: "",
    expected_attendees: "",
    start_time: getDefaultDateTime(1, 10, 0),
    end_time: getDefaultDateTime(1, 11, 30),
    required_facilities: "Projector, WiFi, Audio",
    accessibility_required: false,
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch all sessions from backend
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sessions");
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.detail || "Failed to load sessions.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      event: "Smart Event Summit 2026",
      session_title: "",
      session_type: "Technical",
      description: "",
      expected_attendees: "",
      start_time: getDefaultDateTime(1, 10, 0),
      end_time: getDefaultDateTime(1, 11, 30),
      required_facilities: "Projector, WiFi, Audio",
      accessibility_required: false,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.event || !formData.event.trim()) {
      errors.event = "Event name is required.";
    }

    if (!formData.session_title || !formData.session_title.trim()) {
      errors.session_title = "Session title is required.";
    }

    if (!formData.session_type || !formData.session_type.trim()) {
      errors.session_type = "Session type is required.";
    }

    if (
      formData.expected_attendees === "" ||
      isNaN(Number(formData.expected_attendees)) ||
      Number(formData.expected_attendees) <= 0
    ) {
      errors.expected_attendees = "Expected attendees must be a positive number greater than 0.";
    }

    if (!formData.start_time) {
      errors.start_time = "Start time is required.";
    }

    if (!formData.end_time) {
      errors.end_time = "End time is required.";
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        errors.end_time = "End time must be after start time.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Input",
        text: "Please correct the errors in the form before submitting.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const facilitiesList = formData.required_facilities
        ? formData.required_facilities
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : [];

      const payload = {
        event: formData.event.trim(),
        session_title: formData.session_title.trim(),
        session_type: formData.session_type.trim(),
        description: formData.description.trim() || null,
        expected_attendees: Number(formData.expected_attendees),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        required_facilities: facilitiesList,
        accessibility_required: Boolean(formData.accessibility_required),
      };

      await api.post("/sessions", payload);

      Swal.fire({
        icon: "success",
        title: "Session Added Successfully",
        text: `"${payload.session_title}" has been registered.`,
        timer: 2000,
        showConfirmButton: false,
      });

      handleCloseModal();
      await fetchSessions();
    } catch (error) {
      console.error("Failed to add session:", error);
      const detailMsg =
        error.response?.data?.detail ||
        (typeof error.response?.data === "string" ? error.response.data : null) ||
        "Failed to add session. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Failed to Add Session",
        text: detailMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (session) => {
    const confirm = await Swal.fire({
      title: "Delete Session?",
      text: `Are you sure you want to delete "${session.session_title}"? Any scheduled bookings for this session will also be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/session/${session.session_id}`);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: `Session "${session.session_title}" has been removed.`,
        timer: 1800,
        showConfirmButton: false,
      });
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.response?.data?.detail || "Could not delete session.",
      });
    }
  };

  // KPI Calculations
  const totalSessions = sessions.length;
  const technicalSessions = sessions.filter((s) =>
    (s.session_type || "").toLowerCase().includes("tech")
  ).length;
  const totalExpectedAttendees = sessions.reduce(
    (acc, s) => acc + (Number(s.expected_attendees) || 0),
    0
  );
  const accessibilityRequiredCount = sessions.filter(
    (s) => s.accessibility_required
  ).length;

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (s.session_title || "").toLowerCase().includes(query) ||
      (s.event || "").toLowerCase().includes(query) ||
      (s.description || "").toLowerCase().includes(query) ||
      (s.session_type || "").toLowerCase().includes(query) ||
      (s.required_facilities || "").toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterType !== "all") {
      return (s.session_type || "").toLowerCase() === filterType.toLowerCase();
    }

    return true;
  });

  // Unique session types for filter dropdown
  const uniqueTypes = Array.from(
    new Set(sessions.map((s) => s.session_type).filter(Boolean))
  );

  const formatDateTime = (dtStr) => {
    if (!dtStr) return "TBD";
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dtStr);
    }
  };

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "10px 10px 40px" }}>
          
          {/* Header Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #1e1b4b 100%)",
              borderRadius: "18px",
              padding: "32px 36px",
              color: "#ffffff",
              marginBottom: "28px",
              boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(255, 255, 255, 0.18)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Event Agenda & Tracks
              </div>
              <h1
                style={{
                  fontSize: "30px",
                  fontWeight: "700",
                  margin: "0 0 6px 0",
                  color: "#ffffff",
                }}
              >
                📋 Session Management
              </h1>
              <p
                style={{
                  margin: 0,
                  opacity: 0.92,
                  fontSize: "15px",
                  maxWidth: "640px",
                  color: "#e0e7ff",
                }}
              >
                Create and organize keynotes, technical workshops, and panel sessions. Manage participant capacity, equipment requirements, and schedule coordinates.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link
                to="/scheduling"
                style={{
                  background: "rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s ease",
                }}
              >
                📅 Go to Scheduling
              </Link>

              <button
                onClick={handleOpenModal}
                style={{
                  background: "#a5b4fc",
                  color: "#1e1b4b",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(165, 180, 252, 0.4)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(165, 180, 252, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(165, 180, 252, 0.4)";
                }}
              >
                ➕ Add Session
              </button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "28px",
            }}
          >
            {/* Card 1: Total Sessions */}
            <div
              style={{
                background: "#ffffff",
                padding: "22px 24px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "#e0e7ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                📋
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Total Sessions
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>
                  {totalSessions}
                </div>
              </div>
            </div>

            {/* Card 2: Technical Sessions */}
            <div
              style={{
                background: "#ffffff",
                padding: "22px 24px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                💻
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Technical Sessions
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#0284c7" }}>
                  {technicalSessions}
                </div>
              </div>
            </div>

            {/* Card 3: Total Expected Attendees */}
            <div
              style={{
                background: "#ffffff",
                padding: "22px 24px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                👥
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Total Expected Attendees
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#16a34a" }}>
                  {totalExpectedAttendees.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Card 4: Accessibility Required */}
            <div
              style={{
                background: "#ffffff",
                padding: "22px 24px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                ♿
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Accessibility Required
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#d97706" }}>
                  {accessibilityRequiredCount}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px 20px",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1", minWidth: "280px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "16px",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by title, event, description, or track..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 42px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Session Type Filter Dropdown */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Session Types ({totalSessions})</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} ({sessions.filter((s) => s.session_type === type).length})
                  </option>
                ))}
              </select>

              {(searchTerm || filterType !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("all");
                  }}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Sessions Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔄</div>
              <p style={{ color: "#64748b", fontSize: "16px" }}>Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                padding: "60px 20px",
                borderRadius: "16px",
                textAlign: "center",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>📋</div>
              <h3 style={{ fontSize: "20px", color: "#1e293b", margin: "0 0 8px 0" }}>No Sessions Found</h3>
              <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "450px", margin: "0 auto 20px" }}>
                {searchTerm || filterType !== "all"
                  ? "No sessions match your current search and filter criteria."
                  : "No sessions registered yet. Add your first conference session to begin scheduling!"}
              </p>
              <button
                onClick={handleOpenModal}
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ➕ Add Session
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "24px",
              }}
            >
              {filteredSessions.map((session) => {
                const facilitiesList = session.required_facilities
                  ? session.required_facilities.split(",").map((f) => f.trim()).filter(Boolean)
                  : [];

                return (
                  <div
                    key={session.session_id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.04)";
                    }}
                  >
                    <div style={{ padding: "24px" }}>
                      {/* Top Badges Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "14px",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "#e0e7ff",
                            color: "#4338ca",
                          }}
                        >
                          📌 {session.session_type || "General"}
                        </span>

                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: session.accessibility_required ? "#fef3c7" : "#f1f5f9",
                            color: session.accessibility_required ? "#b45309" : "#64748b",
                          }}
                        >
                          {session.accessibility_required ? "♿ ADA Required" : "Standard Access"}
                        </span>
                      </div>

                      {/* Event Tag */}
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "#6366f1",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "6px",
                        }}
                      >
                        🎟 {session.event}
                      </div>

                      {/* Session Title */}
                      <h3
                        style={{
                          fontSize: "19px",
                          fontWeight: "700",
                          color: "#0f172a",
                          margin: "0 0 10px 0",
                          lineHeight: "1.35",
                        }}
                      >
                        {session.session_title}
                      </h3>

                      {/* Description */}
                      {session.description && (
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#64748b",
                            lineHeight: "1.5",
                            marginBottom: "16px",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {session.description}
                        </p>
                      )}

                      {/* Key Metrics: Attendees & Schedule */}
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          marginBottom: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                          <span>👥 Expected:</span>
                          <span style={{ fontWeight: "700", color: "#4f46e5" }}>
                            {session.expected_attendees || "Open"} attendees
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                          <span>🕒 Slot:</span>
                          <span>
                            {formatDateTime(session.start_time)} – {formatDateTime(session.end_time)}
                          </span>
                        </div>
                      </div>

                      {/* Required Facilities Chips */}
                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "8px",
                          }}
                        >
                          Required Equipment
                        </div>

                        {facilitiesList.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {facilitiesList.map((facility, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                }}
                              >
                                ⚡ {facility}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                            No specific facilities required.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Card Actions */}
                    <div
                      style={{
                        padding: "14px 24px",
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        ID #{session.session_id}
                      </span>

                      <button
                        onClick={() => handleDeleteSession(session)}
                        style={{
                          background: "transparent",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#fee2e2";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Session Modal */}
          <Modal
            isOpen={modalOpen}
            onRequestClose={handleCloseModal}
            style={modalStyles}
            contentLabel="Add New Session"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "14px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", color: "#0f172a" }}>
                  📋 Add New Session
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                  Define session tracks, capacity, and equipment requirements.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSession}>
              {/* Event Name */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Event <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="event"
                  placeholder="e.g. Smart Event Summit 2026"
                  value={formData.event}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${formErrors.event ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {formErrors.event && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {formErrors.event}
                  </span>
                )}
              </div>

              {/* Session Title */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Session Title <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="session_title"
                  placeholder="e.g. Keynote: Autonomous AI Systems Architecture"
                  value={formData.session_title}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${formErrors.session_title ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {formErrors.session_title && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {formErrors.session_title}
                  </span>
                )}
              </div>

              {/* Session Type & Expected Attendees (Two columns) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Session Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    name="session_type"
                    value={formData.session_type}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${formErrors.session_type ? "#ef4444" : "#cbd5e1"}`,
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="Technical">Technical</option>
                    <option value="Keynote">Keynote</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Panel Discussion">Panel Discussion</option>
                    <option value="Breakout Session">Breakout Session</option>
                    <option value="Networking">Networking</option>
                    <option value="General">General</option>
                  </select>
                  {formErrors.session_type && (
                    <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      {formErrors.session_type}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Expected Attendees <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="expected_attendees"
                    placeholder="e.g. 150"
                    min="1"
                    value={formData.expected_attendees}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${formErrors.expected_attendees ? "#ef4444" : "#cbd5e1"}`,
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {formErrors.expected_attendees && (
                    <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      {formErrors.expected_attendees}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Outline topics covered, target audience, session learning goals..."
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Start & End Times (Two columns) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Start Time <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${formErrors.start_time ? "#ef4444" : "#cbd5e1"}`,
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {formErrors.start_time && (
                    <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      {formErrors.start_time}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    End Time <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${formErrors.end_time ? "#ef4444" : "#cbd5e1"}`,
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  {formErrors.end_time && (
                    <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      {formErrors.end_time}
                    </span>
                  )}
                </div>
              </div>

              {/* Required Facilities */}
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Required Facilities (comma-separated)
                </label>
                <input
                  type="text"
                  name="required_facilities"
                  placeholder="e.g. Projector, Audio, High-Speed WiFi, AC"
                  value={formData.required_facilities}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                <span style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Evaluated by the Venue Optimization Agent when matching rooms.
                </span>
              </div>

              {/* Accessibility Required Toggle */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "24px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#334155",
                    fontWeight: "600",
                  }}
                >
                  <input
                    type="checkbox"
                    name="accessibility_required"
                    checked={formData.accessibility_required}
                    onChange={handleInputChange}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#4f46e5",
                      cursor: "pointer",
                    }}
                  />
                  ♿ Wheelchair / ADA Accessibility Required
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#4f46e5",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  {submitting ? "Saving..." : "💾 Save Session"}
                </button>
              </div>
            </form>
          </Modal>

        </div>
      </div>
    </div>
  );
}

export default Sessions;
