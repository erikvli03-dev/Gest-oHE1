import { OvertimeRecord, User } from '../types';

// v41: Bucket para persistência interna
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
  
  // v41: Envia para a Planilha Google como Form Data (URLSearchParams)
  // Este formato é o mais compatível com Google Apps Script doPost(e) { e.parameter }
  async pushToGoogleSheet(record: any): Promise<boolean> {
    const sheetUrl = localStorage.getItem('google_sheet_url');
    if (!sheetUrl) return false;

    try {
      const formData = new URLSearchParams();
      
      // Mapeia todos os campos para o formato de formulário
      Object.keys(record).forEach(key => {
        formData.append(key, String(record[key]));
      });
      
      // Adiciona campos formatados extras
      formData.append('data_hora_envio', new Date().toLocaleString('pt-BR'));
      if (record.durationMinutes) {
        const h = Math.floor(record.durationMinutes / 60);
        const m = record.durationMinutes % 60;
        formData.append('duracao_formatada', `${h}:${m.toString().padStart(2, '0')}`);
      }

      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors', // Crucial para evitar erro de CORS no navegador
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