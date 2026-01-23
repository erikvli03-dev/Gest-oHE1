
import React, { useState, useEffect, useCallback } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import PasswordModal from './components/PasswordModal';
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
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const forceSync = async () => {
    setIsSyncing(true);
    try {
      const cloudRecords = await SyncService.getRecords();
      if (cloudRecords.length > 0) {
        setRecords(cloudRecords);
        localStorage.setItem('overtime_records_cache', JSON.stringify(cloudRecords));
      }
      
      const remoteUsers = await SyncService.getUsers();
      if (remoteUsers.length > 0) {
        localStorage.setItem('users_emergency_backup', JSON.stringify(remoteUsers));
      }
    } catch (e) {
      console.warn("Sync falhou, operando local.");
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const local = localStorage.getItem('overtime_records_cache');
      if (local) setRecords(JSON.parse(local));
      await forceSync();
      setIsLoading(false);
    };
    loadData();
  }, []);

  const syncRecords = useCallback(async (newRecords: OvertimeRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('overtime_records_cache', JSON.stringify(newRecords));
    setIsSyncing(true);
    await SyncService.saveRecords(newRecords);
    setIsSyncing(false);
  }, []);

  const handleLogin = (u: User) => {
    sessionStorage.setItem('logged_user', JSON.stringify(u));
    setUser(u);
  };

  const executeLogout = (e: React.MouseEvent) => {
    e.preventDefault();
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
      ownerUsername: user.username,
      status: 'PENDING'
    };
    await syncRecords([newRecord, ...records]);
  };

  const handleUpdateRecord = async (data: any) => {
    if (!editingRecord) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    const updated = records.map(r => r.id === editingRecord.id ? { ...r, ...data, durationMinutes: duration } : r);
    await syncRecords(updated);
    setEditingRecord(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? { ...r, status: newStatus } : r);
    await syncRecords(updated);
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    await syncRecords(updated);
  };

  if (!user) return <AuthSystem onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-4 sticky top-0 z-[100] shadow-xl">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center relative">
              <i className="fa-solid fa-clock text-white"></i>
              {isSyncing && <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-xl animate-spin"></div>}
            </div>
            <div>
              <h1 className="font-bold text-sm">Overtime</h1>
              <p className="text-[10px] text-blue-400 font-black uppercase">{user.name}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={forceSync} className="p-2.5 bg-slate-800 rounded-xl text-xs border border-slate-700" title="Sincronizar">
              <i className={`fa-solid fa-sync ${isSyncing ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={executeLogout} className="p-2.5 bg-red-900/30 text-red-400 border border-red-900/50 rounded-xl text-xs font-bold">
              SAIR
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
            {(user.role !== 'EMPLOYEE') && <DashboardStats records={records.filter(r => user.role === 'COORDINATOR' || r.supervisor === user.name)} />}
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
