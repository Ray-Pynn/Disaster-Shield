
# Disaster Shield

An offline-first emergency response management platform designed to help operators coordinate incident tracking, 
emergency SOS requests, volunteer dispatching, facility monitoring, and inventory logistics locally.

> **Project Status:** ⚠️ Local Developer Prototype Only  
> This project is designed strictly as an offline-first software engineering portfolio project for GitHub presentation,
>  technical interviews, and recruiter evaluation. It operates using local algorithms and embedded databases without external cloud servers or third-party telemetry.

---

## 📌 Project Overview

* **Project Name:** Disaster Shield — Smart Disaster Management Platform
* **Primary Focus:** Offline incident tracking, SOS priority dispatch, volunteer registry, facility bed monitoring, and atomic inventory allocation.
* **Architecture:** Decoupled Single-Page Application (SPA) frontend with an asynchronous RESTful backend and local SQLite persistence.
* **Deployment Model:** 100% Offline-First (Local execution via Python and Vite).

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend UI** | React.js (ES6+), Vite, Custom CSS3 Design System |
| **Backend API** | Python, FastAPI, Pydantic v2, Uvicorn (ASGI) |
| **Database & ORM** | SQLite 3 with managed context connections (`@contextmanager`) |
| **Testing & Quality** | Pytest (Automated endpoint & transaction unit tests) |
| **Version Control** | Git, GitHub |

---

## 💡 Core Features

* **Real-Time Incident Reporting:** Log and track disaster events with automated severity classification and status updates.
* **Emergency SOS Dispatch:** Rapid distress request collection with priority queueing and person-count tracking.
* **Volunteer Coordination:** Skill-based volunteer registration and real-time availability toggling.
* **Facility Capacity Monitoring:** Live tracking of hospital and safe shelter human bed occupancy.
* **Relief Stock Logistics:** Atomic inventory tracking that decrements warehouse stock without corrupting facility occupancy counts.
* **Proximity Threat Analysis:** Geometric distance calculations using spherical trigonometric formulas to scan threat radiuses locally.

---

## 📂 Project Directory Structure

```text
disaster-shield/
├── .gitignore
├── README.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── test_main.py
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        ├── api.js
        ├── main.jsx
        └── style.css
