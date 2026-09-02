import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Scheduling() {
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [sessionId, setSessionId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [roomSuggestion, setRoomSuggestion] = useState(null);
  const [roomSuggestionLoading, setRoomSuggestionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [
        sessionsResponse,
        speakersResponse,
        venuesResponse,
        schedulesResponse,
      ] = await Promise.all([
        api.get("/sessions"),
        api.get("/speakers"),
        api.get("/venues"),
        api.get("/schedules"),
      ]);

      setSessions(sessionsResponse.data);
      setSpeakers(speakersResponse.data);
      setVenues(venuesResponse.data);
      setSchedules(schedulesResponse.data);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Unable to Load Data",
        text:
          error.response?.data?.detail ||
          "Could not load scheduling information.",
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

const handleSchedule = async (e) => {
  e.preventDefault();

  if (!sessionId || !speakerId || !venueId) {
    Swal.fire({
      icon: "warning",
      title: "Incomplete Details",
      text: "Please select a session, speaker and venue.",
    });
    return;
  }

  if (!startTime || !endTime) {
    Swal.fire({
      icon: "warning",
      title: "Missing Time",
      text: "Please select both start and end time.",
    });
    return;
  }

  if (new Date(endTime) <= new Date(startTime)) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Time",
      text: "End time must be after start time.",
    });
    return;
  }

  try {
    setLoading(true);

    const selectedSession = sessions.find(
      (session) =>
        session.session_id === Number(sessionId)
    );

    const requestData = {
      session_id: Number(sessionId),
      speaker_id: Number(speakerId),
      venue_id: Number(venueId),
      start_time: startTime,
      end_time: endTime,
      venue_match_score: null,
    };
    let response;

    if (editingScheduleId) {
      response = await api.put(
        `/schedule/${editingScheduleId}`,
        requestData
      );

      await Swal.fire({
        icon: "success",
        title: "Schedule Updated!",
        text: `${
          selectedSession?.session_title || "Session"
        } has been updated successfully.`,
        confirmButtonText: "OK",
      });
    } else {
      response = await api.post(
        "/schedule",
        requestData
      );

      await Swal.fire({
        icon: "success",
        title: "Session Scheduled!",
        text: `${
          selectedSession?.session_title || "Session"
        } has been scheduled successfully.`,
        confirmButtonText: "OK",
      });
    }

    // Reset form
    setSessionId("");
    setSpeakerId("");
    setVenueId("");
    setStartTime("");
    setEndTime("");
    setEditingScheduleId(null);

    await loadData();

  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: editingScheduleId
        ? "Update Failed"
        : "Scheduling Failed",
      text:
        error.response?.data?.detail ||
        "Something went wrong.",
    });
  } finally {
    setLoading(false);
  }
};
const handleEdit = (schedule) => {
  setEditingScheduleId(schedule.schedule_id);

  setSessionId(String(schedule.session_id));
  setSpeakerId(String(schedule.speaker_id));
  setVenueId(String(schedule.venue_id));

  // datetime-local needs YYYY-MM-DDTHH:mm
  setStartTime(
    schedule.start_time
      ? schedule.start_time.slice(0, 16)
      : ""
  );

  setEndTime(
    schedule.end_time
      ? schedule.end_time.slice(0, 16)
      : ""
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};
const handleDelete = async (schedule) => {
  const result = await Swal.fire({
    title: "Delete Schedule?",
    text: `Are you sure you want to delete the schedule for "${schedule.session_title}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    await api.delete(
      `/schedule/${schedule.schedule_id}`
    );

    await Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: "Schedule deleted successfully.",
      timer: 1200,
      showConfirmButton: false,
    });

    // If we were editing this schedule, clear the form
    if (
      editingScheduleId === schedule.schedule_id
    ) {
      setEditingScheduleId(null);
      setSessionId("");
      setSpeakerId("");
      setVenueId("");
      setStartTime("");
      setEndTime("");
    }

    await loadData();

  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Delete Failed",
      text:
        error.response?.data?.detail ||
        "Could not delete the schedule.",
    });
  }
};
const handleRoomSuggestion = async () => {
  if (!venueId) {
    Swal.fire({
      icon: "warning",
      title: "Select Venue",
      text: "Please select a venue first.",
    });
    return;
  }

  const selectedSession = sessions.find(
    (session) => session.session_id === Number(sessionId)
  );

  if (!selectedSession?.expected_attendees) {
    Swal.fire({
      icon: "warning",
      title: "Attendance Not Available",
      text: "The selected session does not have expected attendance.",
    });
    return;
  }

  try {
    setRoomSuggestionLoading(true);

    const response = await api.post(
      `/venue-agent/room-suggestion?expected_attendees=${selectedSession.expected_attendees}&current_venue_id=${venueId}`
    );

    setRoomSuggestion(response.data);

  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Room Suggestion Failed",
      text:
        error.response?.data?.detail ||
        "Could not get room recommendation.",
    });
  } finally {
    setRoomSuggestionLoading(false);
  }
};
  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div className="scheduling-container">

          {/* Header */}

          <div className="scheduling-header">
            <h1>📅 Session Scheduling</h1>
            <p>
              Schedule speakers and venues while automatically
              preventing conflicts.
            </p>
          </div>

          {/* Scheduling Form */}

          <div className="schedule-form-card">
            <h2>
  {editingScheduleId
    ? "✏️ Edit Schedule"
    : "🎯 Create Schedule"}
</h2>

            <form onSubmit={handleSchedule}>

              <div className="schedule-form-grid">

                <div className="schedule-field">
                  <label>Session</label>

                  <select
                    value={sessionId}
                    onChange={(e) =>
                      setSessionId(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Select Session
                    </option>

                    {sessions.map((session) => (
                      <option
                        key={session.session_id}
                        value={session.session_id}
                      >
                        {session.session_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="schedule-field">
                  <label>Speaker</label>

                  <select
                    value={speakerId}
                    onChange={(e) =>
                      setSpeakerId(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Select Speaker
                    </option>

                    {speakers
                      .filter(
                        (speaker) => speaker.available
                      )
                      .map((speaker) => (
                        <option
                          key={speaker.speaker_id}
                          value={speaker.speaker_id}
                        >
                          {speaker.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="schedule-field">
                  <label>Venue</label>

                  <select
                    value={venueId}
                    onChange={(e) =>
                      setVenueId(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Select Venue
                    </option>

                    {venues
                      .filter(
                        (venue) => venue.available
                      )
                      .map((venue) => (
                        <option
                          key={venue.venue_id}
                          value={venue.venue_id}
                        >
                          {venue.venue_name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
  type="button"
  className="room-suggestion-btn"
  onClick={handleRoomSuggestion}
  disabled={roomSuggestionLoading}
>
  {roomSuggestionLoading
    ? "🔄 Checking..."
    : "🏢 Check Room Optimization"}
</button>

                <div className="schedule-field">
                  <label>Start Time</label>

                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) =>
                      setStartTime(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="schedule-field">
                  <label>End Time</label>

                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) =>
                      setEndTime(e.target.value)
                    }
                    required
                  />
                </div>

              </div>

              <button
  type="submit"
  className="schedule-submit-btn"
  disabled={loading}
>
  {loading
    ? editingScheduleId
      ? "🔄 Updating..."
      : "🔄 Scheduling..."
    : editingScheduleId
    ? "💾 Update Schedule"
    : "📅 Schedule Session"}
</button>
{editingScheduleId && (
  <button
    type="button"
    className="schedule-cancel-btn"
    onClick={() => {
      setEditingScheduleId(null);
      setSessionId("");
      setSpeakerId("");
      setVenueId("");
      setStartTime("");
      setEndTime("");
    }}
  >
    ❌ Cancel Edit
  </button>
)}

            </form>

{roomSuggestion && (
  <div className="room-suggestion-box">

    <h3>
      🏢 Room Optimization
    </h3>

    <p>
      {roomSuggestion.message}
    </p>

    {roomSuggestion.utilization_percent !== undefined && (
      <p>
        <strong>Current Utilization:</strong>{" "}
        {roomSuggestion.utilization_percent}%
      </p>
    )}

    {roomSuggestion.suggested_venue && (
      <div className="suggested-venue">

        <p>
          <strong>Suggested Venue:</strong>{" "}
          {roomSuggestion.suggested_venue.venue_name}
        </p>

        <p>
          <strong>Capacity:</strong>{" "}
          {roomSuggestion.suggested_venue.capacity}
        </p>

        <p>
          <strong>Facilities:</strong>{" "}
          {roomSuggestion.suggested_venue.facilities}
        </p>

      </div>
    )}

  </div>
)}
</div>

          {/* Existing Schedules */}

          <div className="schedule-list-card">
            <div className="schedule-list-header">
              <div>
                <h2>📋 Scheduled Sessions</h2>
                <p>
                  Current speaker and venue assignments
                </p>
              </div>

              <button
                onClick={loadData}
                className="refresh-schedule-btn"
              >
                🔄 Refresh
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="empty-schedules">
                📭 No sessions have been scheduled yet.
              </div>
            ) : (
              <div className="schedule-table-container">

                <table className="schedule-table">

                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Speaker</th>
                      <th>Venue</th>
<th>Start</th>
<th>End</th>
<th>Score</th>
<th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.schedule_id}>

                        <td>
                          <strong>
                            {schedule.session_title}
                          </strong>
                        </td>

                        <td>
                          🎤 {schedule.speaker_name}
                        </td>

                        <td>
                          🏢 {schedule.venue_name}
                        </td>

                        <td>
                          {new Date(
                            schedule.start_time
                          ).toLocaleString()}
                        </td>

                        <td>
                          {new Date(
                            schedule.end_time
                          ).toLocaleString()}
                        </td>

                        <td>
                          {schedule.venue_match_score !==
                          null
                            ? `${schedule.venue_match_score}%`
                            : "—"}
                        </td>
                        <td>
  <button
    type="button"
    onClick={() => handleEdit(schedule)}
    className="schedule-edit-btn"
    title="Edit Schedule"
  >
    ✏️
  </button>

  <button
    type="button"
    onClick={() => handleDelete(schedule)}
    className="schedule-delete-btn"
    title="Delete Schedule"
  >
    🗑️
  </button>
</td>

                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Scheduling;