import { OvertimeRecord, User } from '../types';

// v44: Bucket para persistência interna
const BUCKET_NAME = 'ailton_v37_prod'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

let isCloudBlocked = false;
let lastRetryTime = 0;

function checkCloudStatus(): boolean {
  if (!isCloudBlocked) return true;
  const now = Date.now();
  if (now - lastRetryTime > 30000) { 
    isCloudBlocked = false;
    return true;
  }
  return false;
}

async function apiCall(key: string, method: 'GET' | 'PUT' = 'GET', data?: any): Promise<any> {
  if (!checkCloudStatus()) return null;

  const url = `${BASE_URL}_${key}?cb=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); 

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

    if (response.status === 404) return method === 'GET' ? [] : null;

    if (!response.ok) return null;
    return method === 'GET' ? await response.json() : true;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`Erro na API (${key}):`, err);
    return null;
  }
}

export const SyncService = {
  isCloudReady: () => !isCloudBlocked,
  
  async pushToGoogleSheet(record: any): Promise<boolean> {
    const sheetUrl = localStorage.getItem('google_sheet_url');
    if (!sheetUrl) return false;

    try {
      const formData = new URLSearchParams();
      const safe = (val: any) => (val === undefined || val === null) ? "" : String(val);

      formData.append('employee', safe(record.employee));
      formData.append('supervisor', safe(record.supervisor));
      formData.append('coordinator', safe(record.coordinator));
      formData.append('location', safe(record.location));
      formData.append('startDate', safe(record.startDate));
      formData.append('startTime', safe(record.startTime));
      formData.append('endDate', safe(record.endDate));
      formData.append('endTime', safe(record.endTime));
      formData.append('reason', safe(record.reason));
      formData.append('status', safe(record.status));
      formData.append('durationMinutes', safe(record.durationMinutes));
      formData.append('colaborador', safe(record.employee));
      formData.append('local', safe(record.location));
      formData.append('motivo', safe(record.reason));
      
      const now = new Date();
      formData.append('timestamp', now.toLocaleString('pt-BR'));
      
      if (record.durationMinutes) {
        const h = Math.floor(record.durationMinutes / 60);
        const m = record.durationMinutes % 60;
        formData.append('duracao_formatada', `${h}:${m.toString().padStart(2, '0')}`);
      }

      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        body: formData
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async saveConfig(config: any): Promise<boolean> {
    return !!(await apiCall('config', 'PUT', config));
  },
  async getConfig(): Promise<any> {
    return await apiCall('config', 'GET');
  },
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    return !!(await apiCall('recs', 'PUT', records));
  },
  async getRecords(): Promise<OvertimeRecord[] | null> {
    return await apiCall('recs', 'GET');
  },
  async saveUsers(users: User[]): Promise<boolean> {
    return !!(await apiCall('users', 'PUT', users));
  },
  async getUsers(): Promise<User[] | null> {
    return await apiCall('users', 'GET');
  }
};