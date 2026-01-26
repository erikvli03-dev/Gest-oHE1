import { OvertimeRecord, User } from '../types';

const BUCKET_NAME = 'ailton_v37_prod'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${BUCKET_NAME}`;

let isCloudBlocked = false;
let lastRetryTime = 0;
let cachedSheetUrl: string | null = localStorage.getItem('google_sheet_url');

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
  const url = `${BASE_URL}_${key}`;
  const fetchUrl = method === 'GET' ? `${url}?cb=${Date.now()}` : url;
  
  try {
    const response = await fetch(fetchUrl, {
      method,
      mode: 'cors',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (response.status === 429) { isCloudBlocked = true; lastRetryTime = Date.now(); return null; }
    if (response.status === 404) {
      return (key === 'recs' || key === 'users') ? [] : null;
    }
    
    return method === 'GET' ? await response.json() : true;
  } catch (err) { 
    console.error(`Falha na API (${key}):`, err);
    return null; 
  }
}

export const SyncService = {
  isCloudReady: () => !isCloudBlocked,
  
  async pushToGoogleSheet(record: OvertimeRecord, action: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT'): Promise<boolean> {
    if (!cachedSheetUrl) {
      cachedSheetUrl = localStorage.getItem('google_sheet_url');
    }

    if (!cachedSheetUrl) {
      const config = await this.getConfig();
      if (config?.googleSheetUrl) {
        cachedSheetUrl = config.googleSheetUrl;
      }
    }

    if (!cachedSheetUrl) return false;

    try {
      const formData = new URLSearchParams();
      formData.append('action', action);
      formData.append('id', record.id);
      formData.append('coordenador', record.coordinator || "Ailton Souza");
      formData.append('colaborador', record.employee);
      formData.append('supervisor', record.supervisor);
      formData.append('local', record.location);
      formData.append('startDate', record.startDate);
      formData.append('startTime', record.startTime);
      formData.append('endDate', record.endDate);
      formData.append('endTime', record.endTime);
      formData.append('motivo', record.reason);
      formData.append('obs', record.observations || "");
      
      const h = Math.floor(record.durationMinutes / 60);
      const m = record.durationMinutes % 60;
      formData.append('duracao_fmt', `${h}:${m.toString().padStart(2, '0')}`);
      formData.append('timestamp', new Date().toLocaleString('pt-BR'));

      await fetch(cachedSheetUrl!, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      return true;
    } catch (e) { 
      console.error("Erro no push:", e);
      return false; 
    }
  },

  async saveConfig(config: any): Promise<boolean> { 
    if (config?.googleSheetUrl) {
      cachedSheetUrl = config.googleSheetUrl;
      localStorage.setItem('google_sheet_url', config.googleSheetUrl);
    }
    return !!(await apiCall('config', 'PUT', config)); 
  },
  
  async getConfig(): Promise<any> { 
    const cloudConfig = await apiCall('config', 'GET');
    if (cloudConfig && typeof cloudConfig === 'object' && !Array.isArray(cloudConfig) && cloudConfig.googleSheetUrl) {
      cachedSheetUrl = cloudConfig.googleSheetUrl;
      localStorage.setItem('google_sheet_url', cloudConfig.googleSheetUrl);
      return cloudConfig;
    }
    const local = localStorage.getItem('google_sheet_url');
    if (local) return { googleSheetUrl: local };
    return null;
  },

  async saveRecords(records: OvertimeRecord[]): Promise<boolean> { return !!(await apiCall('recs', 'PUT', records)); },
  async getRecords(): Promise<OvertimeRecord[] | null> { return await apiCall('recs', 'GET'); },
  async saveUsers(users: User[]): Promise<boolean> { return !!(await apiCall('users', 'PUT', users)); },
  async getUsers(): Promise<User[] | null> { return await apiCall('users', 'GET'); }
};