// src/api/client.js
//
// SRP (Single Responsibility): this file's ONLY job is talking to the backend
// over HTTP and managing the token in storage. It knows nothing about React,
// nothing about UI, nothing about which page called it.
//
// DIP (Dependency Inversion): every page/component depends on apiRequest()
// (an abstraction), never on fetch() directly. If we ever swap fetch for
// axios, or add retry logic, only THIS file changes — no page is touched.

// TODO: confirm real port with backend teammate. Spring Boot defaults to 8080;
// the API doc says 3000. Pick whichever is actually running.
const BASE_URL = "http://localhost:8080/api/v1";

const TOKEN_KEY = "medicore_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * OCP (Open/Closed): this function is generic and CLOSED for modification —
 * we never edit it to add a new feature. It's OPEN for extension: every new
 * endpoint just calls it with different arguments.
 *
 * @param {string} endpoint - path after BASE_URL, e.g. "/auth/login"
 * @param {object} options
 * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} options.method
 * @param {object} [options.body] - request payload, auto JSON.stringified
 * @param {boolean} [options.auth=true] - attach Authorization header?
 */
export async function apiRequest(endpoint, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // some endpoints (e.g. 204 No Content) return no body — that's fine
  }

  if (!response.ok) {
    // Centralized error shape so every page can handle errors the same way
    // instead of each page re-inventing its own error parsing (avoids that
    // copy-pasted-fetch-logic code smell).
    const message = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}
