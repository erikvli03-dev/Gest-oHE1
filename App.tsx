
import React, { useState, useEffect, useRef } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v19_recs';
  
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
    // Limpeza de versions anteriores para evitar conflitos de dados
    localStorage.removeItem('overtime_v18_recs');
    localStorage.removeItem('overtime_v17_recs');
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
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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

      pollingIntervalRef.current = window.setInterval(() => forceSync(true), 30000) as unknown as number;
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
    if (!window.confirm('Sair do sistema?')) return;
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
    if (!window.confirm('Excluir este registro?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
  };

  if (!user) return <AuthSystem onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-4 sticky top-0 z-[100] shadow-xl border-b border-white/5">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-3">
             <div className="font-black tracking-tighter text-blue-400">HE.INSIGHT</div>
             <div className="flex flex-col">
                <span className="font-bold">{user.name}</span>
                <span className="text-[8px] opacity-50 uppercase tracking-widest">{lastSync || 'Conectando...'}</span>
             </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => forceSync()} className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
              <i className={`fa-solid fa-sync ${isSyncing ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={handleLogout} className="p-2.5 bg-slate-800 rounded-xl hover:bg-red-900 transition-colors">
              <i className="fa-solid fa-power-off"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl mt-6">
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
