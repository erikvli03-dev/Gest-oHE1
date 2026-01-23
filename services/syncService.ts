
import { OvertimeRecord, User } from '../types';

// Versão 19 - Nova rota para evitar filtros de rede do computador
const BUCKET_NAME = 'ailton_v19_master_sync'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  // Timestamp para garantir que o computador não use dados antigos (cache)
  const ts = Date.now();
  const url = `${BASE_URL}_${key}?cache_bust=${ts}`;
  
  // Headers simplificados: Menos chance de ser bloqueado por firewalls empresariais
  const options: RequestInit = {
    method,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Accept': 'application/json',
    }
  };

  if (data) {
    (options.headers as any)['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (response.status === 404) return method === 'GET' ? [] : false;
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    console.warn(`Erro na chamada ${key}:`, err);
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
      // Pequeno delay para a nuvem processar antes da confirmação
      await new Promise(r => setTimeout(r, 500));
      return !!success;
    } catch { return false; }
  },

  async getUsers(): Promise<User[]> {
    try {
      const data = await apiCall('users', 'GET');
      return Array.isArray(data) ? data : [];
    } catch { 
      // Se falhar no computador, lança erro para a UI mostrar "Offline"
      throw new Error('OFFLINE_ERROR'); 
    }
  }
};
