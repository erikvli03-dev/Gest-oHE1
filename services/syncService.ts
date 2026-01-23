
import { OvertimeRecord, User } from '../types';

// Versão 16 - Bucket com maior redundância
const BUCKET_NAME = 'ailton_overtime_v16_resilient'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any, retries = 3): Promise<any> {
  const url = `${BASE_URL}_${key}?t=${Date.now()}`; // Query param para evitar cache de provedor
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method,
        mode: 'cors',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (response.status === 404) return method === 'GET' ? [] : false;
      if (!response.ok) throw new Error(`Status_${response.status}`);
      
      return method === 'GET' ? await response.json() : true;
    } catch (err) {
      const isLast = i === retries - 1;
      if (isLast) {
        console.error(`Final Sync Error (${key}):`, err);
        throw new Error('OFFLINE');
      }
      // Espera um pouco antes de tentar de novo (exponential backoff simples)
      await new Promise(res => setTimeout(res, 500 * (i + 1)));
    }
  }
}

export const SyncService = {
  async testConnection(): Promise<boolean> {
    try {
      await fetch(`${BASE_URL}_test`, { method: 'GET', mode: 'cors' });
      return true;
    } catch {
      return false;
    }
  },

  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try {
      return await apiCall('recs', 'PUT', records);
    } catch { return false; }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    return await apiCall('recs', 'GET');
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try {
      return await apiCall('users', 'PUT', users);
    } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    return await apiCall('users', 'GET');
  }
};
