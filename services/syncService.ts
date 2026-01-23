
import { OvertimeRecord, User } from '../types';

// Versão 20 - Endpoint final com redundância de cache
const BUCKET_NAME = 'ailton_v20_final_stable'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  const url = `${BASE_URL}_${key}?nocache=${Date.now()}`;
  
  const options: RequestInit = {
    method,
    mode: 'cors',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;

    const response = await fetch(url, options);
    clearTimeout(timeout);
    
    if (response.status === 404) return method === 'GET' ? [] : false;
    if (!response.ok) throw new Error(`ERR_${response.status}`);
    
    return method === 'GET' ? await response.json() : true;
  } catch (err: any) {
    console.error(`Sync Error [${key}]:`, err.message);
    throw err;
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
    try {
      const success = await apiCall('users', 'PUT', users);
      // Garantia de escrita: espera 1 segundo para o servidor propagar
      await new Promise(r => setTimeout(r, 1000));
      return !!success;
    } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const data = await apiCall('users', 'GET');
      if (!Array.isArray(data)) throw new Error('DATA_MALFORMED');
      return data;
    } catch (e: any) { 
      throw new Error(e.message || 'OFFLINE'); 
    }
  }
};
