
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  // v27: Cache isolado para evitar erros de rede ou tela branca
  const CACHE_RECS = 'overtime_v27_recs';
  
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    if (user) {
      try {
        const cached = localStorage.getItem(CACHE_RECS);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setRecords(parsed);
        }
      } catch (e) {
        setRecords([]);
      }
      forceSync();
    }
  }, [user?.username]);

  const forceSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const cloudRecords = await SyncService.getRecords();
      if (cloudRecords && Array.isArray(cloudRecords)) {
        handleDataImport({ records: cloudRecords }, true);
      }
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.log("Offline mode");
    } finally { setIsSyncing(false); }
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
      alert(`Sincronização concluída!`);
      setShowSyncModal(false);
      setSyncInput('');
    }
  };

  const generateDataKey = () => {
    const data = {
      records: records,
      v: '27',
      exportDate: new Date().toISOString(),
      sender: user?.name
    };
    const key = JSON.stringify(data);
    setGeneratedKey(key);
    return { key, data };
  };

  const handleShareWhatsApp = () => {
    const { key } = generateDataKey();
    const message = `🚀 *HE - ${user?.name}*\n\nSeguem meus registros.\n\n*CÓDIGO:* ${key}`;
    if (key.length > 3000) {
      alert("Histórico grande. Copie o código manualmente.");
      return;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
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
    if (!confirm('Excluir?')) return;
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
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black shadow-lg">HE</div>
          <div>
            <p className="text-xs font-black tracking-tight">{user.name}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
               v27 • {lastSync || 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => { generateDataKey(); setShowSyncModal(true); }} className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
            <i className="fa-solid fa-sync mr-1"></i> Sincronizar
          </button>
          <button onClick={() => { sessionStorage.clear(); setUser(null); }} className="w-10 h-10 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center border border-white/5">
            <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
      </header>

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] p-4 flex items-center justify-center backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 my-auto">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900">Sincronização</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Via WhatsApp ou Código</p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-share"></i> Enviar Meus Dados</h4>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={handleShareWhatsApp} className="flex items-center justify-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all">
                    <i className="fa-brands fa-whatsapp text-2xl"></i>
                    <span className="text-[11px] font-black uppercase tracking-widest">Enviar por WhatsApp</span>
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); alert('Copiado!'); }} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200">Copiar Código para Área de Transferência</button>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-download"></i> Receber Dados</h4>
                <textarea value={syncInput} onChange={e => setSyncInput(e.target.value)} placeholder="Cole o código recebido aqui..." className="w-full h-24 bg-slate-50 border border-slate-200 p-3 text-[9px] font-mono rounded-xl focus:border-purple-500 outline-none" />
                <button onClick={() => { try { handleDataImport(JSON.parse(syncInput)); } catch { alert('Código Inválido!'); } }} disabled={!syncInput} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl shadow-lg uppercase text-[10px] tracking-widest disabled:opacity-50">Sincronizar Dados Colados</button>
              </div>
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
          {user.role !== 'EMPLOYEE' && Array.isArray(records) && <DashboardStats records={records} />}
          <div className="bg-white rounded-3xl p-1 border border-slate-200">
            {Array.isArray(records) && (
              <OvertimeList records={records} onDelete={handleDeleteRecord} onUpdateStatus={handleUpdateStatus} currentUser={user} onEdit={()=>{}} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
