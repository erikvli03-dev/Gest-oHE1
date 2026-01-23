
import { OvertimeRecord, User } from '../types';

// Nova chave v8 para garantir limpeza total e sincronia
const PROJECT_ID = 'ailton_overtime_v8_final'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${PROJECT_ID}`;

async function fetchWithRetry(resource: string, options: any = {}, retries = 2): Promise<Response> {
  const url = new URL(resource);
  url.searchParams.set('force_refresh', Date.now().toString());

  try {
    const response = await fetch(url.toString(), {
      ...options,
      mode: 'cors',
      cache: 'no-store', // Crucial: impede o navegador de usar cache antigo
      headers: {
        ...options.headers,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.status === 404) return response;

    if (!response.ok && retries > 0) {
      throw new Error('Retry');
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 1000));
      return fetchWithRetry(resource, options, retries - 1);
    }
    throw err;
  }
}

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${BASE_URL}_recs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });
      return response.ok;
    } catch { return false; }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    try {
      const response = await fetchWithRetry(`${BASE_URL}_recs`);
      if (response.status === 404) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch { 
      return []; 
    }
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try {
      const response = await fetchWithRetry(`${BASE_URL}_users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users),
      });
      return response.ok;
    } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetchWithRetry(`${BASE_URL}_users`);
      if (response.status === 404) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      throw new Error('NETWORK_ERROR');
    }
  }
};
