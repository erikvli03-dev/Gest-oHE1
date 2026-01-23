
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { COORDINATOR_NAME, SUPERVISORS, EMPLOYEE_HIERARCHY } from '../constants';
import { SyncService } from '../services/syncService';

interface AuthSystemProps {
  onLogin: (user: User) => void;
}

const AuthSystem: React.FC<AuthSystemProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [selectedSup, setSelectedSup] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'SYNCING' | 'ONLINE' | 'OFFLINE'>('SYNCING');
  const [showRescue, setShowRescue] = useState(false);
  const [rescueText, setRescueText] = useState('');

  const CACHE_KEY = 'users_v25_local';

  useEffect(() => {
    syncDatabase();
  }, []);

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    try {
      const remoteUsers = await SyncService.getUsers();
      if (remoteUsers && Array.isArray(remoteUsers)) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(remoteUsers));
        setCloudStatus('ONLINE');
        return remoteUsers;
      }
      throw new Error("Invalid data");
    } catch (err: any) {
      setCloudStatus('OFFLINE');
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
      } catch { return []; }
    }
  };

  const handleManualImport = () => {
    try {
      const data = JSON.parse(rescueText);
      if (data.users) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.users));
        if (data.records) localStorage.setItem('overtime_v25_recs', JSON.stringify(data.records));
        alert('Dados da equipe importados! Tente logar agora.');
        setShowRescue(false);
        setRescueText('');
        syncDatabase();
      }
    } catch {
      alert('Código inválido! Tente copiar novamente.');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setError('');
    setIsProcessing(true);
    
    const cleanUser = username.toLowerCase().trim();
    const cleanPass = password.trim();

    try {
      const allUsers = await syncDatabase();

      if (isRegistering) {
        if (allUsers.some((u: any) => u.username === cleanUser)) {
          setError('Usuário já existe.');
          setIsProcessing(false);
          return;
        }
        
        const newUser: User = { 
          username: cleanUser, 
          password: cleanPass, 
          name: role === 'COORDINATOR' ? COORDINATOR_NAME : name, 
          role,
          supervisorName: role === 'EMPLOYEE' ? selectedSup : undefined
        };
        
        const updated = [...allUsers, newUser];
        const success = await SyncService.saveUsers(updated);
        
        if (success) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          onLogin(newUser);
        } else {
          setError('ERRO DE REDE: Não foi possível salvar na nuvem. Use o 4G para registrar pela primeira vez.');
        }
      } else {
        const user = allUsers.find((u: any) => u.username === cleanUser && u.password === cleanPass);
        if (user) {
          onLogin(user);
        } else {
          setError(allUsers.length === 0 ? 'Sistema Offline e sem dados. Importe o código gerado no celular.' : 'Usuário ou senha incorretos.');
        }
      }
    } catch (err) {
      setError('Falha crítica de conexão.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 relative">
        
        <div className="absolute top-6 right-6">
           <div className={`w-3 h-3 rounded-full ${cloudStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gestão HE v25</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">
            {cloudStatus === 'OFFLINE' ? '🔴 Rede Corporativa Protegida' : '🔵 Conexão Nuvem Ativa'}
          </p>
        </div>

        {showRescue ? (
          <div className="space-y-4">
            <textarea 
              className="w-full h-32 p-4 bg-slate-50 border rounded-2xl text-[9px] font-mono outline-none focus:border-blue-500"
              placeholder="Cole aqui o código de sincronização..."
              value={rescueText}
              onChange={e => setRescueText(e.target.value)}
            />
            <button onClick={handleManualImport} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest">Importar Dados</button>
            <button onClick={() => setShowRescue(false)} className="w-full py-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">Cancelar</button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center">{error}</div>}
            
            <input 
              required 
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Usuário (ex: nome.sobrenome)"
            />
            
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha"
            />

            {isRegistering && (
              <div className="space-y-3 pt-3 border-t">
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
                {role !== 'COORDINATOR' && (
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">Escolha seu nome...</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor abaixo</option>)
                    }
                  </select>
                )}
                {role === 'EMPLOYEE' && (
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-800" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">Quem é seu Supervisor?</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            )}

            <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
              {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
              {isRegistering ? 'Criar minha Conta' : 'Entrar Agora'}
            </button>
            
            <div className="flex flex-col gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                {isRegistering ? 'Já tenho conta, fazer login' : 'Primeiro acesso? Cadastre-se aqui'}
              </button>
              {cloudStatus === 'OFFLINE' && (
                <button type="button" onClick={() => setShowRescue(true)} className="text-[9px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 py-3 rounded-lg border border-blue-100">
                  <i className="fa-solid fa-key mr-2"></i> Importar dados do Celular
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthSystem;
