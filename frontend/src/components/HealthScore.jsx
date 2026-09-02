import "../styles/HealthScore.css";

function HealthScore({
  checkInRate,
  totalAttendees,
  averageAge,
  genderData,
  ticketData,
  attendees,
}) {
  let score = 0;

  // =========================
  // Check-In Rate (40)
  // =========================
  if (checkInRate >= 95) score += 40;
  else if (checkInRate >= 80) score += 35;
  else if (checkInRate >= 60) score += 25;
  else if (checkInRate >= 40) score += 15;
  else score += 5;

// Registration Count (20)

if (totalAttendees >= 15)
    score += 20;
else if (totalAttendees >= 10)
    score += 16;
else if (totalAttendees >= 5)
    score += 12;
else
    score += 6;

  // =========================
  // Ticket Diversity (15)
  // =========================
  if (ticketData.length >= 3) score += 15;
  else if (ticketData.length === 2) score += 10;
  else score += 5;

  // =========================
  // Gender Balance (10)
  // =========================
  const male =
    genderData.find(
      (g) => g.name?.toLowerCase() === "male"
    )?.value || 0;

  const female =
    genderData.find(
      (g) => g.name?.toLowerCase() === "female"
    )?.value || 0;

  const totalGender = male + female;

  if (totalGender > 0) {
    const difference =
      Math.abs(male - female) / totalGender;

    if (difference <= 0.10) score += 10;
    else if (difference <= 0.25) score += 8;
    else if (difference <= 0.40) score += 6;
    else score += 4;
  }

  // =========================
  // Data Completeness (10)
  // =========================
  let complete = 0;

  attendees.forEach((a) => {
    if (
      a.email &&
      a.phone &&
      a.city &&
      a.organization
    ) {
      complete++;
    }
  });

  const completeness =
    totalAttendees > 0
      ? (complete / totalAttendees) * 100
      : 0;

  if (completeness >= 95) score += 10;
  else if (completeness >= 80) score += 8;
  else if (completeness >= 60) score += 6;
  else score += 3;

  // =========================
  // Average Age (5)
  // =========================
  if (averageAge >= 18 && averageAge <= 35) score += 5;
  else if (averageAge <= 50) score += 4;
  else score += 3;

  let status = "";
  let color = "";

  if (score >= 90) {
    status = "🟢 Excellent";
    color = "#10B981";
  } else if (score >= 75) {
    status = "🔵 Very Good";
    color = "#3B82F6";
  } else if (score >= 60) {
    status = "🟡 Good";
    color = "#F59E0B";
  } else {
    status = "🔴 Needs Improvement";
    color = "#EF4444";
  }

  return (
    <div className="health-card">
      <h2>📊 Event Performance Score</h2>

      <div
        className="health-score"
        style={{ color }}
      >
        {score}/100
      </div>

      <h3 style={{ color }}>
        {status}
      </h3>

      <p>
        Based on attendee engagement, registrations,
        ticket diversity, gender balance and profile
        completeness.
      </p>
    </div>
  );
}

export default HealthScore;