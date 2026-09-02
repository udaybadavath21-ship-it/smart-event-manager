import React, { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import Modal from 'react-modal';
import Swal from 'sweetalert2';
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
} from 'recharts';

const CATEGORIES = [
  'Medical', 'Security', 'Technical', 'Equipment',
  'Venue', 'Crowd', 'Speaker', 'Schedule', 'Other'
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Reported', 'Acknowledged', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981', '#8b5cf6', '#64748b', '#ec4899', '#06b6d4'];

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // KPI Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);

  // Detail Modal State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    category: 'Technical',
    location: '',
    reported_by: '',
    assigned_team: '',
    event: '',
    severity: 3,
    priority: 'Medium',
    notes: ''
  });

  // AI Assessment State
  const [aiForm, setAiForm] = useState({
    category: 'Medical',
    description: '',
    severity: 3,
    affected_people: 0,
    event: ''
  });
  const [isAssessing, setIsAssessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    try {
      Modal.setAppElement('#root');
    } catch {
      // Fallback
    }
    fetchIncidents();
    fetchAnalytics();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/incidents');
      const data = res.data?.incidents || res.data || [];
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/incident/analytics');
      if (res.data) setAnalyticsData(res.data);
    } catch (err) {
      console.error('Error fetching incident analytics:', err);
    }
  };

  // Workflow Actions
  const handleWorkflowAction = async (incidentId, action) => {
    if (!incidentId) {
      Swal.fire('Error', 'Invalid incident ID.', 'error');
      return;
    }

    try {
      if (action === 'resolve') {
        const { value: resolutionText, isConfirmed } = await Swal.fire({
          title: 'Resolve Incident',
          input: 'textarea',
          inputLabel: 'Resolution Details & Actions Taken',
          inputPlaceholder: 'Describe how the incident was resolved...',
          showCancelButton: true,
          confirmButtonText: 'Resolve Incident',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#6b7280',
          inputValidator: (val) => {
            if (!val || !val.trim()) {
              return 'Please provide resolution details.';
            }
          }
        });

        if (!isConfirmed) return;

        const res = await api.put(`/incident/${incidentId}/resolve`, {
          resolution: resolutionText.trim()
        });

        Swal.fire({
          icon: 'success',
          title: 'Resolved!',
          text: res.data?.message || 'Incident marked as Resolved.',
          timer: 2000,
          showConfirmButton: false
        });
      } else if (action === 'escalate') {
        const result = await Swal.fire({
          title: 'Escalate Incident?',
          text: 'This will increase the escalation tier and notify emergency teams with an operational alert.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, Escalate',
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#6b7280'
        });

        if (!result.isConfirmed) return;

        const res = await api.put(`/incident/${incidentId}/escalate`);

        Swal.fire({
          icon: 'warning',
          title: 'Escalated!',
          text: res.data?.message || 'Incident has been escalated.',
          timer: 2000,
          showConfirmButton: false
        });
      } else if (action === 'close') {
        const result = await Swal.fire({
          title: 'Close Incident?',
          text: 'This incident has been resolved and will be officially closed.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Close Incident',
          confirmButtonColor: '#374151',
          cancelButtonColor: '#6b7280'
        });

        if (!result.isConfirmed) return;

        const res = await api.put(`/incident/${incidentId}/close`);

        Swal.fire({
          icon: 'success',
          title: 'Closed!',
          text: res.data?.message || 'Incident is now closed.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Acknowledge or Start-Response
        const res = await api.put(`/incident/${incidentId}/${action}`);
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: res.data?.message || 'Incident status updated.',
          timer: 1800,
          showConfirmButton: false
        });
      }

      // Refresh list & analytics
      await fetchIncidents();
      await fetchAnalytics();

      // If detail modal is open for this incident, update it
      if (selectedIncident && selectedIncident.incident_id === incidentId) {
        try {
          const updated = await api.get(`/incident/${incidentId}`);
          setSelectedIncident(updated.data);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Workflow error:', err);
      const msg = err.response?.data?.detail || err.message || `Failed to perform action: ${action}`;
      Swal.fire('Action Failed', msg, 'error');
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    const result = await Swal.fire({
      title: 'Delete Incident?',
      text: 'Are you sure you want to delete this incident record? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/incident/${incidentId}`);
      Swal.fire('Deleted!', 'Incident record has been deleted.', 'success');
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      fetchIncidents();
      fetchAnalytics();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete incident.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/incidents', reportForm);
      Swal.fire({
        icon: 'success',
        title: 'Incident Reported!',
        text: res.data?.message || 'New incident reported successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      setIsReportModalOpen(false);
      setReportForm({
        title: '',
        description: '',
        category: 'Technical',
        location: '',
        reported_by: '',
        assigned_team: '',
        event: '',
        severity: 3,
        priority: 'Medium',
        notes: ''
      });
      fetchIncidents();
      fetchAnalytics();
    } catch (err) {
      console.error('Create error:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to report incident.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const handleAiAssessment = async (e) => {
    e.preventDefault();
    setIsAssessing(true);
    setAiResult(null);
    try {
      const res = await api.post('/incident-agent/recommend-priority', aiForm);
      setAiResult(res.data);
      Swal.fire({
        title: 'Assessment Complete',
        text: `Recommended Priority: ${res.data.priority} (${res.data.score}/100)`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500
      });
    } catch (err) {
      console.error('AI Assessment error:', err);
      const msg = err.response?.data?.detail || 'AI Assessment failed.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setIsAssessing(false);
    }
  };

  const openDetailModal = (inc) => {
    setSelectedIncident(inc);
    setIsDetailModalOpen(true);
  };

  // KPI Calculations from Backend Analytics Summary (representing complete dataset)
  const totalCount = analyticsData?.summary?.total_incidents ?? incidents.length;
  const openCount = analyticsData?.summary?.open_incidents ?? incidents.filter(i => {
    const s = (i.status || '').toLowerCase();
    return s === 'reported' || s === 'acknowledged' || s === 'open' || s === 'escalated';
  }).length;
  const criticalCount = analyticsData?.summary?.critical_incidents ?? incidents.filter(i => (i.priority || '').toLowerCase() === 'critical').length;
  const highCount = analyticsData?.summary?.high_priority ?? incidents.filter(i => (i.priority || '').toLowerCase() === 'high').length;
  const inProgressCount = analyticsData?.summary?.in_progress ?? incidents.filter(i => {
    const s = (i.status || '').toLowerCase();
    return s === 'in progress' || s === 'in_progress';
  }).length;
  const resolvedCount = analyticsData?.summary?.resolved ?? incidents.filter(i => (i.status || '').toLowerCase() === 'resolved').length;
  const closedCount = analyticsData?.summary?.closed ?? incidents.filter(i => (i.status || '').toLowerCase() === 'closed').length;
  const escalatedCount = analyticsData?.summary?.escalated ?? incidents.filter(i => (i.escalation_level && i.escalation_level > 0) || (i.status || '').toLowerCase() === 'escalated').length;
  const avgResolutionFormatted = analyticsData?.summary?.average_resolution_formatted || (analyticsData?.summary?.average_resolution_hours ? `${analyticsData.summary.average_resolution_hours} hrs` : 'N/A');


  // Filtering
  const filteredIncidents = incidents.filter(inc => {
    const sTerm = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      (inc.title || '').toLowerCase().includes(sTerm) || 
      (inc.description || '').toLowerCase().includes(sTerm) ||
      (inc.location || '').toLowerCase().includes(sTerm) ||
      (inc.reported_by || '').toLowerCase().includes(sTerm) ||
      (inc.assigned_team || '').toLowerCase().includes(sTerm);

    const incStatus = (inc.status || 'reported').toLowerCase().replace('_', ' ');
    const fStatus = filterStatus.toLowerCase().replace('_', ' ');
    const matchStatus = filterStatus === 'All' || incStatus === fStatus;

    const matchPriority = filterPriority === 'All' || (inc.priority || '').toLowerCase() === filterPriority.toLowerCase();
    const matchCategory = filterCategory === 'All' || (inc.category || '').toLowerCase() === filterCategory.toLowerCase();

    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  // Render Helpers
  const getPriorityColor = (priority) => {
    switch((priority || '').toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'reported').toLowerCase().replace('_', ' ');
    const map = {
      'reported': { bg: '#fef2f2', col: '#991b1b', text: 'Reported' },
      'open': { bg: '#fef2f2', col: '#991b1b', text: 'Reported' },
      'acknowledged': { bg: '#fffbeb', col: '#b45309', text: 'Acknowledged' },
      'in progress': { bg: '#eff6ff', col: '#1d4ed8', text: 'In Progress' },
      'escalated': { bg: '#fef2f2', col: '#b91c1c', text: 'Escalated' },
      'resolved': { bg: '#ecfdf5', col: '#047857', text: 'Resolved' },
      'closed': { bg: '#f3f4f6', col: '#374151', text: 'Closed' }
    };
    const style = map[s] || map['reported'];
    return (
      <span className="inc-badge" style={{ backgroundColor: style.bg, color: style.col, border: `1px solid ${style.col}22` }}>
        ● {style.text}
      </span>
    );
  };

  const renderStepper = (currentStatus) => {
    const steps = ['Reported', 'Acknowledged', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
    const s = (currentStatus || 'Reported').toLowerCase().replace('_', ' ');

    let currentIndex = 0;
    if (s === 'reported' || s === 'open') currentIndex = 0;
    else if (s === 'acknowledged') currentIndex = 1;
    else if (s === 'in progress') currentIndex = 2;
    else if (s === 'escalated') currentIndex = 3;
    else if (s === 'resolved') currentIndex = 4;
    else if (s === 'closed') currentIndex = 5;

    return (
      <div className="inc-stepper-container">
        <div className="inc-stepper-line"></div>
        {steps.map((step, idx) => {
          let className = 'inc-step';
          if (idx < currentIndex) className += ' completed';
          else if (idx === currentIndex) className += ' active';
          
          return (
            <div key={step} className={className}>
              {idx < currentIndex && <span className="inc-check">✓</span>}
              {step}
            </div>
          );
        })}
      </div>
    );
  };

  const renderActions = (inc) => {
    const s = (inc.status || 'reported').toLowerCase().replace('_', ' ');
    const id = inc.incident_id;

    return (
      <div className="inc-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
        {(s === 'reported' || s === 'open') && (
          <button className="inc-btn inc-btn-primary inc-btn-sm" onClick={() => handleWorkflowAction(id, 'acknowledge')}>
            ✓ Acknowledge
          </button>
        )}
        {s === 'acknowledged' && (
          <>
            <button className="inc-btn inc-btn-primary inc-btn-sm" onClick={() => handleWorkflowAction(id, 'start-response')}>
              ▶ Start Response
            </button>
            <button className="inc-btn inc-btn-danger inc-btn-sm" onClick={() => handleWorkflowAction(id, 'escalate')}>
              ⚠️ Escalate
            </button>
          </>
        )}
        {s === 'in progress' && (
          <>
            <button className="inc-btn inc-btn-success inc-btn-sm" onClick={() => handleWorkflowAction(id, 'resolve')}>
              ✔ Resolve
            </button>
            <button className="inc-btn inc-btn-danger inc-btn-sm" onClick={() => handleWorkflowAction(id, 'escalate')}>
              ⚠️ Escalate
            </button>
          </>
        )}
        {s === 'escalated' && (
          <>
            <button className="inc-btn inc-btn-primary inc-btn-sm" onClick={() => handleWorkflowAction(id, 'start-response')}>
              ▶ Resume Response
            </button>
            <button className="inc-btn inc-btn-success inc-btn-sm" onClick={() => handleWorkflowAction(id, 'resolve')}>
              ✔ Resolve
            </button>
            {(inc.escalation_level || 0) < 3 && (
              <button className="inc-btn inc-btn-danger inc-btn-sm" onClick={() => handleWorkflowAction(id, 'escalate')}>
                ⚠️ Higher Escalation
              </button>
            )}
          </>
        )}
        {s === 'resolved' && (
          <button className="inc-btn inc-btn-secondary inc-btn-sm" onClick={() => handleWorkflowAction(id, 'close')}>
            🔒 Close Incident
          </button>
        )}
        {s === 'closed' && (
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
            ✓ Incident Completed
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button className="inc-btn inc-btn-info inc-btn-sm" onClick={() => openDetailModal(inc)}>
            🔍 Details
          </button>
          <button className="inc-btn inc-btn-ghost inc-btn-sm" onClick={() => handleDeleteIncident(id)} title="Delete Incident">
            🗑
          </button>
        </div>
      </div>
    );
  };

  // Recharts Distribution Data
  const chartCategoryData = analyticsData?.category_distribution && Object.keys(analyticsData.category_distribution).length > 0
    ? Object.entries(analyticsData.category_distribution).map(([name, value]) => ({ name, value }))
    : CATEGORIES.map(cat => ({ name: cat, value: incidents.filter(i => (i.category || '').toLowerCase() === cat.toLowerCase()).length })).filter(d => d.value > 0);

  const chartPriorityData = analyticsData?.priority_distribution && Object.keys(analyticsData.priority_distribution).length > 0
    ? Object.entries(analyticsData.priority_distribution).map(([name, count]) => ({ name, count }))
    : PRIORITIES.map(pri => ({ name: pri, count: incidents.filter(i => (i.priority || '').toLowerCase() === pri.toLowerCase()).length })).filter(d => d.count > 0);

  return (
    <>
      <style>{`
        .inc-container { padding: 24px; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; color: #1e293b; }
        .inc-header { 
          background: linear-gradient(135deg, #dc2626, #ea580c); 
          border-radius: 20px; 
          padding: 32px 40px; 
          color: white; 
          box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.25); 
          margin-bottom: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .inc-header h1 { margin: 0 0 6px 0; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; }
        .inc-header p { margin: 0; opacity: 0.92; font-size: 1.05rem; }
        
        .inc-kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .inc-kpi-card { background: white; padding: 20px 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; display: flex; flex-direction: column; }
        .inc-kpi-card h3 { margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
        .inc-kpi-card p { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; }
        .inc-kpi-card.critical p { color: #dc2626; }
        .inc-kpi-card.high p { color: #ea580c; }
        .inc-kpi-card.blue p { color: #2563eb; }
        .inc-kpi-card.green p { color: #16a34a; }

        .inc-content-grid { display: grid; grid-template-columns: 2fr 1.15fr; gap: 24px; align-items: start; margin-bottom: 32px; }
        @media (max-width: 1100px) {
          .inc-content-grid { grid-template-columns: 1fr; }
        }

        .inc-toolbar { 
          display: flex; gap: 12px; flex-wrap: wrap; background: white; padding: 16px 20px; 
          border-radius: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; margin-bottom: 20px;
          align-items: center;
        }
        .inc-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .inc-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }
        .inc-input.flex-1 { flex: 1; min-width: 180px; }

        .inc-btn { padding: 10px 18px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; }
        .inc-btn-primary { background: #4f46e5; color: white; }
        .inc-btn-primary:hover { background: #4338ca; }
        .inc-btn-success { background: #10b981; color: white; }
        .inc-btn-success:hover { background: #059669; }
        .inc-btn-danger { background: #ef4444; color: white; }
        .inc-btn-danger:hover { background: #dc2626; }
        .inc-btn-secondary { background: #334155; color: white; }
        .inc-btn-secondary:hover { background: #1e293b; }
        .inc-btn-info { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        .inc-btn-info:hover { background: #e2e8f0; }
        .inc-btn-ghost { background: transparent; color: #94a3b8; border: 1px solid transparent; }
        .inc-btn-ghost:hover { background: #fee2e2; color: #ef4444; }
        .inc-btn-header { background: white; color: #dc2626; font-weight: 700; font-size: 1rem; padding: 12px 24px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .inc-btn-header:hover { background: #fef2f2; transform: translateY(-2px); }
        .inc-btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 6px; }

        .inc-list { display: flex; flex-direction: column; gap: 16px; }
        .inc-card { background: white; border-radius: 18px; padding: 22px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; border-left: 6px solid #cbd5e1; transition: transform 0.2s, box-shadow 0.2s; }
        .inc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 12px -2px rgba(0,0,0,0.08); }
        .inc-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .inc-card-id { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .inc-card-title { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
        .inc-card-desc { color: #475569; font-size: 14px; margin: 10px 0 16px 0; line-height: 1.5; }
        
        .inc-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 16px; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9; }
        .inc-meta-item strong { color: #64748b; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px; }
        .inc-meta-item span { color: #0f172a; font-weight: 600; }

        .inc-badge { padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; display: inline-block; }
        .inc-tag { background: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #e2e8f0; }

        /* Stepper */
        .inc-stepper-container { position: relative; display: flex; justify-content: space-between; align-items: center; margin: 20px 0 14px 0; }
        .inc-stepper-line { position: absolute; top: 12px; left: 0; right: 0; height: 2px; background: #e2e8f0; z-index: 0; }
        .inc-step { position: relative; z-index: 1; background: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; border: 2px solid #cbd5e1; color: #64748b; font-weight: 600; }
        .inc-step.completed { border-color: #10b981; background: #10b981; color: white; }
        .inc-step.active { border-color: #dc2626; background: #fef2f2; color: #dc2626; font-weight: 800; box-shadow: 0 0 0 3px rgba(220,38,38,0.15); }
        .inc-check { margin-right: 4px; }

        /* AI Section */
        .inc-ai-card { background: white; border-radius: 18px; padding: 26px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; background-image: radial-gradient(circle at top right, #fef2f2, white); }
        .inc-ai-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .inc-ai-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .inc-form-group { margin-bottom: 14px; }
        .inc-form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569; }
        .inc-form-group input, .inc-form-group select, .inc-form-group textarea { width: 100%; box-sizing: border-box; }
        .inc-form-group textarea { resize: vertical; min-height: 75px; }
        
        .inc-ai-result { margin-top: 20px; padding: 20px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .inc-ai-result-priority { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
        .inc-ai-score-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 12px 0; }
        .inc-ai-score-fill { height: 100%; background: linear-gradient(90deg, #dc2626, #f97316); border-radius: 4px; }

        /* Charts Section */
        .inc-analytics-section { background: white; border-radius: 20px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; margin-bottom: 40px; }
        .inc-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 900px) {
          .inc-charts-grid { grid-template-columns: 1fr; }
        }
        .inc-chart-card { background: #f8fafc; border-radius: 16px; padding: 20px; height: 320px; border: 1px solid #e2e8f0; }

        /* Modal Styles */
        .inc-modal-content { max-height: 85vh; overflow-y: auto; padding: 30px; border-radius: 20px; background: white; width: 680px; max-width: 92%; margin: 0 auto; outline: none; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .inc-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; }
        .inc-modal-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .inc-close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }

        .inc-empty { text-align: center; padding: 60px 20px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; }
      `}</style>

      <div className="layout">
        <Sidebar />
        <div className="main-content">
          <div className="inc-container">
            
            {/* Header */}
            <div className="inc-header">
              <div>
                <h1>Incident Management</h1>
                <p>Monitor, prioritize, track, and resolve event incidents in real-time.</p>
              </div>
              <button className="inc-btn inc-btn-header" onClick={() => setIsReportModalOpen(true)}>
                + Report Incident
              </button>
            </div>

            {/* KPI Cards Row */}
            <div className="inc-kpi-row">
              <div className="inc-kpi-card">
                <h3>Total Incidents</h3>
                <p>{totalCount}</p>
              </div>
              <div className="inc-kpi-card">
                <h3>Open</h3>
                <p>{openCount}</p>
              </div>
              <div className="inc-kpi-card critical">
                <h3>Critical</h3>
                <p>{criticalCount}</p>
              </div>
              <div className="inc-kpi-card high">
                <h3>High Priority</h3>
                <p>{highCount}</p>
              </div>
              <div className="inc-kpi-card blue">
                <h3>In Progress</h3>
                <p>{inProgressCount}</p>
              </div>
              <div className="inc-kpi-card green">
                <h3>Resolved</h3>
                <p>{resolvedCount}</p>
              </div>
              <div className="inc-kpi-card">
                <h3>Closed</h3>
                <p>{closedCount}</p>
              </div>
              <div className="inc-kpi-card high">
                <h3>Escalated</h3>
                <p>{escalatedCount}</p>
              </div>
              <div className="inc-kpi-card">
                <h3>Avg Resolution</h3>
                <p style={{ fontSize: '22px' }}>{avgResolutionFormatted}</p>
              </div>
            </div>

            {/* Main Content Grid: Left List, Right AI Panel */}
            <div className="inc-content-grid">
              
              {/* Left Column - Incidents List */}
              <div>
                <div className="inc-toolbar">
                  <input 
                    type="text" 
                    placeholder="Search by title, location, reporter, team..." 
                    className="inc-input flex-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select className="inc-input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                    <option value="All">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select className="inc-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Acknowledged">Acknowledged</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <select className="inc-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {loading ? (
                  <div className="inc-empty">Loading incidents...</div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="inc-empty">
                    <h3 style={{ margin: '0 0 6px 0', color: '#334155' }}>No incidents found</h3>
                    <p style={{ margin: 0 }}>Try adjusting your filters or click "+ Report Incident" to create one.</p>
                  </div>
                ) : (
                  <div className="inc-list">
                    {filteredIncidents.map(inc => {
                      const priorityColor = getPriorityColor(inc.priority);
                      return (
                        <div 
                          key={inc.incident_id} 
                          className="inc-card" 
                          style={{ borderLeftColor: priorityColor }}
                        >
                          <div className="inc-card-header">
                            <div>
                              <div className="inc-card-id">Incident #{inc.incident_id} • {inc.event || 'General'}</div>
                              <h3 className="inc-card-title">{inc.title}</h3>
                              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span className="inc-badge" style={{ backgroundColor: priorityColor, color: 'white' }}>
                                  {inc.priority || 'Medium'}
                                </span>
                                {getStatusBadge(inc.status)}
                                <span className="inc-tag">{inc.category || 'Other'}</span>
                                <span className="inc-tag">Severity: {inc.severity || 3}/5</span>
                                {(inc.escalation_level || 0) > 0 && (
                                  <span className="inc-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>
                                    Tier {inc.escalation_level} Escalation
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                              {inc.created_at ? new Date(inc.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </div>
                          </div>
                          
                          <p className="inc-card-desc">{inc.description || 'No description provided.'}</p>
                          
                          <div className="inc-meta-grid">
                            <div className="inc-meta-item">
                              <strong>Location</strong>
                              <span>{inc.location || 'Unspecified'}</span>
                            </div>
                            <div className="inc-meta-item">
                              <strong>Reported By</strong>
                              <span>{inc.reported_by || 'Anonymous'}</span>
                            </div>
                            <div className="inc-meta-item">
                              <strong>Assigned Team</strong>
                              <span>{inc.assigned_team || 'Event Operations'}</span>
                            </div>
                            {inc.resolved_at && (
                              <div className="inc-meta-item">
                                <strong>Resolved At</strong>
                                <span style={{ color: '#16a34a' }}>{new Date(inc.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                          </div>

                          {renderStepper(inc.status)}
                          {renderActions(inc)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column - AI Incident Assessment */}
              <div>
                <div className="inc-ai-card">
                  <div className="inc-ai-header">
                    <span style={{ fontSize: '24px' }}>🤖</span>
                    <h2>AI Incident Assessment</h2>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: '1.4' }}>
                    Assess priority, determine response team assignment, and calculate safety impact based on real-time event parameters.
                  </p>
                  
                  <form onSubmit={handleAiAssessment}>
                    <div className="inc-form-group">
                      <label>Incident Category</label>
                      <select className="inc-input" value={aiForm.category} onChange={e => setAiForm({...aiForm, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="inc-form-group">
                      <label>Event Name</label>
                      <input className="inc-input" required value={aiForm.event} onChange={e => setAiForm({...aiForm, event: e.target.value})} placeholder="e.g. Annual Tech Summit 2026" />
                    </div>

                    <div className="inc-form-group">
                      <label>Incident Description</label>
                      <textarea className="inc-input" required value={aiForm.description} onChange={e => setAiForm({...aiForm, description: e.target.value})} placeholder="Describe the situation..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="inc-form-group">
                        <label>Severity (1–5)</label>
                        <input className="inc-input" type="number" min="1" max="5" required value={aiForm.severity} onChange={e => setAiForm({...aiForm, severity: parseInt(e.target.value) || 1})} />
                      </div>
                      <div className="inc-form-group">
                        <label>Affected People</label>
                        <input className="inc-input" type="number" min="0" required value={aiForm.affected_people} onChange={e => setAiForm({...aiForm, affected_people: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>

                    <button type="submit" className="inc-btn inc-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isAssessing}>
                      {isAssessing ? 'Evaluating Situation...' : '⚡ Assess Priority'}
                    </button>
                  </form>

                  {aiResult && (
                    <div className="inc-ai-result">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>AI Recommended Priority</div>
                          <div className="inc-ai-result-priority" style={{ color: getPriorityColor(aiResult.priority) }}>
                            {aiResult.priority}
                          </div>
                        </div>
                        <div className="inc-badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                          Score: {aiResult.score}/100
                        </div>
                      </div>
                      
                      <div className="inc-ai-score-bar">
                        <div className="inc-ai-score-fill" style={{ width: `${Math.min(100, aiResult.score)}%` }}></div>
                      </div>

                      <div style={{ fontSize: '13px', marginTop: '14px', color: '#334155' }}>
                        <strong>Reason:</strong> <span style={{ color: '#475569' }}>{aiResult.reason}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '8px', color: '#334155' }}>
                        <strong>Action Protocol:</strong> <span style={{ color: '#475569' }}>{aiResult.recommended_action}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '8px', color: '#334155' }}>
                        <strong>Assigned Team:</strong> <span className="inc-tag" style={{ marginLeft: '4px' }}>{aiResult.recommended_team}</span>
                      </div>

                      <button 
                        className="inc-btn inc-btn-secondary" 
                        style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                        onClick={() => {
                          setReportForm({
                            ...reportForm,
                            title: `[${aiResult.priority}] ${aiForm.category} Incident`,
                            description: aiForm.description,
                            category: aiForm.category,
                            event: aiForm.event,
                            severity: aiForm.severity,
                            priority: aiResult.priority,
                            assigned_team: aiResult.recommended_team,
                            notes: `AI Assessment Reason: ${aiResult.reason}`
                          });
                          setIsReportModalOpen(true);
                        }}
                      >
                        📝 Pre-fill & Report Incident
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Analytics & Charts Section */}
            <div className="inc-analytics-section">
              <h2 style={{ margin: '0 0 20px 0', fontSize: '1.4rem', fontWeight: '700', color: '#0f172a' }}>
                📊 Incident Analytics & Trends
              </h2>
              <div className="inc-charts-grid">
                <div className="inc-chart-card">
                  <h3 style={{ margin: '0 0 16px 0', textAlign: 'center', color: '#475569', fontSize: '14px' }}>Category Distribution</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    {chartCategoryData.length > 0 ? (
                      <PieChart>
                        <Pie data={chartCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                          {chartCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No category data available</div>
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="inc-chart-card">
                  <h3 style={{ margin: '0 0 16px 0', textAlign: 'center', color: '#475569', fontSize: '14px' }}>Priority Breakdown</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    {chartPriorityData.length > 0 ? (
                      <BarChart data={chartPriorityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {chartPriorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getPriorityColor(entry.name)} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No priority data available</div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* =========================================================
          REPORT NEW INCIDENT MODAL
      ========================================================= */}
      <Modal
        isOpen={isReportModalOpen}
        onRequestClose={() => setIsReportModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '640px',
            maxWidth: '92%',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: 'none',
            backgroundColor: '#ffffff'
          },
          overlay: {
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
          }
        }}
        contentLabel="Report Incident Modal"
      >
        <div className="inc-modal-header">
          <h2>🚨 Report New Incident</h2>
          <button className="inc-close-btn" onClick={() => setIsReportModalOpen(false)}>&times;</button>
        </div>
        <form onSubmit={submitReport}>
          <div className="inc-form-group">
            <label>Incident Title *</label>
            <input className="inc-input" required value={reportForm.title} onChange={e => setReportForm({...reportForm, title: e.target.value})} placeholder="Short descriptive title" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="inc-form-group">
              <label>Category *</label>
              <select className="inc-input" value={reportForm.category} onChange={e => setReportForm({...reportForm, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="inc-form-group">
              <label>Event Focus / Session *</label>
              <input className="inc-input" required value={reportForm.event} onChange={e => setReportForm({...reportForm, event: e.target.value})} placeholder="e.g. Annual Summit 2026" />
            </div>
          </div>

          <div className="inc-form-group">
            <label>Description *</label>
            <textarea className="inc-input" required value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} placeholder="Detailed description of the problem..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="inc-form-group">
              <label>Location *</label>
              <input className="inc-input" required value={reportForm.location} onChange={e => setReportForm({...reportForm, location: e.target.value})} placeholder="e.g. Hall A, Stage 2" />
            </div>
            <div className="inc-form-group">
              <label>Reported By *</label>
              <input className="inc-input" required value={reportForm.reported_by} onChange={e => setReportForm({...reportForm, reported_by: e.target.value})} placeholder="Your name or team" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="inc-form-group">
              <label>Assigned Team (Optional)</label>
              <input className="inc-input" value={reportForm.assigned_team} onChange={e => setReportForm({...reportForm, assigned_team: e.target.value})} placeholder="Auto-assigned if empty" />
            </div>
            <div className="inc-form-group">
              <label>Priority</label>
              <select className="inc-input" value={reportForm.priority} onChange={e => setReportForm({...reportForm, priority: e.target.value})}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="inc-form-group">
            <label>Severity Level: {reportForm.severity}/5 ({reportForm.severity >= 5 ? 'Critical' : reportForm.severity === 4 ? 'High' : reportForm.severity === 3 ? 'Medium' : 'Low'})</label>
            <input className="inc-input" type="range" min="1" max="5" value={reportForm.severity} onChange={e => setReportForm({...reportForm, severity: parseInt(e.target.value) || 3})} />
          </div>

          <div className="inc-form-group">
            <label>Additional Notes</label>
            <textarea className="inc-input" value={reportForm.notes} onChange={e => setReportForm({...reportForm, notes: e.target.value})} placeholder="Internal notes, access codes, etc." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="inc-btn inc-btn-secondary" onClick={() => setIsReportModalOpen(false)}>Cancel</button>
            <button type="submit" className="inc-btn inc-btn-danger">Submit Incident</button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          INCIDENT DETAIL MODAL
      ========================================================= */}
      {selectedIncident && (
        <Modal
          isOpen={isDetailModalOpen}
          onRequestClose={() => setIsDetailModalOpen(false)}
          style={{
            content: {
              top: '50%',
              left: '50%',
              right: 'auto',
              bottom: 'auto',
              marginRight: '-50%',
              transform: 'translate(-50%, -50%)',
              width: '720px',
              maxWidth: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: 'none',
              backgroundColor: '#ffffff'
            },
            overlay: {
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
            }
          }}
          contentLabel="Incident Detail Modal"
        >
          <div className="inc-modal-header">
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Incident #{selectedIncident.incident_id}
              </div>
              <h2 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>{selectedIncident.title}</h2>
            </div>
            <button className="inc-close-btn" onClick={() => setIsDetailModalOpen(false)}>&times;</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span className="inc-badge" style={{ backgroundColor: getPriorityColor(selectedIncident.priority), color: 'white' }}>
              {selectedIncident.priority}
            </span>
            {getStatusBadge(selectedIncident.status)}
            <span className="inc-tag">{selectedIncident.category}</span>
            <span className="inc-tag">Severity: {selectedIncident.severity}/5</span>
            {(selectedIncident.escalation_level || 0) > 0 && (
              <span className="inc-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>
                Tier {selectedIncident.escalation_level} Escalation
              </span>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Description</h4>
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.5' }}>
              {selectedIncident.description || 'No description provided.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Event Focus</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>{selectedIncident.event || 'General'}</div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Location</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>{selectedIncident.location || 'Unspecified'}</div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Reported By</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>{selectedIncident.reported_by || 'Anonymous'}</div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Assigned Team</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>{selectedIncident.assigned_team || 'Event Operations'}</div>
            </div>
          </div>

          {selectedIncident.priority_reason && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>AI Assessment Reason</h4>
              <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', color: '#92400e', fontSize: '13px' }}>
                {selectedIncident.priority_reason}
              </div>
            </div>
          )}

          {selectedIncident.resolution && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#16a34a', textTransform: 'uppercase' }}>Resolution Notes</h4>
              <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '14px', fontWeight: '500' }}>
                {selectedIncident.resolution}
              </div>
            </div>
          )}

          {selectedIncident.notes && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Internal Notes</h4>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                {selectedIncident.notes}
              </div>
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <span>Created: {selectedIncident.created_at ? new Date(selectedIncident.created_at).toLocaleString('en-IN') : 'N/A'}</span>
            <span>Updated: {selectedIncident.updated_at ? new Date(selectedIncident.updated_at).toLocaleString('en-IN') : 'N/A'}</span>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Workflow Actions</h4>
            {renderStepper(selectedIncident.status)}
            <div style={{ marginTop: '16px' }}>
              {renderActions(selectedIncident)}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
