import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function SessionAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const response = await api.get("/session-analytics");

      setAnalytics(response.data);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Analytics Failed",
        text:
          error.response?.data?.detail ||
          "Unable to load session analytics.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="layout">
        <Sidebar />

        <div className="main-content">
          <div className="analytics-loading">
            📊 Loading session analytics...
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="layout">
        <Sidebar />

        <div className="main-content">
          <div className="analytics-loading">
            No analytics data available.
          </div>
        </div>
      </div>
    );
  }

  const summary = analytics.summary;

  // ----------------------------------------------------
  // Convert API objects into chart data
  // ----------------------------------------------------

  const sessionTypeData = Object.entries(
    analytics.sessions_by_type || {}
  ).map(([name, value]) => ({
    name,
    value,
  }));

  const speakerWorkloadData = Object.entries(
    analytics.speaker_workload || {}
  ).map(([name, sessions]) => ({
    name,
    sessions,
  }));

  const venueUsageData = Object.entries(
    analytics.venue_usage || {}
  ).map(([name, sessions]) => ({
    name,
    sessions,
  }));

  const venueUtilizationData = Object.entries(
    analytics.venue_utilization || {}
  ).map(([name, utilization]) => ({
    name,
    utilization,
  }));
const roomOccupancyData = Object.entries(
  analytics.room_occupancy || {}
).map(([name, occupancy]) => ({
  name,
  occupancy,
}));

const popularSessions = analytics.popular_sessions || [];

const peakAttendanceSession =
  analytics.peak_attendance_session || null;
  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div className="analytics-container">

          {/* HEADER */}

          <div className="analytics-header">
            <div>
              <h1>📊 Session Analytics</h1>

              <p>
                AI-powered insights into sessions, speakers,
                venues and event operations.
              </p>
            </div>

            <button
              className="analytics-refresh-btn"
              onClick={loadAnalytics}
            >
              🔄 Refresh
            </button>
          </div>

          {/* KPI CARDS */}

          <div className="analytics-cards">

            <div className="analytics-card">
              <div className="analytics-card-icon">
                📚
              </div>

              <div>
                <h3>Total Sessions</h3>
                <strong>
                  {summary.total_sessions}
                </strong>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-icon">
                📅
              </div>

              <div>
                <h3>Scheduled Sessions</h3>
                <strong>
                  {summary.scheduled_sessions}
                </strong>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-icon">
                🎤
              </div>

              <div>
                <h3>Speakers Assigned</h3>
                <strong>
                  {summary.speakers_assigned}
                </strong>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-icon">
                🏢
              </div>

              <div>
                <h3>Venues Used</h3>
                <strong>
                  {summary.venues_used}
                </strong>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-icon">
                ⏱️
              </div>

              <div>
                <h3>Avg Duration</h3>
                <strong>
                  {summary.average_session_duration_minutes}
                  <span className="small-unit"> min</span>
                </strong>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-icon">
                👥
              </div>

              <div>
                <h3>Expected Attendance</h3>
                <strong>
                  {summary.total_expected_attendance}
                </strong>
              </div>
            </div>

          </div>

          <div className="analytics-card">
  <div className="analytics-card-icon">
    🎯
  </div>

  <div>
    <h3>Avg Venue Match</h3>
    <strong>
      {summary.average_venue_match_score}%
    </strong>
  </div>
</div>

<div className="analytics-card">
  <div className="analytics-card-icon">
    🏟️
  </div>

  <div>
    <h3>Room Occupancy</h3>

    <strong>
      {roomOccupancyData.length > 0
        ? `${roomOccupancyData[0].occupancy}%`
        : "0%"}
    </strong>
  </div>
</div>

          {/* SECONDARY INSIGHTS */}

          <div className="analytics-mini-grid">

            <div className="analytics-mini-card">
              <span>♿</span>

              <div>
                <p>Accessibility Sessions</p>
                <strong>
                  {summary.accessibility_sessions}
                </strong>
              </div>
            </div>

            <div className="analytics-mini-card">
              <span>👥</span>

              <div>
                <p>Average Expected Attendance</p>
                <strong>
                  {summary.average_expected_attendance}
                </strong>
              </div>
            </div>

            <div className="analytics-mini-card">
              <span>🏢</span>

              <div>
                <p>Total Venues</p>
                <strong>
                  {summary.total_venues}
                </strong>
              </div>
            </div>

            <div className="analytics-mini-card">
              <span>🎤</span>

              <div>
                <p>Total Speakers</p>
                <strong>
                  {summary.total_speakers}
                </strong>
              </div>
            </div>

          </div>

          {/* CHARTS */}

          <div className="analytics-chart-grid">

            {/* SESSION TYPES */}

            <div className="analytics-chart-card">

              <h2>📚 Sessions by Type</h2>

              {sessionTypeData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <PieChart>
                    <Pie
                      data={sessionTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {sessionTypeData.map(
                        (_, index) => (
                          <Cell
                            key={`cell-${index}`}
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">
                  No session type data available.
                </div>
              )}

            </div>

            {/* SESSION POPULARITY */}

<div className="analytics-insights">

  <h2>🔥 Session Popularity</h2>

  {popularSessions.length > 0 ? (

    <div className="insight-grid">

      {popularSessions.map((session) => (

        <div
          className="insight-item"
          key={session.session_id}
        >

          <span>🔥</span>

          <div>

            <strong>
              {session.session_title}
            </strong>

            <p>
              Expected attendance:{" "}
              <b>
                {session.expected_attendees}
              </b>
            </p>

            <p>
              Type:{" "}
              {session.session_type}
            </p>

          </div>

        </div>

      ))}

    </div>

  ) : (

    <div className="no-chart-data">
      No session popularity data available.
    </div>

  )}

</div>

{/* PEAK ATTENDANCE */}

<div className="analytics-insights">

  <h2>⏰ Peak Attendance</h2>

  {peakAttendanceSession ? (

    <div className="insight-grid">

      <div className="insight-item">

        <span>📈</span>

        <div>

          <strong>
            {peakAttendanceSession.session_title}
          </strong>

          <p>
            Expected attendees:{" "}
            <b>
              {peakAttendanceSession.expected_attendees}
            </b>
          </p>

          <p>
            Time:{" "}
            {new Date(
              peakAttendanceSession.start_time
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}

            {" – "}

            {new Date(
              peakAttendanceSession.end_time
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

        </div>

      </div>

    </div>

  ) : (

    <div className="no-chart-data">
      No peak attendance data available.
    </div>

  )}

</div>

            {/* SPEAKER WORKLOAD */}

            <div className="analytics-chart-card">

              <h2>🎤 Speaker Workload</h2>

              {speakerWorkloadData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={speakerWorkloadData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />

                    <YAxis allowDecimals={false} />

                    <Tooltip />

                    <Legend />

                    <Bar
                      dataKey="sessions"
                      name="Sessions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">
                  No speaker workload data available.
                </div>
              )}

            </div>

            {/* VENUE USAGE */}

            <div className="analytics-chart-card">

              <h2>🏢 Venue Usage</h2>

              {venueUsageData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={venueUsageData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />

                    <YAxis allowDecimals={false} />

                    <Tooltip />

                    <Legend />

                    <Bar
                      dataKey="sessions"
                      name="Sessions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">
                  No venue usage data available.
                </div>
              )}

            </div>

            {/* VENUE UTILIZATION */}

            <div className="analytics-chart-card">

              <h2>📈 Venue Utilization</h2>

              {venueUtilizationData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={venueUtilizationData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                    />

                    <Tooltip />

                    <Legend />

                    <Bar
                      dataKey="utilization"
                      name="Utilization %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">
                  No venue utilization data available.
                </div>
              )}

            </div>

          </div>

          {/* ROOM OCCUPANCY */}

<div className="analytics-chart-card">

  <h2>🏟️ Room Occupancy</h2>

  {roomOccupancyData.length > 0 ? (
    <ResponsiveContainer
      width="100%"
      height={300}
    >
      <BarChart
        data={roomOccupancyData}
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
        />

        <YAxis
          domain={[0, 100]}
          unit="%"
        />

        <Tooltip />

        <Legend />

        <Bar
          dataKey="occupancy"
          name="Occupancy %"
        />
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <div className="no-chart-data">
      No room occupancy data available.
    </div>
  )}

</div>

          {/* OPERATIONAL INSIGHTS */}

          <div className="analytics-insights">

            <h2>🤖 Operational Insights</h2>

            <div className="insight-grid">

              <div className="insight-item">
                <span>📅</span>

                <div>
                  <strong>
                    Scheduling Status
                  </strong>

                  <p>
                    {summary.scheduled_sessions ===
                    summary.total_sessions
                      ? "All sessions have been scheduled."
                      : `${
                          summary.total_sessions -
                          summary.scheduled_sessions
                        } session(s) still need scheduling.`}
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span>🎤</span>

                <div>
                  <strong>
                    Speaker Allocation
                  </strong>

                  <p>
                    {summary.speakers_assigned} of{" "}
                    {summary.total_speakers} speakers
                    are currently assigned.
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span>🏢</span>

                <div>
                  <strong>
                    Venue Allocation
                  </strong>

                  <p>
                    {summary.venues_used} of{" "}
                    {summary.total_venues} venues
                    are currently being used.
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span>♿</span>

                <div>
                  <strong>
                    Accessibility
                  </strong>

                  <p>
                    {summary.accessibility_sessions}{" "}
                    session(s) require accessibility
                    support.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default SessionAnalytics;