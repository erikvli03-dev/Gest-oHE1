
import { OvertimeRecord, User } from '../types';

// v32: Novo bucket para evitar bloqueios de IP da versão anterior
const BUCKET_NAME = 'ailton_v32_pro'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

let isCloudBlocked = false;
let lastRetryTime = 0;

function checkCloudStatus(): boolean {
  if (!isCloudBlocked) return true;
  const now = Date.now();
  if (now - lastRetryTime > 60000) { // Bloqueio de 1 minuto apenas
    isCloudBlocked = false;
    return true;
  }
  return false;
}

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  if (!checkCloudStatus()) return null;

  const url = `${BASE_URL}_${key}?cb=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // v32: 8 segundos (mais tolerante)

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

    if (!response.ok) return null;
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

export const SyncService = {
  isCloudReady: () => !isCloudBlocked,
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    return !!(await apiCall('recs', 'PUT', records));
  },
  async getRecords(): Promise<OvertimeRecord[]> {
    const data = await apiCall('recs', 'GET');
    return Array.isArray(data) ? data : [];
  },
  async saveUsers(users: User[]): Promise<boolean> {
    return !!(await apiCall('users', 'PUT', users));
  },
  async getUsers(): Promise<User[]> {
    const data = await apiCall('users', 'GET');
    return Array.isArray(data) ? data : [];
  }
};
