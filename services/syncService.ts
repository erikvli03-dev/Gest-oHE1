
import { OvertimeRecord, User } from '../types';

const BUCKET_NAME = 'ailton_v30_immortal'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

// v30: Estado do disjuntor para não insistir em conexões com erro
let isCloudBlocked = false;
let lastRetryTime = 0;

function checkCloudStatus(): boolean {
  if (!isCloudBlocked) return true;
  const now = Date.now();
  if (now - lastRetryTime > 300000) { // Tenta reativar após 5 minutos
    isCloudBlocked = false;
    return true;
  }
  return false;
}

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  if (!checkCloudStatus()) return null;

  const url = `${BASE_URL}_${key}?cb=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500); // Timeout ultra-rápido

  try {
    const response = await fetch(url, {
      method,
      mode: 'cors',
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    clearTimeout(timeoutId);

    if (response.status === 429 || response.status >= 500) {
      isCloudBlocked = true;
      lastRetryTime = Date.now();
      console.warn("Nuvem bloqueada por limite de tráfego.");
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
