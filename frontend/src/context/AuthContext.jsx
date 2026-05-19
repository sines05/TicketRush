import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { sanitizeString } from '../utils/security.js';
import authService from '../services/authService.js';
import userService from '../services/userService.js';
import { useQueryClient } from '@tanstack/react-query';

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem(STORAGE_USER);
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    async function hydrate() {
      // Only attempt hydration if we have a user in storage
      const storedUser = localStorage.getItem(STORAGE_USER);
      if (!storedUser) {
        setLoading(false);
        return;
      }

      try {
        const userData = await userService.getMe();
        if (!userData) {
          setUser(null);
          localStorage.removeItem(STORAGE_USER);
          setLoading(false);
          return;
        }
        const nextUser = {
          user_id: userData.id || userData.user_id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          avatar_url: userData.avatar_url ?? null,
          gender: userData.gender ?? null,
          date_of_birth: userData.date_of_birth ?? null,
          is_oauth: userData.is_oauth ?? false,
          is_2fa_enabled: userData.two_factor_enabled ?? false
        };
        setUser(nextUser);
        localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
      } catch (error) {
        setUser(null);
        localStorage.removeItem(STORAGE_USER);
      } finally {
        setLoading(false);
      }
    }

    hydrate();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const cleanEmail = sanitizeString(email).toLowerCase();
    const cleanPassword = sanitizeString(password);

    const data = await authService.login({ email: cleanEmail, password: cleanPassword });

    const nextUser = {
      user_id: data.id || data.user_id,
      email: data.email || cleanEmail,
      full_name: data.full_name,
      role: data.role,
      avatar_url: data.avatar_url ?? null,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth ?? null,
      is_oauth: data.is_oauth ?? false,
      is_2fa_enabled: data.two_factor_enabled ?? false
    };

    setUser(nextUser);
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));

    return { user: nextUser };
  }, []);

  const loginWithToken = useCallback(async () => {
    try {
      const userData = await userService.getMe();

      const nextUser = {
        user_id: userData.id || userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        avatar_url: userData.avatar_url ?? null,
        gender: userData.gender ?? null,
        date_of_birth: userData.date_of_birth ?? null,
        is_oauth: userData.is_oauth ?? false,
        is_2fa_enabled: userData.two_factor_enabled ?? false
      };

      setUser(nextUser);
      localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));

      return { user: nextUser };
    } catch (error) {
      setUser(null);
      localStorage.removeItem(STORAGE_USER);
      throw error;
    }
  }, []);

  const register = useCallback(async ({ email, password, full_name, gender, date_of_birth }) => {
    const cleanEmail = sanitizeString(email).toLowerCase();
    const cleanPassword = sanitizeString(password);

    const data = await authService.register({
      email: cleanEmail,
      password: cleanPassword,
      full_name: sanitizeString(full_name),
      gender,
      date_of_birth
    });

    if (!data) {
      throw new Error('Registration failed: No user data returned');
    }

    const nextUser = {
      user_id: data.id || data.user_id,
      email: data.email || cleanEmail,
      full_name: data.full_name,
      role: data.role,
      avatar_url: data.avatar_url ?? null,
      gender: data.gender ?? gender ?? null,
      date_of_birth: data.date_of_birth ?? date_of_birth ?? null,
      is_oauth: data.is_oauth ?? false,
      is_2fa_enabled: data.two_factor_enabled ?? false
    };

    // Note: Backend does NOT set tr_access_token cookie on register.
    // Setting user state here would cause an unauthorized redirect on the next page.
    // Instead, we return success and let the register page redirect to login.
    return { user: nextUser };
  }, []);

  const verify2FA = useCallback(async (pendingToken, code) => {
    const data = await authService.verify2FALogin(pendingToken, code);

    const nextUser = {
      user_id: data.id || data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      avatar_url: data.avatar_url ?? null,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth ?? null,
      is_oauth: data.is_oauth ?? false,
      is_2fa_enabled: data.two_factor_enabled ?? true
    };

    setUser(nextUser);
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));

    return { user: nextUser };
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

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_USER);
    queryClient.clear();
    window.sessionStorage.clear();
    window.location.href = '/';
  }, [queryClient]);

  const value = useMemo(() => {
    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      login,
      loginWithToken,
      register,
      verify2FA,
      updateUser,
      logout
    };
  }, [user, loading, login, loginWithToken, register, verify2FA, updateUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
