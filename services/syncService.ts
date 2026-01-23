
import { OvertimeRecord, User } from '../types';

// Versão 15 - Bucket definitivo com sincronização de alta prioridade
const BUCKET_NAME = 'ailton_overtime_v15_final'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  const url = `${BASE_URL}_${key}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method,
      mode: 'cors',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store'
    });

    if (response.status === 404) return method === 'GET' ? [] : false;
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    console.warn(`Sync Warning (${key}):`, err);
    throw err;
  }
}

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try {
      return await apiCall('recs', 'PUT', records);
    } catch { return false; }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    try {
      const data = await apiCall('recs', 'GET');
      return Array.isArray(data) ? data : [];
    } catch { 
      throw new Error('OFFLINE'); 
    }
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try {
      return await apiCall('users', 'PUT', users);
    } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const data = await apiCall('users', 'GET');
      return Array.isArray(data) ? data : [];
    } catch {
      throw new Error('OFFLINE');
    }
  }
};
