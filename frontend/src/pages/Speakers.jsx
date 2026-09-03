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

function Speakers() {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("all");

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    expertise: "",
    organization: "",
    experience_years: "",
    city: "",
    available: true,
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch all speakers
  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/speakers");
      setSpeakers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load speakers:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.detail || "Failed to load speakers.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeakers();
  }, []);

  // Form Reset
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      expertise: "",
      organization: "",
      experience_years: "",
      city: "",
      available: true,
    });
    setFormErrors({});
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setModalOpen(false);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};

    // Name required
    if (!formData.name.trim()) {
      errors.name = "Speaker Name is required.";
    }

    // Email required and valid format
    if (!formData.email.trim()) {
      errors.email = "Email address is required.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
    }

    // Phone validation (if provided, at least 7 characters with valid phone symbols)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = "Please enter a valid phone number.";
      }
    }

    // Experience must be non-negative number if provided
    if (formData.experience_years !== "" && formData.experience_years !== null) {
      const expNum = Number(formData.experience_years);
      if (isNaN(expNum) || expNum < 0) {
        errors.experience_years = "Experience must be a non-negative number (0 or more).";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submission
  const handleSaveSpeaker = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        expertise: formData.expertise.trim() || null,
        organization: formData.organization.trim() || null,
        experience_years: formData.experience_years !== "" ? Number(formData.experience_years) : null,
        city: formData.city.trim() || null,
        available: Boolean(formData.available),
      };

      await api.post("/speakers", payload);

      await Swal.fire({
        icon: "success",
        title: "Speaker Added Successfully",
        text: `${payload.name} has been added to the speakers registry.`,
        timer: 1800,
        showConfirmButton: false,
      });

      handleCloseModal();
      await fetchSpeakers();

    } catch (error) {
      console.error("Failed to add speaker:", error);
      const errorMsg =
        error.response?.data?.detail ||
        (Array.isArray(error.response?.data)
          ? error.response.data.map((d) => d.msg).join(", ")
          : "Failed to create speaker. Please try again.");

      Swal.fire({
        icon: "error",
        title: "Failed to Add Speaker",
        text: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Speaker Handler
  const handleDeleteSpeaker = async (speaker) => {
    const confirm = await Swal.fire({
      title: "Delete Speaker?",
      text: `Are you sure you want to remove "${speaker.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/speaker/${speaker.speaker_id}`);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: `${speaker.name} has been removed.`,
        timer: 1500,
        showConfirmButton: false,
      });
      fetchSpeakers();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.response?.data?.detail || "Could not delete speaker.",
      });
    }
  };

  // KPI Calculations
  const totalSpeakers = speakers.length;
  const availableSpeakers = speakers.filter((s) => s.available).length;
  const unavailableSpeakers = totalSpeakers - availableSpeakers;
  const avgExp =
    totalSpeakers > 0
      ? (
          speakers.reduce((acc, s) => acc + (s.experience_years || 0), 0) /
          totalSpeakers
        ).toFixed(1)
      : 0;

  // Filtering
  const filteredSpeakers = speakers.filter((s) => {
    const matchesSearch =
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.organization && s.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.expertise && s.expertise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterAvailability === "available") return s.available;
    if (filterAvailability === "unavailable") return !s.available;
    return true;
  });

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div style={{ maxWidth: "1350px", margin: "0 auto" }}>

          {/* Header Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
              borderRadius: "16px",
              padding: "28px 32px",
              color: "#ffffff",
              marginBottom: "24px",
              boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 6px 0", color: "#fff" }}>
                🎤 Speaker Management
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: "15px" }}>
                Register, manage profiles, and monitor availability for event sessions
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Link
                to="/speaker-agent"
                style={{
                  background: "rgba(255, 255, 255, 0.18)",
                  color: "#ffffff",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🤖 AI Recommendations
              </Link>

              <button
                onClick={handleOpenModal}
                style={{
                  background: "#ffffff",
                  color: "#4338ca",
                  padding: "11px 22px",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                ➕ Add Speaker
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "20px 24px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                borderLeft: "5px solid #6366f1",
              }}
            >
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>
                Total Speakers
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", marginTop: "6px" }}>
                {totalSpeakers}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "20px 24px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                borderLeft: "5px solid #10b981",
              }}
            >
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>
                Available
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#10b981", marginTop: "6px" }}>
                {availableSpeakers}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "20px 24px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                borderLeft: "5px solid #f59e0b",
              }}
            >
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>
                Unavailable
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#f59e0b", marginTop: "6px" }}>
                {unavailableSpeakers}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "20px 24px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                borderLeft: "5px solid #06b6d4",
              }}
            >
              <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>
                Avg Experience
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#06b6d4", marginTop: "6px" }}>
                {avgExp} <span style={{ fontSize: "16px", fontWeight: "500", color: "#64748b" }}>years</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ flex: "1", minWidth: "260px" }}>
              <input
                type="text"
                placeholder="🔍 Search speakers by name, organization, expertise, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <label style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Availability:</label>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Statuses ({speakers.length})</option>
                <option value="available">Available Only ({availableSpeakers})</option>
                <option value="unavailable">Unavailable Only ({unavailableSpeakers})</option>
              </select>
            </div>
          </div>

          {/* Speakers List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b", fontSize: "16px" }}>
              🔄 Loading speakers registry...
            </div>
          ) : filteredSpeakers.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "60px 20px",
                textAlign: "center",
                color: "#64748b",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "14px" }}>🎤</div>
              <h3 style={{ fontSize: "20px", color: "#1e293b", margin: "0 0 8px 0" }}>No Speakers Found</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "14px" }}>
                {searchTerm || filterAvailability !== "all"
                  ? "No speakers match the current search or filter criteria."
                  : "No speakers in the database yet. Add your first speaker!"}
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
                ➕ Add Speaker
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "20px",
              }}
            >
              {filteredSpeakers.map((speaker) => {
                const initials = speaker.name
                  ? speaker.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "SP";

                const expertiseList = speaker.expertise
                  ? speaker.expertise.split(",").map((e) => e.trim()).filter(Boolean)
                  : [];

                return (
                  <div
                    key={speaker.speaker_id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      padding: "24px",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 10px 22px rgba(0, 0, 0, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.05)";
                    }}
                  >
                    <div>
                      {/* Card Header: Avatar, Name, Availability */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                          <div
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "700",
                              fontSize: "18px",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#1e293b" }}>
                              {speaker.name}
                            </h3>
                            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>
                              {speaker.organization || "Independent Speaker"}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: speaker.available ? "#dcfce7" : "#f1f5f9",
                            color: speaker.available ? "#15803d" : "#64748b",
                            border: `1px solid ${speaker.available ? "#86efac" : "#cbd5e1"}`,
                          }}
                        >
                          {speaker.available ? "● Available" : "○ Busy"}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          marginBottom: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          padding: "12px",
                          background: "#f8fafc",
                          borderRadius: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span>📧</span>
                          <span style={{ fontWeight: "500", wordBreak: "break-all" }}>{speaker.email}</span>
                        </div>

                        {speaker.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>📞</span>
                            <span>{speaker.phone}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {speaker.city && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>📍</span>
                              <span>{speaker.city}</span>
                            </div>
                          )}

                          {speaker.experience_years !== null && speaker.experience_years !== undefined && (
                            <span
                              style={{
                                marginLeft: "auto",
                                background: "#e0e7ff",
                                color: "#4338ca",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                            >
                              ⭐ {speaker.experience_years} yrs exp
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expertise Badges */}
                      {expertiseList.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700", marginBottom: "6px" }}>
                            Expertise
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {expertiseList.map((exp, idx) => (
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
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div
                      style={{
                        paddingTop: "14px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        ID #{speaker.speaker_id}
                      </span>

                      <button
                        onClick={() => handleDeleteSpeaker(speaker)}
                        style={{
                          background: "transparent",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Add Speaker Modal */}
      <Modal
        isOpen={modalOpen}
        onRequestClose={handleCloseModal}
        style={modalStyles}
        contentLabel="Add Speaker Modal"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#1e293b" }}>
              ➕ Add New Speaker
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>
              Enter the speaker's contact details, professional background, and availability
            </p>
          </div>

          <button
            onClick={handleCloseModal}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "24px",
              color: "#94a3b8",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveSpeaker}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

            {/* Speaker Name */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Speaker Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: formErrors.name ? "1px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {formErrors.name && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{formErrors.name}</div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Email Address <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. jane.doe@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: formErrors.email ? "1px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {formErrors.email && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{formErrors.email}</div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +1 555-123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: formErrors.phone ? "1px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {formErrors.phone && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{formErrors.phone}</div>
              )}
            </div>

            {/* Organization */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Organization / Affiliation
              </label>
              <input
                type="text"
                placeholder="e.g. Google, MIT, OpenAI"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Experience (Years) */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: formErrors.experience_years ? "1px solid #ef4444" : "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {formErrors.experience_years && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{formErrors.experience_years}</div>
              )}
            </div>

            {/* City */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                City / Location
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Expertise */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Expertise / Specialization
              </label>
              <input
                type="text"
                placeholder="e.g. Artificial Intelligence, Machine Learning, Cloud Architecture"
                value={formData.expertise}
                onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                Separate multiple topics with commas
              </span>
            </div>

            {/* Available Toggle */}
            <div style={{ gridColumn: "span 2", padding: "12px 16px", background: "#f8fafc", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "#1e293b" }}>Available for Scheduling</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Speaker will appear in session assignment dropdowns
                </div>
              </div>

              <label style={{ position: "relative", display: "inline-block", width: "48px", height: "26px" }}>
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: formData.available ? "#10b981" : "#cbd5e1",
                    transition: "0.3s",
                    borderRadius: "26px",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: '""',
                      height: "20px",
                      width: "20px",
                      left: formData.available ? "24px" : "3px",
                      bottom: "3px",
                      backgroundColor: "white",
                      transition: "0.3s",
                      borderRadius: "50%",
                    }}
                  />
                </span>
              </label>
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={submitting}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "14px",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {submitting ? "🔄 Saving..." : "💾 Save Speaker"}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default Speakers;
