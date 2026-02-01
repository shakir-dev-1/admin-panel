// src/lib/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function fetchWithAuth<T>(
  url: string, 
  token: string, 
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);
  
  // Set Content-Type to JSON for POST/PUT/PATCH if not already set
  if (!headers.has('Content-Type') && 
      (options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Always add Authorization
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = `API request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content)
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  
  return {} as T;
}

// Add this helper for POST requests
export async function postWithAuth<T>(
  url: string,
  token: string,
  data?: unknown
): Promise<T> {
  return fetchWithAuth<T>(url, token, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}