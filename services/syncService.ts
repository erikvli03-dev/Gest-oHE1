
import { OvertimeRecord, User } from '../types';

// v27: Novo bucket para evitar limites de taxa e instabilidade
const BUCKET_NAME = 'ailton_v27_stable'; 
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
    });

    if (!response.ok) {
      if (response.status === 404) return method === 'GET' ? [] : false;
      return false;
    }
    
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    console.warn("Rede instável, operando em modo local.");
    return method === 'GET' ? null : false;
  }
}

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    return await apiCall('recs', 'PUT', records);
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    const data = await apiCall('recs', 'GET');
    return Array.isArray(data) ? data : [];
  },

  async saveUsers(users: User[]): Promise<boolean> {
    return await apiCall('users', 'PUT', users);
  },

  async getUsers(): Promise<User[]> {
    const data = await apiCall('users', 'GET');
    return Array.isArray(data) ? data : [];
  }
};
