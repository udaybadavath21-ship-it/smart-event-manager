import Sidebar from "../components/Sidebar";
import KPICards from "../components/KPICards";
import Charts from "../components/Charts";
import AIOverview from "../components/AIOverview";

import "../styles/dashboard.css";

function Dashboard() {
  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">

        <div className="dashboard-header">
          <h1>🎉 Smart Event Manager</h1>
          <p>
            Welcome back, Admin. Here's your event overview.
          </p>
        </div>

        <KPICards />

        <div className="dashboard-section">

          <div className="chart-grid">

            <div className="chart-card">
              <Charts />
            </div>

          </div>

        </div>

        <div className="ai-card">
          <AIOverview />
        </div>

      </div>

    </div>
  );
}

export default Dashboard;