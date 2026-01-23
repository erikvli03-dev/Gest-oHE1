
import { OvertimeRecord, User } from '../types';

// Versão v10 estável com URL fixa
const PROJECT_ID = 'ailton_overtime_v10_gold_standard'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${PROJECT_ID}`;

async function fetchWithRetry(resource: string, options: any = {}, retries = 3): Promise<Response> {
  // ATENÇÃO: Nunca adicionar parâmetros de busca (?cb=...) na URL do KVDB, 
  // pois ele interpreta como parte do nome da chave.
  try {
    const response = await fetch(resource, {
      ...options,
      mode: 'cors',
      cache: 'no-store', // Força o navegador a não usar cache
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers,
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
      await new Promise(res => setTimeout(res, 1000));
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
      return Array.isArray(data) ? data : [];
    } catch (err) { 
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
