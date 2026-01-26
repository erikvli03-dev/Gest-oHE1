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
    if (!cachedSheetUrl) {
      const config = await this.getConfig();
      if (config?.googleSheetUrl) {
        cachedSheetUrl = config.googleSheetUrl;
        localStorage.setItem('google_sheet_url', cachedSheetUrl!);
      }
    }

    if (!cachedSheetUrl) return false;

    try {
      const formData = new URLSearchParams();
      // Garantindo strings limpas e nomes idênticos ao Script
      formData.append('action', String(action));
      formData.append('id', String(record.id || ""));
      formData.append('coordenador', String(record.coordinator || "Ailton Souza"));
      formData.append('colaborador', String(record.employee || "Não Identificado"));
      formData.append('supervisor', String(record.supervisor || "Não Identificado"));
      formData.append('local', String(record.location || ""));
      formData.append('startDate', String(record.startDate || ""));
      formData.append('startTime', String(record.startTime || ""));
      formData.append('endDate', String(record.endDate || ""));
      formData.append('endTime', String(record.endTime || ""));
      formData.append('motivo', String(record.reason || ""));
      formData.append('obs', String(record.observations || ""));
      
      const h = Math.floor(record.durationMinutes / 60);
      const m = record.durationMinutes % 60;
      formData.append('duracao_fmt', `${h}:${m.toString().padStart(2, '0')}`);
      formData.append('timestamp', new Date().toLocaleString('pt-BR'));

      // Console log para você debugar se necessário (F12 no navegador)
      console.log("Enviando para planilha:", Object.fromEntries(formData));

      await fetch(cachedSheetUrl!, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      return true;
    } catch (e) { 
      console.error("Erro fatal no push:", e);
      return false; 
    }
  },

  async saveConfig(config: any): Promise<boolean> { 
    if (config.googleSheetUrl) {
      cachedSheetUrl = config.googleSheetUrl;
      localStorage.setItem('google_sheet_url', config.googleSheetUrl);
    }
    return !!(await apiCall('config', 'PUT', config)); 
  },
  
  async getConfig(): Promise<any> { 
    const config = await apiCall('config', 'GET');
    if (config?.googleSheetUrl) {
      cachedSheetUrl = config.googleSheetUrl;
      localStorage.setItem('google_sheet_url', config.googleSheetUrl);
    }
    return config;
  },

  async saveRecords(records: OvertimeRecord[]): Promise<boolean> { return !!(await apiCall('recs', 'PUT', records)); },
  async getRecords(): Promise<OvertimeRecord[] | null> { return await apiCall('recs', 'GET'); },
  async saveUsers(users: User[]): Promise<boolean> { return !!(await apiCall('users', 'PUT', users)); },
  async getUsers(): Promise<User[] | null> { return await apiCall('users', 'GET'); }
};