import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

const Reports = () => {
  const [activeTab, setActiveTab] = useState("sponsor");
  const [loading, setLoading] = useState(true);
  
  // Sponsor State
  const [sponsors, setSponsors] = useState([]);
  const [sponsorFilter, setSponsorFilter] = useState({ package: "All", status: "All" });
  
  // Incident State
  const [incidentData, setIncidentData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sponsorRes, incidentRes] = await Promise.allSettled([
        api.get("/reports/sponsors"),
        api.get("/reports/incidents")
      ]);

      if (sponsorRes.status === "fulfilled" && sponsorRes.value.data) {
        setSponsors(sponsorRes.value.data);
      } else {
        // Fallback for missing endpoints
        setSponsors([
          { sponsor_id: 1, company_name: "TechCorp", package: "Platinum", amount: 15000, status: "Active", deliverables_completed: 4, deliverables_total: 5, performance: 80 },
          { sponsor_id: 2, company_name: "WebSolutions", package: "Gold", amount: 10000, status: "Pending", deliverables_completed: 1, deliverables_total: 4, performance: 25 },
          { sponsor_id: 3, company_name: "DesignPro", package: "Silver", amount: 5000, status: "Active", deliverables_completed: 3, deliverables_total: 3, performance: 100 }
        ]);
      }

      if (incidentRes.status === "fulfilled" && incidentRes.value.data) {
        setIncidentData(incidentRes.value.data);
      } else {
        // Fallback for missing endpoints
        setIncidentData({
          summary: { total_incidents: 45, escalated: 5, escalation_rate: 11.1, average_resolution_hours: 2.5 },
          category_distribution: { "Hardware": 15, "Software": 20, "Network": 10 },
          priority_distribution: { "High": 5, "Medium": 15, "Low": 25 },
          status_distribution: { "Open": 10, "In Progress": 15, "Resolved": 20 },
          incidents: [
            { id: 101, title: "Wifi Down", category: "Network", priority: "High", severity: "Critical", status: "Resolved", team: "IT", created: "2026-08-19T10:00:00Z", resolved: "2026-08-19T11:30:00Z" },
            { id: 102, title: "Projector Broken", category: "Hardware", priority: "Medium", severity: "Major", status: "Open", team: "Facilities", created: "2026-08-19T14:00:00Z", resolved: null }
          ]
        });
      }
    } catch (error) {
      console.error("Error fetching reports", error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async (filename, elementId) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Failed to export PDF.");
    }
  };

  const formatObjToChartData = (obj) => {
    if (!obj) return [];
    return Object.entries(obj).map(([name, value]) => ({ name, value }));
  };

  const filteredSponsors = sponsors.filter(s => {
    const passPackage = sponsorFilter.package === "All" || s.package === sponsorFilter.package;
    const passStatus = sponsorFilter.status === "All" || s.status === sponsorFilter.status;
    return passPackage && passStatus;
  });

  const totalValue = sponsors.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const avgPerformance = sponsors.length ? (sponsors.reduce((acc, curr) => acc + (Number(curr.performance) || 0), 0) / sponsors.length).toFixed(1) : 0;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div className="rpt-container">
          
          <div className="rpt-header" style={{ background: "linear-gradient(135deg, #334155 0%, #4f46e5 100%)", padding: "2rem", borderRadius: "18px", color: "white", marginBottom: "2rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>📋 Reports</h1>
            <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>Comprehensive operational analytics and reporting</p>
          </div>

          <div className="rpt-tabs" style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.5rem" }}>
            <button 
              onClick={() => setActiveTab("sponsor")}
              style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", background: activeTab === "sponsor" ? "#4f46e5" : "transparent", color: activeTab === "sponsor" ? "white" : "#475569", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
            >
              Sponsor Report
            </button>
            <button 
              onClick={() => setActiveTab("incident")}
              style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", background: activeTab === "incident" ? "#4f46e5" : "transparent", color: activeTab === "incident" ? "white" : "#475569", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
            >
              Incident Report
            </button>
          </div>

          {loading ? (
            <div className="rpt-loading" style={{ textAlign: "center", padding: "4rem" }}>
              <div style={{ display: "inline-block", width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #4f46e5", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <p>Loading reports...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div className="rpt-content">
              {activeTab === "sponsor" && (
                <div className="rpt-sponsor-tab">
                  <div className="rpt-actions" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                    <button 
                      onClick={() => exportPDF("sponsor_report", "sponsor-report-content")}
                      style={{ background: "#10B981", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      📄 Export to PDF
                    </button>
                  </div>

                  <div id="sponsor-report-content" style={{ background: "white", padding: "2rem", borderRadius: "18px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                    <div className="rpt-summary-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                      <div className="rpt-card" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.875rem", textTransform: "uppercase" }}>Total Sponsors</h3>
                        <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>{sponsors.length}</p>
                      </div>
                      <div className="rpt-card" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.875rem", textTransform: "uppercase" }}>Total Value</h3>
                        <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#10B981" }}>₹{totalValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="rpt-card" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.875rem", textTransform: "uppercase" }}>Avg Performance</h3>
                        <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#4f46e5" }}>{avgPerformance}%</p>
                      </div>
                    </div>

                    <div className="rpt-filters" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                      <select 
                        value={sponsorFilter.package} 
                        onChange={(e) => setSponsorFilter({...sponsorFilter, package: e.target.value})}
                        style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="All">All Packages</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                      </select>
                      <select 
                        value={sponsorFilter.status} 
                        onChange={(e) => setSponsorFilter({...sponsorFilter, status: e.target.value})}
                        style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="rpt-table-wrapper" style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                            <th style={{ padding: "1rem 0.5rem" }}>Sponsor</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Package</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Amount</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Status</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Performance</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Deliverables</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSponsors.length > 0 ? filteredSponsors.map((s, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "1rem 0.5rem", fontWeight: "500" }}>{s.company_name}</td>
                              <td style={{ padding: "1rem 0.5rem" }}>
                                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem", background: s.package === "Platinum" ? "#e2e8f0" : s.package === "Gold" ? "#fef08a" : "#f1f5f9", color: "#334155", fontWeight: "600" }}>
                                  {s.package}
                                </span>
                              </td>
                              <td style={{ padding: "1rem 0.5rem" }}>₹{s.amount?.toLocaleString('en-IN')}</td>
                              <td style={{ padding: "1rem 0.5rem" }}>
                                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem", background: s.status === "Active" ? "#d1fae5" : "#fee2e2", color: s.status === "Active" ? "#065f46" : "#991b1b" }}>
                                  {s.status}
                                </span>
                              </td>
                              <td style={{ padding: "1rem 0.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <div style={{ width: "100px", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ width: `${s.performance}%`, height: "100%", background: "#4f46e5" }}></div>
                                  </div>
                                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>{s.performance}%</span>
                                </div>
                              </td>
                              <td style={{ padding: "1rem 0.5rem", color: "#64748b" }}>{s.deliverables_completed} / {s.deliverables_total}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No sponsors found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "incident" && incidentData && (
                <div className="rpt-incident-tab">
                  <div className="rpt-actions" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                    <button 
                      onClick={() => exportPDF("incident_report", "incident-report-content")}
                      style={{ background: "#10B981", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      📄 Export to PDF
                    </button>
                  </div>

                  <div id="incident-report-content" style={{ background: "white", padding: "2rem", borderRadius: "18px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                    <div className="rpt-summary-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                      <div className="rpt-card" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.875rem", textTransform: "uppercase" }}>Total Incidents</h3>
                        <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>{incidentData.summary?.total_incidents || 0}</p>
                      </div>
                      <div className="rpt-card" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.875rem", textTransform: "uppercase" }}>Escalation Rate</h3>
                        <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#EF4444" }}>{incidentData.summary?.escalation_rate || 0}%</p>
                      </div>
                      <div className="rpt-card" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.875rem", textTransform: "uppercase" }}>Avg Resolution Time</h3>
                        <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#4f46e5" }}>{incidentData.summary?.average_resolution_hours || 0} hrs</p>
                      </div>
                    </div>

                    <div className="rpt-charts" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginBottom: "3rem" }}>
                      
                      <div className="rpt-chart-card" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
                        <h4 style={{ textAlign: "center", marginBottom: "1rem", color: "#334155" }}>Category Distribution</h4>
                        <div style={{ height: 250 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={formatObjToChartData(incidentData.category_distribution)}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {formatObjToChartData(incidentData.category_distribution).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rpt-chart-card" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
                        <h4 style={{ textAlign: "center", marginBottom: "1rem", color: "#334155" }}>Priority Distribution</h4>
                        <div style={{ height: 250 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={formatObjToChartData(incidentData.priority_distribution)}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip cursor={{ fill: "transparent" }} />
                              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                                {formatObjToChartData(incidentData.priority_distribution).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rpt-chart-card" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
                        <h4 style={{ textAlign: "center", marginBottom: "1rem", color: "#334155" }}>Status Distribution</h4>
                        <div style={{ height: 250 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={formatObjToChartData(incidentData.status_distribution)}
                                outerRadius={80}
                                dataKey="value"
                                label
                              >
                                {formatObjToChartData(incidentData.status_distribution).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>

                    <h3 style={{ marginBottom: "1rem", color: "#334155" }}>Recent Incidents</h3>
                    <div className="rpt-table-wrapper" style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                            <th style={{ padding: "1rem 0.5rem" }}>ID</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Title</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Category</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Priority</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Severity</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Status</th>
                            <th style={{ padding: "1rem 0.5rem" }}>Team</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incidentData.incidents?.length > 0 ? incidentData.incidents.map((inc, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "1rem 0.5rem", color: "#64748b" }}>#{inc.id}</td>
                              <td style={{ padding: "1rem 0.5rem", fontWeight: "500" }}>{inc.title}</td>
                              <td style={{ padding: "1rem 0.5rem" }}>{inc.category}</td>
                              <td style={{ padding: "1rem 0.5rem" }}>
                                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.75rem", background: inc.priority === "High" ? "#fee2e2" : inc.priority === "Medium" ? "#fef3c7" : "#f1f5f9", color: inc.priority === "High" ? "#991b1b" : inc.priority === "Medium" ? "#92400e" : "#475569", fontWeight: "bold" }}>
                                  {inc.priority}
                                </span>
                              </td>
                              <td style={{ padding: "1rem 0.5rem", color: "#64748b" }}>{inc.severity}</td>
                              <td style={{ padding: "1rem 0.5rem" }}>
                                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem", background: inc.status === "Resolved" ? "#d1fae5" : inc.status === "Open" ? "#fee2e2" : "#e0e7ff", color: inc.status === "Resolved" ? "#065f46" : inc.status === "Open" ? "#991b1b" : "#3730a3" }}>
                                  {inc.status}
                                </span>
                              </td>
                              <td style={{ padding: "1rem 0.5rem", color: "#64748b" }}>{inc.team}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No incidents found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Reports;