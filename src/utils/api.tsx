// src/utils/api.ts
export async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    credentials: "include", // send cookies
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  // if server returns 401 because access token expired, caller can call refresh endpoint
  return res;
}
