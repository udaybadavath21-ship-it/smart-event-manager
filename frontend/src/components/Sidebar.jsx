import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import api from "../api";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get("/alerts/unread-count");
        setUnreadAlerts(res.data.unread_count || 0);
      } catch {
        // Silently ignore if not logged in
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Logout",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem("token");

    await Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out successfully.",
      timer: 1200,
      showConfirmButton: false,
    });

    navigate("/login");
  };

  return (
    <div className="sidebar">

      <h2>🎟 Smart Event Manager</h2>

      <Link
        className={
          location.pathname === "/admin"
            ? "active-link"
            : ""
        }
        to="/admin"
      >
        🏠 Dashboard
      </Link>

      <Link
        className={
          location.pathname === "/attendees"
            ? "active-link"
            : ""
        }
        to="/attendees"
      >
        👥 Attendees
      </Link>

      <Link
        className={
          location.pathname === "/csv-upload"
            ? "active-link"
            : ""
        }
        to="/csv-upload"
      >
        📂 CSV Upload
      </Link>

      <Link
        className={
          location.pathname === "/qr-scanner"
            ? "active-link"
            : ""
        }
        to="/qr-scanner"
      >
        📷 QR Scanner
      </Link>

      <Link
        className={
          location.pathname === "/ai-insights"
            ? "active-link"
            : ""
        }
        to="/ai-insights"
      >
        🤖 AI Insights
      </Link>

      <hr
        style={{
          margin: "25px 0 15px",
          opacity: 0.3,
        }}
      />

      <Link
        className={
          location.pathname === "/venue-agent"
            ? "active-link"
            : ""
        }
        to="/venue-agent"
      >
        🏢 Venues
      </Link>

      <Link
        className={
          location.pathname === "/speaker-agent"
            ? "active-link"
            : ""
        }
        to="/speaker-agent"
      >
        🎤 Speakers
      </Link>

      <Link
        className={
          location.pathname === "/scheduling"
            ? "active-link"
            : ""
        }
        to="/scheduling"
      >
        📅 Scheduling
      </Link>

      <Link
        className={
          location.pathname === "/session-analytics"
            ? "active-link"
            : ""
        }
        to="/session-analytics"
      >
        📊 Session Analytics
      </Link>

      <hr
        style={{
          margin: "25px 0 15px",
          opacity: 0.3,
        }}
      />

      <Link
        className={
          location.pathname === "/sponsors"
            ? "active-link"
            : ""
        }
        to="/sponsors"
      >
        🤝 Sponsors
      </Link>

      <Link
        className={
          location.pathname === "/incidents"
            ? "active-link"
            : ""
        }
        to="/incidents"
      >
        🚨 Incidents
      </Link>

      <Link
        className={
          location.pathname === "/operations"
            ? "active-link"
            : ""
        }
        to="/operations"
        style={{ position: "relative" }}
      >
        📡 Operations Center
        {unreadAlerts > 0 && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            {unreadAlerts > 9 ? "9+" : unreadAlerts}
          </span>
        )}
      </Link>

      <Link
        className={
          location.pathname === "/reports"
            ? "active-link"
            : ""
        }
        to="/reports"
      >
        📋 Reports
      </Link>

      <hr
        style={{
          margin: "25px 0 15px",
          opacity: 0.3,
        }}
      />

      <Link
        className={
          location.pathname === "/executive"
            ? "active-link"
            : ""
        }
        to="/executive"
      >
        🎯 Executive Center
      </Link>

      <Link
        className={
          location.pathname === "/ai-operations"
            ? "active-link"
            : ""
        }
        to="/ai-operations"
      >
        🧠 AI Operations
      </Link>

      <button
        onClick={handleLogout}
        className="logout-btn"
      >
        🚪 Logout
      </button>

    </div>
  );
}

export default Sidebar;