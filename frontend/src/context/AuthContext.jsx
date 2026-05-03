import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { sanitizeString } from '../utils/security.js';
import authService from '../services/authService.js';

const STORAGE_TOKEN = 'tr_access_token';
const STORAGE_USER = 'tr_user';

export const AuthContext = createContext(null);

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN);
    const storedUser = safeJsonParse(localStorage.getItem(STORAGE_USER));

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }

    setLoading(false);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const cleanEmail = sanitizeString(email);
    const cleanPassword = sanitizeString(password);

    const data = await authService.login({ email: cleanEmail, password: cleanPassword });

    const nextUser = {
      user_id: data.user_id,
      email: cleanEmail,
      full_name: data.full_name,
      role: data.role,
      avatar_url: data.avatar_url ?? null,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth ?? null
    };

    setToken(data.access_token);
    setUser(nextUser);
    localStorage.setItem(STORAGE_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));

    return { user: nextUser, access_token: data.access_token };
  }, []);

  const register = useCallback(async ({ email, password, full_name, gender, date_of_birth }) => {
    const cleanEmail = sanitizeString(email);
    const cleanPassword = sanitizeString(password);

    const data = await authService.register({
      email: cleanEmail,
      password: cleanPassword,
      full_name: sanitizeString(full_name),
      gender,
      date_of_birth
    });

    const nextUser = {
      user_id: data.user_id,
      email: cleanEmail,
      full_name: data.full_name,
      role: data.role,
      avatar_url: data.avatar_url ?? null,
      gender: data.gender ?? gender ?? null,
      date_of_birth: data.date_of_birth ?? date_of_birth ?? null
    };

    setToken(data.access_token);
    setUser(nextUser);
    localStorage.setItem(STORAGE_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));

    return { user: nextUser, access_token: data.access_token };
  }, []);

  const updateUser = useCallback((partial) => {
    if (!partial || typeof partial !== 'object') return;

    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_USER, JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  }, []);

  const value = useMemo(() => {
    return {
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      role: user?.role ?? null,
      login,
      register,
      updateUser,
      logout
    };
  }, [token, user, loading, login, register, updateUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
