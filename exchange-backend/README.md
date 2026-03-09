# Exchange Rate Software — Backend 

A Flask-based REST API for tracking USD/LBP exchange rates, P2P marketplace trading, analytics, alerts, and system administration.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Environment Setup](#3-environment-setup)
4. [Database Configuration](#4-database-configuration)
5. [Running the Server](#5-running-the-server)
6. [Testing the Endpoints](#6-testing-the-endpoints)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Error Codes Reference](#8-error-codes-reference)

---

## 1. Prerequisites

Make sure the following are installed before starting:

- **Python 3.10 or higher** (tested on Python 3.13)
- **MySQL 8.0 or higher** with MySQL Workbench
- **Postman** for testing endpoints
- **Git**

---

## 2. Project Structure

```
Exchange-Rate-Software/
├── app.py                        # Main application entry point
├── extensions.py                 # Shared Flask extensions (db, bcrypt, limiter)
├── requirements.txt              # Python dependencies
├── .env                          # Environment variables (NOT committed to git)
├── .gitignore
├── model/
│   ├── user.py                   # User model with role and status
│   ├── transaction.py            # Transaction model with outlier detection
│   ├── offer.py                  # P2P marketplace offer model
│   ├── alert.py                  # Exchange rate alert model
│   ├── preference.py             # User preferences model
│   ├── watchlist.py              # Watchlist item model
│   ├── notification.py           # Notification model
│   ├── audit_log.py              # Audit log model
│   └── backup_record.py          # Backup record model
├── route/
│   ├── auth_route.py             # Registration and authentication
│   ├── transaction_route.py      # Transactions and exchange rate
│   ├── analytics_route.py        # Analytics and time-series data
│   ├── marketplace_route.py      # P2P marketplace
│   ├── alerts_route.py           # Exchange rate alerts
│   ├── watchlist_route.py        # Watchlist management
│   ├── preferences_route.py      # User preferences
│   ├── admin_route.py            # Admin and RBAC
│   ├── audit_route.py            # Audit logs
│   ├── notifications_route.py    # Notifications
│   ├── reporting_route.py        # Admin reports
│   └── backup_route.py           # Backup and restore
└── service/
    ├── auth_service.py           # JWT token creation and decoding
    ├── audit_service.py          # Centralized audit logging helper
    └── notification_service.py   # Notification creation and alert checking
```

---

## 3. Environment Setup

### Step 1: Clone the repository

```bash
git clone <repo-url>
cd Exchange-Rate-Software
```

### Step 2: Create and activate a virtual environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

If you get errors related to marshmallow or SQLAlchemy on Python 3.12+, run:

```bash
pip install --upgrade flask-marshmallow marshmallow marshmallow-sqlalchemy
```

### Step 4: Create the `.env` file

Create a file named `.env` in the root of the project with the following content:

```
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_NAME=exchange
SECRET_KEY=any_long_random_string_here
```

Replace `DB_USER` and `DB_PASSWORD` with your actual MySQL credentials. `SECRET_KEY` is used for signing JWT tokens — use any long random string (e.g. `my_super_secret_key_123`).

note: don't commit `.env` to Git. It is already listed in `.gitignore`.

### Step 5: Verify the database connection in `app.py`

Your `app.py` should read from the `.env` file like this:

```python
import os
from dotenv import load_dotenv
load_dotenv()

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
```

---

## 4. Database Configuration

### Step 1: Create the database

Open MySQL Workbench, connect to your local server, and run:

```sql
CREATE DATABASE exchange;
USE exchange;
```

### Step 2: Create all tables

Option 1:
Run the following SQL statements **in order** — order matters because of foreign key dependencies:

```sql
-- Users table
CREATE TABLE user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(30) UNIQUE NOT NULL,
    hashed_password VARCHAR(128),
    role VARCHAR(10) NOT NULL DEFAULT 'USER',
    status VARCHAR(10) NOT NULL DEFAULT 'active'
);

-- Transactions table
CREATE TABLE transaction (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usd_amount FLOAT NOT NULL,
    lbp_amount FLOAT NOT NULL,
    usd_to_lbp BOOLEAN NOT NULL,
    added_date DATETIME,
    user_id INT,
    source VARCHAR(20) NOT NULL DEFAULT 'internal',
    is_outlier BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Offers table (P2P Marketplace)
CREATE TABLE offer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    usd_amount FLOAT NOT NULL,
    lbp_amount FLOAT NOT NULL,
    usd_to_lbp BOOLEAN NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'open',
    created_at DATETIME,
    accepted_by INT,
    accepted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (accepted_by) REFERENCES user(id)
);

-- Alerts table
CREATE TABLE alert (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    usd_to_lbp BOOLEAN NOT NULL,
    threshold FLOAT NOT NULL,
    direction VARCHAR(10) NOT NULL,
    creation_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Preferences table
CREATE TABLE preference (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    default_interval VARCHAR(10) NOT NULL DEFAULT 'daily',
    default_time_range INT NOT NULL DEFAULT 72,
    default_usd_to_lbp BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Watchlist table
CREATE TABLE watchlist_item (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    label VARCHAR(100) NOT NULL,
    usd_to_lbp BOOLEAN NOT NULL,
    target_rate FLOAT,
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Notifications table
CREATE TABLE notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Audit log table
CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    event_type VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    timestamp DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Backup record table
CREATE TABLE backup_record (
    id INT PRIMARY KEY AUTO_INCREMENT,
    triggered_by INT NOT NULL,
    timestamp DATETIME,
    status VARCHAR(10) NOT NULL,
    record_counts VARCHAR(255) NOT NULL,
    FOREIGN KEY (triggered_by) REFERENCES user(id)
);
```
Option 2:
in the terminal type the following for each table you want to create(example here we create user table):

```
python
>>> from app import app    
>>> from extensions import db
>>> from model.user import User
>>> with app.app_context():
...     db.create_all()
...
>>> exit()
```

### Step 3: Create your first admin user

You cannot register as admin through the API — all users start as `USER`. After registering through the API, promote yourself manually in MySQL Workbench:

```sql
UPDATE user SET role = 'ADMIN' WHERE user_name = 'your_username';
```

---

## 5. Running the Server

Make sure your virtual environment is activated and your `.env` file exists, then run:

```bash
python app.py
```

You should see output like this:

```
* Serving Flask app 'app'
* Debug mode: off
* Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

The server is now running at `http://127.0.0.1:5000`.

> The UserWarning about in-memory storage from flask-limiter is expected in development — you can safely ignore it.

---

## 6. Testing the Endpoints

### Setting up Postman

1. Open Postman and create a new request
2. For endpoints that require a **request body**, go to the **Body** tab → select **raw** → change the dropdown from `Text` to `JSON`
3. For endpoints that require **authentication**, add a request header:
   - Key: `Authorization`
   - Value: `Bearer <your_token>` (replace with the actual token returned by `/authentication`)

> Make sure there is a **space** between `Bearer` and the token. A common mistake is missing this space which causes a 500 error.

### Recommended first-time testing flow

Follow this order to set up test data properly:

**Step 1 — Register two users:**
```
POST http://127.0.0.1:5000/user
Body: { "user_name": "admin", "password": "password123" }

POST http://127.0.0.1:5000/user
Body: { "user_name": "user1", "password": "password123" }
```

**Step 2 — Promote first user to admin** (in MySQL Workbench):
```sql
UPDATE user SET role = 'ADMIN' WHERE user_name = 'admin';
```

**Step 3 — Authenticate and save your tokens:**
```
POST http://127.0.0.1:5000/authentication
Body: { "user_name": "admin", "password": "password123" }
```
Copy the token from the response. You will use it as `Bearer <token>` in all protected requests.

**Step 4 — Add some transactions to generate exchange rate data:**
```
POST http://127.0.0.1:5000/transaction
Body: { "usd_amount": 1, "lbp_amount": 90000, "usd_to_lbp": true }

POST http://127.0.0.1:5000/transaction
Body: { "usd_amount": 1, "lbp_amount": 89500, "usd_to_lbp": true }

POST http://127.0.0.1:5000/transaction
Body: { "usd_amount": 1, "lbp_amount": 91000, "usd_to_lbp": false }
```

**Step 5 — Check the exchange rate:**
```
GET http://127.0.0.1:5000/exchangeRate
```

From here you can test any of the endpoints below.

---

## 7. API Endpoints Reference

### Authentication

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/user` | No | `{ "user_name", "password" }` | Register a new user |
| POST | `/authentication` | No | `{ "user_name", "password" }` | Login and receive JWT token |

---

### Transactions

| Method | Endpoint | Auth | Body / Params | Description |
|--------|----------|------|---------------|-------------|
| POST | `/transaction` | Optional | `{ "usd_amount", "lbp_amount", "usd_to_lbp" }` | Submit a transaction |
| GET | `/transaction` | Yes | — | View your own transactions |
| GET | `/exchangeRate` | No | — | Get current 72-hour average exchange rates |
| GET | `/export` | Yes | — | Download your transaction history as a CSV file |

> Transactions deviating more than 50% from the recent average are flagged as outliers and excluded from rate calculations.

---

### Analytics

| Method | Endpoint | Auth | Query Params | Description |
|--------|----------|------|--------------|-------------|
| GET | `/analytics` | No | `start_date`, `end_date` (MM/DD/YYYY), `usd_to_lbp` (true/false) | Get rate statistics (avg, min, max, volatility) for a period |
| GET | `/exchangeRateHistory` | No | `start_date`, `end_date`, `usd_to_lbp`, `interval` (hourly or daily) | Get time-series data for charting |

**Example:**
```
GET /analytics?start_date=01/01/2026&end_date=02/22/2026&usd_to_lbp=true
GET /exchangeRateHistory?usd_to_lbp=true&interval=daily
```

---

### P2P Marketplace

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/market/offers` | Yes | `{ "usd_amount", "lbp_amount", "usd_to_lbp" }` | Post a new offer |
| GET | `/market/offers` | No | — | Browse all open offers |
| POST | `/market/offers/<id>/accept` | Yes | — | Accept an open offer |
| DELETE | `/market/offers/<id>` | Yes | — | Cancel your own offer |
| GET | `/market/trades` | Yes | — | View your completed trade history |

---

### Alerts

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/alerts` | Yes | `{ "usd_to_lbp", "threshold", "direction" }` | Create a rate alert |
| GET | `/alerts` | Yes | — | View your alerts |
| DELETE | `/alerts/<id>` | Yes | — | Delete an alert |
| GET | `/alerts/check` | Yes | — | Manually check which of your alerts are triggered |

> `direction` must be `"above"` or `"below"`. Alerts are checked automatically after every transaction and offer acceptance — you will receive a notification when triggered.

**Example body:**
```json
{ "usd_to_lbp": true, "threshold": 95000, "direction": "above" }
```

---

### Watchlist

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/watchlist` | Yes | `{ "label", "usd_to_lbp", "target_rate" (optional) }` | Add item to watchlist |
| GET | `/watchlist` | Yes | — | View your watchlist |
| DELETE | `/watchlist/<id>` | Yes | — | Remove item from watchlist |

---

### Preferences

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/preferences` | Yes | `{ "default_interval", "default_time_range", "default_usd_to_lbp" }` | Create your preferences |
| GET | `/preferences` | Yes | — | View your preferences |
| PUT | `/preferences` | Yes | Any subset of the above fields | Update preferences (partial updates supported) |
| DELETE | `/preferences` | Yes | — | Reset preferences to defaults |

> `default_interval` must be `"hourly"` or `"daily"`. `default_time_range` is in hours (e.g. 72).

---

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | View your notifications (includes unread count) |
| PUT | `/notifications/<id>/read` | Yes | Mark a notification as read |
| DELETE | `/notifications/<id>` | Yes | Delete a single notification |
| DELETE | `/notifications` | Yes | Delete all your notifications |

---

### Audit Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/audit/logs` | ADMIN | View all system-wide audit logs |
| GET | `/audit/logs/me` | Yes | View your own audit logs |

---

### Admin & RBAC

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/admin/users` | ADMIN | — | View all users |
| GET | `/admin/stats` | ADMIN | — | View system-wide statistics |
| PUT | `/admin/users/<id>/status` | ADMIN | `{ "status" }` | Update a user's status |
| PUT | `/admin/users/<id>/role` | ADMIN | `{ "role" }` | Update a user's role |
| GET | `/admin/users/<id>/preferences` | ADMIN | — | View a user's preferences |
| POST | `/admin/users/<id>/preferences` | ADMIN | Preference fields | Create preferences for a user |
| PUT | `/admin/users/<id>/preferences` | ADMIN | Preference fields | Update a user's preferences |
| DELETE | `/admin/users/<id>/preferences` | ADMIN | — | Delete a user's preferences |
| GET | `/admin/users/<id>/alerts` | ADMIN | — | View a user's alerts |
| POST | `/admin/users/<id>/alerts` | ADMIN | Alert fields | Create an alert for a user |
| GET | `/admin/users/<id>/alerts/check` | ADMIN | — | Check a user's triggered alerts |
| DELETE | `/admin/alerts/<id>` | ADMIN | — | Delete a specific alert |
| GET | `/admin/data-quality` | ADMIN | — | View outlier and data source report |

> `status` must be `"active"`, `"suspended"`, or `"banned"`. `role` must be `"USER"` or `"ADMIN"`.

---

### Reporting

| Method | Endpoint | Auth | Query Params | Description |
|--------|----------|------|--------------|-------------|
| GET | `/admin/reports/transactions` | ADMIN | `start_date`, `end_date` (MM/DD/YYYY) | Transaction volume report |
| GET | `/admin/reports/users` | ADMIN | — | Most active users by transactions and offers |
| GET | `/admin/reports/marketplace` | ADMIN | — | Marketplace offer statistics |

---

### Backup & Restore

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/admin/backup` | ADMIN | — | Trigger a full system backup (returns downloadable JSON) |
| POST | `/admin/restore` | ADMIN | Backup JSON as body | Restore data from a backup file |
| GET | `/admin/backup/status` | ADMIN | — | View backup history and last backup status |

> To restore: first trigger a backup with `POST /admin/backup` and save the response JSON file. Then paste its contents as the request body for `POST /admin/restore`.

---

## 8. Error Codes Reference

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Missing required fields, invalid values, duplicate username, preferences already exist |
| 401 | Unauthorized | Missing or invalid JWT token, missing MFA code |
| 403 | Forbidden | Wrong password, suspended/banned account, trying to access another user's resources |
| 404 | Not Found | Resource with given ID does not exist |
| 429 | Too Many Requests | Rate limit exceeded — 5 requests/minute on login, transactions, and offer acceptance |
| 500 | Internal Server Error | Database operation failed — automatically rolled back |

---

## Important Notes

- All dates use the format `MM/DD/YYYY` (e.g. `02/22/2026`)
- All protected endpoints require the header `Authorization: Bearer <token>` — make sure there is a space between `Bearer` and the token
- Tokens expire after **24 hours** — re-authenticate to get a new one
- Transactions deviating more than **50%** from the 72-hour average are flagged as outliers and excluded from all rate calculations
- Rate limiting is applied to `POST /authentication`, `POST /transaction`, and `POST /market/offers/<id>/accept` at **5 requests per minute per IP**
- Audit logs are **immutable** — they cannot be edited or deleted, only appended
- All users start with the `USER` role — admin promotion must be done manually via MySQL Workbench
