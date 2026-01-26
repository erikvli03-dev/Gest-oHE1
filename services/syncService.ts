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
      // Retorna array vazio apenas para listas, senão null para objetos como 'config'
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
    // Tenta atualizar a URL do cache/localstorage antes de enviar
    if (!cachedSheetUrl) {
      cachedSheetUrl = localStorage.getItem('google_sheet_url');
    }

    if (!cachedSheetUrl) {
      console.log("URL não encontrada localmente, buscando na nuvem...");
      const config = await this.getConfig();
      if (config?.googleSheetUrl) {
        cachedSheetUrl = config.googleSheetUrl;
      }
    }

    if (!cachedSheetUrl) {
      console.error("Configuração de planilha ausente. O Coordenador precisa definir a URL.");
      return false;
    }

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

      const response = await fetch(cachedSheetUrl!, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      return true; // no-cors sempre retorna opaque response, assumimos sucesso se não houve exceção
    } catch (e) { 
      console.error("Erro no push para Google Sheets:", e);
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
    
    // Validação robusta do objeto de configuração vindo da nuvem
    if (cloudConfig && typeof cloudConfig === 'object' && !Array.isArray(cloudConfig) && cloudConfig.googleSheetUrl) {
      cachedSheetUrl = cloudConfig.googleSheetUrl;
      localStorage.setItem('google_sheet_url', cloudConfig.googleSheetUrl);
      return cloudConfig;
    }
    
    // Fallback para o que já estiver salvo no celular
    const local = localStorage.getItem('google_sheet_url');
    if (local) return { googleSheetUrl: local };
    
    return null;
  },

  async saveRecords(records: OvertimeRecord[]): Promise<boolean> { return !!(await apiCall('recs', 'PUT', records)); },
  async getRecords(): Promise<OvertimeRecord[] | null> { return await apiCall('recs', 'GET'); },
  async saveUsers(users: User[]): Promise<boolean> { return !!(await apiCall('users', 'PUT', users)); },
  async getUsers(): Promise<User[] | null> { return await apiCall('users', 'GET'); }
};