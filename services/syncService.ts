
import { OvertimeRecord, User } from '../types';

/**
 * SyncService - Gerencia a persistência global dos dados.
 * Nova chave de projeto com suporte a CORS ampliado.
 */
const PROJECT_KEY = 'v3_ailton_overtime_prod_final_99'; 
const BASE_URL = `https://kvdb.io/6L5qE8vE2uA7pYn9/${PROJECT_KEY}`;

// Função auxiliar para fetch com timeout
async function fetchWithTimeout(resource: string, options: any = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}_recs`, {
        method: 'POST', // POST costuma ser mais aceito que PUT em redes móveis
        headers: { 'Content-Type': 'text/plain' }, // Evita pre-flight de segurança em alguns casos
        body: JSON.stringify(records),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao salvar registros:', error);
      return false;
    }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}_recs`, { cache: 'no-store' });
      if (response.status === 404) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}_users`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(users),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao salvar usuários:', error);
      return false;
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}_users`, { cache: 'no-store' });
      if (response.status === 404) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('Servidor offline ou banco vazio.');
      throw error; // Repassa o erro para o AuthSystem tratar
    }
  }
};
