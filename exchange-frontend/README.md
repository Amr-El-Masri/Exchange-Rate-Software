# USD to LBP Exchange Tracker — Sprint 2 Frontend

**Student:** Amr El Masri   
**Sprint:** 2 — React Frontend integrated with Sprint 1 Backend

---

## Overview

A full-stack currency exchange tracking application for USD/LBP exchange rates. This React frontend consumes the Sprint 1 Flask REST API and provides a complete UI for exchange rate tracking, P2P marketplace, alerts, watchlist, notifications, preferences, and admin management.

---

## Prerequisites

Make sure the following are installed before setup:

- **Node.js** v18 or higher (tested on v24.13.1)
- **npm** v9 or higher (tested on v11.8.0)
- **Sprint 1 Flask backend** running at `http://127.0.0.1:5000`

---

## Setup

### 1. Clone the repository

```bash
git clone <github-classroom-repo-url>
cd exchange-frontend
```

### 2. Install dependencies

```bash
npm install
```

This installs all required packages including:

- `react`, `react-dom`, `react-router-dom`
- `@mui/material`, `@emotion/react`, `@emotion/styled`
- `@mui/icons-material`
- `recharts`

---

## Environment Configuration

The API base URL is configured in a single file:

**`src/config.js`**
```js
const BASE_URL = "http://127.0.0.1:5000";
export default BASE_URL;
```

If your backend is running on a different host or port, update `BASE_URL` in this file. No `.env` file is required — all API configuration is centralized in `src/config.js`.

---

## Running the App

### Start the backend first

Navigate to your Sprint 1 backend folder and run:

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# Activate virtual environment (Mac/Linux)
source venv/bin/activate

# Run Flask
python app.py
```

Make sure the backend is running at `http://127.0.0.1:5000` before starting the frontend.

### Start the frontend

```bash
npm start
```

The app will open automatically at:

```
http://127.0.0.1:3000/amr-el-masri/dashboard
```

---

## Routing Structure

All routes follow the required naming convention:

| Page | Route |
|------|-------|
| Dashboard | `/amr-el-masri/dashboard` |
| Graph | `/amr-el-masri/graph` |
| Transactions | `/amr-el-masri/transactions` |
| Marketplace | `/amr-el-masri/marketplace` |
| Alerts | `/amr-el-masri/alerts` |
| Watchlist | `/amr-el-masri/watchlist` |
| Notifications | `/amr-el-masri/notifications` |
| Preferences | `/amr-el-masri/preferences` |
| Login | `/amr-el-masri/login` |
| Register | `/amr-el-masri/register` |
| Admin | `/amr-el-masri/admin` *(ADMIN role only)* |

Any unknown route redirects to the dashboard.

---

## Features

### Authentication
- Register, login, logout with JWT
- Token stored in `localStorage`
- Automatically attached to all authenticated API requests
- Role detection on login (USER vs ADMIN)

### Exchange Rate Dashboard
- Live USD→LBP and LBP→USD rates (last 72 hours)
- Analytics: average, min, max, % change, volatility
- Trend and volatility insights
- Date range filter and direction toggle
- Line chart of exchange rate over time

### Exchange Rate Graph
- Time-series line chart with daily or hourly intervals
- Date range, interval, and direction controls
- Preferences auto-applied on login

### Transactions
- Submit USD→LBP or LBP→USD transactions
- View personal transaction history
- Outlier warning displayed when rate deviates significantly
- Export transaction history as CSV download

### P2P Marketplace
- Browse all available offers
- Create, accept, and cancel offers
- Cannot accept your own offer (enforced in UI)
- Trade history view

### Alerts
- Create threshold-based rate alerts (above/below)
- View and delete active alerts
- Check which alerts are currently triggered

### Watchlist
- Add items with label, direction, and optional target rate
- Client-side duplicate label check
- Remove items from watchlist

### Notifications
- View all notifications with unread count
- Mark individual notifications as read
- Delete individual or all notifications
- Auto-polls every 30 seconds

### Preferences
- Set default analytics time range, graph interval, and direction
- Preferences loaded at login and automatically applied to Dashboard and Graph pages
- Reset to defaults

### Admin Panel *(ADMIN role only)*
- **Users tab:** view all users, update status (active/suspended/banned), update role
- **Stats tab:** system-wide transaction statistics and exchange rates
- **Audit Logs tab:** append-only log of all system events
- **Data Quality tab:** outlier transactions and source tracking
- **Backup & Restore tab:** trigger backup (downloads JSON), restore from JSON file, check backup history
- Non-admin users attempting to access `/admin` see a Forbidden (403) message

### Rate Limiting
- HTTP 429 responses are detected on login, transactions, and offer acceptance
- User sees a clear message and the submit button is disabled for 30 seconds

---

## Project Structure

```
exchange-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Navbar.js         # Persistent sidebar navigation
│   │   └── ProofPanel.js     # Proof panel (top-right: name, time, route)
│   ├── pages/
│   │   ├── Dashboard.js      # Exchange rate dashboard
│   │   ├── Graph.js          # Exchange rate graph
│   │   ├── Login.js          # Login page
│   │   ├── Register.js       # Registration page
│   │   ├── Transactions.js   # Transactions + CSV export
│   │   ├── Marketplace.js    # P2P marketplace
│   │   ├── Alerts.js         # Rate alerts
│   │   ├── Watchlist.js      # Watchlist/favorites
│   │   ├── Notifications.js  # Notifications
│   │   ├── Preferences.js    # User preferences
│   │   └── Admin.js          # Admin panel (ADMIN only)
│   ├── config.js             # API base URL configuration
│   └── App.js                # Root component, routing, global state
├── package.json
└── README.md
```

---

## Notes

- The app works without login for public endpoints (exchange rates, analytics, browsing offers). Full functionality requires a registered and logged-in account.
- Admin features require a user with `role = 'ADMIN'` in the database.
- CORS must be enabled on the Flask backend (already configured in Sprint 1 using `flask-cors`).
