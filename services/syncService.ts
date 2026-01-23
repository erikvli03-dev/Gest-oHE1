
import { OvertimeRecord, User } from '../types';

// Versão 21 - Endpoint otimizado para evitar bloqueios de rede móvel e empresarial
const BUCKET_NAME = 'ailton_v21_stable_final'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any, retries = 3): Promise<any> {
  // Apenas GET usa nocache para evitar cache do navegador. PUT deve ser limpo.
  const url = method === 'GET' 
    ? `${BASE_URL}_${key}?t=${Date.now()}` 
    : `${BASE_URL}_${key}`;
  
  const options: RequestInit = {
    method,
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      ...(data ? { 'Content-Type': 'application/json' } : {})
    },
    body: data ? JSON.stringify(data) : undefined
  };

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      options.signal = controller.signal;

      const response = await fetch(url, options);
      clearTimeout(timeout);
      
      if (response.status === 404) return method === 'GET' ? [] : false;
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      
      return method === 'GET' ? await response.json() : true;
    } catch (err: any) {
      console.warn(`Tentativa ${i + 1} falhou para ${key}:`, err.message);
      if (i === retries - 1) throw err;
      // Espera um pouco antes de tentar de novo (Backoff)
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
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
    try {
      const success = await apiCall('users', 'PUT', users);
      // Aguarda propagação no servidor
      await new Promise(r => setTimeout(r, 800));
      return !!success;
    } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const data = await apiCall('users', 'GET');
      if (!Array.isArray(data)) return [];
      return data;
    } catch (e: any) { 
      throw new Error('OFFLINE'); 
    }
  }
};
