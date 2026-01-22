
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, User } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import PasswordModal from './components/PasswordModal';
import { calculateDuration } from './utils/timeUtils';

const App: React.FC = () => {
  const [records, setRecords] = useState<OvertimeRecord[]>(() => {
    const saved = localStorage.getItem('overtime_records_v2');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    localStorage.setItem('overtime_records_v2', JSON.stringify(records));
  }, [records]);

  // Reset do estado de confirmação de logout ao fechar/mudar de tela
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

  // FUNÇÃO SAIR DEFINITIVA: Sem window.confirm para evitar bloqueios
  const executeLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Limpeza total
    sessionStorage.removeItem('logged_user');
    sessionStorage.clear();
    
    // Reset de estados
    setEditingRecord(null);
    setIsLoggingOut(false);
    setUser(null); 
  };

  const handleAddRecord = (data: Omit<OvertimeRecord, 'id' | 'createdAt' | 'durationMinutes' | 'ownerUsername'>) => {
    if (!user) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    
    const newRecord: OvertimeRecord = {
      ...data,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      durationMinutes: duration,
      ownerUsername: user.username
    };
    
    setRecords(prev => [newRecord, ...prev]);
    alert('✅ Registro salvo com sucesso!');
  };

  const handleUpdateRecord = (data: Omit<OvertimeRecord, 'id' | 'createdAt' | 'durationMinutes' | 'ownerUsername'>) => {
    if (!editingRecord) return;
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...data, durationMinutes: duration } : r));
    setEditingRecord(null);
    alert('✅ Registro atualizado!');
  };

  const handleDeleteRecord = (id: string) => {
    // Agora a confirmação já foi feita visualmente no componente OvertimeList
    setRecords(prev => prev.filter(r => r.id !== id));
    if (editingRecord?.id === id) setEditingRecord(null);
  };

  const handleEditRequest = (record: OvertimeRecord) => {
    setEditingRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem('logged_user', JSON.stringify(updatedUser));
    const users: User[] = JSON.parse(localStorage.getItem('app_users') || '[]');
    const idx = users.findIndex(u => u.username === updatedUser.username);
    if (idx !== -1) {
      users[idx] = updatedUser;
      localStorage.setItem('app_users', JSON.stringify(users));
    }
  };

  if (!user) {
    return <AuthSystem onLogin={handleLogin} />;
  }

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
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-business-time text-white text-lg"></i>
            </div>
            <div className="hidden xs:block">
              <h1 className="font-bold text-lg leading-tight">Overtime</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
                {user.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2 font-bold cursor-pointer"
            >
              <i className="fa-solid fa-key pointer-events-none"></i>
              <span className="hidden sm:inline pointer-events-none">Senha</span>
            </button>

            {/* BOTÃO SAIR COM CONFIRMAÇÃO EM DOIS ESTÁGIOS */}
            {!isLoggingOut ? (
              <button 
                type="button"
                onClick={() => setIsLoggingOut(true)} 
                className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2 font-bold text-white cursor-pointer active:scale-95"
              >
                <i className="fa-solid fa-right-from-bracket pointer-events-none"></i>
                <span>Sair</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={executeLogout} 
                className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-black text-white shadow-lg shadow-red-500/30 active:scale-95 animate-pulse cursor-pointer border-none"
              >
                <i className="fa-solid fa-circle-check pointer-events-none"></i>
                <span>Confirmar?</span>
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
          <div className="lg:col-span-5 space-y-6">
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

          <div className="lg:col-span-7 space-y-8">
            {(user.role === 'COORDINATOR' || user.role === 'SUPERVISOR') && (
              <DashboardStats records={dashboardRecords} />
            )}
            <OvertimeList 
              records={records} 
              onDelete={handleDeleteRecord} 
              onEdit={handleEditRequest}
              currentUser={user}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
