
import { OvertimeRecord, User } from '../types';

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
  try {
    const response = await fetch(url, {
      method,
      mode: 'cors',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (response.status === 429) { isCloudBlocked = true; lastRetryTime = Date.now(); return null; }
    if (response.status === 404) return method === 'GET' ? [] : null;
    return method === 'GET' ? await response.json() : true;
  } catch (err) { return null; }
}

export const SyncService = {
  isCloudReady: () => !isCloudBlocked,
  
  async pushToGoogleSheet(record: OvertimeRecord, action: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT'): Promise<boolean> {
    const sheetUrl = localStorage.getItem('google_sheet_url');
    if (!sheetUrl) return false;

    try {
      const formData = new URLSearchParams();
      formData.append('action', action);
      formData.append('id', record.id);
      formData.append('colaborador', record.employee);
      formData.append('supervisor', record.supervisor);
      formData.append('local', record.location);
      formData.append('inicio_data', record.startDate);
      formData.append('inicio_hora', record.startTime);
      formData.append('fim_data', record.endDate);
      formData.append('fim_hora', record.endTime);
      formData.append('motivo', record.reason);
      formData.append('obs', record.observations || "");
      
      const h = Math.floor(record.durationMinutes / 60);
      const m = record.durationMinutes % 60;
      formData.append('duracao_formatada', `${h}:${m.toString().padStart(2, '0')}`);
      formData.append('timestamp', new Date().toLocaleString('pt-BR'));

      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      });
      return true;
    } catch (e) { return false; }
  },

  async saveConfig(config: any): Promise<boolean> { return !!(await apiCall('config', 'PUT', config)); },
  async getConfig(): Promise<any> { return await apiCall('config', 'GET'); },
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> { return !!(await apiCall('recs', 'PUT', records)); },
  async getRecords(): Promise<OvertimeRecord[] | null> { return await apiCall('recs', 'GET'); },
  async saveUsers(users: User[]): Promise<boolean> { return !!(await apiCall('users', 'PUT', users)); },
  async getUsers(): Promise<User[] | null> { return await apiCall('users', 'GET'); }
};
