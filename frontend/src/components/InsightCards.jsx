import "../styles/InsightCards.css";

function InsightCards({
  totalAttendees,
  totalCheckedIn,
  checkInRate,
  averageAge,
  topCity,
  topTicket,
}) {
  return (
    <div className="insight-cards">

      <div className="insight-card">
        <h3>👥 Total Attendees</h3>
        <p>{totalAttendees}</p>
      </div>

      <div className="insight-card">
        <h3>✅ Checked In</h3>
        <p>{totalCheckedIn}</p>
      </div>

      <div className="insight-card">
        <h3>📈 Check-In Rate</h3>
        <p>{checkInRate}%</p>
      </div>

      <div className="insight-card">
        <h3>🎓 Average Age</h3>
        <p>{averageAge} Years</p>
      </div>

      <div className="insight-card">
        <h3>🏙 Top City</h3>
        <p>{topCity}</p>
      </div>

      <div className="insight-card">
        <h3>🎫 Popular Ticket</h3>
        <p>{topTicket}</p>
      </div>

    </div>
  );
}

export default InsightCards;