
import React, { useState, useEffect, useRef } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v20_recs';
  
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

  useEffect(() => {
    // Limpeza de versions anteriores
    for (let i = 1; i <= 19; i++) {
        localStorage.removeItem(`overtime_v${i}_recs`);
    }
  }, []);

  const mergeRecords = (local: OvertimeRecord[], remote: OvertimeRecord[]): OvertimeRecord[] => {
    const map = new Map<string, OvertimeRecord>();
    remote.forEach(r => map.set(r.id, r));
    local.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  };

  const forceSync = async (isAuto = false) => {
    if (!user) return;
    if (!isAuto) setIsSyncing(true);
    
    try {
      const cloudRecords = await SyncService.getRecords();
      setRecords(prev => {
        const merged = mergeRecords(prev, cloudRecords);
        localStorage.setItem(CACHE_RECS, JSON.stringify(merged));
        return merged;
      });
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setSyncError(false);
    } catch (e) {
      setSyncError(true);
    } finally {
      if (!isAuto) setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) setRecords(JSON.parse(cached));
      forceSync();
      pollingIntervalRef.current = window.setInterval(() => forceSync(true), 40000) as unknown as number;
    }
    return () => { if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current); };
  }, [user?.username]);

  const pushToCloud = async (currentLocalRecords: OvertimeRecord[]) => {
    setIsSyncing(true);
    try {
      const remote = await SyncService.getRecords();
      const finalToSave = mergeRecords(currentLocalRecords, remote);
      const success = await SyncService.saveRecords(finalToSave);
      if (success) {
        setSyncError(false);
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
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
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
  };

  const handleUpdateRecord = async (data: any) => {
    if (!editingRecord) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    const updated = records.map(r => r.id === editingRecord.id ? { ...r, ...data, durationMinutes: duration } : r);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
    setEditingRecord(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Excluir este registro permanentemente?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
  };

  if (!user) return <AuthSystem onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-5 sticky top-0 z-[100] shadow-2xl">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl font-black">HE</div>
             <div className="flex flex-col">
                <span className="font-black text-sm tracking-tight">{user.name}</span>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{lastSync ? `Sincronizado: ${lastSync}` : 'Conectando...'}</span>
             </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={() => forceSync()} className="w-10 h-10 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center">
              <i className={`fa-solid fa-sync text-sm ${isSyncing ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={handleLogout} className="w-10 h-10 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center">
              <i className="fa-solid fa-power-off text-sm"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-6xl mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <OvertimeForm 
              onSubmit={editingRecord ? handleUpdateRecord : handleAddRecord} 
              initialData={editingRecord || undefined}
              onCancel={editingRecord ? () => setEditingRecord(null) : undefined}
              currentUser={user}
            />
          </div>
          <div className="lg:col-span-8 space-y-8">
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
