
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

  const mergeUsers = (local: User[], remote: User[]): User[] => {
    const userMap = new Map<string, User>();
    remote.forEach(u => userMap.set(u.username, u));
    local.forEach(u => {
      if (!userMap.has(u.username)) userMap.set(u.username, u);
    });
    return Array.from(userMap.values());
  };

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    const localRaw = localStorage.getItem('users_v16');
    const localUsers: User[] = localRaw ? JSON.parse(localRaw) : [];

    try {
      const remoteUsers = await SyncService.getUsers();
      const merged = mergeUsers(localUsers, remoteUsers);
      localStorage.setItem('users_v16', JSON.stringify(merged));
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
      // 1. Tenta buscar a lista mais recente do servidor
      let allUsers: User[] = [];
      try {
        allUsers = await syncDatabase();
      } catch {
        // Se falhar a sincronia, usa o que tem local
        const cached = localStorage.getItem('users_v16');
        allUsers = cached ? JSON.parse(cached) : [];
      }

      if (isRegistering) {
        if (allUsers.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe no sistema.');
          setIsProcessing(false);
          return;
        }
        
        const finalName = role === 'COORDINATOR' ? COORDINATOR_NAME : name;
        if (!finalName) {
          setError('Por favor, selecione seu nome.');
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
        localStorage.setItem('users_v16', JSON.stringify(updatedUsers));
        
        // No cadastro, FORÇAMOS o envio antes de entrar
        const success = await SyncService.saveUsers(updatedUsers);
        if (!success) {
          // Se não salvou na nuvem, o PC não vai ver. Avisamos o usuário.
          setError('Não foi possível salvar na nuvem. Verifique sua internet no celular.');
          setIsProcessing(false);
          return;
        }
        
        onLogin(newUser);
      } else {
        // LOGIN
        const user = allUsers.find(u => u.username === cleanUsername && u.password === password.trim());
        
        if (user) {
          onLogin(user);
        } else {
          // Se não achou, faz uma última tentativa desesperada de buscar na nuvem agora
          setCloudStatus('SYNCING');
          try {
            const freshRemote = await SyncService.getUsers();
            const freshUser = freshRemote.find(u => u.username === cleanUsername && u.password === password.trim());
            if (freshUser) {
              const merged = mergeUsers(allUsers, freshRemote);
              localStorage.setItem('users_v16', JSON.stringify(merged));
              onLogin(freshUser);
            } else {
              setError('Usuário ou senha incorretos.');
            }
          } catch {
            setError('Sem conexão com o servidor. O computador está Offline.');
          }
        }
      }
    } catch (err) {
      setError('Erro crítico de sistema. Tente recarregar.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        {/* Status da Nuvem */}
        <div className="absolute top-8 right-8">
           <button 
             onClick={() => syncDatabase()}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black border transition-all ${
               cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               cloudStatus === 'OFFLINE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}
           >
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : cloudStatus === 'ONLINE' ? 'fa-cloud' : 'fa-cloud-slash'}`}></i>
             {cloudStatus === 'OFFLINE' ? 'RECONECTAR' : cloudStatus}
           </button>
        </div>

        <div className="text-center mb-8 mt-4">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-white text-4xl mb-6 shadow-2xl shadow-blue-500/30">
            <i className="fa-solid fa-id-card-clip"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 leading-none tracking-tight">Portal Overtime</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3 italic">Versão v16 Anti-Bloqueio</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-[11px] font-bold border border-red-100 text-center animate-pulse">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nome.sobrenome"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-5 pt-4 border-t border-slate-100 mt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Cargo</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nome Completo</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecione na Lista --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-4">Seu Supervisor</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none font-bold text-blue-700" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Escolher --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase mt-4 flex items-center justify-center gap-3">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Criar Cadastro' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center pt-4 border-t border-slate-50">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 p-2 transition-colors">
            {isRegistering ? 'Já possui conta? Login' : 'Novo usuário? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
