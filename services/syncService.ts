
import { OvertimeRecord, User } from '../types';

// v22: Nova URL e sistema de detecção de firewall
const BUCKET_NAME = 'ailton_v22_stealth_rescue'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  const url = `${BASE_URL}_${key}?cache_bust=${Date.now()}`;
  
  try {
    const response = await fetch(url, {
      method,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined,
      priority: 'high'
    });

    if (!response.ok) {
      if (response.status === 404) return method === 'GET' ? [] : false;
      throw new Error(`FIREWALL_BLOCK_${response.status}`);
    }
    
    return method === 'GET' ? await response.json() : true;
  } catch (err: any) {
    console.error("Sync Error:", err.message);
    throw new Error(err.message === 'Failed to fetch' ? 'FIREWALL_BLOCKED' : err.message);
  }
}

export const SyncService = {
  async saveAllData(users: User[], records: OvertimeRecord[]): Promise<boolean> {
    try {
      const u = await apiCall('users', 'PUT', users);
      const r = await apiCall('recs', 'PUT', records);
      return u && r;
    } catch { return false; }
  },

  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try { return await apiCall('recs', 'PUT', records); } catch { return false; }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    try { return await apiCall('recs', 'GET'); } catch { return []; }
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try { return await apiCall('users', 'PUT', users); } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const data = await apiCall('users', 'GET');
      return Array.isArray(data) ? data : [];
    } catch (e: any) { 
      throw e; 
    }
  }
};
