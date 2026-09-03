import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";
import "../App.css";

function SpeakerAgent() {
  const [minimumExperience, setMinimumExperience] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [expertise, setExpertise] = useState({
    "Artificial Intelligence": false,
    "Machine Learning": false,
    "Deep Learning": false,
    "Data Science": false,
    "Cloud Computing": false,
    "Software Engineering": false,
  });

  const handleExpertiseChange = (item) => {
    setExpertise({
      ...expertise,
      [item]: !expertise[item],
    });
  };

  const handleRecommend = async (e) => {
    e.preventDefault();

    const requiredExpertise = Object.keys(expertise).filter(
      (item) => expertise[item]
    );

    if (requiredExpertise.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Select Expertise",
        text: "Please select at least one required expertise.",
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await api.post(
        "/speaker-agent/recommend",
        {
          required_expertise: requiredExpertise,
          minimum_experience_years:
            Number(minimumExperience) || 0,
        }
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Speaker Recommendation Failed",
        text:
          error.response?.data?.detail ||
          "Something went wrong while finding a speaker.",
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
        <div className="speaker-agent-container">

          {/* Header */}

          <div
            className="speaker-agent-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1>🎤 Speaker Agent</h1>
              <p>
                Intelligent speaker recommendation based on
                expertise, experience and availability
              </p>
            </div>

            <Link
              to="/speakers"
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
              👥 Speaker Management
            </Link>
          </div>

          {/* Requirements */}

          <div className="speaker-requirements-card">
            <h2>🎯 Session Requirements</h2>

            <form onSubmit={handleRecommend}>

              <div className="speaker-input-group">
                <label>
                  Minimum Experience
                </label>

                <div className="experience-input">
                  <input
                    type="number"
                    min="0"
                    placeholder="Example: 5"
                    value={minimumExperience}
                    onChange={(e) =>
                      setMinimumExperience(e.target.value)
                    }
                  />

                  <span>Years</span>
                </div>
              </div>

              <div className="expertise-section">
                <h3>🧠 Required Expertise</h3>

                <div className="expertise-grid">
                  {Object.keys(expertise).map((item) => (
                    <label
                      key={item}
                      className={`expertise-option ${
                        expertise[item]
                          ? "expertise-selected"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={expertise[item]}
                        onChange={() =>
                          handleExpertiseChange(item)
                        }
                      />

                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="speaker-recommend-btn"
                disabled={loading}
              >
                {loading
                  ? "🔄 Finding Best Speaker..."
                  : "🔍 Find Best Speaker"}
              </button>

            </form>
          </div>

          {/* Results */}

          {result && (
            <div className="speaker-results">

              <div className="speaker-results-title">
                <h2>🤖 AI Speaker Recommendation</h2>

                <p>
                  The Speaker Agent evaluated available
                  speakers against your session requirements.
                </p>
              </div>

              {/* Best Speaker */}

              {result.best_speaker && (
                <div className="best-speaker-card">

                  <div className="best-speaker-title">
                    <span>🏆</span>

                    <div>
                      <h2>Best Speaker</h2>
                      <p>
                        Highest compatibility score
                      </p>
                    </div>
                  </div>

                  <div className="best-speaker-main">

                    <div>
                      <h1>
                        {result.best_speaker.name}
                      </h1>

                      <p>
                        🏢{" "}
                        {result.best_speaker.organization ||
                          "Organization not specified"}
                      </p>

                      <p>
                        📍{" "}
                        {result.best_speaker.city ||
                          "Location not specified"}
                      </p>

                      <p>
                        💼 Experience:{" "}
                        {result.best_speaker.experience_years ||
                          0}{" "}
                        years
                      </p>
                    </div>

                    <div
                      className={`speaker-score ${getScoreClass(
                        result.best_speaker.match_score
                      )}`}
                    >
                      <span>Match Score</span>

                      <strong>
                        {result.best_speaker.match_score}%
                      </strong>
                    </div>

                  </div>

                  <div className="speaker-checks">

                    <div>
                      {result.best_speaker.checks.expertise
                        ? "✅"
                        : "❌"}{" "}
                      Expertise
                    </div>

                    <div>
                      {result.best_speaker.checks.experience
                        ? "✅"
                        : "❌"}{" "}
                      Experience
                    </div>

                    <div>
                      {result.best_speaker.checks.availability
                        ? "✅"
                        : "❌"}{" "}
                      Availability
                    </div>

                  </div>

                  <div className="speaker-expertise">
                    <strong>Expertise:</strong>{" "}
                    {result.best_speaker.expertise ||
                      "No expertise listed"}
                  </div>

                </div>
              )}

              {/* Alternatives */}

              {result.alternatives &&
                result.alternatives.length > 0 && (
                  <div className="alternative-speaker-section">

                    <h2>🥈 Alternative Speakers</h2>

                    <div className="alternative-speaker-grid">

                      {result.alternatives.map((speaker) => (
                        <div
                          className="alternative-speaker-card"
                          key={speaker.speaker_id}
                        >

                          <div className="alternative-speaker-header">
                            <h3>
                              {speaker.name}
                            </h3>

                            <span
                              className={`alternative-score ${getScoreClass(
                                speaker.match_score
                              )}`}
                            >
                              {speaker.match_score}%
                            </span>
                          </div>

                          <p>
                            🏢{" "}
                            {speaker.organization ||
                              "Organization not specified"}
                          </p>

                          <p>
                            💼 Experience:{" "}
                            {speaker.experience_years || 0}{" "}
                            years
                          </p>

                          <p>
                            🧠{" "}
                            {speaker.expertise ||
                              "No expertise listed"}
                          </p>

                        </div>
                      ))}

                    </div>

                  </div>
                )}

              {result.alternatives &&
                result.alternatives.length === 0 && (
                  <div className="no-alternatives">
                    ℹ️ No alternative speakers are currently
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

export default SpeakerAgent;