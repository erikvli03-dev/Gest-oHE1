
import { OvertimeRecord, User } from '../types';

// Versão 17 - Novo túnel de dados para evitar bloqueios regionais
const BUCKET_NAME = 'ailton_overtime_v17_final_sync'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any, retries = 2): Promise<any> {
  // Adiciona timestamp e random para furar qualquer cache de operadora/browser
  const nonce = Math.random().toString(36).substring(7);
  const url = `${BASE_URL}_${key}?cache=${nonce}&t=${Date.now()}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

      const response = await fetch(url, {
        method,
        mode: 'cors',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 404) return method === 'GET' ? [] : false;
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      
      const result = method === 'GET' ? await response.json() : true;
      return result;
    } catch (err) {
      if (i === retries) {
        console.error(`Sync Failure (${key}):`, err);
        throw new Error('NETWORK_ERROR');
      }
      // Espera 1s antes da re-tentativa
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try { return await apiCall('recs', 'PUT', records); } catch { return false; }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    try {
      const data = await apiCall('recs', 'GET');
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try { return await apiCall('users', 'PUT', users); } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const data = await apiCall('users', 'GET');
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
};
