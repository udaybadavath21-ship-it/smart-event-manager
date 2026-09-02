import { useState } from "react";
import Sidebar from "../components/Sidebar";
import CameraScanner from "../components/CameraScanner";
import Swal from "sweetalert2";
import api from "../api";

function QRScanner() {
  const [attendee, setAttendee] = useState(null);

  const handleCheckIn = async () => {
    try {
      await api.put(`/checkin/${attendee.attendee_id}`);
      await Swal.fire({
        icon: "success",
        title: "Check-In Successful!",
        text: `${attendee.name} has been checked in.`,
        confirmButtonText: "OK",
      });

      setAttendee({
        ...attendee,
        checkin_status: true,
      });
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || "Something went wrong.";
      if (error.response?.status === 400) {
        Swal.fire({
          icon: "warning",
          title: "Already Checked In",
          text: detail,
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Check-In Failed",
          text: detail,
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleUndoCheckIn = async () => {
    const result = await Swal.fire({
      title: "Undo Check-In?",
      text: "Are you sure you want to undo this attendee's check-in?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Undo",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await api.put(`/undo-checkin/${attendee.attendee_id}`);
      await Swal.fire({
        icon: "success",
        title: "Undo Successful!",
        text: `${attendee.name} is now marked as Not Checked In.`,
      });

      setAttendee({
        ...attendee,
        checkin_status: false,
      });
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || "Something went wrong.";
      Swal.fire({
        icon: "error",
        title: "Undo Failed",
        text: detail,
      });
    }
  };

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <h1>📷 QR Scanner</h1>

        <p>Choose one of the following methods:</p>

        {!attendee && (
          <>
            <CameraScanner
              key="scanner"
              onScan={setAttendee}
            />
          </>
        )}

        {attendee && (
          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              maxWidth: "550px",
              backgroundColor: "#fff",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            }}
          >
            <h2>{attendee.name}</h2>

            <hr />

            <p>
              <strong>🎟 Event ID:</strong> {attendee.event_id}
            </p>

            <p>
              <strong>📧 Email:</strong> {attendee.email}
            </p>

            <p>
              <strong>🏙 City:</strong> {attendee.city}
            </p>

            <p>
              <strong>🏷 Ticket:</strong> {attendee.ticket_type}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {attendee.checkin_status ? (
                <span style={{ color: "green", fontWeight: "bold" }}>
                  ✅ Checked In
                </span>
              ) : (
                <span style={{ color: "red", fontWeight: "bold" }}>
                  ❌ Not Checked In
                </span>
              )}
            </p>

            {!attendee.checkin_status ? (
              <button
                onClick={handleCheckIn}
                style={{
                  padding: "10px 20px",
                  marginTop: "15px",
                  marginRight: "10px",
                  cursor: "pointer",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                ✅ Check In
              </button>
            ) : (
              <button
                onClick={handleUndoCheckIn}
                style={{
                  padding: "10px 20px",
                  marginTop: "15px",
                  marginRight: "10px",
                  cursor: "pointer",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                ↩ Undo Check-In
              </button>
            )}

            <button
              onClick={() => setAttendee(null)}
              style={{
                padding: "10px 20px",
                marginTop: "15px",
                cursor: "pointer",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              🔄 Scan Next Attendee
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRScanner;