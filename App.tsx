
import React, { useState, useEffect, useCallback } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v36_recs';
  
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [lastSyncInfo, setLastSyncInfo] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // v36: Função de mesclagem que prioriza o ID mas garante unicidade
  const mergeRecords = useCallback((cloudData: OvertimeRecord[], localData: OvertimeRecord[]) => {
    const map = new Map();
    // Primeiro colocamos os locais (que podem ser novos/não sincronizados)
    localData.forEach(r => map.set(r.id, r));
    // Depois os da nuvem (que são a verdade absoluta atualizada)
    cloudData.forEach(r => map.set(r.id, r));
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  const forceSync = useCallback(async (silent = false) => {
    if (!user || isSyncing) return;
    if (!silent) setIsSyncing(true);
    
    try {
      const cloudRecords = await SyncService.getRecords();
      // v36: Só atualizamos se a resposta não for null (erro de rede)
      if (cloudRecords !== null) {
        setRecords(prev => {
          const merged = mergeRecords(cloudRecords, prev);
          localStorage.setItem(CACHE_RECS, JSON.stringify(merged));
          return merged;
        });
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncInfo(`${time} (${cloudRecords.length} recs)`);
      }
    } catch (e) {
      console.warn("Falha na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, mergeRecords]);

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) {
        try { setRecords(JSON.parse(cached)); } catch { setRecords([]); }
      }
      
      forceSync();

      const interval = setInterval(() => {
        forceSync(true);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user?.username]);

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

    try {
      // v36: Read-Modify-Write Robusto
      const latestCloud = await SyncService.getRecords();
      
      if (latestCloud === null) {
        // Se a nuvem falhou, salvamos localmente e avisamos
        const newList = [newRecord, ...records];
        setRecords(newList);
        localStorage.setItem(CACHE_RECS, JSON.stringify(newList));
        alert("Aviso: Falha ao conectar na nuvem. O registro está salvo apenas neste celular até a próxima sincronização.");
      } else {
        const updatedList = mergeRecords(latestCloud, [newRecord, ...records]);
        setRecords(updatedList);
        localStorage.setItem(CACHE_RECS, JSON.stringify(updatedList));
        await SyncService.saveRecords(updatedList);
      }
      
      if ('vibrate' in navigator) navigator.vibrate(50);
    } catch (err) {
      console.error("Erro ao adicionar:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, s: OvertimeStatus) => {
    setIsSyncing(true);
    try {
      const latestCloud = await SyncService.getRecords();
      if (latestCloud !== null) {
        const updated = mergeRecords(latestCloud, records).map(r => 
          r.id === id ? {...r, status: s} : r
        );
        setRecords(updated);
        localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
        await SyncService.saveRecords(updated);
      } else {
        alert("Não foi possível atualizar o status. Verifique sua conexão.");
      }
    } catch (e) {
      alert("Erro ao atualizar status na nuvem.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Excluir este lançamento permanentemente?')) return;
    setIsSyncing(true);
    try {
      const latestCloud = await SyncService.getRecords();
      if (latestCloud !== null) {
        const updated = latestCloud.filter((r: any) => r.id !== id);
        setRecords(updated);
        localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
        await SyncService.saveRecords(updated);
      }
    } catch (e) {
      alert("Erro ao deletar na nuvem.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDataImport = (data: any) => {
    if (!data || !data.records) return;
    const merged = mergeRecords(data.records, records);
    setRecords(merged);
    localStorage.setItem(CACHE_RECS, JSON.stringify(merged));
    SyncService.saveRecords(merged).then(() => {
      alert(`Dados Importados e Sincronizados!`);
      setShowSyncModal(false);
    });
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
              <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : (SyncService.isCloudReady() ? 'bg-emerald-500' : 'bg-red-500')}`}></div>
              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
                {isSyncing ? 'Sincronizando...' : (lastSyncInfo ? `Sinc: ${lastSyncInfo}` : 'Conectado')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => forceSync()} disabled={isSyncing} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all disabled:opacity-50 relative">
            <i className={`fa-solid fa-arrows-rotate text-xs ${isSyncing ? 'animate-spin' : ''}`}></i>
          </button>
          <button onClick={() => setShowSyncModal(true)} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all">
            <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
          </button>
          <button onClick={() => { sessionStorage.clear(); setUser(null); }} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center border border-red-500/20">
            <i className="fa-solid fa-power-off text-xs"></i>
          </button>
        </div>
      </header>

      {isSyncing && !lastSyncInfo && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest z-[150] shadow-xl flex items-center gap-2">
          <i className="fa-solid fa-spinner animate-spin"></i>
          Buscando na Nuvem...
        </div>
      )}

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        <OvertimeForm onSubmit={handleAddRecord} currentUser={user} />
        
        {user.role !== 'EMPLOYEE' && <DashboardStats records={records} />}
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="h-px flex-1 bg-slate-200"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registros de HE</span>
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
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Backup e Importação</span>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4">
              <button onClick={() => {
                const data = JSON.stringify({ records, v: '36', sender: user.name });
                const msg = `📊 *BACKUP HE v36*\n\nColaborador: ${user.name}\n\n*DATA:* ${new Date().toLocaleString()}\n\n*CÓDIGO:* \n${data}`;
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
              <button onClick={() => { try { handleDataImport(JSON.parse(syncInput)); } catch { alert('Código inválido!'); } }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Importar Registros</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
