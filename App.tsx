
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  // Versão 25 para evitar conflitos de cache anteriores
  const CACHE_RECS = 'overtime_v25_recs';
  const CACHE_USERS = 'users_v25_local';
  
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

  // Carregamento inicial seguro
  useEffect(() => {
    if (user) {
      try {
        const cached = localStorage.getItem(CACHE_RECS);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setRecords(parsed);
        }
      } catch (e) {
        console.error("Erro ao carregar cache:", e);
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
      console.log("Offline ou Bloqueado: Usando dados locais.");
    } finally { setIsSyncing(false); }
  };

  const handleDataImport = (data: any, isCloud = false) => {
    if (!data) return;

    setRecords(prev => {
      const map = new Map();
      // Preserva registros locais atuais
      if (Array.isArray(prev)) prev.forEach(r => map.set(r.id, r));
      
      // Mescla novos registros
      if (data.records && Array.isArray(data.records)) {
        data.records.forEach((r: OvertimeRecord) => map.set(r.id, r));
      }
      
      const final = Array.from(map.values()).sort((a,b) => b.createdAt - a.createdAt);
      localStorage.setItem(CACHE_RECS, JSON.stringify(final));
      return final;
    });

    if (data.users && !isCloud) {
      try {
        const localUsersStr = localStorage.getItem(CACHE_USERS);
        const localUsers = localUsersStr ? JSON.parse(localUsersStr) : [];
        const userMap = new Map();
        if (Array.isArray(localUsers)) localUsers.forEach((u: User) => userMap.set(u.username, u));
        if (Array.isArray(data.users)) data.users.forEach((u: User) => userMap.set(u.username, u));
        localStorage.setItem(CACHE_USERS, JSON.stringify(Array.from(userMap.values())));
      } catch (e) {
        console.error("Erro ao mesclar usuários:", e);
      }
    }

    if (!isCloud) {
      alert(`Sincronização v25 Concluída!\nRegistros processados.`);
      setShowSyncModal(false);
      setSyncInput('');
    }
  };

  const generateDataKey = () => {
    const usersStr = localStorage.getItem(CACHE_USERS);
    const data = {
      users: usersStr ? JSON.parse(usersStr) : [],
      records: records,
      v: '25',
      exportDate: new Date().toISOString(),
      sender: user?.name
    };
    const key = JSON.stringify(data);
    setGeneratedKey(key);
    return { key, data };
  };

  const handleShareWhatsApp = () => {
    const { key } = generateDataKey();
    const message = `🚀 *Sincronização de HE - ${user?.name}*\n\nEstou enviando meus registros atualizados.\nTotal: ${records.length} lançamentos.\n\n*CÓDIGO DE IMPORTAÇÃO (COPIE TUDO):*\n${key}`;
    
    if (key.length > 3500) {
      alert("Seu histórico é muito grande para o link direto. Clique em 'COPIAR CÓDIGO' e cole manualmente no WhatsApp do Supervisor.");
      return;
    }
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const { key } = generateDataKey();
    const subject = `Horas Extras - Sincronização v25 - ${user?.name}`;
    const body = `Olá,\n\nSegue o código de sincronização dos meus registros de horas extras:\n\n${key}\n\nAtenciosamente,\n${user?.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const pushToCloud = async (updated: OvertimeRecord[]) => {
    setIsSyncing(true);
    try {
      await SyncService.saveRecords(updated);
      setLastSync(new Date().toLocaleTimeString());
    } catch {} finally { setIsSyncing(false); }
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
    await pushToCloud(updated);
  };

  const handleUpdateStatus = async (id: string, s: OvertimeStatus) => {
    const updated = records.map(r => r.id === id ? {...r, status: s} : r);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Deseja excluir permanentemente?')) return;
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
    await pushToCloud(updated);
  };

  if (!user) return <AuthSystem onLogin={u => { setUser(u); sessionStorage.setItem('logged_user', JSON.stringify(u)); }} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Fixo */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[100] shadow-2xl flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-500/20">HE</div>
          <div>
            <p className="text-xs font-black tracking-tight leading-none">{user.name}</p>
            <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
               v25 • {lastSync ? `Sinc: ${lastSync}` : 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => { generateDataKey(); setShowSyncModal(true); }} 
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-[10px] font-black uppercase tracking-tighter"
          >
            <i className="fa-solid fa-share-nodes"></i>
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button onClick={() => { sessionStorage.clear(); setUser(null); }} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center border border-red-500/10 active:scale-90 transition-transform">
            <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
      </header>

      {/* Modal de Compartilhamento Inteligente */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900">Sincronização v25</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Contorne o Firewall da Empresa</p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">📤 Enviar meus lançamentos</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all">
                    <i className="fa-brands fa-whatsapp text-2xl"></i>
                    <span className="text-[9px] font-black uppercase">Via WhatsApp</span>
                  </button>
                  <button onClick={handleShareEmail} className="flex flex-col items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 hover:bg-blue-100 transition-all">
                    <i className="fa-solid fa-envelope text-2xl"></i>
                    <span className="text-[9px] font-black uppercase">Via E-mail</span>
                  </button>
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(generatedKey); alert('Código Copiado!'); }}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-copy"></i> Apenas Copiar Código
                </button>
              </div>

              <div className="h-px bg-slate-100"></div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">📥 Receber dados de equipe</h4>
                <p className="text-[9px] text-slate-400 font-bold">Cole aqui o código que você recebeu do seu colaborador:</p>
                <textarea 
                  value={syncInput}
                  onChange={e => setSyncInput(e.target.value)}
                  placeholder="Cole o código JSON aqui..."
                  className="w-full h-24 bg-slate-50 border border-slate-200 p-3 text-[9px] font-mono rounded-xl focus:border-purple-500 outline-none"
                />
                <button 
                  onClick={() => { try { handleDataImport(JSON.parse(syncInput)); } catch { alert('Código Inválido!'); } }}
                  disabled={!syncInput}
                  className="w-full bg-purple-600 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-500/20 uppercase text-[10px] tracking-widest disabled:opacity-50"
                >
                  Processar e Sincronizar
                </button>
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
          {user.role !== 'EMPLOYEE' && <DashboardStats records={records} />}
          <div className="bg-white rounded-3xl p-1 border border-slate-200 shadow-sm">
            <OvertimeList 
              records={records} 
              onDelete={handleDeleteRecord} 
              onUpdateStatus={handleUpdateStatus} 
              currentUser={user} 
              onEdit={()=>{}} 
            />
          </div>
        </div>
      </main>

      {/* Botão Flutuante de Ajuda de Sincronização */}
      <button 
        onClick={() => { generateDataKey(); setShowSyncModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-xl z-[90] active:scale-90 transition-transform lg:hidden"
      >
        <i className="fa-solid fa-sync"></i>
      </button>
    </div>
  );
};

export default App;
