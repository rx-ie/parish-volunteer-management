# 🏛️ FIAT Roster: Automated Parish Volunteer Scheduling System

> **Platform:** Google Workspace / Google Apps Script (Zero-Cost Infrastructure)

---

## 📌 Executive Summary

Secretariat staff and ministry heads spend **8 to 10 hours every month** manually collecting volunteer availability across WhatsApp messages and paper forms, cross-checking conflicts, and drafting monthly duty rosters for hundreds of volunteers across Readers, Wardens, Extraordinary Ministers, and Choirs.

**FIAT Roster** is a lightweight, zero-cost, automated rostering engine built entirely within native Google Workspace technology (Google Apps Script & Google Sheets). It automates assignment generation using a **Constraint-Based Priority Scoring Engine**, balances volunteer workload to prevent burnout, and provides a mobile-first interface for volunteers to submit availability or request instant duty swaps.

---

## ✨ Key Features & Capabilities

* 🚀 **3-Second Auto-Rostering Engine:** Evaluates role capabilities, time slots, and availability matrix to auto-populate monthly duty schedules in seconds.
* ⚖️ **Fairness & Burnout Protection:** Enforces strict monthly maximum service caps per volunteer ($N$ Masses/month) and prioritizes volunteers with fewer assignments or longer rest periods.
* 📱 **Mobile-First Volunteer Portal:** Clean, lightweight web interface for volunteers to select availability preferences (🟢 *Preferred*, 🟡 *Available*, ⚪ *Unavailable*) and manage their assigned shifts.
* 🔄 **Instant Shift Swap Handler:** Enables 1-click duty swap requests that automatically identify eligible replacements and trigger notification alerts.
* ⚠️ **Secretariat Dashboard & Exception Alerts:** Displays a visual coverage matrix, highlights unfilled slots (`UNFILLED_ALERT`), and allows parish secretariats to perform manual drag-and-drop overrides.
* 🛡️ **Zero-Cost & Native Security:** Runs inside the Archdiocese's existing Google Workspace domain—no external servers, paid database subscriptions, or third-party data tracking.

---

## 🏗️ System Architecture

```
                    ┌────────────────────────────┐
                    │  Google Apps Script Backend│
                    │         (Code.gs)          │
                    └──────────────┬─────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
   ?page=volunteer (Mobile)                ?page=admin (Desktop)
┌──────────────────────────────┐       ┌──────────────────────────────┐
│       VOLUNTEER PORTAL       │       │       SECRETARIAT DASHBOARD  │
├──────────────────────────────┤       ├──────────────────────────────┤
│ • Interactive Availability   │       │ • 1-Click Roster Generation  │
│ • "My Assigned Shifts" View  │       │ • Coverage & Alert Metrics   │
│ • 1-Click "Request Swap"     │       │ • Candidate Ranking Override │
└──────────────────────────────┘       └──────────────────────────────┘
                │                                     │
                └──────────────────┬──────────────────┘
                                   ▼
                    ┌────────────────────────────┐
                    │    Google Sheets Database  │
                    │   (Volunteers, Slots, Map) │
                    └────────────────────────────┘
```

---

## 📊 Data Model Schema

The system uses a simple relational model stored inside Google Sheets tabs:

### 1. `Volunteers`
| Column | Type | Description |
| :--- | :--- | :--- |
| `volunteer_id` | String | Unique Identifier (e.g., `VOL001`) |
| `name` | String | Full Name |
| `roles` | String (CSV) | Capabilities (e.g., `Senior Reader, Warden`) |
| `max_serves_month` | Integer | Maximum shift cap per month (Burnout rule) |
| `serves_this_mth` | Integer | Current month count |
| `last_served_date` | Date | Recency tracking date |

### 2. `Mass_Slots`
| Column | Type | Description |
| :--- | :--- | :--- |
| `slot_id` | String | Unique Mass ID (e.g., `SLOT_OCT_03_530PM`) |
| `mass_datetime` | DateTime | Timestamp of Mass service |
| `required_role` | String | Capacity requirement (e.g., `Reader`) |
| `available_candidates` | Integer | Pre-calculated availability count |

### 3. `Roster_Entries` (Output)
| Column | Type | Description |
| :--- | :--- | :--- |
| `slot_id` | String | Foreign Key to Mass Slot |
| `volunteer_id` | String | Foreign Key to Volunteer (or `UNASSIGNED`) |
| `status` | String | `ASSIGNED` or `UNFILLED_ALERT` |

---

## ⚙️ Rostering Algorithm Rules

The algorithm processes unassigned Mass slots using a two-pass constraint evaluator:

```
                      ALL CANDIDATE VOLUNTEERS
                                 │
                                 ▼
                 ┌──────────────────────────────┐
                 │    HARD CONSTRAINT FILTER    │
                 └──────────────┬───────────────┘
                                │
             (Passes Role, Time Conflict, & Monthly Cap)
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │    SOFT CONSTRAINT SCORING   │
                 └──────────────┬───────────────┘
                                │
                                ▼
                   HIGHEST SCORE ASSIGNED TO SLOT
```

### Hard Constraints (Must Pass)
1. **Role Match:** `vol.roles.includes(slot.requiredRole)`
2. **Monthly Cap:** `vol.servesThisMonth < vol.maxServesMonth`
3. **Time Conflict:** No double-booking across overlapping Mass times.
4. **Availability:** Volunteer must have flagged `AVAILABLE` or `PREFERRED`.

### Soft Constraint Scoring Function

$$S = (W_1 \times \text{Fairness}) + (W_2 \times \text{Recency}) + (W_3 \times \text{Preference})$$

$$\text{Where: } S = (10 - \text{serves\_this\_mth}) \times 5 + (\text{Days since last served}) \times 2 + \text{Preference Bonus (10 pts)}$$

---

## 📁 Repository File Structure

```text
.
├── README.md           # Project Documentation & Architecture Overview
├── Code.gs             # Google Apps Script Backend & Optimization Engine
├── Index.html          # Web App HTML/CSS (Bootstrap 5) UI Router
└── config.json         # Sample Configuration & Operational Parameters
```

---

## 🚀 Setup & Deployment Instructions

### Prerequisites
* A Google Account with access to Google Drive / Google Sheets.

### Step 1: Set Up the Google Sheet
1. Create a new Google Sheet named **`FIAT_Parish_Roster`**.
2. Create 4 tabs named exactly: `Volunteers`, `Mass_Slots`, `Availability`, and `Roster_Entries`.
3. Populate headers in row 1 corresponding to the Data Model Schema above.

### Step 2: Add Apps Script Code
1. In your Google Sheet, click **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with the [`Code.gs`](./Code.gs) file from this repository.
3. Click **+ > HTML** to add an HTML file, name it `Index`, and paste the contents of [`Index.html`](./Index.html).

### Step 3: Deploy as Web App
1. Click **Deploy > New deployment**.
2. Select type: **Web app**.
3. Set **Execute as:** *Me*.
4. Set **Who has access:** *Anyone within Archdiocese domain* (or *Anyone* for testing).
5. Copy the deployment Web App URL.

---

## ⏱️ Impact Metrics

| Metric | Manual Process | With FIAT Roster |
| :--- | :--- | :--- |
| **Monthly Secretariat Labor** | 8 – 10 Hours | **< 15 Minutes** |
| **Schedule Conflict Rate** | High (Human error) | **0% (Hard constraints)** |
| **Volunteer Burnout Protection** | Unmonitored | **Strict Cap Enforcement** |
| **Software Cost** | Variable SaaS Fees | **$0 / Year** |

---

## 📄 License & Mission

Free to modify, adapt, and deploy.
