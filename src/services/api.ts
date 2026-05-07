export interface AuthUser {
  app_id: string;
  corp_id: string;
  id: number;
  name: string;
  role: string;
  username: string;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const result = await response.json().catch(() => ({
    error: 'Request failed',
    success: false,
  }));

  if (response.status === 401 && !url.startsWith('/api/auth/')) {
    window.location.href = '/login';
  }

  if (!response.ok || !result.success) {
    throw new ApiError(result.error || 'Request failed', response.status || 500);
  }

  return result.data as T;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export const api = {
  auth: {
    login: (data: { username: string; password: string }) =>
      apiFetch<AuthUser>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),
    me: () => apiFetch<AuthUser>('/api/auth/me'),
  },
  samplers: {
    list: () => apiFetch<any[]>('/api/samplers'),
    get: (id: number) => apiFetch<any>(`/api/samplers/${id}`),
    create: (data: any) => apiFetch<any>('/api/samplers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch<any>(`/api/samplers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<void>(`/api/samplers/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: () => apiFetch<any[]>('/api/tasks'),
    get: (id: number) => apiFetch<any>(`/api/tasks/${id}`),
    create: (data: any) => apiFetch<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch<any>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
    complete: (id: number) => apiFetch<any>(`/api/tasks/${id}/complete`, { method: 'POST' }),
  },
  workHours: {
    list: () => apiFetch<any[]>('/api/work-hours'),
    get: (id: number) => apiFetch<any>(`/api/work-hours/${id}`),
    create: (data: any) => apiFetch<any>('/api/work-hours', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch<any>(`/api/work-hours/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<void>(`/api/work-hours/${id}`, { method: 'DELETE' }),
    approve: (id: number) => apiFetch<any>(`/api/work-hours/${id}/approve`, { method: 'POST' }),
  },
  salaries: {
    list: () => apiFetch<any[]>('/api/salaries'),
    get: (id: number) => apiFetch<any>(`/api/salaries/${id}`),
    calculate: (data: any) => apiFetch<any>('/api/salaries/calculate', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch<any>(`/api/salaries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<void>(`/api/salaries/${id}`, { method: 'DELETE' }),
    pay: (id: number) => apiFetch<any>(`/api/salaries/${id}/pay`, { method: 'POST' }),
  },
  salaryConfigs: {
    list: () => apiFetch<any[]>('/api/salary-configs'),
    get: (id: number) => apiFetch<any>(`/api/salary-configs/${id}`),
    create: (data: any) => apiFetch<any>('/api/salary-configs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch<any>(`/api/salary-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<void>(`/api/salary-configs/${id}`, { method: 'DELETE' }),
  },
};
