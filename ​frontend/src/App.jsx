
import React, { useState, useEffect } from "react";
import { api } from "./api";

export default function App() {
  // Navigation & UI States
  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [sosRequests, setSosRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  // Proximity Alert Analysis State
  const [alertLat, setAlertLat] = useState("26.8467");
  const [alertLng, setAlertLng] = useState("80.9462");
  const [alertRadius, setAlertRadius] = useState("5");
  const [alertsResult, setAlertsResult] = useState(null);
  const [safeFacilitiesResult, setSafeFacilitiesResult] = useState(null);

  // Form Input States
  const [incidentForm, setIncidentForm] = useState({
    title: "",
    disaster_type: "flood",
    description: "",
    severity: "medium",
    latitude: "26.8467",
    longitude: "80.9462",
    location: "",
    affected_people: 0,
  });

  const [sosForm, setSosForm] = useState({
    person_name: "",
    description: "",
    latitude: "26.8467",
    longitude: "80.9462",
    location: "",
    people_count: 1,
  });

  const [volunteerForm, setVolunteerForm] = useState({
    name: "",
    skills: "",
    phone: "",
    location: "",
    latitude: "26.8467",
    longitude: "80.9462",
  });

  const [inventoryForm, setInventoryForm] = useState({
    item_name: "",
    category: "Food and Water",
    quantity: 100,
    unit: "litres",
    location: "Central Warehouse",
    minimum_quantity: 20,
  });

  const [allocationForm, setAllocationForm] = useState({
    item_id: "",
    facility_id: "",
    quantity: 10,
    notes: "",
  });

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      await api.health();
      setIsBackendHealthy(true);
      
      const [dash, inc, sos, vol, fac, inv, alc, act] = await Promise.all([
        api.dashboard(),
        api.incidents(),
        api.sos(),
        api.volunteers(),
        api.facilities(),
        api.inventory(),
        api.allocations(),
        api.activity(),
      ]);
      setDashboardData(dash);
      setIncidents(inc);
      setSosRequests(sos);
      setVolunteers(vol);
      setFacilities(fac);
      setInventory(inv);
      setAllocations(alc);
      setActivityLog(act);
    } catch (err) {
      setIsBackendHealthy(false);
      setError(err.message || "Failed to connect to Disaster Shield backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latStr = position.coords.latitude.toFixed(4);
        const lngStr = position.coords.longitude.toFixed(4);
        setAlertLat(latStr);
        setAlertLng(lngStr);
        setError("");
        showNotification("Location updated from browser geolocation.");
      },
      () => {
        setError("Location permission denied or position unavailable.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleRunProximityAnalysis = async () => {
    setError("");
    try {
      const lat = parseFloat(alertLat);
      const lng = parseFloat(alertLng);
      const rad = parseFloat(alertRadius);
      const alertsData = await api.alerts(lat, lng, rad);
      const safeFacData = await api.safeFacilities(lat, lng);
      setAlertsResult(alertsData);
      setSafeFacilitiesResult(safeFacData);
      showNotification(`Proximity alert scan complete (${rad} km radius).`);
    } catch (err) {
      setError(err.message || "Failed to execute proximity threat analysis.");
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createIncident({
        ...incidentForm,
        latitude: parseFloat(incidentForm.latitude),
        longitude: parseFloat(incidentForm.longitude),
        affected_people: parseInt(incidentForm.affected_people, 10),
      });
      showNotification("Incident reported successfully.");
      setIncidentForm({
        title: "",
        disaster_type: "flood",
        description: "",
        severity: "medium",
        latitude: "26.8467",
        longitude: "80.9462",
        location: "",
        affected_people: 0,
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateIncidentStatus = async (id, newStatus) => {
    try {
      await api.updateIncident(id, { status: newStatus });
      showNotification(`Incident #${id} status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSOS = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createSOS({
        ...sosForm,
        latitude: parseFloat(sosForm.latitude),
        longitude: parseFloat(sosForm.longitude),
        people_count: parseInt(sosForm.people_count, 10),
      });
      showNotification("Emergency SOS request logged.");
      setSosForm({
        person_name: "",
        description: "",
        latitude: "26.8467",
        longitude: "80.9462",
        location: "",
        people_count: 1,
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateSOSStatus = async (id, newStatus) => {
    try {
      await api.updateSOS(id, { status: newStatus, priority: "high" });
      showNotification(`SOS #${id} status changed to ${newStatus}.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateVolunteer = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createVolunteer({
        ...volunteerForm,
        latitude: parseFloat(volunteerForm.latitude),
        longitude: parseFloat(volunteerForm.longitude),
      });
      showNotification("Volunteer registered successfully.");
      setVolunteerForm({
        name: "",
        skills: "",
        phone: "",
        location: "",
        latitude: "26.8467",
        longitude: "80.9462",
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateVolunteer = async (id, availability) => {
    try {
      await api.updateVolunteer(id, { availability });
      showNotification(`Volunteer #${id} set to ${availability}.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateInventory = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createInventory({
        ...inventoryForm,
        quantity: parseInt(inventoryForm.quantity, 10),
        minimum_quantity: parseInt(inventoryForm.minimum_quantity, 10),
      });
      showNotification("Inventory item registered.");
      setInventoryForm({
        item_name: "",
        category: "Food and Water",
        quantity: 100,
        unit: "litres",
        location: "Central Warehouse",
        minimum_quantity: 20,
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    setError("");
    if (!allocationForm.item_id || !allocationForm.facility_id) {
      setError("Please select both an item and a facility for allocation.");
      return;
    }
    try {
      await api.createAllocation({
        item_id: parseInt(allocationForm.item_id, 10),
        facility_id: parseInt(allocationForm.facility_id, 10),
        quantity: parseInt(allocationForm.quantity, 10),
        notes: allocationForm.notes,
      });
      showNotification("Relief supply allocated successfully.");
      setAllocationForm({ item_id: "", facility_id: "", quantity: 10, notes: "" });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">DS</div>
          <div>
            <strong>DISASTER SHIELD</strong>
            <small>Offline Control Platform</small>
          </div>
        </div>

        <div className="nav-caption">COMMAND MODULES</div>
        <nav>
          {[
            { id: "dashboard", label: "Overview Dashboard", icon: "📊" },
            { id: "incidents", label: "Incident Logging", icon: "🚨", count: dashboardData?.active_incidents },
            { id: "sos", label: "Emergency SOS", icon: "🆘", count: dashboardData?.active_sos },
            { id: "volunteers", label: "Volunteer Registry", icon: "🤝" },
            { id: "facilities", label: "Facilities & Shelters", icon: "🏥" },
            { id: "inventory", label: "Relief Inventory", icon: "📦" },
            { id: "alerts", label: "Proximity Alerts", icon: "📍" },
            { id: "map", label: "Schematic Map", icon: "🗺️" },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? "active" : ""}`}
              onClick={() => {
                setCurrentView(item.id);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count > 0 && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p>Local Prototype Mode</p>
          <button className="logout-button" onClick={loadData}>
            🔄 Refresh Data
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div className="breadcrumb">
            Disaster Shield &gt; <strong className="capitalize">{currentView}</strong>
          </div>
          <div className="topbar-right">
            <span className={`badge ${isBackendHealthy ? "success" : "critical"}`}>
              {isBackendHealthy ? "System Operational (Offline)" : "Backend Disconnected"}
            </span>
            <div className="user-avatar">OP</div>
            <span className="user-name">Emergency Commander</span>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <main className="page-container">
          {error && (
            <div className="alert-banner error-banner">
              <span>⚠️ {error}</span>
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {notification && (
            <div className="alert-banner success-banner">
              <span>✅ {notification}</span>
              <button onClick={() => setNotification("")}>×</button>
            </div>
          )}

          {/* VIEW 1: DASHBOARD OVERVIEW */}
          {currentView === "dashboard" && (
            <div>
              <div className="welcome-panel">
                <div>
                  <p>OFFLINE EMERGENCY RESPONSE CENTER</p>
                  <h2>Disaster Shield Command System</h2>
                  <span>Real-time local tracking for disaster logging, SOS coordination, and supply logistics.</span>
                </div>
                <div className="welcome-symbol">🛡️</div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>ACTIVE INCIDENTS</span>
                    <span className="stat-icon">🔥</span>
                  </div>
                  <strong>{dashboardData?.active_incidents ?? 0}</strong>
                  <small>Out of {dashboardData?.total_incidents ?? 0} total reported</small>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>PENDING SOS REQUESTS</span>
                    <span className="stat-icon">🆘</span>
                  </div>
                  <strong>{dashboardData?.active_sos ?? 0}</strong>
                  <small>Awaiting volunteer assignment</small>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>AVAILABLE VOLUNTEERS</span>
                    <span className="stat-icon">👥</span>
                  </div>
                  <strong>{dashboardData?.available_volunteers ?? 0}</strong>
                  <small>Ready for field dispatch</small>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>RELIEF INVENTORY UNITS</span>
                    <span className="stat-icon">📦</span>
                  </div>
                  <strong>{dashboardData?.total_inventory_units ?? 0}</strong>
                  <small>Stock across local warehouses</small>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent Activity Stream</h3>
                      <p>Audit trail of local system operations</p>
                    </div>
                  </div>
                  {activityLog.length === 0 ? (
                    <div className="empty-state">No recent activity logged.</div>
                  ) : (
                    activityLog.slice(0, 7).map((log) => (
                      <div key={log.id} className="system-row">
                        <div>
                          <strong>{log.action}</strong>
                          <div className="muted">{log.details}</div>
                        </div>
                        <small>{new Date(log.created_at).toLocaleTimeString()}</small>
                      </div>
                    ))
                  )}
                </div>

                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Control Quick Actions</h3>
                      <p>Direct navigation short-cuts</p>
                    </div>
                  </div>
                  <div className="quick-actions">
                    <button className="btn primary" onClick={() => setCurrentView("incidents")}>
                      + Log New Incident
                    </button>
                    <button className="btn secondary" onClick={() => setCurrentView("sos")}>
                      + Log SOS Request
                    </button>
                    <button className="btn secondary" onClick={() => setCurrentView("alerts")}>
                      📍 Radius Threat Check
                    </button>
                    <button className="btn secondary" onClick={() => setCurrentView("inventory")}>
                      📦 Dispatch Inventory
                    </button>
                  </div>
                  <div className="notice">
                    ℹ️ <strong>Offline System Note:</strong> All operations execute against local SQLite database files without internet dependencies.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: INCIDENTS */}
          {currentView === "incidents" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DISASTER MANAGEMENT</div>
                  <h1>Incident Logging & Tracking</h1>
                </div>
              </div>
              <div className="content-grid">
                <div className="panel">
                  <h3>Report Disaster Event</h3>
                  <form onSubmit={handleCreateIncident} className="form-grid">
                    <div className="field full-width">
                      <label>Incident Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. River Overflow Flood"
                        value={incidentForm.title}
                        onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Disaster Type</label>
                      <select
                        value={incidentForm.disaster_type}
                        onChange={(e) => setIncidentForm({ ...incidentForm, disaster_type: e.target.value })}
                      >
                        <option value="flood">Flood</option>
                        <option value="earthquake">Earthquake</option>
                        <option value="fire">Fire</option>
                        <option value="volcano">Volcano</option>
                        <option value="cyclone">Cyclone</option>
                        <option value="landslide">Landslide</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Severity Level</label>
                      <select
                        value={incidentForm.severity}
                        onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={incidentForm.latitude}
                        onChange={(e) => setIncidentForm({ ...incidentForm, latitude: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={incidentForm.longitude}
                        onChange={(e) => setIncidentForm({ ...incidentForm, longitude: e.target.value })}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Location Description</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. North Zone Sector 4"
                        value={incidentForm.location}
                        onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Incident Description</label>
                      <textarea
                        rows="3"
                        required
                        placeholder="Detail the scope of damage..."
                        value={incidentForm.description}
                        onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn primary full-width">
                      Submit Incident Report
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3>Active Incident Registry</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.map((inc) => (
                          <tr key={inc.id}>
                            <td>#{inc.id}</td>
                            <td>
                              <strong>{inc.title}</strong>
                              <br />
                              <small>{inc.location}</small>
                            </td>
                            <td className="capitalize">{inc.disaster_type}</td>
                            <td>
                              <span className={`badge ${inc.severity}`}>{inc.severity}</span>
                            </td>
                            <td>
                              <span className={`badge ${inc.status === "resolved" ? "success" : "high"}`}>
                                {inc.status}
                              </span>
                            </td>
                            <td>
                              <select
                                value={inc.status}
                                onChange={(e) => handleUpdateIncidentStatus(inc.id, e.target.value)}
                              >
                                <option value="reported">Reported</option>
                                <option value="verified">Verified</option>
                                <option value="responding">Responding</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: SOS REQUESTS */}
          {currentView === "sos" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">EMERGENCY DISPATCH</div>
                  <h1>Emergency SOS Calls</h1>
                </div>
              </div>
              <div className="content-grid">
                <div className="panel">
                  <h3>Record SOS Distress Call</h3>
                  <form onSubmit={handleCreateSOS} className="form-grid">
                    <div className="field full-width">
                      <label>Person Name</label>
                      <input
                        type="text"
                        required
                        value={sosForm.person_name}
                        onChange={(e) => setSosForm({ ...sosForm, person_name: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>People Count</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={sosForm.people_count}
                        onChange={(e) => setSosForm({ ...sosForm, people_count: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={sosForm.latitude}
                        onChange={(e) => setSosForm({ ...sosForm, latitude: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={sosForm.longitude}
                        onChange={(e) => setSosForm({ ...sosForm, longitude: e.target.value })}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Location Name</label>
                      <input
                        type="text"
                        required
                        value={sosForm.location}
                        onChange={(e) => setSosForm({ ...sosForm, location: e.target.value })}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Distress Description</label>
                      <textarea
                        rows="3"
                        required
                        value={sosForm.description}
                        onChange={(e) => setSosForm({ ...sosForm, description: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn primary full-width">
                      Submit SOS Request
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3>SOS Queue</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Requester</th>
                          <th>People</th>
                          <th>Status</th>
                          <th>Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sosRequests.map((sos) => (
                          <tr key={sos.id}>
                            <td>#{sos.id}</td>
                            <td>
                              <strong>{sos.person_name}</strong>
                              <br />
                              <small>{sos.description}</small>
                            </td>
                            <td>{sos.people_count} pers.</td>
                            <td>
                              <span className={`badge ${sos.status === "resolved" ? "success" : "critical"}`}>
                                {sos.status}
                              </span>
                            </td>
                            <td>
                              <select
                                value={sos.status}
                                onChange={(e) => handleUpdateSOSStatus(sos.id, e.target.value)}
                              >
                                <option value="pending">Pending</option>
                                <option value="assigned">Assigned</option>
                                <option value="responding">Responding</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: VOLUNTEERS */}
          {currentView === "volunteers" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FIELD PERSONNEL</div>
                  <h1>Volunteer Management</h1>
                </div>
              </div>
              <div className="content-grid">
                <div className="panel">
                  <h3>Register Volunteer</h3>
                  <form onSubmit={handleCreateVolunteer} className="form-grid">
                    <div className="field full-width">
                      <label>Full Name</label>
                      <input
                        type="text"
                        required
                        value={volunteerForm.name}
                        onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Specialized Skills</label>
                      <input
                        type="text"
                        required
                        placeholder="First Aid, Rescue, Medical Support"
                        value={volunteerForm.skills}
                        onChange={(e) => setVolunteerForm({ ...volunteerForm, skills: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={volunteerForm.phone}
                        onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={volunteerForm.latitude}
                        onChange={(e) => setVolunteerForm({ ...volunteerForm, latitude: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={volunteerForm.longitude}
                        onChange={(e) => setVolunteerForm({ ...volunteerForm, longitude: e.target.value })}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Assigned Zone</label>
                      <input
                        type="text"
                        required
                        value={volunteerForm.location}
                        onChange={(e) => setVolunteerForm({ ...volunteerForm, location: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn primary full-width">
                      Register Volunteer
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3>Registered Volunteers</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Skills</th>
                          <th>Zone</th>
                          <th>Availability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volunteers.map((vol) => (
                          <tr key={vol.id}>
                            <td>
                              <strong>{vol.name}</strong>
                              <br />
                              <small>{vol.phone}</small>
                            </td>
                            <td>{vol.skills}</td>
                            <td>{vol.location}</td>
                            <td>
                              <select
                                value={vol.availability}
                                onChange={(e) => handleUpdateVolunteer(vol.id, e.target.value)}
                              >
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="unavailable">Unavailable</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: FACILITIES */}
          {currentView === "facilities" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">INFRASTRUCTURE</div>
                  <h1>Hospitals & Safe Shelters</h1>
                </div>
              </div>
              <div className="facility-grid">
                {facilities.map((fac) => {
                  const percent = Math.min(100, Math.round((fac.occupied / fac.capacity) * 100));
                  return (
                    <div key={fac.id} className="facility-card">
                      <div className="facility-icon">
                        {fac.facility_type === "hospital" ? "🏥" : "🏠"}
                      </div>
                      <h3>{fac.name}</h3>
                      <p>{fac.location}</p>
                      <div className="capacity-line">
                        <span>Human Occupancy</span>
                        <strong>
                          {fac.occupied} / {fac.capacity} beds ({percent}%)
                        </strong>
                      </div>
                      <div className="capacity-track">
                        <div
                          className="capacity-fill"
                          style={{
                            width: `${percent}%`,
                            background: percent > 85 ? "#fa6473" : "#40a9e7",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 6: INVENTORY & ALLOCATIONS */}
          {currentView === "inventory" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">LOGISTICS</div>
                  <h1>Relief Stock & Allocations</h1>
                </div>
              </div>
              <div className="content-grid">
                <div className="panel">
                  <h3>Add Inventory Stock</h3>
                  <form onSubmit={handleCreateInventory} className="form-grid">
                    <div className="field full-width">
                      <label>Item Name</label>
                      <input
                        type="text"
                        required
                        value={inventoryForm.item_name}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, item_name: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Category</label>
                      <input
                        type="text"
                        required
                        value={inventoryForm.category}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Unit Type</label>
                      <input
                        type="text"
                        required
                        placeholder="litres, packets, kits"
                        value={inventoryForm.unit}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={inventoryForm.quantity}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Minimum Stock Threshold</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={inventoryForm.minimum_quantity}
                        onChange={(e) => setInventoryForm({ ...inventoryForm, minimum_quantity: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn primary full-width">
                      Save Inventory Stock
                    </button>
                  </form>

                  <h3 style={{ marginTop: "30px" }}>Dispatch Supplies to Facility</h3>
                  <form onSubmit={handleCreateAllocation} className="form-grid">
                    <div className="field full-width">
                      <label>Select Relief Item</label>
                      <select
                        value={allocationForm.item_id}
                        onChange={(e) => setAllocationForm({ ...allocationForm, item_id: e.target.value })}
                      >
                        <option value="">-- Choose Stock Item --</option>
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.item_name} (Avail: {item.quantity} {item.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field full-width">
                      <label>Target Facility</label>
                      <select
                        value={allocationForm.facility_id}
                        onChange={(e) => setAllocationForm({ ...allocationForm, facility_id: e.target.value })}
                      >
                        <option value="">-- Choose Facility --</option>
                        {facilities.map((fac) => (
                          <option key={fac.id} value={fac.id}>
                            {fac.name} ({fac.facility_type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field full-width">
                      <label>Dispatch Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={allocationForm.quantity}
                        onChange={(e) => setAllocationForm({ ...allocationForm, quantity: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn secondary full-width">
                      Dispatch Supplies
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h3>Current Warehouse Stock</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Category</th>
                          <th>Stock Level</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.item_name}</strong>
                            </td>
                            <td>{item.category}</td>
                            <td>
                              {item.quantity} {item.unit}
                            </td>
                            <td>
                              {item.quantity <= item.minimum_quantity ? (
                                <span className="badge critical">Low Stock</span>
                              ) : (
                                <span className="badge success">Adequate</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 style={{ marginTop: "30px" }}>Supply Allocation Log</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Item</th>
                          <th>Facility</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.map((alc) => (
                          <tr key={alc.id}>
                            <td>#{alc.id}</td>
                            <td>{alc.item_name}</td>
                            <td>{alc.facility_name}</td>
                            <td>
                              {alc.quantity} {alc.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 7: ALERTS ANALYSIS */}
          {currentView === "alerts" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SPATIAL ANALYSIS</div>
                  <h1>Local Disaster Proximity Analysis</h1>
                </div>
              </div>
              <div className="content-grid">
                <div className="panel">
                  <h3>Analysis Parameters</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label>Center Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={alertLat}
                        onChange={(e) => setAlertLat(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Center Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={alertLng}
                        onChange={(e) => setAlertLng(e.target.value)}
                      />
                    </div>
                    <div className="field full-width">
                      <label>Scan Radius (Kilometers)</label>
                      <select value={alertRadius} onChange={(e) => setAlertRadius(e.target.value)}>
                        <option value="2">2 Kilometers</option>
                        <option value="5">5 Kilometers</option>
                        <option value="10">10 Kilometers</option>
                        <option value="25">25 Kilometers</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn primary full-width"
                      onClick={handleRunProximityAnalysis}
                    >
                      Run Proximity Scan
                    </button>
                    <button
                      type="button"
                      className="btn secondary full-width"
                      onClick={handleUseCurrentLocation}
                    >
                      📍 Use My Current Location
                    </button>
                  </div>
                </div>

                <div className="panel">
                  <h3>Analysis Results</h3>
                  {!alertsResult ? (
                    <div className="empty-state">Run a proximity scan to identify nearby threats.</div>
                  ) : (
                    <div>
                      <div className="alert-result-summary">
                        <strong>{alertsResult.alert_count}</strong>
                        <span>Active disaster threat(s) within {alertsResult.radius_km} km radius</span>
                      </div>
                      <h4>Threat Details</h4>
                      {alertsResult.alerts.map((alt) => (
                        <div key={alt.id} className="alert-item">
                          <div>
                            <strong>{alt.title}</strong>
                            <p>{alt.description}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className={`badge ${alt.severity}`}>{alt.severity}</span>
                            <br />
                            <small>{alt.distance_km} km away</small>
                          </div>
                        </div>
                      ))}

                      {safeFacilitiesResult && (
                        <div style={{ marginTop: "25px" }}>
                          <h4>Recommended Evacuation Shelters</h4>
                          {safeFacilitiesResult.facilities.map((fac) => (
                            <div key={fac.id} className="alert-item">
                              <div>
                                <strong>{fac.name}</strong>
                                <p>{fac.location}</p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span className="badge success">{fac.available_capacity} beds free</span>
                                <br />
                                <small>{fac.distance_km} km away</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 8: SCHEMATIC DISASTER MAP */}
          {currentView === "map" && (
            <div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">VISUALIZATION</div>
                  <h1>Interactive Schematic Disaster Map</h1>
                </div>
              </div>
              <div className="map-layout">
                <div className="map-panel">
                  <div className="map-toolbar">
                    <p>Schematic local grid coordinate canvas (Offline Mode)</p>
                  </div>
                  <div className="schematic-map">
                    <div className="map-grid-lines" />
                    <div className="map-river" />
                    <div className="map-river river-two" />

                    <div className="map-area area-one">NORTH SECTOR</div>
                    <div className="map-area area-two">CENTRAL SECTOR</div>
                    <div className="map-area area-three">SOUTH SECTOR</div>
                    <div className="map-area area-four">EAST SECTOR</div>

                    {incidents.map((inc) => {
                      const top = `${Math.min(85, Math.max(15, (inc.latitude - 26.81) * 1000))}%`;
                      const left = `${Math.min(85, Math.max(15, (inc.longitude - 80.91) * 1000))}%`;
                      return (
                        <div
                          key={`inc-${inc.id}`}
                          className={`map-marker incident-marker ${inc.severity}`}
                          style={{ top, left }}
                          title={`${inc.title} (${inc.severity})`}
                        >
                          🔥
                        </div>
                      );
                    })}

                    {facilities.map((fac) => {
                      const top = `${Math.min(85, Math.max(15, (fac.latitude - 26.81) * 1000))}%`;
                      const left = `${Math.min(85, Math.max(15, (fac.longitude - 80.91) * 1000))}%`;
                      return (
                        <div
                          key={`fac-${fac.id}`}
                          className="map-marker facility-marker"
                          style={{ top, left }}
                          title={`${fac.name} (${fac.facility_type})`}
                        >
                          {fac.facility_type === "hospital" ? "🏥" : "🏠"}
                        </div>
                      );
                    })}

                    <div className="map-legend">
                      <span>
                        <i className="legend-incident" /> Critical Incident
                      </span>
                      <span>
                        <i className="legend-hospital" /> Hospital
                      </span>
                      <span>
                        <i className="legend-shelter" /> Safe Shelter
                      </span>
                    </div>
                  </div>
                </div>

                <div className="panel map-side">
                  <h3>Map Overlay Summary</h3>
                  <div className="side-stat">
                    <span>Incidents Rendered:</span>
                    <strong>{incidents.length}</strong>
                  </div>
                  <div className="side-stat">
                    <span>Facilities Rendered:</span>
                    <strong>{facilities.length}</strong>
                  </div>
                  <div className="side-stat">
                    <span>Volunteers Active:</span>
                    <strong>{volunteers.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="app-footer">
            <span>Disaster Shield Emergency Management Platform — Offline Demonstration Prototype</span>
            <span>Local Execution Mode</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
