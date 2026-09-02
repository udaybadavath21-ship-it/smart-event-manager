import { useState, useEffect, useRef } from "react";
import api from "../api";
import Sidebar from "../components/Sidebar";
import InsightCards from "../components/InsightCards";
import RecommendationBox from "../components/RecommendationBox";
import HealthScore from "../components/HealthScore";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

function AIInsights() {
  const [attendees, setAttendees] = useState([]);

  const [cityFilter, setCityFilter] = useState("All");
  const [ticketFilter, setTicketFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const reportRef = useRef(null);

  useEffect(() => {
    fetchAttendees();
  }, []);

  const fetchAttendees = async () => {
    try {
      const response = await api.get("/attendees");
      setAttendees(response.data);
    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        await Swal.fire({
          icon: "warning",
          title: "Session Expired",
          text: "Please login again",
        });

        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
  };

  /* ---------------- NORMALIZE ---------------- */

  const normalize = (value, type = "") => {
    if (!value) return "Unknown";

    let v = value
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

    if (type === "ticket" && v === "vip") return "VIP";

    return v
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  };

  /* ---------------- FILTER OPTIONS ---------------- */

  const cities = [
    "All",
    ...new Set(
      attendees.map((a) => normalize(a.city))
    ),
  ];

  const tickets = [
    "All",
    ...new Set(
      attendees.map((a) =>
        normalize(a.ticket_type, "ticket")
      )
    ),
  ];

  const genders = [
    "All",
    ...new Set(
      attendees.map((a) =>
        normalize(a.gender)
      )
    ),
  ];

  /* ---------------- FILTER DATA ---------------- */

  const filteredAttendees = attendees.filter(
    (a) =>
      (cityFilter === "All" ||
        normalize(a.city) === cityFilter) &&

      (ticketFilter === "All" ||
        normalize(
          a.ticket_type,
          "ticket"
        ) === ticketFilter) &&

      (genderFilter === "All" ||
        normalize(a.gender) === genderFilter) &&

      (statusFilter === "All" ||
        (statusFilter === "Checked In" &&
          a.checkin_status) ||
        (statusFilter === "Not Checked In" &&
          !a.checkin_status))
  );

  /* ---------------- KPI ---------------- */

  const totalAttendees =
    filteredAttendees.length;

  const totalCheckedIn =
    filteredAttendees.filter(
      (a) => a.checkin_status
    ).length;

  const checkInRate =
    totalAttendees === 0
      ? 0
      : (
          (totalCheckedIn /
            totalAttendees) *
          100
        ).toFixed(1);

  const attendeesWithAge =
    filteredAttendees.filter(
      (a) =>
        a.age !== null &&
        !isNaN(Number(a.age))
    );

  const averageAge =
    attendeesWithAge.length === 0
      ? 0
      : (
          attendeesWithAge.reduce(
            (sum, a) =>
              sum + Number(a.age),
            0
          ) /
          attendeesWithAge.length
        ).toFixed(1);

  /* ---------------- CITY DATA ---------------- */

  const cityData = Object.values(
    filteredAttendees.reduce(
      (acc, attendee) => {
        const city = normalize(
          attendee.city
        );

        if (!acc[city]) {
          acc[city] = {
            city,
            count: 0,
          };
        }

        acc[city].count++;

        return acc;
      },
      {}
    )
  );

  /* ---------------- TICKET DATA ---------------- */

  const ticketData = Object.values(
    filteredAttendees.reduce(
      (acc, attendee) => {
        const ticket = normalize(
          attendee.ticket_type,
          "ticket"
        );

        if (!acc[ticket]) {
          acc[ticket] = {
            name: ticket,
            value: 0,
          };
        }

        acc[ticket].value++;

        return acc;
      },
      {}
    )
  );

  /* ---------------- GENDER DATA ---------------- */

  const genderData = Object.values(
    filteredAttendees.reduce(
      (acc, attendee) => {
        const gender = normalize(
          attendee.gender
        );

        if (!acc[gender]) {
          acc[gender] = {
            name: gender,
            value: 0,
          };
        }

        acc[gender].value++;

        return acc;
      },
      {}
    )
  );

  const topCity =
    cityData.length === 0
      ? "N/A"
      : cityData.reduce((a, b) =>
          a.count > b.count ? a : b
        ).city;

  const topTicket =
    ticketData.length === 0
      ? "N/A"
      : ticketData.reduce((a, b) =>
          a.value > b.value ? a : b
        ).name;

  const COLORS = [
    "#4F46E5",
    "#10B981",
    "#F59E0B",
    "#EF4444",
  ];

  const downloadReport = async () => {
    const canvas =
      await html2canvas(reportRef.current, {
        scale: 2,
      });

    const img =
      canvas.toDataURL("image/png");

    const pdf = new jsPDF();

    const width =
      pdf.internal.pageSize.getWidth();

    const height =
      (canvas.height * width) /
      canvas.width;

    pdf.addImage(
      img,
      "PNG",
      0,
      0,
      width,
      height
    );

    pdf.save("AI_Insights_Report.pdf");
  };
    return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div className="container">

          <h1>🤖 AI Insights Dashboard</h1>

          <button
            className="download-btn"
            onClick={downloadReport}
          >
            📥 Download AI Report
          </button>

          <div className="filters">

            <select
              value={cityFilter}
              onChange={(e) =>
                setCityFilter(e.target.value)
              }
            >
              {cities.map((city) => (
                <option
                  key={city}
                  value={city}
                >
                  {city}
                </option>
              ))}
            </select>

            <select
              value={ticketFilter}
              onChange={(e) =>
                setTicketFilter(e.target.value)
              }
            >
              {tickets.map((ticket) => (
                <option
                  key={ticket}
                  value={ticket}
                >
                  {ticket}
                </option>
              ))}
            </select>

            <select
              value={genderFilter}
              onChange={(e) =>
                setGenderFilter(e.target.value)
              }
            >
              {genders.map((gender) => (
                <option
                  key={gender}
                  value={gender}
                >
                  {gender}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All">All Status</option>
              <option value="Checked In">
                Checked In
              </option>
              <option value="Not Checked In">
                Not Checked In
              </option>
            </select>

          </div>

          <div ref={reportRef}>

            <InsightCards
              totalAttendees={totalAttendees}
              totalCheckedIn={totalCheckedIn}
              checkInRate={checkInRate}
              averageAge={averageAge}
              topCity={topCity}
              topTicket={topTicket}
            />

            <div className="progress-card">
              <h3>Check-In Progress</h3>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${checkInRate}%`,
                  }}
                >
                  {checkInRate}%
                </div>
              </div>
            </div>

            <div className="charts-grid">

              <div className="chart-card">

                <h3>
                  Gender Distribution
                </h3>

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <PieChart>

                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {genderData.map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={
                              COLORS[
                                index %
                                  COLORS.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>
                </ResponsiveContainer>

              </div>

              <div className="chart-card">

                <h3>
                  Top Cities
                </h3>

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={cityData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="city"
                    />

                    <YAxis />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      fill="#4F46E5"
                      radius={[8, 8, 0, 0]}
                    />

                  </BarChart>
                </ResponsiveContainer>

              </div>

            </div>

            <div className="leaderboard">

              <h2>
                🏆 Top Cities
              </h2>

              {cityData
                .sort(
                  (a, b) =>
                    b.count - a.count
                )
                .slice(0, 5)
                .map(
                  (city, index) => (
                    <div
                      key={city.city}
                      className="leader-row"
                    >
                      <span>
                        {index === 0
                          ? "🥇"
                          : index === 1
                          ? "🥈"
                          : index === 2
                          ? "🥉"
                          : `#${index + 1}`}
                      </span>

                      <span>
                        {city.city}
                      </span>

                      <strong>
                        {city.count}
                      </strong>
                    </div>
                  )
                )}

            </div>

            <RecommendationBox
              checkInRate={
                checkInRate
              }
              topCity={topCity}
              topTicket={topTicket}
              totalAttendees={
                totalAttendees
              }
              totalCheckedIn={
                totalCheckedIn
              }
              averageAge={
                averageAge
              }
              genderData={
                genderData
              }
            />

            <HealthScore
              checkInRate={Number(
                checkInRate
              )}
              totalAttendees={
                totalAttendees
              }
              averageAge={Number(
                averageAge
              )}
              genderData={
                genderData
              }
              ticketData={
                ticketData
              }
              attendees={
                filteredAttendees
              }
            />

          </div>

        </div>
      </div>
    </div>
  );
}

export default AIInsights;