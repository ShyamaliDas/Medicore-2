// src/context/AuthContext.jsx
//
// Design pattern: Provider pattern (React's version of Dependency Injection).
// Instead of every page importing client.js and managing its own copy of
// "who is logged in", the whole app is wrapped once in <AuthProvider> and
// any component can ask useAuth() for the current user/token.
//
// ISP (Interface Segregation): consumers only ever see
// { user, login, signup, logout, loading } — five things, nothing about
// HOW tokens are stored or decoded leaks out to the pages that use it.
//
// SRP: this file's only job is auth state. It does not render any UI.

import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, setToken, clearToken, getToken } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const AuthContext = createContext(null);

// Small private helper — not exported, because nothing outside this file
// needs to know how a JWT is decoded. (Encapsulation.)
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // decoded token: { userId, role, name, ... }
  const [loading, setLoading] = useState(true);

  // Restore session on page refresh — runs once.
  useEffect(() => {
    const token = getToken();
    if (token) setUser(decodeJwt(token));
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await apiRequest(ENDPOINTS.login, {
      method: "POST",
      body: { email, password },
      auth: false, // no token to attach yet, we're about to get one
    });
    setToken(data.accessToken);
    setUser(decodeJwt(data.accessToken));
    return data.data; // full profile, useful for role-based redirect
  }

  async function signup(payload) {
    // Signup does NOT log the user in automatically (backend doesn't return
    // a token for signup) — caller should redirect to /login after success.
    return apiRequest(ENDPOINTS.signup, {
      method: "POST",
      body: payload,
      auth: false,
    });
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  const value = { user, login, signup, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Encapsulation: components call useAuth(), never import AuthContext
// directly. This also gives us one place to throw a helpful error if
// someone forgets to wrap the app in <AuthProvider>.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
