
import { OvertimeRecord, User } from '../types';

// Nova versão v9 com lógica de merge incremental
const PROJECT_ID = 'ailton_overtime_v9_ultra_stable'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${PROJECT_ID}`;

async function fetchWithRetry(resource: string, options: any = {}, retries = 3): Promise<Response> {
  const url = new URL(resource);
  url.searchParams.set('cb', Date.now().toString());

  try {
    const response = await fetch(url.toString(), {
      ...options,
      mode: 'cors',
      cache: 'no-store',
      headers: {
        ...options.headers,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (response.status === 404) return response;

    if (!response.ok) {
      if (retries > 0) throw new Error('Retry');
      return response;
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 1500));
      return fetchWithRetry(resource, options, retries - 1);
    }
    throw new Error('NETWORK_ERROR');
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
      if (!Array.isArray(data)) return [];
      return data;
    } catch (err) { 
      // CRITICAL: Se houver erro de rede, lançamos o erro para o App não achar que a lista está vazia
      throw err; 
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
    } catch (err) {
      throw err;
    }
  }
};
