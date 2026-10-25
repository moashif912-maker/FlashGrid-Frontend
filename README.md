# ⚡ FlashGrid Frontend

A real-time React frontend for a high-concurrency flash sale system. Users buy limited-stock items while stock updates live, and a built-in stress test checks that the backend never oversells.

Backend repository: [FlashGrid-Backend](https://github.com/moashif912-maker/FlashGrid-Backend)

## ✨ Features

**Shoppers**
- Sales list with status (Upcoming, Live, Ended), countdown timers and a stock progress bar
- Stock refreshes every 2 seconds
- Buy button states: upcoming, live, sold out, ended, already purchased
- Clear messages for every purchase response (201, 404, 409, 410, 425, 429)
- Cooldown timer on the button when rate limited (429)
- Order confirmation modal and My Orders page
- Sign in with a numeric User ID, saved in localStorage

**Admin**
- Create sale form with validation
- Live inventory table
- Re-init action to reload a sale into Redis

**Stress test**
- Up to 200 concurrent users fired in parallel from the browser
- Live counts for 201, 409, 410 and 429 with a chart
- Automatic PASS / FAIL check: successful orders must not exceed the starting stock
- One-click test sale that goes live in 5 seconds

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts |
| Backend | Spring Boot, Redis (Lua scripts), Redisson, PostgreSQL |

## 🚀 Getting started

Requires Node.js 18+ and the FlashGrid backend running on `http://localhost:8080`.

```bash
git clone https://github.com/moashif912-maker/flashgrid-frontend.git
cd flashgrid-frontend
npm install
```

Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:8080/api
```

Start the app:

```bash
npm run dev
```

Open http://localhost:5173. The backend must allow this origin through CORS.

## 🔌 API used

| Method | Endpoint | Description |
|---|---|---|
| GET | /flash-sales | List all sales with live stock and status |
| GET | /flash-sales/{id} | Single sale |
| POST | /flash-sales | Create a sale |
| POST | /flash-sales/{id}/init | Reload a sale into Redis |
| POST | /flash-sales/{id}/purchase | Buy one unit |
| GET | /flash-sales/{id}/stock | Available stock |
| GET | /orders?userId= | A user's orders |

Purchase status codes: 201 success, 400 invalid, 404 not initialized, 409 already purchased, 410 sold out or ended, 425 not started, 429 rate limited (5 requests per 10 seconds per user).

## Design decisions

- **Local time handling.** The backend sends date-times without a timezone (India time). The frontend parses them as local time and never adds a `Z`, so countdowns stay correct.
- **Single polling request.** One call to `GET /flash-sales` every 2 seconds updates every card, instead of one stock request per card.
- **Normalized errors.** An Axios interceptor converts failures into `{ status, message }`, so each purchase outcome maps to a clear user message.
- **Reliable stress test.** Test users use IDs from 1,000,000 upwards so they never collide with real users, and stock is read before and after the run.

## Project structure

```
src/
  api/          Axios client and endpoint functions
  components/   Navbar, SaleCard, StatusBadge, modal, route guard
  context/      Auth context
  pages/        Sales, Orders, Admin, Stress Test, Login
  utils/        Time helpers and the useNow hook
```

## Author

Mo Ashif, B.Tech CSE
