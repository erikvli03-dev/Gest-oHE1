
import { OvertimeRecord, User } from '../types';

// Chave única e definitiva para evitar conflitos de cache ou rede
const PROJECT_ID = 'ailton_overtime_final_v7_stable'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${PROJECT_ID}`;

async function fetchWithRetry(resource: string, options: any = {}, retries = 2): Promise<Response> {
  try {
    const response = await fetch(resource, {
      ...options,
      mode: 'cors',
      cache: 'no-store', // Garante que o celular não use dados velhos
      headers: {
        ...options.headers,
        'Accept': 'application/json'
      }
    });

    // Se for 404, não é erro de rede, é apenas banco vazio. Retornamos a resposta.
    if (response.status === 404) return response;

    if (!response.ok && retries > 0) {
      throw new Error('Retry');
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 800));
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
      throw new Error('OFFLINE');
    }
  }
};
