// Copyright 2026 Kushan Shah
// SPDX-License-Identifier: Apache-2.0

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate from localStorage on mount
    const savedToken = localStorage.getItem("geostream_token");
    const savedUser = localStorage.getItem("geostream_user");
    if (savedToken && savedUser) {
      setTimeout(() => {
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("geostream_token");
          localStorage.removeItem("geostream_user");
        }
      }, 0);
    }
  }, []);

  const setAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("geostream_token", newToken);
    localStorage.setItem("geostream_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("geostream_token");
    localStorage.removeItem("geostream_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
