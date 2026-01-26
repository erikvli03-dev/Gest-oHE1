
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v32_recs';
  
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [lastSync, setLastSync] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setRecords(parsed);
        } catch (e) { setRecords([]); }
      }
      if (SyncService.isCloudReady()) forceSync();
    }
  }, [user?.username]);

  const forceSync = async () => {
    if (!user) return;
    try {
      const cloudRecords = await SyncService.getRecords();
      if (cloudRecords && Array.isArray(cloudRecords)) {
        handleDataImport({ records: cloudRecords }, true);
      }
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn("Modo offline ativo.");
    }
  };

  const handleDataImport = (data: any, isCloud = false) => {
    if (!data || !data.records) return;
    setRecords(prev => {
      const map = new Map();
      const currentRecords = Array.isArray(prev) ? prev : [];
      currentRecords.forEach(r => map.set(r.id, r));
      data.records.forEach((r: OvertimeRecord) => map.set(r.id, r));
      const final = Array.from(map.values()).sort((a,b) => b.createdAt - a.createdAt);
      localStorage.setItem(CACHE_RECS, JSON.stringify(final));
      return final;
    });
    if (!isCloud) {
      alert(`Dados Importados!`);
      setShowSyncModal(false);
    }
  };

  const handleAddRecord = async (data: any) => {
    setIsSaving(true);
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);

    const newRecord: OvertimeRecord = {
      ...data,
      id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      durationMinutes: duration,
      ownerUsername: user!.username,
      status: 'PENDING'
    };

    // Atualiza imediatamente na UI
    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));

    // Feedback de sucesso imediato
    setTimeout(() => {
      setIsSaving(false);
      // Notificação nativa se possível
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 800);

    // Sincroniza em background
    SyncService.saveRecords(updated).catch(err => {
      console.error("Erro ao sincronizar na nuvem, salvo localmente.");
    });
  };

  const handleUpdateStatus = async (id: string, s: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? {...r, status: s} : r);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    SyncService.saveRecords(updated).catch(() => {});
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    SyncService.saveRecords(updated).catch(() => {});
  };

  if (!user) return <AuthSystem onLogin={u => { setUser(u); sessionStorage.setItem('logged_user', JSON.stringify(u)); }} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[100] shadow-2xl flex justify-between items-center border-b border-white/5 backdrop-blur-lg bg-slate-900/95">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-500/20">HE</div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-tighter leading-none">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${SyncService.isCloudReady() ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
                v32 • {SyncService.isCloudReady() ? 'Sincronizado' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSyncModal(true)} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all">
            <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
          </button>
          <button onClick={() => { sessionStorage.clear(); setUser(null); }} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center border border-red-500/20">
            <i className="fa-solid fa-power-off text-xs"></i>
          </button>
        </div>
      </header>

      {isSaving && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest z-[150] shadow-2xl flex items-center gap-3 border border-white/10 animate-in fade-in zoom-in duration-300">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
          Lançamento Realizado!
        </div>
      )}

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        <OvertimeForm onSubmit={handleAddRecord} currentUser={user} />
        
        {user.role !== 'EMPLOYEE' && <DashboardStats records={records} />}
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="h-px flex-1 bg-slate-200"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Histórico Recente</span>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>
          <OvertimeList records={records} onDelete={handleDeleteRecord} onUpdateStatus={handleUpdateStatus} currentUser={user} onEdit={()=>{}} />
        </div>
      </main>

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/95 z-[200] p-4 flex items-center justify-center backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 border border-slate-200">
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Sincronização Manual</h3>
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">v32 • Backup e Importação</span>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4">
              <button onClick={() => {
                const data = JSON.stringify({ records, v: '32', sender: user.name });
                const msg = `📊 *BACKUP HE v32*\n\nColaborador: ${user.name}\n\n*DATA:* ${new Date().toLocaleString()}\n\n*CÓDIGO:* \n${data}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
              }} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                <i className="fa-brands fa-whatsapp text-xl"></i> Exportar via WhatsApp
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou Importar</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <textarea value={syncInput} onChange={e => setSyncInput(e.target.value)} placeholder="Cole aqui o código de backup..." className="w-full h-32 bg-slate-50 border border-slate-200 p-4 text-[9px] font-mono rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
              <button onClick={() => { try { handleDataImport(JSON.parse(syncInput)); } catch { alert('Código inválido ou incompleto!'); } }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Importar Registros</button>
              
              <button onClick={forceSync} className="w-full text-blue-600 font-black text-[10px] uppercase tracking-widest py-2">
                <i className="fa-solid fa-rotate mr-2"></i> Forçar Sinc. com Nuvem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
