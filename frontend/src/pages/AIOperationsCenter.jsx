import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";

export default function AIOperationsCenter() {
  const defaultAgents = [
    {
      id: "venue_agent",
      name: "Venue Agent",
      status: "active",
      description: "Finds optimal venues, detects capacity issues, recommends alternatives",
      endpoint: "POST /venue-agent/recommend",
      last_used: null
    },
    {
      id: "speaker_agent",
      name: "Speaker Agent",
      status: "active",
      description: "Matches speakers to topics, checks availability, resolves conflicts",
      endpoint: "POST /speaker-agent/recommend",
      last_used: null
    },
    {
      id: "incident_agent",
      name: "Incident Agent",
      status: "active",
      description: "Assesses incident priority, recommends response teams and actions",
      endpoint: "POST /incident-agent/recommend-priority",
      last_used: null
    },
    {
      id: "sponsor_agent",
      name: "Sponsor Agent",
      status: "active",
      description: "Matches sponsors to events, evaluates contract health and deliverables",
      endpoint: "POST /sponsorship-agent/recommend",
      last_used: null
    },
    {
      id: "analytics_agent",
      name: "Analytics Agent",
      status: "active",
      description: "Analyzes session metrics, attendance trends, and venue utilization",
      endpoint: "GET /session-analytics",
      last_used: null
    }
  ];

  const [agents, setAgents] = useState(defaultAgents);
  const [history, setHistory] = useState([]);
  const [criticalActions, setCriticalActions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [situation, setSituation] = useState("");
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState(null);
  const [expandedAgents, setExpandedAgents] = useState({});
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchInitialData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [agentsRes, historyRes, criticalRes] = await Promise.all([
        api.get("/orchestrator/agents/status").catch(() => ({ data: { agents: defaultAgents } })),
        api.get("/orchestrator/activity").catch(() => ({ data: { activity: [] } })),
        api.get("/intelligence/critical-actions").catch(() => ({ data: { actions: [] } }))
      ]);

      if (isMountedRef.current) {
        if (agentsRes.data?.agents && agentsRes.data.agents.length > 0) {
          setAgents(agentsRes.data.agents);
        }
        if (historyRes.data?.activity) {
          setHistory(historyRes.data.activity);
        }
        if (criticalRes.data?.actions) {
          setCriticalActions(criticalRes.data.actions);
        }
      }
    } catch (err) {
      console.error("Error fetching AI Ops data:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchInitialData();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runOrchestration = async () => {
    if (!situation.trim() || orchestrating) return;
    setOrchestrating(true);
    setOrchestrationResult(null);
    setExpandedAgents({});
    try {
      const res = await api.post("/orchestrator/resolve", { situation });
      if (isMountedRef.current) {
        setOrchestrationResult(res.data);
      }
      // Re-fetch history to update the table
      const historyRes = await api.get("/orchestrator/activity").catch(() => null);
      if (historyRes?.data?.activity && isMountedRef.current) {
        setHistory(historyRes.data.activity);
      }
    } catch (err) {
      console.error("Orchestration error:", err);
      Swal.fire("Orchestration Failed", "Failed to run the orchestrator. Please check your backend connection.", "error");
    } finally {
      if (isMountedRef.current) {
        setOrchestrating(false);
      }
    }
  };

  const getAgentColor = (id) => {
    const colors = {
      venue_agent: "#3b82f6",
      speaker_agent: "#8b5cf6",
      incident_agent: "#ef4444",
      sponsor_agent: "#f59e0b",
      analytics_agent: "#14b8a6"
    };
    return colors[id] || "#6b7280";
  };

  const scenarios = [
    { label: "🏢 Venue Capacity Issue", text: "The main auditorium is approaching maximum capacity during the keynote session" },
    { label: "🎤 Speaker Conflict", text: "Dr. Sharma is assigned to two overlapping sessions at the same time" },
    { label: "⚡ Technical Failure", text: "Power outage reported in Hall B affecting the ongoing Generative AI workshop" },
    { label: "🏥 Medical Emergency", text: "Medical emergency reported in Exhibition Hall during the networking event" },
    { label: "🤝 Sponsor Issue", text: "Platinum sponsor deliverables are significantly behind schedule with contract expiring in 2 days" }
  ];

  return (
    <div className="layout" style={{ display: "flex", minHeight: "100vh", width: "100%", backgroundColor: "#f3f4f6" }}>
      <Sidebar />
      <div className="main-content" style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        
        <style>{`
          .aiops-container { font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }
          .aiops-header { background: linear-gradient(135deg, #059669, #0d9488); padding: 32px; border-radius: 12px; color: white; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .aiops-header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .aiops-header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 16px; }
          
          .aiops-section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #374151; }
          
          .aiops-agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
          .aiops-agent-card { background: white; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .aiops-agent-card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
          .aiops-agent-name { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
          .aiops-agent-status { display: flex; align-items: center; font-size: 14px; color: #059669; font-weight: 500; margin-bottom: 12px; }
          .aiops-agent-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 6px; }
          .aiops-agent-desc { font-size: 14px; color: #6b7280; margin-bottom: 12px; line-height: 1.5; }
          .aiops-agent-endpoint { font-family: monospace; font-size: 12px; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #4b5563; word-break: break-all; margin-bottom: 8px; }
          .aiops-agent-lastused { font-size: 12px; color: #9ca3af; }
          
          .aiops-orchestrator-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 32px; border: 1px solid #e5e7eb; }
          .aiops-textarea { width: 100%; height: 120px; padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; resize: vertical; margin-bottom: 16px; font-family: inherit; }
          .aiops-textarea:focus { outline: none; border-color: #059669; box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.2); }
          
          .aiops-quick-scenarios { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
          .aiops-scenario-btn { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 8px 12px; border-radius: 20px; font-size: 14px; cursor: pointer; color: #4b5563; transition: all 0.2s; }
          .aiops-scenario-btn:hover { background: #e5e7eb; color: #1f2937; }
          
          .aiops-run-btn { background: linear-gradient(to right, #059669, #10b981); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; width: 100%; }
          .aiops-run-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .aiops-run-btn:hover:not(:disabled) { opacity: 0.9; }
          
          .aiops-spinner { border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top: 3px solid white; width: 20px; height: 20px; animation: aiops-spin 1s linear infinite; margin-right: 12px; }
          @keyframes aiops-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          
          .aiops-result-panel { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 32px; border: 1px solid #e5e7eb; animation: aiops-fade-in 0.3s ease-out; }
          @keyframes aiops-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .aiops-result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
          .aiops-result-problem { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0; }
          .aiops-result-meta { font-size: 14px; color: #6b7280; }
          
          .aiops-confidence-badge { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; font-weight: 700; font-size: 18px; color: white; }
          
          .aiops-agent-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
          .aiops-agent-badge { padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500; color: white; display: flex; align-items: center; gap: 6px; }
          
          .aiops-accordion { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
          .aiops-accordion-header { background: #f9fafb; padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
          .aiops-accordion-header:hover { background: #f3f4f6; }
          .aiops-accordion-body { padding: 16px; border-top: 1px solid #e5e7eb; background: white; }
          .aiops-list { margin: 0; padding-left: 20px; }
          .aiops-list li { margin-bottom: 8px; color: #4b5563; }
          
          .aiops-final-rec { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-top: 24px; }
          .aiops-final-rec h4 { margin: 0 0 12px 0; color: #166534; font-size: 18px; }
          .aiops-final-rec p { margin: 0; color: #15803d; font-size: 16px; line-height: 1.5; font-weight: 500; }
          
          .aiops-alerts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px; }
          .aiops-alert-card { background: white; border-radius: 8px; padding: 16px; border-left: 4px solid; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .aiops-alert-title { font-weight: 600; font-size: 16px; margin: 0 0 8px 0; }
          .aiops-alert-desc { font-size: 14px; color: #4b5563; margin-bottom: 12px; }
          .aiops-alert-rec { font-size: 14px; background: #f9fafb; padding: 8px; border-radius: 4px; font-weight: 500; }
          
          .aiops-table-wrapper { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .aiops-table { width: 100%; border-collapse: collapse; text-align: left; }
          .aiops-table th { background: #f9fafb; padding: 12px 16px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
          .aiops-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; }
          .aiops-table tr:hover { background: #f9fafb; cursor: pointer; }
        `}</style>

        <div className="aiops-container">
          <div className="aiops-header">
            <h1>AI Operations Center</h1>
            <p>Multi-Agent Orchestration & Decision Support</p>
          </div>

          <h2 className="aiops-section-title">Agent Status Dashboard</h2>
          <div className="aiops-agents-grid">
            {agents.map((agent) => (
              <div key={agent.id} className="aiops-agent-card">
                <div className="aiops-agent-card-accent" style={{ backgroundColor: getAgentColor(agent.id) }}></div>
                <h3 className="aiops-agent-name">{agent.name}</h3>
                <div className="aiops-agent-status">
                  <span className="aiops-agent-dot"></span> Active
                </div>
                <p className="aiops-agent-desc">{agent.description || "Specialized AI agent ready for orchestration."}</p>
                <div className="aiops-agent-endpoint">{agent.endpoint || `POST /${agent.id}/run`}</div>
                <div className="aiops-agent-lastused">
                  Last used: {agent.last_used ? new Date(agent.last_used).toLocaleString() : "Ready"}
                </div>
              </div>
            ))}
          </div>

          <div className="aiops-orchestrator-card">
            <h2 className="aiops-section-title">🧠 Agent Orchestrator</h2>
            <div className="aiops-quick-scenarios">
              {scenarios.map((sc, i) => (
                <button 
                  key={i} 
                  className="aiops-scenario-btn"
                  onClick={() => setSituation(sc.text)}
                >
                  {sc.label}
                </button>
              ))}
            </div>
            
            <textarea 
              className="aiops-textarea"
              placeholder="Describe the event situation... e.g., 'Hall A has a technical problem during the Generative AI session'"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
            />
            
            <button 
              className="aiops-run-btn"
              onClick={runOrchestration}
              disabled={!situation.trim() || orchestrating}
            >
              {orchestrating ? (
                <><span className="aiops-spinner"></span> Consulting agents...</>
              ) : (
                "Run Orchestration"
              )}
            </button>
          </div>

          {orchestrationResult && (
            <div className="aiops-result-panel">
              <div className="aiops-result-header">
                <div>
                  <h3 className="aiops-result-problem">
                    {orchestrationResult.detected_problem || "Analysis Complete"}
                  </h3>
                  <div className="aiops-result-meta">
                    Completed in {orchestrationResult.processing_time_ms || 0}ms • {new Date(orchestrationResult.timestamp || Date.now()).toLocaleString()}
                  </div>
                </div>
                
                <div 
                  className="aiops-confidence-badge" 
                  style={{ 
                    backgroundColor: (orchestrationResult.confidence >= 80) ? '#10b981' : (orchestrationResult.confidence >= 60 ? '#f59e0b' : '#ef4444')
                  }}
                >
                  {orchestrationResult.confidence || 0}%
                </div>
              </div>

              <div className="aiops-agent-badges">
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151', alignSelf: 'center', marginRight: '8px' }}>Agents Consulted:</span>
                {(orchestrationResult.agents_consulted || []).map((agent, i) => (
                  <span key={i} className="aiops-agent-badge" style={{ backgroundColor: getAgentColor(agent.id) }}>
                    {agent.name}
                  </span>
                ))}
              </div>

              <div className="aiops-agent-details">
                {(orchestrationResult.agent_details || []).map((detail, idx) => (
                  <div key={idx} className="aiops-accordion">
                    <div 
                      className="aiops-accordion-header"
                      onClick={() => setExpandedAgents(prev => ({...prev, [detail.id]: !prev[detail.id]}))}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getAgentColor(detail.id) }}></span>
                        {detail.name} Findings
                      </span>
                      <span>{expandedAgents[detail.id] ? "▲" : "▼"}</span>
                    </div>
                    {expandedAgents[detail.id] && (
                      <div className="aiops-accordion-body">
                        <h5 style={{ margin: "0 0 8px 0", color: "#374151" }}>Findings:</h5>
                        <ul className="aiops-list">
                          {(detail.findings || []).map((f, fi) => (
                            <li key={fi}>{f}</li>
                          ))}
                        </ul>
                        {detail.recommendations && detail.recommendations.length > 0 && (
                          <>
                            <h5 style={{ margin: "12px 0 8px 0", color: "#374151" }}>Recommendations:</h5>
                            <ul className="aiops-list">
                              {detail.recommendations.map((r, ri) => (
                                <li key={ri} style={{ color: "#059669", fontWeight: 500 }}>{r}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="aiops-final-rec">
                <h4>🎯 Consolidated Recommendation</h4>
                <p>{orchestrationResult.recommendation}</p>
              </div>
            </div>
          )}

          <h2 className="aiops-section-title">Decision Support Alerts</h2>
          <div className="aiops-alerts-grid">
            {criticalActions.length === 0 ? (
              <div style={{ padding: "24px", background: "white", borderRadius: "8px", color: "#059669", gridColumn: "1 / -1", textAlign: "center", border: "1px solid #e5e7eb" }}>
                ✅ No critical actions. All systems operational.
              </div>
            ) : (
              criticalActions.map((action, idx) => (
                <div 
                  key={idx} 
                  className="aiops-alert-card"
                  style={{ borderLeftColor: action.severity === 'critical' ? '#ef4444' : action.severity === 'high' ? '#f97316' : '#f59e0b' }}
                >
                  <h4 className="aiops-alert-title">{action.title}</h4>
                  <p className="aiops-alert-desc">{action.description}</p>
                  <div className="aiops-alert-rec">
                    <strong>Action:</strong> {action.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 className="aiops-section-title">Orchestration History</h2>
          <div className="aiops-table-wrapper">
            <table className="aiops-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Situation</th>
                  <th>Detected Problem</th>
                  <th>Agents Consulted</th>
                  <th>Confidence</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>
                      No orchestration history yet. Run your first orchestration above.
                    </td>
                  </tr>
                ) : (
                  history.map((item, idx) => (
                    <tr key={idx} onClick={() => setOrchestrationResult(item)}>
                      <td>{new Date(item.timestamp || Date.now()).toLocaleTimeString()}</td>
                      <td>{item.situation?.length > 40 ? item.situation.substring(0, 40) + '...' : item.situation}</td>
                      <td><strong>{item.detected_problem || "General Issue"}</strong></td>
                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {(item.agents_consulted || []).map((a, ai) => (
                            <span 
                              key={ai} 
                              style={{ 
                                fontSize: "11px", 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                backgroundColor: getAgentColor(a.id), 
                                color: "white" 
                              }}
                            >
                              {a.name?.replace(" Agent", "")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{item.confidence || 0}%</td>
                      <td>{item.recommendation?.length > 45 ? item.recommendation.substring(0, 45) + '...' : item.recommendation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
