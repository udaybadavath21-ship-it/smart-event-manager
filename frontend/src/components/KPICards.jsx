import "../styles/KPICards.css";

function KPICards({ attendees, totalCheckedIn }) {
  return (
    <div className="kpi-grid">

      <div className="kpi-card">
        <div className="kpi-icon">👥</div>
        <div className="kpi-title">Total Attendees</div>
        <div className="kpi-value">{attendees.length}</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon">🎟️</div>
        <div className="kpi-title">VIP Tickets</div>
        <div className="kpi-value">
          {
            attendees.filter(
              attendee =>
                attendee.ticket_type?.trim().toLowerCase() === "vip"
            ).length
          }
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon">🎓</div>
        <div className="kpi-title">Students</div>
        <div className="kpi-value">
          {
            attendees.filter(
              attendee =>
                attendee.ticket_type?.trim().toLowerCase() === "student"
            ).length
          }
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon">💼</div>
        <div className="kpi-title">Professionals</div>
        <div className="kpi-value">
          {
            attendees.filter(
              attendee =>
                attendee.ticket_type?.trim().toLowerCase() === "professional"
            ).length
          }
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon">✅</div>
        <div className="kpi-title">Checked In</div>
        <div className="kpi-value">{totalCheckedIn}</div>
      </div>

    </div>
  );
}

export default KPICards;