const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, password } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (password) {
    headers["x-admin-password"] = password;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed (${response.status}).`,
      response.status
    );
  }

  return data;
}

export function getLetters() {
  return request("/api/letters");
}

export function getLetter(id) {
  return request(`/api/letters/${encodeURIComponent(id)}`);
}

export function verifyPassword(password) {
  return request("/api/auth/verify", { method: "POST", password });
}

export function createLetter(data, password) {
  return request("/api/letters", { method: "POST", body: data, password });
}

export function updateLetter(id, data, password) {
  return request(`/api/letters/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: data,
    password
  });
}

export function deleteLetter(id, password) {
  return request(`/api/letters/${encodeURIComponent(id)}`, {
    method: "DELETE",
    password
  });
}
