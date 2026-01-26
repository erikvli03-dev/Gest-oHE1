import React, { useState, useEffect, useCallback } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v37_recs';
  
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [lastSyncInfo, setLastSyncInfo] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => localStorage.getItem('google_sheet_url') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingSheet, setIsTestingSheet] = useState(false);

  const mergeRecords = useCallback((cloudData: OvertimeRecord[], localData: OvertimeRecord[]) => {
    const map = new Map();
    cloudData.forEach(r => map.set(r.id, r));
    localData.forEach(r => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  const forceSync = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsSyncing(true);
    
    try {
      const cloudRecords = await SyncService.getRecords();
      if (cloudRecords !== null) {
        setRecords(prev => {
          const merged = mergeRecords(cloudRecords, prev);
          localStorage.setItem(CACHE_RECS, JSON.stringify(merged));
          return merged;
        });
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncInfo(`${time} (${cloudRecords.length} registros)`);
      }
    } catch (e) {
      console.warn("Sincronização falhou.");
    } finally {
      setIsSyncing(false);
    }
  }, [user, mergeRecords]);

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) {
        try { setRecords(JSON.parse(cached)); } catch { setRecords([]); }
      }
      forceSync();
      const interval = setInterval(() => forceSync(true), 20000);
      return () => clearInterval(interval);
    }
  }, [user?.username, forceSync]);

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
      if (googleSheetUrl) {
        await SyncService.pushToGoogleSheet(newRecord);
      }

      const latestCloud = await SyncService.getRecords();
      const currentList = latestCloud !== null ? latestCloud : records;
      const updatedList = mergeRecords(currentList, [newRecord, ...records]);
      
      setRecords(updatedList);
      localStorage.setItem(CACHE_RECS, JSON.stringify(updatedList));
      await SyncService.saveRecords(updatedList);
      
      if ('vibrate' in navigator) navigator.vibrate(50);
      alert("Registro enviado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar, mas os dados foram guardados localmente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, s: OvertimeStatus) => {
    setIsSyncing(true);
    try {
      const latestCloud = await SyncService.getRecords();
      const base = latestCloud !== null ? latestCloud : records;
      const updated = base.map(r => r.id === id ? {...r, status: s} : r);
      setRecords(updated);
      localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
      await SyncService.saveRecords(updated);
    } catch (e) {
      alert("Erro ao atualizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Excluir?')) return;
    setIsSyncing(true);
    try {
      const latestCloud = await SyncService.getRecords();
      const base = latestCloud !== null ? latestCloud : records;
      const updated = base.filter((r: any) => r.id !== id);
      setRecords(updated);
      localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
      await SyncService.saveRecords(updated);
    } catch (e) {
      alert("Erro.");
    } finally {
      setIsSyncing(false);
    }
  };

  const saveGoogleConfig = () => {
    localStorage.setItem('google_sheet_url', googleSheetUrl);
    alert("Configuração de Planilha Salva!");
  };

  const handleTestSheet = async () => {
    if (!googleSheetUrl) return alert("Insira uma URL primeiro.");
    setIsTestingSheet(true);
    
    const today = new Date().toISOString().split('T')[0];
    
    // v42: Envia dados completos para evitar o erro de "undefined" na planilha
    const success = await SyncService.pushToGoogleSheet({ 
      employee: "TESTE DE SISTEMA", 
      supervisor: user?.name || "Ailton Souza",
      coordinator: "Ailton Souza",
      reason: "Teste de conexão FIPS OK",
      location: "SANTOS",
      startDate: today,
      startTime: "08:00",
      endDate: today,
      endTime: "09:00",
      durationMinutes: 60,
      status: "PENDING",
      createdAt: Date.now() 
    });

    alert("Comando enviado! Se a URL estiver certa, uma linha sem erros aparecerá na sua planilha agora.");
    setIsTestingSheet(false);
  };

  if (!user) return <AuthSystem onLogin={u => { setUser(u); sessionStorage.setItem('logged_user', JSON.stringify(u)); }} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[100] shadow-2xl flex justify-between items-center border-b border-white/5 backdrop-blur-lg bg-slate-900/95">
        <div className="flex items-center gap-3">
          <div className="w-12 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-black shadow-lg text-[10px] tracking-tighter">FIPS</div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-tighter leading-none">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : (SyncService.isCloudReady() ? 'bg-emerald-500' : 'bg-red-500')}`}></div>
              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
                {isSyncing ? 'Sincronizando...' : (lastSyncInfo ? lastSyncInfo : 'Pronto')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => forceSync()} disabled={isSyncing} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all">
            <i className={`fa-solid fa-arrows-rotate text-xs ${isSyncing ? 'animate-spin' : ''}`}></i>
          </button>
          <button onClick={() => setShowSyncModal(true)} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all">
            <i className="fa-solid fa-gear text-xs"></i>
          </button>
          <button onClick={() => { sessionStorage.clear(); setUser(null); }} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-power-off text-xs"></i>
          </button>
        </div>
      </header>

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
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Configurações</h3>
              <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-6">
              {(user.role === 'COORDINATOR' || user.role === 'SUPERVISOR') && (
                <div className="p-5 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-blue-600 uppercase mb-2 ml-1">Integração Google Sheets</label>
                    <input 
                      type="text" 
                      value={googleSheetUrl} 
                      onChange={e => setGoogleSheetUrl(e.target.value)}
                      placeholder="URL do Apps Script (Web App)..."
                      className="w-full p-4 bg-white border border-blue-200 rounded-2xl text-[10px] outline-none font-mono focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={saveGoogleConfig} className="bg-blue-600 text-white py-4 rounded-xl font-bold text-[10px] uppercase shadow-lg active:scale-95 transition-all">Salvar URL</button>
                    <button 
                      onClick={handleTestSheet} 
                      disabled={isTestingSheet}
                      className="bg-white border border-blue-200 text-blue-600 py-4 rounded-xl font-bold text-[10px] uppercase active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isTestingSheet ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-vial"></i>}
                      Testar Agora
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Segurança</p>
                <button onClick={() => {
                  const data = JSON.stringify({ records });
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`📊 *BACKUP FIPS*\n\n${data}`)}`, '_blank');
                }} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg">
                  <i className="fa-brands fa-whatsapp text-lg"></i> Backup WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;