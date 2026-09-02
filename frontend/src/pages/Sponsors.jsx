import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import Swal from "sweetalert2";
import Modal from "react-modal";
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
  Legend,
  ResponsiveContainer
} from "recharts";

const customModalStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "800px",
    maxWidth: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "16px",
    padding: "30px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    border: "none",
    backgroundColor: "#ffffff"
  },
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
  },
};

const CATEGORIES = ["Technology", "Healthcare", "Finance", "Education", "Media", "Retail", "Other"];
const PACKAGES = ["Platinum", "Gold", "Silver", "Bronze", "Custom"];
const STATUSES = ["Lead", "Contacted", "Negotiating", "Confirmed", "Active", "Completed", "Cancelled"];
const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"];

const getStatusColor = (status) => {
  const colors = {
    Lead: "#64748b",        // gray
    Contacted: "#3b82f6",   // blue
    Negotiating: "#eab308", // yellow
    Confirmed: "#4f46e5",   // indigo
    Active: "#22c55e",      // green
    Completed: "#14b8a6",   // teal
    Cancelled: "#ef4444"    // red
  };
  return colors[status] || "#64748b";
};

const getPackageStyle = (pkg) => {
  const styles = {
    Platinum: { background: "linear-gradient(135deg, #a855f7, #c084fc)", color: "white" },
    Gold: { background: "#fbbf24", color: "#78350f" },
    Silver: { background: "#e2e8f0", color: "#334155" },
    Bronze: { background: "#fdba74", color: "#9a3412" },
    Custom: { background: "#e0f2fe", color: "#0369a1" }
  };
  return styles[pkg] || { background: "#f1f5f9", color: "#475569" };
};

const Sponsors = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const initialFormState = {
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    category: "Technology",
    package: "Gold",
    amount: 0,
    event: "",
    status: "Lead",
    start_date: "",
    end_date: "",
    benefits: "",
    deliverables: "",
    deliverables_completed: 0,
    deliverables_total: 0,
    notes: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  // AI State
  const [aiFormData, setAiFormData] = useState({
    event: "",
    category: "Technology",
    budget_min: "",
    budget_max: "",
    package: "Gold",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    try {
      Modal.setAppElement("#root");
    } catch {
      // Fallback
    }
    fetchSponsors();
    fetchAnalytics();
  }, []);

  const fetchSponsors = async () => {
    try {
      const res = await api.get("/sponsors");
      if (Array.isArray(res.data)) {
        setSponsors(res.data);
      }
    } catch (error) {
      console.error("Error fetching sponsors:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/sponsorship/analytics");
      if (res.data) setAnalyticsData(res.data);
    } catch (error) {
      console.error("Analytics API failed:", error);
    }
  };

  const handleOpenModal = (sponsor = null) => {
    if (sponsor) {
      setIsEditing(true);
      setCurrentId(sponsor.sponsor_id);
      setFormData({
        company_name: sponsor.company_name || "",
        contact_person: sponsor.contact_person || "",
        email: sponsor.email || "",
        phone: sponsor.phone || "",
        category: sponsor.category || "Technology",
        package: sponsor.package || "Gold",
        amount: sponsor.amount || 0,
        event: sponsor.event || "",
        status: sponsor.status || "Lead",
        start_date: sponsor.start_date ? sponsor.start_date.split('T')[0] : "",
        end_date: sponsor.end_date ? sponsor.end_date.split('T')[0] : "",
        benefits: sponsor.benefits || "",
        deliverables: sponsor.deliverables || "",
        deliverables_completed: sponsor.deliverables_completed || 0,
        deliverables_total: sponsor.deliverables_total || 0,
        notes: sponsor.notes || "",
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/sponsor/${currentId}`, formData);
        Swal.fire("Success", "Sponsor updated successfully!", "success");
      } else {
        await api.post("/sponsors", formData);
        Swal.fire("Success", "Sponsor added successfully!", "success");
      }
      handleCloseModal();
      fetchSponsors();
      fetchAnalytics();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to save sponsor. Please try again.", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/sponsor/${id}`);
        Swal.fire("Deleted!", "Sponsor has been deleted.", "success");
        fetchSponsors();
        fetchAnalytics();
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Failed to delete sponsor.", "error");
      }
    }
  };

  const handleAiInputChange = (e) => {
    const { name, value } = e.target;
    setAiFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGetRecommendations = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    try {
      const res = await api.post("/sponsorship-agent/recommend", aiFormData);
      setAiRecommendation(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", error.response?.data?.detail || "Failed to get recommendations. Please try again.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  // KPI Calculations
  const totalSponsors = sponsors.length;
  const activeSponsors = sponsors.filter(s => s.status === "Active" || s.status === "Confirmed").length;
  const totalValue = sponsors.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const totalDeliv = sponsors.reduce((acc, s) => acc + (Number(s.deliverables_total) || 0), 0);
  const compDeliv = sponsors.reduce((acc, s) => acc + (Number(s.deliverables_completed) || 0), 0);
  const delivRate = totalDeliv ? Math.round((compDeliv / totalDeliv) * 100) : 0;

  // Formatting in INR
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  // Filtering
  const filteredSponsors = sponsors.filter(s => {
    const matchesSearch = (s.company_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.contact_person || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? s.status === statusFilter : true;
    const matchesPackage = packageFilter ? s.package === packageFilter : true;
    return matchesSearch && matchesStatus && matchesPackage;
  });

  // Derived Analytics (safe object-to-array transformation)
  const chartDataPackage = analyticsData?.package_distribution && Object.keys(analyticsData.package_distribution).length > 0
    ? Object.entries(analyticsData.package_distribution).map(([name, value]) => ({ name, value }))
    : PACKAGES.map(pkg => ({ name: pkg, value: sponsors.filter(s => s.package === pkg).length })).filter(d => d.value > 0);
  
  const chartDataStatus = analyticsData?.status_distribution && Object.keys(analyticsData.status_distribution).length > 0
    ? Object.entries(analyticsData.status_distribution).map(([name, count]) => ({ name, count }))
    : STATUSES.map(stat => ({ name: stat, count: sponsors.filter(s => s.status === stat).length })).filter(d => d.count > 0);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <style>{`
          .sp-container { padding: 24px; max-width: 1400px; margin: 0 auto; color: #1e293b; font-family: system-ui, -apple-system, sans-serif; }
          .sp-header { background: linear-gradient(135deg, #0d9488, #0891b2); color: white; padding: 32px 40px; border-radius: 20px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.3); }
          .sp-header-title { margin: 0; font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em; }
          .sp-header-subtitle { margin: 8px 0 0; font-size: 1.1rem; opacity: 0.9; }
          .sp-btn-primary { background: white; color: #0f766e; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .sp-btn-primary:hover { background: #f0fdfa; transform: translateY(-2px); box-shadow: 0 6px 8px -1px rgba(0,0,0,0.15); }
          
          .sp-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
          .sp-kpi-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; display: flex; flex-direction: column; }
          .sp-kpi-title { font-size: 0.875rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
          .sp-kpi-value { font-size: 2rem; font-weight: 700; color: #0f172a; }
          .sp-kpi-progress { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 16px; }
          .sp-kpi-bar { height: 100%; background: #0ea5e9; border-radius: 4px; transition: width 1s ease-in-out; }

          .sp-toolbar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; background: white; padding: 16px; border-radius: 16px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
          .sp-input, .sp-select { padding: 10px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; }
          .sp-input:focus, .sp-select:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1); }
          .sp-search { flex-grow: 1; min-width: 200px; }

          .sp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; margin-bottom: 40px; }
          .sp-card { background: white; border-radius: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 24px; border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
          .sp-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
          .sp-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .sp-card-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
          .sp-card-subtitle { font-size: 0.875rem; color: #64748b; margin: 0; }
          .sp-badge { padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          
          .sp-card-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 0.9rem; color: #475569; }
          .sp-detail-item { display: flex; flex-direction: column; }
          .sp-detail-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; margin-bottom: 2px; }
          .sp-detail-value { font-weight: 500; color: #0f172a; }

          .sp-progress-container { margin-bottom: 20px; }
          .sp-progress-header { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px; color: #64748b; font-weight: 600; }
          .sp-progress-bg { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
          .sp-progress-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #0d9488, #2dd4bf); }

          .sp-card-actions { display: flex; gap: 10px; margin-top: auto; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          .sp-btn-action { flex: 1; padding: 8px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-align: center; border: none; transition: background 0.2s; }
          .sp-btn-edit { background: #f1f5f9; color: #334155; }
          .sp-btn-edit:hover { background: #e2e8f0; }
          .sp-btn-delete { background: #fef2f2; color: #ef4444; }
          .sp-btn-delete:hover { background: #fee2e2; }

          .sp-section { background: white; border-radius: 20px; padding: 32px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
          .sp-section-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 24px 0; display: flex; align-items: center; gap: 10px; }
          
          .sp-ai-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          .sp-form-group { margin-bottom: 16px; }
          .sp-label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
          .sp-btn-ai { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; width: 100%; cursor: pointer; transition: background 0.2s; }
          .sp-btn-ai:hover { background: #4338ca; }
          .sp-btn-ai:disabled { background: #a5b4fc; cursor: not-allowed; }

          .sp-ai-result { background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px dashed #cbd5e1; min-height: 250px; }
          .sp-ai-score { font-size: 3rem; font-weight: 800; color: #0ea5e9; line-height: 1; margin: 16px 0; }

          .sp-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          .sp-chart-card { background: #f8fafc; border-radius: 16px; padding: 24px; height: 350px; }

          /* Modal specific */
          .sp-modal-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .sp-modal-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: #0f172a; }
          .sp-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
          .sp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .sp-form-full { grid-column: 1 / -1; }
          .sp-textarea { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; resize: vertical; min-height: 80px; }
          .sp-modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
          .sp-btn-cancel { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
          .sp-btn-save { background: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
          .sp-btn-save:hover { background: #0f766e; }

          @media (max-width: 768px) {
            .sp-ai-layout, .sp-charts-grid { grid-template-columns: 1fr; }
            .sp-form-grid { grid-template-columns: 1fr; }
          }
        `}</style>

        <div className="sp-container">
          {/* Header */}
          <div className="sp-header">
            <div>
              <h1 className="sp-header-title">Sponsors</h1>
              <p className="sp-header-subtitle">Manage partnerships and track deliverables</p>
            </div>
            <button className="sp-btn-primary" onClick={() => handleOpenModal()}>
              + Add Sponsor
            </button>
          </div>

          {/* KPIs */}
          <div className="sp-kpi-grid">
            <div className="sp-kpi-card">
              <span className="sp-kpi-title">Total Sponsors</span>
              <span className="sp-kpi-value">{totalSponsors}</span>
            </div>
            <div className="sp-kpi-card">
              <span className="sp-kpi-title">Active Partners</span>
              <span className="sp-kpi-value">{activeSponsors}</span>
            </div>
            <div className="sp-kpi-card">
              <span className="sp-kpi-title">Total Value</span>
              <span className="sp-kpi-value">{formatCurrency(totalValue)}</span>
            </div>
            <div className="sp-kpi-card">
              <span className="sp-kpi-title">Deliverable Progress</span>
              <span className="sp-kpi-value">{delivRate}%</span>
              <div className="sp-kpi-progress">
                <div className="sp-kpi-bar" style={{ width: `${delivRate}%` }}></div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="sp-toolbar">
            <input 
              type="text" 
              className="sp-input sp-search" 
              placeholder="Search sponsors by name or contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              className="sp-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="sp-select"
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
            >
              <option value="">All Packages</option>
              {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Sponsor Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>Loading sponsors...</div>
          ) : filteredSponsors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "16px", marginBottom: "40px" }}>
              <h3 style={{ margin: "0 0 10px", color: "#475569" }}>No sponsors found</h3>
              <p style={{ color: "#94a3b8", margin: 0 }}>Try adjusting your filters or add a new sponsor.</p>
            </div>
          ) : (
            <div className="sp-grid">
              {filteredSponsors.map(sponsor => {
                const pkgStyle = getPackageStyle(sponsor.package);
                const statusColor = getStatusColor(sponsor.status);
                const progress = sponsor.deliverables_total > 0 
                  ? Math.round(((sponsor.deliverables_completed || 0) / sponsor.deliverables_total) * 100) 
                  : 0;

                return (
                  <div key={sponsor.sponsor_id} className="sp-card">
                    <div className="sp-card-header">
                      <div>
                        <h3 className="sp-card-title">{sponsor.company_name}</h3>
                        <p className="sp-card-subtitle">{sponsor.contact_person}</p>
                      </div>
                      <span className="sp-badge" style={pkgStyle}>{sponsor.package}</span>
                    </div>

                    <div className="sp-card-details">
                      <div className="sp-detail-item">
                        <span className="sp-detail-label">AMOUNT</span>
                        <span className="sp-detail-value">{formatCurrency(sponsor.amount || 0)}</span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-label">STATUS</span>
                        <span className="sp-detail-value" style={{ color: statusColor, fontWeight: "bold" }}>
                          ● {sponsor.status}
                        </span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-label">EMAIL</span>
                        <span className="sp-detail-value" style={{ wordBreak: 'break-all' }}>{sponsor.email || 'N/A'}</span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-label">CATEGORY</span>
                        <span className="sp-detail-value">{sponsor.category || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="sp-progress-container">
                      <div className="sp-progress-header">
                        <span>Deliverables</span>
                        <span>{sponsor.deliverables_completed || 0} / {sponsor.deliverables_total || 0} ({progress}%)</span>
                      </div>
                      <div className="sp-progress-bg">
                        <div className="sp-progress-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="sp-card-actions">
                      <button className="sp-btn-action sp-btn-edit" onClick={() => handleOpenModal(sponsor)}>Edit</button>
                      <button className="sp-btn-action sp-btn-delete" onClick={() => handleDelete(sponsor.sponsor_id)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Recommendation Section */}
          <div className="sp-section">
            <h2 className="sp-section-title">🤖 AI Sponsor Recommendation</h2>
            <div className="sp-ai-layout">
              <div>
                <form onSubmit={handleGetRecommendations}>
                  <div className="sp-form-group">
                    <label className="sp-label">Event Focus/Theme</label>
                    <input type="text" className="sp-input" style={{ width: '100%' }} name="event" value={aiFormData.event} onChange={handleAiInputChange} placeholder="e.g., Annual Tech Summit 2026" required />
                  </div>
                  <div className="sp-form-grid" style={{ marginBottom: "16px" }}>
                    <div>
                      <label className="sp-label">Industry Category</label>
                      <select className="sp-select" style={{ width: '100%' }} name="category" value={aiFormData.category} onChange={handleAiInputChange}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="sp-label">Target Package</label>
                      <select className="sp-select" style={{ width: '100%' }} name="package" value={aiFormData.package} onChange={handleAiInputChange}>
                        {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="sp-label">Min Budget (₹)</label>
                      <input type="number" className="sp-input" style={{ width: '100%' }} name="budget_min" value={aiFormData.budget_min} onChange={handleAiInputChange} />
                    </div>
                    <div>
                      <label className="sp-label">Max Budget (₹)</label>
                      <input type="number" className="sp-input" style={{ width: '100%' }} name="budget_max" value={aiFormData.budget_max} onChange={handleAiInputChange} />
                    </div>
                  </div>
                  <button type="submit" className="sp-btn-ai" disabled={aiLoading}>
                    {aiLoading ? "Analyzing Partners..." : "Get Recommendations"}
                  </button>
                </form>
              </div>

              <div className="sp-ai-result">
                {aiRecommendation ? (
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "1rem" }}>Top Recommendation</h3>
                    <h2 style={{ margin: "0", fontSize: "1.75rem", color: "#0f172a" }}>{aiRecommendation.best_sponsor?.company_name || aiRecommendation.recommended_sponsor}</h2>
                    
                    <div className="sp-ai-score">{aiRecommendation.best_sponsor?.match_score || aiRecommendation.match_score}% Match</div>
                    
                    <span className="sp-badge" style={getPackageStyle(aiRecommendation.best_sponsor?.recommended_package || aiRecommendation.recommended_package)}>
                      Suggested: {aiRecommendation.best_sponsor?.recommended_package || aiRecommendation.recommended_package}
                    </span>

                    <h4 style={{ marginTop: "24px", marginBottom: "8px" }}>Why this match?</h4>
                    <ul style={{ margin: 0, paddingLeft: "20px", color: "#475569", lineHeight: "1.6" }}>
                      {(aiRecommendation.best_sponsor?.reasons || aiRecommendation.reasons)?.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>

                    {aiRecommendation.alternatives?.length > 0 && (
                      <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #cbd5e1" }}>
                        <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 600 }}>Alternatives: </span>
                        <span style={{ color: "#334155" }}>{aiRecommendation.alternatives.map(a => a.company_name || a).join(", ")}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", textAlign: "center" }}>
                    Fill out the criteria and let our AI suggest the best partnership targets based on real historical data.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="sp-section">
            <h2 className="sp-section-title">📊 Sponsorship Analytics</h2>
            <div className="sp-charts-grid">
              <div className="sp-chart-card">
                <h3 style={{ margin: "0 0 16px 0", textAlign: "center", color: "#475569" }}>Package Distribution</h3>
                <ResponsiveContainer width="100%" height="85%">
                  {chartDataPackage.length > 0 ? (
                    <PieChart>
                      <Pie data={chartDataPackage} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={5} dataKey="value">
                        {chartDataPackage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>No package data available</div>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="sp-chart-card">
                <h3 style={{ margin: "0 0 16px 0", textAlign: "center", color: "#475569" }}>Status Pipeline</h3>
                <ResponsiveContainer width="100%" height="85%">
                  {chartDataStatus.length > 0 ? (
                    <BarChart data={chartDataStatus} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "#f1f5f9" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {chartDataStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>No status data available</div>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onRequestClose={handleCloseModal} style={customModalStyles} contentLabel="Sponsor Modal">
        <div className="sp-modal-header">
          <h2 className="sp-modal-title">{isEditing ? "Edit Sponsor" : "Add New Sponsor"}</h2>
          <button className="sp-modal-close" onClick={handleCloseModal}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sp-form-grid">
            <div className="sp-form-full">
              <label className="sp-label">Company Name *</label>
              <input type="text" className="sp-input" style={{ width: '100%' }} name="company_name" value={formData.company_name} onChange={handleInputChange} required />
            </div>
            
            <div>
              <label className="sp-label">Contact Person *</label>
              <input type="text" className="sp-input" style={{ width: '100%' }} name="contact_person" value={formData.contact_person} onChange={handleInputChange} required />
            </div>
            
            <div>
              <label className="sp-label">Email</label>
              <input type="email" className="sp-input" style={{ width: '100%' }} name="email" value={formData.email} onChange={handleInputChange} />
            </div>

            <div>
              <label className="sp-label">Phone</label>
              <input type="text" className="sp-input" style={{ width: '100%' }} name="phone" value={formData.phone} onChange={handleInputChange} />
            </div>

            <div>
              <label className="sp-label">Category</label>
              <select className="sp-select" style={{ width: '100%' }} name="category" value={formData.category} onChange={handleInputChange}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="sp-label">Sponsorship Package</label>
              <select className="sp-select" style={{ width: '100%' }} name="package" value={formData.package} onChange={handleInputChange}>
                {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="sp-label">Amount (₹)</label>
              <input type="number" className="sp-input" style={{ width: '100%' }} name="amount" value={formData.amount} onChange={handleInputChange} min="0" />
            </div>

            <div>
              <label className="sp-label">Event</label>
              <input type="text" className="sp-input" style={{ width: '100%' }} name="event" value={formData.event} onChange={handleInputChange} />
            </div>

            <div>
              <label className="sp-label">Status</label>
              <select className="sp-select" style={{ width: '100%' }} name="status" value={formData.status} onChange={handleInputChange}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="sp-label">Start Date</label>
              <input type="date" className="sp-input" style={{ width: '100%' }} name="start_date" value={formData.start_date} onChange={handleInputChange} />
            </div>

            <div>
              <label className="sp-label">End Date</label>
              <input type="date" className="sp-input" style={{ width: '100%' }} name="end_date" value={formData.end_date} onChange={handleInputChange} />
            </div>

            <div>
              <label className="sp-label">Deliverables Completed</label>
              <input type="number" className="sp-input" style={{ width: '100%' }} name="deliverables_completed" value={formData.deliverables_completed} onChange={handleInputChange} min="0" />
            </div>

            <div>
              <label className="sp-label">Total Deliverables</label>
              <input type="number" className="sp-input" style={{ width: '100%' }} name="deliverables_total" value={formData.deliverables_total} onChange={handleInputChange} min="0" />
            </div>

            <div className="sp-form-full">
              <label className="sp-label">Benefits</label>
              <textarea className="sp-textarea" name="benefits" value={formData.benefits} onChange={handleInputChange} placeholder="Describe the benefits included in this package..." />
            </div>

            <div className="sp-form-full">
              <label className="sp-label">Notes</label>
              <textarea className="sp-textarea" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Internal notes..." />
            </div>
          </div>

          <div className="sp-modal-actions">
            <button type="button" className="sp-btn-cancel" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="sp-btn-save">{isEditing ? "Save Changes" : "Add Sponsor"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Sponsors;
