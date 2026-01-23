
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v30_recs';
  
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [lastSync, setLastSync] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');

  // v30: Carregamento instantâneo do celular
  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setRecords(parsed);
        } catch (e) { setRecords([]); }
      }
      
      // Sincroniza em segundo plano apenas se a nuvem estiver "saudável"
      if (SyncService.isCloudReady()) {
        forceSync();
      }
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
      console.log("Servidor em limite. Modo local ativo.");
    }
  };

  const handleDataImport = (data: any, isCloud = false) => {
    if (!data) return;
    setRecords(prev => {
      const map = new Map();
      const currentRecords = Array.isArray(prev) ? prev : [];
      currentRecords.forEach(r => map.set(r.id, r));
      if (data.records && Array.isArray(data.records)) {
        data.records.forEach((r: OvertimeRecord) => map.set(r.id, r));
      }
      const final = Array.from(map.values()).sort((a,b) => b.createdAt - a.createdAt);
      localStorage.setItem(CACHE_RECS, JSON.stringify(final));
      return final;
    });
    if (!isCloud) {
      alert(`Dados sincronizados localmente!`);
      setShowSyncModal(false);
      setSyncInput('');
    }
  };

  const handleAddRecord = async (data: any) => {
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    const newRecord: OvertimeRecord = {
      ...data,
      id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      durationMinutes: duration,
      ownerUsername: user!.username,
      status: 'PENDING'
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    SyncService.saveRecords(updated).catch(() => {});
  };

  const handleUpdateStatus = async (id: string, s: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? {...r, status: s} : r);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    SyncService.saveRecords(updated).catch(() => {});
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    SyncService.saveRecords(updated).catch(() => {});
  };

  if (!user) return <AuthSystem onLogin={u => { setUser(u); sessionStorage.setItem('logged_user', JSON.stringify(u)); }} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[100] shadow-xl flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black">HE</div>
          <div>
            <p className="text-xs font-black tracking-tight">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${SyncService.isCloudReady() ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
                v30 • {SyncService.isCloudReady() ? 'ONLINE' : 'LIMITADO'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSyncModal(true)} className="px-3 py-2 bg-slate-800 border border-white/5 text-white rounded-xl text-[10px] font-black uppercase">
            <i className="fa-solid fa-cloud-arrow-up mr-1 text-blue-400"></i> Sync
          </button>
          <button onClick={() => { sessionStorage.clear(); setUser(null); }} className="w-10 h-10 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center border border-white/5">
            <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
      </header>

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] p-4 flex items-center justify-center backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Sincronização</h3>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-400 p-2"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4">
               {!SyncService.isCloudReady() && (
                 <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[10px] text-amber-700 font-bold">
                   A nuvem atingiu o limite. Use o WhatsApp abaixo para enviar seus dados ao supervisor.
                 </div>
               )}

              <button onClick={() => {
                const data = JSON.stringify({ records, v: '30', sender: user.name });
                const msg = `🚀 *HE - ${user.name}*\n\nMeus registros v30:\n\n*CÓDIGO:* ${data}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
              }} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                <i className="fa-brands fa-whatsapp text-lg"></i> Enviar p/ Supervisor
              </button>

              <div className="h-px bg-slate-100 my-4"></div>

              <textarea value={syncInput} onChange={e => setSyncInput(e.target.value)} placeholder="Cole o código recebido aqui para importar..." className="w-full h-24 bg-slate-50 border border-slate-200 p-3 text-[9px] font-mono rounded-xl outline-none" />
              <button onClick={() => { try { handleDataImport(JSON.parse(syncInput)); } catch { alert('Código inválido!'); } }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[11px] uppercase">Importar Dados</button>
            </div>
          </div>
        </div>
      )}

      <main className="p-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <OvertimeForm onSubmit={handleAddRecord} currentUser={user} />
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          {user.role !== 'EMPLOYEE' && <DashboardStats records={records} />}
          <div className="bg-white rounded-3xl p-1 border border-slate-200">
            <OvertimeList records={records} onDelete={handleDeleteRecord} onUpdateStatus={handleUpdateStatus} currentUser={user} onEdit={()=>{}} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
