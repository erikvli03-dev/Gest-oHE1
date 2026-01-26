import { OvertimeRecord, User } from '../types';

// v42: Bucket para persistência interna
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
  
  // v42: Envia para a Planilha Google com mapeamento robusto (PT/EN)
  async pushToGoogleSheet(record: any): Promise<boolean> {
    const sheetUrl = localStorage.getItem('google_sheet_url');
    if (!sheetUrl) return false;

    try {
      const formData = new URLSearchParams();
      
      // Mapeia campos originais garantindo que não envie a string "undefined"
      const safeGet = (val: any) => (val === undefined || val === null) ? "" : String(val);

      // Envia em Inglês (compatível com o script anterior)
      formData.append('employee', safeGet(record.employee));
      formData.append('supervisor', safeGet(record.supervisor));
      formData.append('coordinator', safeGet(record.coordinator));
      formData.append('location', safeGet(record.location));
      formData.append('startDate', safeGet(record.startDate));
      formData.append('startTime', safeGet(record.startTime));
      formData.append('endDate', safeGet(record.endDate));
      formData.append('endTime', safeGet(record.endTime));
      formData.append('reason', safeGet(record.reason));
      formData.append('status', safeGet(record.status));
      formData.append('durationMinutes', safeGet(record.durationMinutes));

      // Envia em Português (para facilitar novos scripts)
      formData.append('colaborador', safeGet(record.employee));
      formData.append('local', safeGet(record.location));
      formData.append('inicio_data', safeGet(record.startDate));
      formData.append('inicio_hora', safeGet(record.startTime));
      formData.append('fim_data', safeGet(record.endDate));
      formData.append('fim_hora', safeGet(record.endTime));
      formData.append('motivo', safeGet(record.reason));
      
      // Campos calculados e formatados
      const now = new Date();
      formData.append('timestamp', now.toLocaleString('pt-BR'));
      
      if (record.durationMinutes) {
        const h = Math.floor(record.durationMinutes / 60);
        const m = record.durationMinutes % 60;
        formData.append('duracao_formatada', `${h}:${m.toString().padStart(2, '0')}`);
      } else {
        formData.append('duracao_formatada', "0:00");
      }

      // Envio via no-cors para Google Apps Script
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        body: formData
      });
      
      return true;
    } catch (e) {
      console.error("Erro ao enviar para planilha:", e);
      return false;
    }
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