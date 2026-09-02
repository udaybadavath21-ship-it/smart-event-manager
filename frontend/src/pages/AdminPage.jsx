import { useState, useEffect } from "react";
import api from "../api";
import "../App.css";
import Sidebar from "../components/Sidebar";
import KPICards from "../components/KPICards";
import Swal from "sweetalert2";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function AdminPage() {
  const [attendees, setAttendees] = useState([]);
  const normalize = (value, type = "") => {
  if (!value) return "Unknown";

  let v = value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (type === "ticket" && v === "vip") {
    return "VIP";
  }

  return v
    .split(" ")
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};
 const cityData = Object.values(
  attendees.reduce((acc, attendee) => {

    const city = normalize(attendee.city);

    if (!acc[city]) {
      acc[city] = {
        city,
        count: 0,
      };
    }

    acc[city].count++;

    return acc;

  }, {})
);
const ticketData = Object.values(
  attendees.reduce((acc, attendee) => {

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

  }, {})
);
const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"];
const checkInData = [
  {
    name: "Checked In",
    value: attendees.filter((a) => a.checkin_status).length,
  },
  {
    name: "Not Checked In",
    value: attendees.filter((a) => !a.checkin_status).length,
  },
];
const registrationsByDate = attendees.reduce((acc, attendee) => {
  if (!attendee.registration_date) {
    return acc;
  }

  const date = new Date(
    attendee.registration_date
  ).toLocaleDateString();

  if (!acc[date]) {
    acc[date] = 0;
  }

  acc[date]++;

  return acc;
}, {});

let cumulativeTotal = 0;

const registrationTrend = Object.entries(registrationsByDate)
  .map(([date, count]) => ({
    date,
    timestamp: new Date(date).getTime(),
    count,
  }))
  .sort((a, b) => a.timestamp - b.timestamp)
  .map((item) => {
    cumulativeTotal += item.count;

    return {
      date: item.date,
      registrations: cumulativeTotal,
    };
  });
const totalCheckedIn = attendees.filter(
  (a) => a.checkin_status
).length;
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
        text: "Please login again.",
      });

      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }
};

  useEffect(() => {
    fetchAttendees();
  }, []);

return (
  <div className="layout">
    <Sidebar />

    <div className="main-content">
      <div className="container">
        <h1>Admin Dashboard</h1>
        <p>Manage all registered attendees</p>

        <KPICards
          attendees={attendees}
          totalCheckedIn={totalCheckedIn}
        />

        <h2 style={{ marginTop: "30px" }}>
          Analytics Dashboard
        </h2>

        <div className="charts-grid">

          {/* City Chart */}
          <div className="chart-card">
            <h3>Registrations by City</h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="city" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ticket Chart */}
          <div className="chart-card">
            <h3>Ticket Type Distribution</h3>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ticketData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {ticketData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Check-In Chart */}
          <div className="chart-card">
            <h3>Check-In Status</h3>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={checkInData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {checkInData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Registration Trend */}
          <div className="chart-card">
            <h3>Registration Trend</h3>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="registrations"
                  stroke="#4F46E5"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  </div>
);
}

export default AdminPage;
