
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  // v28: Cache principal isolado
  const CACHE_RECS = 'overtime_v28_recs';
  
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

  // Carrega do celular imediatamente ao abrir
  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setRecords(parsed);
        } catch (e) { setRecords([]); }
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
      console.log("Limite da nuvem atingido. Operando modo local.");
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
      alert(`Dados importados com sucesso!`);
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
    // Tenta salvar na nuvem mas não espera e nem trava se der erro de limite
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
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black shadow-lg">HE</div>
          <div>
            <p className="text-xs font-black tracking-tight">{user.name}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
               v28 • {lastSync || 'Local'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => { 
            const data = { records, v: '28', sender: user?.name };
            setGeneratedKey(JSON.stringify(data));
            setShowSyncModal(true); 
          }} className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
            <i className="fa-solid fa-share-nodes mr-1"></i> Sincronizar
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
                <h3 className="font-black text-slate-900">Sincronização Segura</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Use se a nuvem atingir o limite</p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-share"></i> Enviar meus dados</h4>
                <button onClick={() => {
                   const msg = `🚀 *HE - ${user?.name}*\n\nMeus registros atualizados:\n\n*CÓDIGO:* ${generatedKey}`;
                   window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                }} className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100">
                  <i className="fa-brands fa-whatsapp text-2xl"></i>
                  <span className="text-[11px] font-black uppercase">Enviar por WhatsApp</span>
                </button>
                <button onClick={() => { navigator.clipboard.writeText(generatedKey); alert('Copiado!'); }} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200">Copiar Código Manual</button>
              </div>

              <div className="h-px bg-slate-100"></div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-download"></i> Receber dados da equipe</h4>
                <textarea value={syncInput} onChange={e => setSyncInput(e.target.value)} placeholder="Cole aqui o código recebido..." className="w-full h-24 bg-slate-50 border border-slate-200 p-3 text-[9px] font-mono rounded-xl focus:border-purple-500 outline-none" />
                <button onClick={() => { try { handleDataImport(JSON.parse(syncInput)); } catch { alert('Código Inválido!'); } }} disabled={!syncInput} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl shadow-lg uppercase text-[10px] tracking-widest disabled:opacity-50">Sincronizar Agora</button>
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
