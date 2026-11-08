
const API_BASE = "http://127.0.0.1:8000/api";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch {
    throw new Error(
      "Cannot connect to Disaster Shield backend. Start the local backend first."
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The backend returned an invalid response.");
  }

  if (!response.ok) {
    const detail = data.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : "The requested operation could not be completed."
    );
  }
  return data;
}

const get = (path) => request(path);
const post = (path, body) =>
  request(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
const patch = (path, body) =>
  request(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });

export const api = {
  health: () => request("/health"),
  dashboard: () => get("/dashboard"),
  incidents: () => get("/incidents"),
  createIncident: (data) => post("/incidents", data),
  updateIncident: (id, data) => patch(`/incidents/${id}`, data),
  sos: () => get("/sos"),
  createSOS: (data) => post("/sos", data),
  updateSOS: (id, data) => patch(`/sos/${id}`, data),
  volunteers: () => get("/volunteers"),
  createVolunteer: (data) => post("/volunteers", data),
  updateVolunteer: (id, data) => patch(`/volunteers/${id}`, data),
  facilities: () => get("/facilities"),
  inventory: () => get("/inventory"),
  createInventory: (data) => post("/inventory", data),
  updateInventory: (id, data) => patch(`/inventory/${id}`, data),
  allocations: () => get("/allocations"),
  createAllocation: (data) => post("/allocations", data),
  alerts: (latitude, longitude, radius_km = 5) =>
    get(`/alerts?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}`),
  safeFacilities: (latitude, longitude) =>
    get(`/safe-facilities?latitude=${latitude}&longitude=${longitude}`),
  activity: () => get("/activity"),
  lowStock: () => get("/inventory/low-stock")
};
