import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";
import "../App.css";

function VenueAgent() {
  const [expectedAttendees, setExpectedAttendees] = useState("");
  const [accessibilityRequired, setAccessibilityRequired] = useState(false);

  const [facilities, setFacilities] = useState({
    Projector: false,
    WiFi: false,
    "Audio System": false,
    AC: false,
    Microphone: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFacilityChange = (facility) => {
    setFacilities({
      ...facilities,
      [facility]: !facilities[facility],
    });
  };

  const handleRecommend = async (e) => {
    e.preventDefault();

    if (!expectedAttendees || Number(expectedAttendees) <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Number",
        text: "Please enter the expected number of attendees.",
      });
      return;
    }

    const requiredFacilities = Object.keys(facilities).filter(
      (facility) => facilities[facility]
    );

    if (requiredFacilities.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Select Facilities",
        text: "Please select at least one required facility.",
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await api.post(
        "/venue-agent/recommend",
        {
          expected_attendees: Number(expectedAttendees),
          required_facilities: requiredFacilities,
          accessibility_required: accessibilityRequired,
        }
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Venue Recommendation Failed",
        text:
          error.response?.data?.detail ||
          "Something went wrong while finding a venue.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 80) return "score-good";
    if (score >= 50) return "score-medium";
    return "score-low";
  };

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div className="venue-agent-container">

          <div
            className="venue-agent-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1>🏢 Venue Agent</h1>
              <p>
                AI-powered venue recommendation and optimization
              </p>
            </div>

            <Link
              to="/venues"
              style={{
                background: "rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                padding: "10px 18px",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.2s",
              }}
            >
              🏢 Venue Management
            </Link>
          </div>

          {/* REQUIREMENTS CARD */}

          <div className="venue-requirements-card">
            <h2>🎯 Event Requirements</h2>

            <form onSubmit={handleRecommend}>

              <div className="venue-input-group">
                <label>
                  Expected Number of Attendees
                </label>

                <input
                  type="number"
                  min="1"
                  placeholder="Example: 300"
                  value={expectedAttendees}
                  onChange={(e) =>
                    setExpectedAttendees(e.target.value)
                  }
                  required
                />
              </div>

              <div className="facility-section">
                <h3>🛠 Required Facilities</h3>

                <div className="facility-grid">
                  {Object.keys(facilities).map((facility) => (
                    <label
                      className={`facility-option ${
                        facilities[facility]
                          ? "facility-selected"
                          : ""
                      }`}
                      key={facility}
                    >
                      <input
                        type="checkbox"
                        checked={facilities[facility]}
                        onChange={() =>
                          handleFacilityChange(facility)
                        }
                      />

                      <span>{facility}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="accessibility-option">
                <label>
                  <input
                    type="checkbox"
                    checked={accessibilityRequired}
                    onChange={(e) =>
                      setAccessibilityRequired(
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    ♿ Accessibility assistance required
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="venue-recommend-btn"
                disabled={loading}
              >
                {loading
                  ? "🔄 Finding Best Venue..."
                  : "🔍 Find Best Venue"}
              </button>

            </form>
          </div>

          {/* RESULTS */}

          {result && (
            <div className="venue-results">

              <div className="results-title">
                <h2>🤖 AI Venue Recommendation</h2>

                <p>
                  The Venue Agent evaluated available venues
                  against your event requirements.
                </p>
              </div>

              {/* BEST VENUE */}

              {result.best_venue && (
                <div className="best-venue-card">

                  <div className="best-venue-title">
                    <span>🏆</span>

                    <div>
                      <h2>Best Venue</h2>
                      <p>Highest compatibility score</p>
                    </div>
                  </div>

                  <div className="best-venue-main">

                    <div>
                      <h1>
                        {result.best_venue.venue_name}
                      </h1>

                      <p>
                        📍 {result.best_venue.location}
                      </p>

                      <p>
                        👥 Capacity:{" "}
                        {result.best_venue.capacity}
                      </p>
                    </div>

                    <div
                      className={`venue-score ${getScoreClass(
                        result.best_venue.match_score
                      )}`}
                    >
                      <span>Match Score</span>
                      <strong>
                        {result.best_venue.match_score}%
                      </strong>
                    </div>

                  </div>

                  <div className="venue-checks">

                    <div>
                      {result.best_venue.checks.capacity
                        ? "✅"
                        : "❌"}{" "}
                      Capacity
                    </div>

                    <div>
                      {result.best_venue.checks.facilities
                        ? "✅"
                        : "❌"}{" "}
                      Facilities
                    </div>

                    <div>
                      {result.best_venue.checks.accessibility
                        ? "✅"
                        : "❌"}{" "}
                      Accessibility
                    </div>

                    <div>
                      {result.best_venue.checks.availability
                        ? "✅"
                        : "❌"}{" "}
                      Availability
                    </div>

                  </div>

                  <div className="venue-facilities">
                    <strong>Facilities:</strong>{" "}
                    {result.best_venue.facilities ||
                      "No facilities listed"}
                  </div>

                </div>
              )}

              {/* ALTERNATIVES */}

              {result.alternatives &&
                result.alternatives.length > 0 && (
                  <div className="alternative-section">

                    <h2>🥈 Alternative Venues</h2>

                    <div className="alternative-grid">

                      {result.alternatives.map((venue) => (
                        <div
                          className="alternative-card"
                          key={venue.venue_id}
                        >

                          <div className="alternative-header">
                            <h3>
                              {venue.venue_name}
                            </h3>

                            <span
                              className={`alternative-score ${getScoreClass(
                                venue.match_score
                              )}`}
                            >
                              {venue.match_score}%
                            </span>
                          </div>

                          <p>
                            📍 {venue.location}
                          </p>

                          <p>
                            👥 Capacity: {venue.capacity}
                          </p>

                          <p>
                            🛠{" "}
                            {venue.facilities ||
                              "No facilities listed"}
                          </p>

                        </div>
                      ))}

                    </div>

                  </div>
                )}

              {/* NO ALTERNATIVES */}

              {result.alternatives &&
                result.alternatives.length === 0 && (
                  <div className="no-alternatives">
                    ℹ️ No alternative venues are currently
                    available.
                  </div>
                )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default VenueAgent;