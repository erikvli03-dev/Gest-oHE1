
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

  // Carregamento inicial (Nuvem + Cache Local)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Tenta carregar do cache local primeiro para velocidade
      const local = localStorage.getItem('overtime_records_cache');
      if (local) setRecords(JSON.parse(local));

      // Busca dados frescos da nuvem
      const cloudRecords = await SyncService.getRecords();
      if (cloudRecords.length > 0) {
        setRecords(cloudRecords);
        localStorage.setItem('overtime_records_cache', JSON.stringify(cloudRecords));
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Função para salvar dados globalmente
  const syncRecords = useCallback(async (newRecords: OvertimeRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('overtime_records_cache', JSON.stringify(newRecords));
    setIsSyncing(true);
    await SyncService.saveRecords(newRecords);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    if (isLoggingOut) {
      const timer = setTimeout(() => setIsLoggingOut(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoggingOut]);

  const handleLogin = (u: User) => {
    sessionStorage.setItem('logged_user', JSON.stringify(u));
    setUser(u);
  };

  const executeLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    sessionStorage.removeItem('logged_user');
    setEditingRecord(null);
    setIsLoggingOut(false);
    setUser(null); 
  };

  const handleAddRecord = async (data: Omit<OvertimeRecord, 'id' | 'createdAt' | 'durationMinutes' | 'ownerUsername' | 'status'>) => {
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

  const handleUpdateRecord = async (data: Omit<OvertimeRecord, 'id' | 'createdAt' | 'durationMinutes' | 'ownerUsername' | 'status'>) => {
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
    if (editingRecord?.id === id) setEditingRecord(null);
  };

  const handleEditRequest = (record: OvertimeRecord) => {
    setEditingRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem('logged_user', JSON.stringify(updatedUser));
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white font-bold animate-pulse">Sincronizando Banco de Dados...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthSystem onLogin={handleLogin} />;

  const dashboardRecords = records.filter(r => {
    if (user.role === 'COORDINATOR') return true;
    if (user.role === 'SUPERVISOR') return r.supervisor === user.name;
    return false;
  });

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-900 text-white py-4 mb-8 sticky top-0 z-[100] shadow-xl border-b border-slate-800">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg relative">
              <i className="fa-solid fa-business-time text-white text-lg"></i>
              {isSyncing && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
              )}
            </div>
            <div className="hidden xs:block">
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                Overtime
                {isSyncing && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">Sync</span>}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
                {user.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-xl border border-slate-700 transition-all font-bold"
            >
              <i className="fa-solid fa-key sm:mr-2"></i>
              <span className="hidden sm:inline">Senha</span>
            </button>

            {!isLoggingOut ? (
              <button 
                onClick={() => setIsLoggingOut(true)} 
                className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl border border-slate-700 transition-all font-bold"
              >
                <i className="fa-solid fa-right-from-bracket sm:mr-2"></i>
                <span className="hidden sm:inline">Sair</span>
              </button>
            ) : (
              <button 
                onClick={executeLogout} 
                className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-xl transition-all font-black text-white shadow-lg animate-pulse"
              >
                Confirmar?
              </button>
            )}
          </div>
        </div>
      </header>

      {isPasswordModalOpen && (
        <PasswordModal 
          user={user} 
          onClose={() => setIsPasswordModalOpen(false)} 
          onSuccess={handleUpdateUser} 
        />
      )}

      <main className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="lg:sticky lg:top-24">
              <OvertimeForm 
                key={editingRecord ? `edit-${editingRecord.id}` : 'new-form'}
                onSubmit={editingRecord ? handleUpdateRecord : handleAddRecord} 
                initialData={editingRecord || undefined}
                onCancel={editingRecord ? () => setEditingRecord(null) : undefined}
                currentUser={user}
              />
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            {(user.role === 'COORDINATOR' || user.role === 'SUPERVISOR') && (
              <DashboardStats records={dashboardRecords} />
            )}
            <OvertimeList 
              records={records} 
              onDelete={handleDeleteRecord} 
              onEdit={handleEditRequest}
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
