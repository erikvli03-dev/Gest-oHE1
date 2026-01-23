
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

  // Função para mesclar listas de usuários sem perder dados locais
  const mergeUsers = (local: User[], remote: User[]): User[] => {
    const userMap = new Map<string, User>();
    // Primeiro adicionamos os remotos
    remote.forEach(u => userMap.set(u.username, u));
    // Depois os locais (locais ganham se forem mais novos/estiverem apenas aqui)
    local.forEach(u => {
      if (!userMap.has(u.username)) {
        userMap.set(u.username, u);
      }
    });
    return Array.from(userMap.values());
  };

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    const localRaw = localStorage.getItem('users_backup_v15');
    const localUsers: User[] = localRaw ? JSON.parse(localRaw) : [];

    try {
      const remoteUsers = await SyncService.getUsers();
      const merged = mergeUsers(localUsers, remoteUsers);
      
      localStorage.setItem('users_backup_v15', JSON.stringify(merged));
      setCloudStatus('ONLINE');
      return merged;
    } catch (err) {
      setCloudStatus('OFFLINE');
      return localUsers;
    }
  };

  useEffect(() => {
    syncDatabase();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setError('');
    setIsProcessing(true);

    const cleanUsername = username.toLowerCase().trim();

    try {
      // Sempre sincroniza antes de qualquer ação
      const allUsers: User[] = await syncDatabase();

      if (isRegistering) {
        if (allUsers.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe.');
          setIsProcessing(false);
          return;
        }
        
        const finalName = role === 'COORDINATOR' ? COORDINATOR_NAME : name;
        if (!finalName) {
          setError('Selecione seu nome.');
          setIsProcessing(false);
          return;
        }

        const newUser: User = { 
          username: cleanUsername, 
          password: password.trim(), 
          name: finalName, 
          role,
          supervisorName: role === 'EMPLOYEE' ? selectedSup : undefined
        };
        
        const updatedUsers = [...allUsers, newUser];
        
        // 1. Salva local imediatamente
        localStorage.setItem('users_backup_v15', JSON.stringify(updatedUsers));
        
        // 2. Tenta salvar na nuvem e espera um pouco mais
        try {
          const success = await SyncService.saveUsers(updatedUsers);
          if (!success) throw new Error("Cloud save failed");
          setCloudStatus('ONLINE');
        } catch {
          console.warn("User saved locally only. Sync will happen later.");
          setCloudStatus('OFFLINE');
        }
        
        onLogin(newUser);
      } else {
        const user = allUsers.find(u => u.username === cleanUsername && u.password === password.trim());
        if (user) {
          onLogin(user);
        } else {
          // Tenta uma última busca na nuvem se não achou localmente
          setCloudStatus('SYNCING');
          try {
            const freshRemote = await SyncService.getUsers();
            const freshMerged = mergeUsers(allUsers, freshRemote);
            localStorage.setItem('users_backup_v15', JSON.stringify(freshMerged));
            const freshUser = freshMerged.find(u => u.username === cleanUsername && u.password === password.trim());
            
            if (freshUser) {
              onLogin(freshUser);
            } else {
              setError('Usuário ou senha incorretos.');
            }
          } catch {
            setError('Usuário ou senha incorretos (Offline).');
          }
        }
      }
    } catch (err) {
      setError('Erro de sistema. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        <div className="absolute top-6 right-8">
           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border transition-all shadow-sm ${
             cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
             cloudStatus === 'OFFLINE' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
           }`}>
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : 'fa-circle-check'}`}></i>
             {cloudStatus}
           </div>
        </div>

        <div className="text-center mb-8 pt-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl mb-6 shadow-2xl transform -rotate-3">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Overtime</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-3 italic">Ailton Souza • v15 Final Fix</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center animate-shake">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-3">Nome de Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              autoComplete="username"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: joao.silva"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-3">Senha de Acesso</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              autoComplete="current-password"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-5 pt-4 border-t border-slate-100 mt-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3">Ocupação / Cargo</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3">Seu Nome Completo</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecionar na Lista --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Defina o Supervisor abaixo primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-3">Seu Supervisor Direto</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none font-bold text-blue-700 focus:border-blue-600 transition-all" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Escolher Supervisor --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.97] transition-all text-xs tracking-[0.2em] uppercase mt-6 flex items-center justify-center gap-3">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Cadastrar Agora' : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-50 pt-6">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 p-2 transition-colors">
            {isRegistering ? 'Já tem conta? Clique para Entrar' : 'Novo por aqui? Crie sua Conta'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AuthSystem;
