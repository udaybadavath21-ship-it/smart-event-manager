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
    width: "640px",
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

function Venues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("all");

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    venue_name: "",
    location: "",
    capacity: "",
    facilities: "",
    accessibility: true,
    available: true,
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch all venues from backend
  const fetchVenues = async () => {
    try {
      setLoading(true);
      const res = await api.get("/venues");
      setVenues(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load venues:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.detail || "Failed to load venues.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      venue_name: "",
      location: "",
      capacity: "",
      facilities: "",
      accessibility: true,
      available: true,
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

    if (!formData.venue_name || !formData.venue_name.trim()) {
      errors.venue_name = "Venue name is required.";
    }

    if (!formData.location || !formData.location.trim()) {
      errors.location = "Location is required.";
    }

    if (
      formData.capacity === "" ||
      isNaN(Number(formData.capacity)) ||
      Number(formData.capacity) <= 0
    ) {
      errors.capacity = "Capacity must be a positive number greater than 0.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveVenue = async (e) => {
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

      const payload = {
        venue_name: formData.venue_name.trim(),
        location: formData.location.trim(),
        capacity: Number(formData.capacity),
        facilities: formData.facilities.trim() || null,
        accessibility: Boolean(formData.accessibility),
        available: Boolean(formData.available),
      };

      await api.post("/venues", payload);

      Swal.fire({
        icon: "success",
        title: "Venue Added Successfully",
        text: `${payload.venue_name} has been added to available venues.`,
        timer: 2000,
        showConfirmButton: false,
      });

      handleCloseModal();
      await fetchVenues();
    } catch (error) {
      console.error("Failed to add venue:", error);
      const detailMsg =
        error.response?.data?.detail ||
        (typeof error.response?.data === "string" ? error.response.data : null) ||
        "Failed to add venue. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Failed to Add Venue",
        text: detailMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVenue = async (venue) => {
    const confirm = await Swal.fire({
      title: "Delete Venue?",
      text: `Are you sure you want to delete "${venue.venue_name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/venue/${venue.venue_id}`);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: `Venue "${venue.venue_name}" has been removed.`,
        timer: 1800,
        showConfirmButton: false,
      });
      fetchVenues();
    } catch (error) {
      console.error("Failed to delete venue:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.response?.data?.detail || "Could not delete venue.",
      });
    }
  };

  // KPI Calculations
  const totalVenues = venues.length;
  const availableVenues = venues.filter((v) => v.available).length;
  const unavailableVenues = totalVenues - availableVenues;
  const totalCapacity = venues.reduce(
    (acc, v) => acc + (Number(v.capacity) || 0),
    0
  );

  // Filtered venues
  const filteredVenues = venues.filter((v) => {
    const matchesSearch =
      (v.venue_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.facilities || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterAvailability === "available") return v.available === true;
    if (filterAvailability === "unavailable") return v.available === false;

    return true;
  });

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "10px 10px 40px" }}>
          
          {/* Header Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 60%, #0f172a 100%)",
              borderRadius: "18px",
              padding: "32px 36px",
              color: "#ffffff",
              marginBottom: "28px",
              boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.3)",
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
                Physical Infrastructure
              </div>
              <h1
                style={{
                  fontSize: "30px",
                  fontWeight: "700",
                  margin: "0 0 6px 0",
                  color: "#ffffff",
                }}
              >
                🏢 Venue Management
              </h1>
              <p
                style={{
                  margin: 0,
                  opacity: 0.92,
                  fontSize: "15px",
                  maxWidth: "600px",
                  color: "#e0f2fe",
                }}
              >
                Register and organize event spaces, audit seating capacities, track facility equipment, and coordinate room scheduling.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link
                to="/venue-agent"
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
                🤖 AI Recommendations
              </Link>

              <button
                onClick={handleOpenModal}
                style={{
                  background: "#38bdf8",
                  color: "#0f172a",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(56, 189, 248, 0.4)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(56, 189, 248, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(56, 189, 248, 0.4)";
                }}
              >
                ➕ Add Venue
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
            {/* Card 1: Total Venues */}
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
                🏢
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Total Venues
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>
                  {totalVenues}
                </div>
              </div>
            </div>

            {/* Card 2: Available Venues */}
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
                ✅
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Available Venues
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#16a34a" }}>
                  {availableVenues}
                </div>
              </div>
            </div>

            {/* Card 3: Unavailable Venues */}
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
                🔒
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Unavailable Venues
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#d97706" }}>
                  {unavailableVenues}
                </div>
              </div>
            </div>

            {/* Card 4: Total Capacity */}
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
                  background: "#f3e8ff",
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
                  Total Capacity
                </div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#7c3aed" }}>
                  {totalCapacity.toLocaleString()}
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
            <div style={{ position: "relative", flex: "1", minWidth: "260px" }}>
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
                placeholder="Search by venue name, location, or facility..."
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

            {/* Availability Filter Dropdown */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
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
                <option value="all">All Venues ({totalVenues})</option>
                <option value="available">Available Only ({availableVenues})</option>
                <option value="unavailable">Unavailable Only ({unavailableVenues})</option>
              </select>

              {(searchTerm || filterAvailability !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterAvailability("all");
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

          {/* Venues Grid / List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔄</div>
              <p style={{ color: "#64748b", fontSize: "16px" }}>Loading venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                padding: "60px 20px",
                borderRadius: "16px",
                textAlign: "center",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>🏢</div>
              <h3 style={{ fontSize: "20px", color: "#1e293b", margin: "0 0 8px 0" }}>No Venues Found</h3>
              <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "450px", margin: "0 auto 20px" }}>
                {searchTerm || filterAvailability !== "all"
                  ? "No venues match your current search and filter criteria."
                  : "No venues registered yet. Add your first event space to begin scheduling sessions!"}
              </p>
              <button
                onClick={handleOpenModal}
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ➕ Add Venue
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
              {filteredVenues.map((venue) => {
                const facilitiesList = venue.facilities
                  ? venue.facilities.split(",").map((f) => f.trim()).filter(Boolean)
                  : [];

                return (
                  <div
                    key={venue.venue_id}
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
                        }}
                      >
                        {/* Availability Badge */}
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: venue.available ? "#dcfce7" : "#fee2e2",
                            color: venue.available ? "#15803d" : "#b91c1c",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: venue.available ? "#22c55e" : "#ef4444",
                            }}
                          />
                          {venue.available ? "Available" : "Unavailable"}
                        </span>

                        {/* Accessibility Badge */}
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: venue.accessibility ? "#e0f2fe" : "#f1f5f9",
                            color: venue.accessibility ? "#0369a1" : "#64748b",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {venue.accessibility ? "♿ Accessible" : "⚠️ Not Accessible"}
                        </span>
                      </div>

                      {/* Venue Name & Location */}
                      <h3
                        style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#0f172a",
                          margin: "0 0 8px 0",
                        }}
                      >
                        {venue.venue_name}
                      </h3>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#475569",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>📍</span>
                        <span>{venue.location}</span>
                      </div>

                      {/* Capacity Pill */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#f8fafc",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          marginBottom: "16px",
                          fontSize: "13px",
                          color: "#1e293b",
                          fontWeight: "600",
                        }}
                      >
                        <span>👥 Capacity:</span>
                        <span style={{ color: "#0284c7", fontSize: "15px" }}>
                          {venue.capacity} seats
                        </span>
                      </div>

                      {/* Facilities Chips */}
                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "8px",
                          }}
                        >
                          Facilities & Amenities
                        </div>

                        {facilitiesList.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {facilitiesList.map((facility, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  padding: "4px 10px",
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
                          <span style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
                            No specific facilities listed.
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
                        ID #{venue.venue_id}
                      </span>

                      <button
                        onClick={() => handleDeleteVenue(venue)}
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

          {/* Add Venue Modal */}
          <Modal
            isOpen={modalOpen}
            onRequestClose={handleCloseModal}
            style={modalStyles}
            contentLabel="Add New Venue"
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
                  🏢 Add New Venue
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                  Register an event room, auditorium, or hall.
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

            <form onSubmit={handleSaveVenue}>
              {/* Venue Name */}
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
                  Venue Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="venue_name"
                  placeholder="e.g. Grand Auditorium, Hall B, Room 302"
                  value={formData.venue_name}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${formErrors.venue_name ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {formErrors.venue_name && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {formErrors.venue_name}
                  </span>
                )}
              </div>

              {/* Location */}
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
                  Location / Floor <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g. Main Building, Floor 2, East Wing"
                  value={formData.location}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${formErrors.location ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {formErrors.location && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {formErrors.location}
                  </span>
                )}
              </div>

              {/* Capacity */}
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
                  Capacity (seats) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  name="capacity"
                  placeholder="e.g. 250"
                  min="1"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${formErrors.capacity ? "#ef4444" : "#cbd5e1"}`,
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {formErrors.capacity && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {formErrors.capacity}
                  </span>
                )}
              </div>

              {/* Facilities */}
              <div style={{ marginBottom: "22px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Facilities & Equipment (comma-separated)
                </label>
                <input
                  type="text"
                  name="facilities"
                  placeholder="e.g. Projector, AC, High-Speed WiFi, Audio System, Stage"
                  value={formData.facilities}
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
                  Separate items with commas. Used by the Venue Agent for intelligent recommendations.
                </span>
              </div>

              {/* Toggles Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "26px",
                }}
              >
                {/* Accessibility Toggle */}
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
                    name="accessibility"
                    checked={formData.accessibility}
                    onChange={handleInputChange}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#0284c7",
                      cursor: "pointer",
                    }}
                  />
                  ♿ Wheelchair Accessible
                </label>

                {/* Available Toggle */}
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
                    name="available"
                    checked={formData.available}
                    onChange={handleInputChange}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#16a34a",
                      cursor: "pointer",
                    }}
                  />
                  ✅ Available for Scheduling
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
                    background: "#0284c7",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                  }}
                >
                  {submitting ? "Saving..." : "💾 Save Venue"}
                </button>
              </div>
            </form>
          </Modal>

        </div>
      </div>
    </div>
  );
}

export default Venues;
