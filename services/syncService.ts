
import { OvertimeRecord, User } from '../types';

// v29: Novo bucket para evitar o bloqueio da versão anterior
const BUCKET_NAME = 'ailton_v29_resilient'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  const url = `${BASE_URL}_${key}?cache_bust=${Date.now()}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout mais curto para não travar

  try {
    const response = await fetch(url, {
      method,
      mode: 'cors',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    clearTimeout(timeoutId);

    // Se atingiu o limite (429), apenas loga e retorna nulo para o app ignorar
    if (response.status === 429) {
      console.warn("Limite de requisições atingido na nuvem.");
      return null;
    }

    if (!response.ok) return null;
    
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    const res = await apiCall('recs', 'PUT', records);
    return !!res;
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    const data = await apiCall('recs', 'GET');
    return Array.isArray(data) ? data : [];
  },

  async saveUsers(users: User[]): Promise<boolean> {
    const res = await apiCall('users', 'PUT', users);
    return !!res;
  },

  async getUsers(): Promise<User[]> {
    const data = await apiCall('users', 'GET');
    return Array.isArray(data) ? data : [];
  }
};
