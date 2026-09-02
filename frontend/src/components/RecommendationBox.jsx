import "../styles/RecommendationBox.css";

function RecommendationBox({
  checkInRate,
  topCity,
  topTicket,
  totalAttendees,
  totalCheckedIn,
  averageAge,
  genderData,
}) {
  const recommendations = [];

  // Check-in recommendation
  if (Number(checkInRate) < 70) {
    recommendations.push(
      "⚠️ Check-in rate is below 70%. Send reminder emails to attendees."
    );
  } else {
    recommendations.push(
      "✅ Check-in rate is healthy. Event participation looks good."
    );
  }

  // City recommendation
  recommendations.push(
    `🏙 Most registrations are from ${topCity}. Consider allocating more volunteers and resources there.`
  );

  // Ticket recommendation
  recommendations.push(
    `🎫 ${topTicket} is the most popular ticket type. Plan services accordingly.`
  );

  // Age recommendation
  if (Number(averageAge) < 25) {
    recommendations.push(
      "🎓 Most attendees are young adults. Student-focused activities may increase engagement."
    );
  } else {
    recommendations.push(
      "💼 Attendee age indicates a professional audience. Consider networking opportunities."
    );
  }

  // Gender recommendation
  if (genderData.length >= 2) {
    const male =
      genderData.find(
        (g) => g.name?.toLowerCase() === "male"
      )?.value || 0;

    const female =
      genderData.find(
        (g) => g.name?.toLowerCase() === "female"
      )?.value || 0;

    if (male > female) {
      recommendations.push(
        "👨 Male attendees outnumber female attendees."
      );
    } else if (female > male) {
      recommendations.push(
        "👩 Female attendees outnumber male attendees."
      );
    } else {
      recommendations.push(
        "⚖️ Gender participation is well balanced."
      );
    }
  }

  // Attendance recommendation
  recommendations.push(
    `📊 ${totalCheckedIn} out of ${totalAttendees} attendees have checked in.`
  );

  return (
    <div className="recommendation-box">
      <h2>🤖 AI Recommendations</h2>

      {recommendations.map((item, index) => (
        <div
          key={index}
          className="recommendation-card"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export default RecommendationBox;