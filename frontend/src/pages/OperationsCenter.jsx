import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import Swal from "sweetalert2";

const OperationsCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/operations/dashboard");
      setData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Fallback data in case API fails during development
      setData({
        sponsorship: { total_sponsors: 0, active_sponsors: 0, total_value: 0, pending_value: 0, average_performance: 0 },
        incidents: { open_incidents: 0, critical_incidents: 0, high_priority: 0, in_progress: 0, resolved: 0, average_resolution_hours: 0 },
        alerts: { active_alerts: 0, critical_alerts: 0, unread_alerts: 0 },
        recent_incidents: [],
        recent_alerts: [],
        top_sponsors: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/alert/${id}/read`);
      // Update local state for immediate feedback
      setData((prevData) => ({
        ...prevData,
        recent_alerts: prevData.recent_alerts.map((alert) =>
          alert.alert_id === id ? { ...alert, is_read: true } : alert
        ),
        alerts: {
          ...prevData.alerts,
          unread_alerts: Math.max(0, prevData.alerts.unread_alerts - 1)
        }
      }));
    } catch (error) {
      console.error("Error marking alert as read:", error);
      Swal.fire("Error", "Failed to mark alert as read.", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/alerts/mark-all-read");
      fetchDashboardData();
      Swal.fire("Success", "All alerts marked as read.", "success");
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
      Swal.fire("Error", "Failed to mark alerts as read.", "error");
    }
  };

  const handleCheckDeadlines = async () => {
    try {
      Swal.fire({
        title: "Scanning Deadlines...",
        text: "Checking sponsor contract end dates and deliverable completion status...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const response = await api.post("/alerts/check-deadlines");
      await fetchDashboardData();
      Swal.close();
      const count = response.data?.alerts_created ?? 0;
      Swal.fire({
        icon: "success",
        title: "Scan Completed",
        text: response.data?.message || `Scan completed. ${count} new alert(s) generated.`,
        timer: 3000,
        showConfirmButton: true,
      });
    } catch (error) {
      console.error("Error checking deadlines:", error);
      Swal.close();
      const msg =
        error.response?.data?.detail ||
        error.message ||
        "Failed to check deadlines.";
      Swal.fire("Scan Error", msg, "error");
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

  const getPriorityBadge = (priority) => {
    const p = priority?.toLowerCase();
    let badgeClass = "ops-badge-default";
    if (p === "critical") badgeClass = "ops-badge-critical";
    if (p === "high") badgeClass = "ops-badge-high";
    if (p === "medium") badgeClass = "ops-badge-medium";
    if (p === "low") badgeClass = "ops-badge-low";
    return <span className={`ops-badge ${badgeClass}`}>{priority || "Unknown"}</span>;
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    let badgeClass = "ops-badge-default";
    if (s === "resolved" || s === "completed" || s === "active") badgeClass = "ops-badge-success";
    if (s === "in progress" || s === "pending") badgeClass = "ops-badge-warning";
    if (s === "open") badgeClass = "ops-badge-danger";
    return <span className={`ops-badge ${badgeClass}`}>{status || "Unknown"}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div className="ops-container">
          
          {/* Header Section */}
          <div className="ops-header-section" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)', padding: '2rem', borderRadius: '18px', color: 'white', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(67, 56, 202, 0.2)' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📡 Operations Center
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem' }}>
                Real-time event monitoring and operations dashboard
              </p>
            </div>
            <div className="ops-header-actions" style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleCheckDeadlines} className="ops-btn-outline" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}>
                Scan Deadlines
              </button>
              <button onClick={fetchDashboardData} disabled={loading} className="ops-btn-primary" style={{ background: 'white', color: '#4338ca', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                {loading ? "Refreshing..." : "🔄 Refresh Data"}
              </button>
            </div>
          </div>

          {loading && !data ? (
            <div className="ops-loading-state" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <h2>Loading Operations Data...</h2>
            </div>
          ) : (
            <>
              {/* KPI Section */}
              <div className="ops-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* Sponsorship Section - Green Accent */}
                <div className="ops-kpi-card" style={{ background: 'white', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #10b981' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤝 Sponsorship
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total Sponsors</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{data?.sponsorship?.total_sponsors || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Active Sponsors</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{data?.sponsorship?.active_sponsors || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total Value</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{formatCurrency(data?.sponsorship?.total_value)}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Pending Value</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>{formatCurrency(data?.sponsorship?.pending_value)}</p>
                    </div>
                    <div className="ops-kpi-item" style={{ gridColumn: 'span 2' }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Avg. Performance Score</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div style={{ flex: 1, background: '#f3f4f6', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${data?.sponsorship?.average_performance || 0}%`, background: '#10b981', height: '100%' }}></div>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: '600' }}>{data?.sponsorship?.average_performance || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Incidents Section - Red Accent */}
                <div className="ops-kpi-card" style={{ background: 'white', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #ef4444' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🚨 Incidents
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Open Incidents</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>{data?.incidents?.open_incidents || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>In Progress</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>{data?.incidents?.in_progress || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Critical Priority</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#b91c1c' }}>{data?.incidents?.critical_incidents || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>High Priority</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#ea580c' }}>{data?.incidents?.high_priority || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Resolved</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{data?.incidents?.resolved || 0}</p>
                    </div>
                    <div className="ops-kpi-item">
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Avg. Resolution</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{data?.incidents?.average_resolution_hours || 0} <span style={{ fontSize: '1rem', fontWeight: '400', color: '#6b7280' }}>hrs</span></p>
                    </div>
                  </div>
                </div>

                {/* Alerts Section - Amber Accent */}
                <div className="ops-kpi-card" style={{ background: 'white', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderTop: '4px solid #f59e0b' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🔔 Alerts
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    <div className="ops-kpi-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Active Alerts</span>
                      <span style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>{data?.alerts?.active_alerts || 0}</span>
                    </div>
                    <div className="ops-kpi-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Critical Alerts</span>
                      <span style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{data?.alerts?.critical_alerts || 0}</span>
                    </div>
                    <div className="ops-kpi-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Unread Alerts</span>
                      <span style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {data?.alerts?.unread_alerts > 0 && <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>}
                        {data?.alerts?.unread_alerts || 0}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Two-Column Section: Recent Incidents & Alerts */}
              <div className="ops-two-column" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* Left: Recent Incidents */}
                <div className="ops-section-card" style={{ background: 'white', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem' }}>Recent Incidents</h3>
                  </div>
                  
                  {data?.recent_incidents?.length > 0 ? (
                    <div className="ops-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {data.recent_incidents.map((incident) => (
                        <div key={incident.incident_id} className="ops-list-item" style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{incident.title}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {getPriorityBadge(incident.priority)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <span>📂 {incident.category || 'General'}</span>
                              <span>🕒 {formatDate(incident.created_at)}</span>
                            </div>
                            {getStatusBadge(incident.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ops-empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                      <p>No recent incidents found.</p>
                    </div>
                  )}
                </div>

                {/* Right: Recent Alerts */}
                <div className="ops-section-card" style={{ background: 'white', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem' }}>Recent Alerts</h3>
                    <button onClick={handleMarkAllRead} disabled={data?.alerts?.unread_alerts === 0} style={{ background: 'transparent', border: '1px solid #e5e7eb', color: '#4b5563', padding: '0.5rem 1rem', borderRadius: '6px', cursor: data?.alerts?.unread_alerts === 0 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>
                      Mark All Read
                    </button>
                  </div>

                  {data?.recent_alerts?.length > 0 ? (
                    <div className="ops-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {data.recent_alerts.map((alert) => (
                        <div key={alert.alert_id} className={`ops-list-item ${alert.is_read ? 'read' : 'unread'}`} style={{ border: '1px solid', borderColor: alert.is_read ? '#e5e7eb' : '#fef3c7', background: alert.is_read ? 'white' : '#fffbeb', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, paddingRight: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                {getPriorityBadge(alert.priority)}
                                <span style={{ fontSize: '0.75rem', background: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>
                                  {alert.alert_type}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937', lineHeight: '1.4' }}>{alert.message}</p>
                            </div>
                            {!alert.is_read && (
                              <button onClick={() => handleMarkAsRead(alert.alert_id)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                Mark Read
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            🕒 {formatDate(alert.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ops-empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                      <p>No recent alerts found.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Sponsor Performance Section */}
              <div className="ops-section-card ops-sponsor-performance" style={{ background: 'white', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.25rem' }}>Top Sponsors Performance</h3>
                
                {data?.top_sponsors?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                          <th style={{ padding: '1rem', color: '#6b7280', fontWeight: '600', fontSize: '0.875rem' }}>Company</th>
                          <th style={{ padding: '1rem', color: '#6b7280', fontWeight: '600', fontSize: '0.875rem' }}>Package</th>
                          <th style={{ padding: '1rem', color: '#6b7280', fontWeight: '600', fontSize: '0.875rem' }}>Value</th>
                          <th style={{ padding: '1rem', color: '#6b7280', fontWeight: '600', fontSize: '0.875rem' }}>Deliverables</th>
                          <th style={{ padding: '1rem', color: '#6b7280', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.top_sponsors.map((sponsor) => {
                          const progress = sponsor.deliverables_total > 0 
                            ? Math.round((sponsor.deliverables_completed / sponsor.deliverables_total) * 100) 
                            : 0;
                            
                          return (
                            <tr key={sponsor.sponsor_id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }} className="ops-table-row">
                              <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>{sponsor.company_name}</td>
                              <td style={{ padding: '1rem', color: '#4b5563' }}>{sponsor.package}</td>
                              <td style={{ padding: '1rem', fontWeight: '600', color: '#059669' }}>{formatCurrency(sponsor.amount)}</td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{ flex: 1, minWidth: '100px', background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, background: progress === 100 ? '#10b981' : '#4f46e5', height: '100%' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.875rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
                                    {sponsor.deliverables_completed} / {sponsor.deliverables_total}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>{getStatusBadge(sponsor.status)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ops-empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                    <p>No sponsor data available.</p>
                  </div>
                )}
              </div>

            </>
          )}

        </div>
      </div>
      
      {/* Inline styles for custom badges added directly to avoid App.css dependency for critical visuals */}
      <style>{`
        .ops-container {
          padding: 1rem;
          max-width: 1600px;
          margin: 0 auto;
        }
        .ops-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .ops-badge-critical { background: #fee2e2; color: #991b1b; }
        .ops-badge-high { background: #ffedd5; color: #c2410c; }
        .ops-badge-medium { background: #fef9c3; color: #854d0e; }
        .ops-badge-low { background: #d1fae5; color: #065f46; }
        .ops-badge-success { background: #d1fae5; color: #065f46; }
        .ops-badge-warning { background: #fef3c7; color: #92400e; }
        .ops-badge-danger { background: #fee2e2; color: #991b1b; }
        .ops-badge-default { background: #f3f4f6; color: #374151; }
        .ops-table-row:hover { background-color: #f9fafb; }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OperationsCenter;
