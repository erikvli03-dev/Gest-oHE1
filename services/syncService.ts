
import { OvertimeRecord, User } from '../types';

// Nova chave simplificada para evitar problemas de roteamento
const PROJECT_ID = 'ailton_ot_v6'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${PROJECT_ID}`;

async function fetchWithRetry(resource: string, options: any = {}, retries = 3): Promise<Response> {
  try {
    const response = await fetch(resource, {
      ...options,
      mode: 'cors',
      cache: 'no-store'
    });
    if (!response.ok && retries > 0) throw new Error('Retry');
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
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
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
      throw new Error('OFFLINE');
    }
  }
};
