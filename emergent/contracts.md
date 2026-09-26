# ClearBook — API Contracts & Integration Plan

## Auth (JWT, email + password)
- `POST /api/auth/signup` { name, email, password } → { token, user }
- `POST /api/auth/login`  { email, password }       → { token, user }
- `GET  /api/me`  (Bearer token)                    → { user }
- `PATCH /api/me` { name?, email?, currency? }      → { user }

All below endpoints require `Authorization: Bearer <token>`.
Every resource is scoped to the authenticated user (`user_id` filter server-side).

## Expenses
- `GET    /api/expenses`
- `POST   /api/expenses`  { amount, category, date, note? }
- `PUT    /api/expenses/{id}`
- `DELETE /api/expenses/{id}`

## Incomes
- `GET    /api/incomes`
- `POST   /api/incomes`   { amount, source, date, note? }
- `PUT    /api/incomes/{id}`
- `DELETE /api/incomes/{id}`

## Budgets
- `GET    /api/budgets`
- `POST   /api/budgets`   { category, limit }
- `PUT    /api/budgets/{id}`
- `DELETE /api/budgets/{id}`

## Goals
- `GET    /api/goals`
- `POST   /api/goals`     { name, target, saved, deadline, color }
- `PUT    /api/goals/{id}`
- `DELETE /api/goals/{id}`

## Dashboard summary
- `GET /api/summary` → { totalIncome, totalExpense, savingsRate, spendScore, byCategory[], weekly[], yearTrend[] }

## Data replacement (frontend)
- `mock.js` constants (CATEGORIES, INCOME_SOURCES) remain — used only for labels/colors.
- Remove seeding of `mockExpenses`, `mockIncomes`, `mockBudgets`, `mockGoals` from initial state.
- `lib/store.js` becomes `lib/api.js` — async fetch wrappers using `${REACT_APP_BACKEND_URL}/api`.
- Token stored in `localStorage['cb.token']`; user in `localStorage['cb.user']`.
- Protected routes redirect to `/login` if no token.

## Backend implementation
- Models with `id: str` (uuid4), `user_id: str`, plus fields per resource.
- Use `motor` (async Mongo), password hashing via `passlib[bcrypt]`, JWT via `pyjwt`.
- Env: `JWT_SECRET` (auto-generated once, stored in `backend/.env`).

## Frontend integration steps
1. Create `frontend/src/lib/api.js` with `apiFetch(path, opts)` that injects `Authorization`.
2. Add `AuthContext` — exposes `user`, `token`, `login`, `signup`, `logout`.
3. Wrap routes with `RequireAuth` — redirects to `/login`.
4. Update Auth page to call backend; on success save token+user and navigate to `/dashboard`.
5. Refactor Dashboard/Expenses/Income/Budgets/Goals/Worksheet/Settings to fetch via `api.js` in `useEffect`, replace `store.getX()`.
6. Keep `store.getTheme/setTheme` for theme persistence only (local).
