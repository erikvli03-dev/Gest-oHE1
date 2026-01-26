import React, { useState, useEffect, useCallback } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from './types';
import OvertimeForm from './components/OvertimeForm';
import OvertimeList from './components/OvertimeList';
import DashboardStats from './components/DashboardStats';
import AuthSystem from './components/AuthSystem';
import PasswordModal from './components/PasswordModal';
import { calculateDuration } from './utils/timeUtils';
import { SyncService } from './services/syncService';
import { analyzeOvertimeTrends } from './services/geminiService';

const App: React.FC = () => {
  const CACHE_RECS = 'overtime_v37_recs';
  
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('logged_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [lastSyncInfo, setLastSyncInfo] = useState<string>('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => localStorage.getItem('google_sheet_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Função para sincronizar dados e configuração
  const forceSync = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsSyncing(true);
    try {
      // 1. Busca a URL da planilha configurada na nuvem
      const cloudConfig = await SyncService.getConfig();
      if (cloudConfig?.googleSheetUrl) {
        setGoogleSheetUrl(cloudConfig.googleSheetUrl);
        // localStorage já é atualizado dentro do SyncService.getConfig()
      }

      // 2. Busca os registros
      const cloudRecords = await SyncService.getRecords();
      if (cloudRecords !== null) {
        setRecords(cloudRecords);
        localStorage.setItem(CACHE_RECS, JSON.stringify(cloudRecords));
        setLastSyncInfo(`${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} OK`);
      }
    } catch (e) { 
      console.warn("Sincronização falhou"); 
    } finally { 
      setIsSyncing(false); 
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_RECS);
      if (cached) setRecords(JSON.parse(cached));
      
      // Sincroniza imediatamente ao logar
      forceSync();
      
      // Auto-sync a cada 30 segundos
      const interval = setInterval(() => forceSync(true), 30000);
      return () => clearInterval(interval);
    }
  }, [user?.username, forceSync]);

  const handleAddOrEditRecord = async (data: any) => {
    const duration = calculateDuration(data.startDate, data.startTime, data.endDate, data.endTime);
    
    const newRecord: OvertimeRecord = {
      ...data,
      id: editingRecord ? editingRecord.id : `r_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: editingRecord ? editingRecord.createdAt : Date.now(),
      durationMinutes: duration,
      ownerUsername: user!.username,
      status: 'REGISTERED' as OvertimeStatus
    };

    try {
      // Primeiro tenta enviar para a planilha
      const sent = await SyncService.pushToGoogleSheet(newRecord, editingRecord ? 'UPDATE' : 'INSERT');
      
      const updatedList = editingRecord 
        ? records.map(r => r.id === editingRecord.id ? newRecord : r)
        : [newRecord, ...records];
      
      setRecords(updatedList);
      localStorage.setItem(CACHE_RECS, JSON.stringify(updatedList));
      await SyncService.saveRecords(updatedList);
      setEditingRecord(null);

      if (sent) {
        alert("Lançamento concluído com sucesso!");
      } else {
        alert("Lançamento salvo no app, mas houve falha ao enviar para a planilha. Verifique a URL do Script nas configurações.");
      }
    } catch (err) { 
      console.error(err);
      alert("Erro ao processar lançamento."); 
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Excluir este registro permanentemente?')) return;
    try {
      const record = records.find(r => r.id === id);
      if (record) await SyncService.pushToGoogleSheet(record, 'DELETE');
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      localStorage.setItem(CACHE_RECS, JSON.stringify(updated));
      await SyncService.saveRecords(updated);
    } catch (e) { 
      alert("Erro ao excluir registro."); 
    }
  };

  if (!user) return <AuthSystem onLogin={u => { setUser(u); sessionStorage.setItem('logged_user', JSON.stringify(u)); }} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[100] shadow-2xl flex justify-between items-center border-b border-white/5 backdrop-blur-lg bg-slate-900/95">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black shadow-lg text-[10px]">FIPS</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{user.name}</p>
            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {isSyncing ? 'Sincronizando...' : (lastSyncInfo || 'Conectado')}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {user.role === 'COORDINATOR' && (
            <button onClick={async () => { setIsAnalyzing(true); setAiReport(await analyzeOvertimeTrends(records)); setIsAnalyzing(false); }} className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center text-xs shadow-lg">
              {isAnalyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
            </button>
          )}
          <button onClick={() => setShowPasswordModal(true)} title="Alterar Senha" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-xs"><i className="fa-solid fa-user-lock"></i></button>
          {user.role === 'COORDINATOR' && (
            <button onClick={() => setShowSyncModal(true)} title="Configurar Planilha" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-xs"><i className="fa-solid fa-gear"></i></button>
          )}
          <button onClick={() => { sessionStorage.clear(); setUser(null); window.location.reload(); }} className="w-9 h-9 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center text-xs"><i className="fa-solid fa-power-off"></i></button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-6">
        <OvertimeForm onSubmit={handleAddOrEditRecord} initialData={editingRecord} onCancel={editingRecord ? () => setEditingRecord(null) : undefined} currentUser={user} />
        {user.role !== 'EMPLOYEE' && <DashboardStats records={records} />}
        <OvertimeList records={records} onDelete={handleDeleteRecord} onEdit={setEditingRecord} onUpdateStatus={()=>{}} currentUser={user} />
      </main>

      {showPasswordModal && <PasswordModal user={user} onClose={() => setShowPasswordModal(false)} onSuccess={u => { setUser(u); sessionStorage.setItem('logged_user', JSON.stringify(u)); }} />}

      {aiReport && (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] p-6 flex items-center justify-center backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-900 uppercase text-xs">Análise de IA</h3>
              <i className="fa-solid fa-robot text-purple-600"></i>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{aiReport}</div>
            <button onClick={() => setAiReport(null)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase mt-6">Fechar</button>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/95 z-[200] p-4 flex items-center justify-center backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8">
            <h3 className="font-black text-slate-900 uppercase text-xs mb-4">Configuração Mestra</h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">Defina a URL do Script do Google que será usada por todos os colaboradores.</p>
            <input 
              type="text" 
              value={googleSheetUrl} 
              onChange={e => setGoogleSheetUrl(e.target.value)} 
              placeholder="https://script.google.com/macros/s/..." 
              className="w-full p-4 bg-slate-50 border rounded-2xl text-[10px] outline-none mb-4 font-mono focus:ring-2 focus:ring-blue-500" 
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={async () => { 
                await SyncService.saveConfig({googleSheetUrl}); 
                setShowSyncModal(false);
                alert("Configuração salva na nuvem para toda a equipe!"); 
              }} className="bg-blue-600 text-white py-4 rounded-xl font-bold text-[10px] uppercase shadow-lg active:scale-95 transition-all">Salvar Global</button>
              <button onClick={() => setShowSyncModal(false)} className="bg-slate-100 text-slate-500 py-4 rounded-xl font-bold text-[10px] uppercase active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;