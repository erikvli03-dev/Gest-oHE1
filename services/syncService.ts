
import { OvertimeRecord, User } from '../types';

// Chave única para o projeto do Ailton para evitar colisão com outros apps
const BUCKET_ID = 'gestao_he_ailton_souza_v1_prod';
const BASE_URL = `https://kvdb.io/6Pz7P7Z7z7Z7z7Z7z7Z7z7/${BUCKET_ID}`; 
// Nota: Em um ambiente real, usaríamos Firebase ou Supabase. 
// Para este protótipo funcional, utilizaremos uma API de armazenamento Key-Value compartilhada.

export const SyncService = {
  async saveRecords(records: OvertimeRecord[]): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/records`, {
        method: 'POST',
        body: JSON.stringify(records),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao salvar registros na nuvem:', error);
      return false;
    }
  },

  async getRecords(): Promise<OvertimeRecord[]> {
    try {
      const response = await fetch(`${BASE_URL}/records`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar registros na nuvem:', error);
      return [];
    }
  },

  async saveUsers(users: User[]): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(users),
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao salvar usuários na nuvem:', error);
      return false;
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${BASE_URL}/users`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar usuários na nuvem:', error);
      return [];
    }
  }
};
