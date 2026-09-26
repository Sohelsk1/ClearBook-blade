import React, { createContext, useContext, useState } from 'react';
import { auth } from '../lib/api';

const DEMO = { id: 'demo', name: 'Demo User', email: 'demo@clearbook.in', currency: 'INR' };

function bootUser() {
  const existing = auth.getUser();
  if (existing?.name) return existing;
  auth.setUser(DEMO);
  auth.setToken('local-demo');
  return DEMO;
}

const AuthContext = createContext({ user: DEMO, loading: false, login: async () => {}, signup: async () => {}, logout: () => {}, setUser: () => {} });

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(bootUser);
  const setUser = (next) => {
    if (next) auth.setUser(next);
    setUserState(next);
  };
  const logout = () => { auth.clear(); setUserState(null); };

  return <AuthContext.Provider value={{ user, loading: false, login: async () => user, signup: async () => user, logout, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
