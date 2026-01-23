
import { OvertimeRecord, User } from '../types';

// v28: Novo bucket e limite de timeout para evitar travamentos
const BUCKET_NAME = 'ailton_v28_emergency'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  const url = `${BASE_URL}_${key}?cache_bust=${Date.now()}`;
  
  // Cria um controlador para cancelar a requisição se demorar mais de 3 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

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

    if (!response.ok) {
      // Se atingiu o limite (429) ou erro de servidor (5xx), retorna nulo para o app seguir em modo local
      return null;
    }
    
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("Nuvem atingiu o limite ou está offline. Operando Localmente.");
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
