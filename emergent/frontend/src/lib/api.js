// Simple API wrapper for ClearBook backend
const BASE = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const TOKEN_KEY = 'cb.token';
const USER_KEY  = 'cb.user';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY),
  getUser:  () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } },
  setUser:  (u) => u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY),
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
};

async function request(path, { method = 'GET', body, requireAuth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const t = auth.getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const j = await res.json(); msg = j.detail || j.message || msg; } catch {}
    if (res.status === 401 && requireAuth) {
      auth.clear();
      if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/signup')) {
        location.href = '/login';
      }
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth
  signup: (data) => request('/auth/signup', { method: 'POST', body: data, requireAuth: false }),
  login:  (data) => request('/auth/login',  { method: 'POST', body: data, requireAuth: false }),
  me:     () => request('/me'),
  updateMe: (data) => request('/me', { method: 'PATCH', body: data }),

  // resources
  listExpenses: () => request('/expenses'),
  addExpense:   (d) => request('/expenses', { method: 'POST', body: d }),
  updateExpense:(id,d) => request(`/expenses/${id}`, { method: 'PUT', body: d }),
  deleteExpense:(id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  listIncomes:  () => request('/incomes'),
  addIncome:    (d) => request('/incomes', { method: 'POST', body: d }),
  updateIncome: (id,d) => request(`/incomes/${id}`, { method: 'PUT', body: d }),
  deleteIncome: (id) => request(`/incomes/${id}`, { method: 'DELETE' }),

  listBudgets:  () => request('/budgets'),
  addBudget:    (d) => request('/budgets', { method: 'POST', body: d }),
  updateBudget: (id,d) => request(`/budgets/${id}`, { method: 'PUT', body: d }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  listGoals:    () => request('/goals'),
  addGoal:      (d) => request('/goals', { method: 'POST', body: d }),
  updateGoal:   (id,d) => request(`/goals/${id}`, { method: 'PUT', body: d }),
  deleteGoal:   (id) => request(`/goals/${id}`, { method: 'DELETE' }),

  summary: () => request('/summary'),
};
