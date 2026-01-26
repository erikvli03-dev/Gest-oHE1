
import { OvertimeRecord, User } from '../types';

// v36: Novo bucket e lógica de erro aprimorada
const BUCKET_NAME = 'ailton_v36_final'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

let isCloudBlocked = false;
let lastRetryTime = 0;

function checkCloudStatus(): boolean {
  if (!isCloudBlocked) return true;
  const now = Date.now();
  if (now - lastRetryTime > 30000) { // Bloqueio reduzido para 30s
    isCloudBlocked = false;
    return true;
  }
  return false;
}

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  if (!checkCloudStatus()) return null;

  const url = `${BASE_URL}_${key}?cb=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // v36: 15 segundos para redes instáveis

  try {
    const response = await fetch(url, {
      method,
      mode: 'cors',
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      isCloudBlocked = true;
      lastRetryTime = Date.now();
      return null;
    }

    // v36: KVDB retorna 404 se a chave nunca foi criada. Tratamos como vazio [], não como erro null.
    if (response.status === 404) return method === 'GET' ? [] : null;

    if (!response.ok) return null;
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`Erro na API (${key}):`, err);
    return null; // Erro real de rede
  }
}

export const SyncService = {
  isCloudReady: () => !isCloudBlocked,
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    return !!(await apiCall('recs', 'PUT', records));
  },
  async getRecords(): Promise<OvertimeRecord[] | null> {
    const data = await apiCall('recs', 'GET');
    return data; // Retorna null se falhou, [] se vazio
  },
  async saveUsers(users: User[]): Promise<boolean> {
    return !!(await apiCall('users', 'PUT', users));
  },
  async getUsers(): Promise<User[] | null> {
    return await apiCall('users', 'GET');
  }
};
