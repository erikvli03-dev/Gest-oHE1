
import { OvertimeRecord, User } from '../types';

// Versão 18 - Canal único e limpo para evitar conflitos
const BUCKET_NAME = 'ailton_overtime_v18_ultra_resilient'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any, retries = 3): Promise<any> {
  // O uso de Math.random() e Date.now() em cada chamada garante que o PC não use dados "velhos" do cache
  const url = `${BASE_URL}_${key}?z=${Math.random().toString(36).substring(2, 15)}&t=${Date.now()}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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
      
      return method === 'GET' ? await response.json() : true;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(res => setTimeout(res, 800 * (i + 1)));
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
      // Tenta salvar
      const success = await apiCall('users', 'PUT', users);
      if (!success) return false;
      
      // Validação: Tenta ler de volta para ter certeza que a nuvem aceitou
      const check = await this.getUsers();
      return check.length === users.length;
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
