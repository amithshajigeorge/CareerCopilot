const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions {
  headers?: Record<string, string>;
  body?: any;
}

function getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || JSON.stringify(errorJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }

  // Handle empty or NO_CONTENT responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export function apiGet<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'GET',
    headers: getHeaders(headers),
  });
}

export function apiPost<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    headers: getHeaders(headers),
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'DELETE',
    headers: getHeaders(headers),
  });
}

export function apiMultipartPost<T>(endpoint: string, formData: FormData, customHeaders?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = {};
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }
  
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return apiFetch<T>(endpoint, {
    method: 'POST',
    headers, // Fetch automatically sets boundary for FormData if Content-Type is omitted
    body: formData,
  });
}
