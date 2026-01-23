
import React, { useState, useEffect, useRef } from 'react';
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
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [syncError, setSyncError] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  
  const pollingIntervalRef = useRef<number | null>(null);

  // Lógica de Merge: Une o que está no aparelho com o que está na nuvem
  const mergeRecords = (local: OvertimeRecord[], remote: OvertimeRecord[]): OvertimeRecord[] => {
    const map = new Map<string, OvertimeRecord>();
    // Prioridade para o que veio da nuvem (remote)
    remote.forEach(r => map.set(r.id, r));
    // Adiciona o que está local mas não está na nuvem ainda
    local.forEach(l => {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  };

  // Função que busca dados da nuvem
  const forceSync = async (isAuto = false) => {
    if (!user) return;
    if (!isAuto) setIsSyncing(true);
    
    try {
      const cloudRecords = await SyncService.getRecords();
      setRecords(prev => {
        const merged = mergeRecords(prev, cloudRecords);
        localStorage.setItem('overtime_cache_v14', JSON.stringify(merged));
        return merged;
      });
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSyncError(false);
    } catch (e) {
      setSyncError(true);
    } finally {
      if (!isAuto) setIsSyncing(false);
    }
  };

  // Efeito principal: Gerencia a sincronização contínua
  useEffect(() => {
    if (user) {
      // Carrega cache imediato
      const cached = localStorage.getItem('overtime_cache_v14');
      if (cached) setRecords(JSON.parse(cached));
      
      // Primeira busca
      forceSync();

      // Configura o "Radar" de atualizações (Polling a cada 30 segundos)
      pollingIntervalRef.current = window.setInterval(() => {
        forceSync(true);
      }, 30000) as unknown as number;
    }

    return () => {
      if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current);
    };
  }, [user?.username]);

  // Função que envia dados para a nuvem
  const pushToCloud = async (currentLocalRecords: OvertimeRecord[]) => {
    setIsSyncing(true);
    try {
      let remote: OvertimeRecord[] = [];
      try { 
        remote = await SyncService.getRecords(); 
      } catch { 
        console.warn("Offline: salvando local para enviar depois.");
      }
      
      const finalToSave = mergeRecords(currentLocalRecords, remote);
      const success = await SyncService.saveRecords(finalToSave);
      
      if (success) {
        setSyncError(false);
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setSyncError(true);
      }
    } catch (err) {
      setSyncError(true);
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
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      createdAt: Date.now(),
      durationMinutes: duration,
      ownerUsername: user.username.toLowerCase().trim(),
      status: 'PENDING'
    };
    
    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem('overtime_cache_v14', JSON.stringify(updated));
    await pushToCloud(updated);
  };

  const handleUpdateRecord = async (data: any) => {
    if (!editingRecord) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    const updated = records.map(r => r.id === editingRecord.id ? { ...r, ...data, durationMinutes: duration } : r);
    setRecords(updated);
    localStorage.setItem('overtime_cache_v14', JSON.stringify(updated));
    await pushToCloud(updated);
    setEditingRecord(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setRecords(updated);
    localStorage.setItem('overtime_cache_v14', JSON.stringify(updated));
    await pushToCloud(updated);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Deseja excluir este registro?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('overtime_cache_v14', JSON.stringify(updated));
    await pushToCloud(updated);
  };

  if (!user) return <AuthSystem onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-4 sticky top-0 z-[100] shadow-xl border-b border-white/5">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative shadow-lg transition-all ${syncError ? 'bg-amber-500' : 'bg-blue-600'} ${isSyncing ? 'scale-110' : ''}`}>
              <i className={`fa-solid ${syncError ? 'fa-cloud-arrow-up' : 'fa-clock'} text-white`}></i>
              {isSyncing && <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-xl animate-spin"></div>}
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none flex items-center gap-2 uppercase tracking-tight">
                Overtime
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-md font-black border border-blue-500/30">
                  {records.length}
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-blue-400 font-black uppercase">{user.name}</span>
                {lastSync && !syncError && (
                  <span className="text-[8px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                    Ativo: {lastSync}
                  </span>
                )}
                {syncError && <span className="text-[8px] text-amber-500 font-bold animate-pulse uppercase">Tentando Reestabelecer...</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => forceSync()} 
              disabled={isSyncing}
              className="p-2.5 rounded-xl text-xs bg-slate-800 text-white border border-slate-700 active:scale-90 transition-all shadow-inner"
              title="Sincronizar Manualmente"
            >
              <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={handleLogout} className="p-2.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-[10px] font-black hover:text-white transition-all">
              SAIR
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl mt-6">
        {syncError && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl mb-6 flex items-center gap-3 text-amber-800 animate-pulse">
            <i className="fa-solid fa-wifi text-lg"></i>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase">Aguardando Sincronia</p>
              <p className="text-[10px]">Lançamentos feitos agora serão enviados ao PC automaticamente assim que a rede estabilizar.</p>
            </div>
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
