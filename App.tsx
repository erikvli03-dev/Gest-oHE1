
import React, { useState, useEffect, useCallback } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [syncError, setSyncError] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);

  // Função para mesclar registros locais e remotos sem perdas
  const mergeRecords = (local: OvertimeRecord[], remote: OvertimeRecord[]): OvertimeRecord[] => {
    const merged = [...remote];
    local.forEach(l => {
      if (!merged.find(m => m.id === l.id)) {
        merged.push(l);
      }
    });
    return merged.sort((a, b) => b.createdAt - a.createdAt);
  };

  const forceSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      // 1. Busca dados da nuvem
      const cloudRecords = await SyncService.getRecords();
      
      // 2. Mescla com o que já temos no estado atual (previne apagar dados novos não salvos)
      setRecords(prev => {
        const merged = mergeRecords(prev, cloudRecords);
        localStorage.setItem('overtime_records_cache', JSON.stringify(merged));
        return merged;
      });

      // 3. Busca usuários para backup
      const remoteUsers = await SyncService.getUsers();
      if (remoteUsers.length > 0) {
        localStorage.setItem('users_emergency_backup', JSON.stringify(remoteUsers));
      }
      
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error("Sync Error:", e);
      setSyncError(true);
      // Não alteramos o estado de 'records' aqui para manter o que já existe localmente
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const local = localStorage.getItem('overtime_records_cache');
      if (local) {
        setRecords(JSON.parse(local));
      }
      
      if (user) {
        await forceSync();
      }
      setIsLoading(false);
    };
    init();
  }, [user?.username]);

  // Função central para salvar dados com segurança
  const pushToCloud = async (currentLocalRecords: OvertimeRecord[]) => {
    setIsSyncing(true);
    try {
      // Primeiro baixa o que está lá para não atropelar dados de outros dispositivos
      const remote = await SyncService.getRecords();
      const finalToSave = mergeRecords(currentLocalRecords, remote);
      
      const success = await SyncService.saveRecords(finalToSave);
      if (success) {
        setRecords(finalToSave);
        localStorage.setItem('overtime_records_cache', JSON.stringify(finalToSave));
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      setSyncError(true);
      // Mantemos o estado local para tentar novamente depois
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (u: User) => {
    sessionStorage.setItem('logged_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    if (!window.confirm('Deseja realmente sair?')) return;
    sessionStorage.removeItem('logged_user');
    setUser(null);
  };

  const handleAddRecord = async (data: any) => {
    if (!user) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    const newRecord: OvertimeRecord = {
      ...data,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      durationMinutes: duration,
      ownerUsername: user.username.toLowerCase().trim(),
      status: 'PENDING'
    };
    
    const updatedLocal = [newRecord, ...records];
    setRecords(updatedLocal);
    await pushToCloud(updatedLocal);
  };

  const handleUpdateRecord = async (data: any) => {
    if (!editingRecord) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    const updated = records.map(r => r.id === editingRecord.id ? { ...r, ...data, durationMinutes: duration } : r);
    setRecords(updated);
    await pushToCloud(updated);
    setEditingRecord(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setRecords(updated);
    await pushToCloud(updated);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Deseja excluir este registro?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    await pushToCloud(updated);
  };

  if (!user) return <AuthSystem onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-4 sticky top-0 z-[100] shadow-xl border-b border-white/5">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative shadow-lg transition-colors ${syncError ? 'bg-red-600 shadow-red-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
              <i className={`fa-solid ${syncError ? 'fa-triangle-exclamation' : 'fa-clock'} text-white`}></i>
              {isSyncing && <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-xl animate-spin"></div>}
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none flex items-center gap-2">
                Overtime
                <span className="bg-blue-500/20 text-blue-400 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-blue-500/30 uppercase">
                  {records.length} ITENS
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-blue-400 font-black uppercase tracking-tight">{user.name}</span>
                {lastSync && !syncError && <span className="text-[8px] text-slate-500 font-bold">SINC: {lastSync}</span>}
                {syncError && <span className="text-[8px] text-red-500 font-bold animate-pulse">ERRO DE REDE</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={forceSync} 
              disabled={isSyncing}
              className={`p-2.5 rounded-xl text-xs border transition-all ${isSyncing ? 'bg-slate-800 border-slate-700 text-slate-500' : syncError ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-white active:bg-slate-700 shadow-lg'}`}
              title="Atualizar Dados"
            >
              <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={handleLogout} className="p-2.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-[10px] font-black tracking-widest active:scale-95 transition-all">
              SAIR
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl mt-6">
        {isLoading && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-white font-black text-[10px] uppercase tracking-widest">Sincronizando...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <OvertimeForm 
              onSubmit={editingRecord ? handleUpdateRecord : handleAddRecord} 
              initialData={editingRecord || undefined}
              onCancel={editingRecord ? () => setEditingRecord(null) : undefined}
              currentUser={user}
            />
          </div>
          <div className="lg:col-span-8 space-y-6">
            {(user.role !== 'EMPLOYEE') && (
              <DashboardStats records={records.filter(r => user.role === 'COORDINATOR' || r.supervisor === user.name)} />
            )}
            <OvertimeList 
              records={records} 
              onDelete={handleDeleteRecord} 
              onEdit={setEditingRecord}
              onUpdateStatus={handleUpdateStatus}
              currentUser={user}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
