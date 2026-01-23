
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

  // Versão do Cache Local
  const CACHE_KEY = 'users_v17_final';

  useEffect(() => {
    // Limpa caches de versões que deram erro (v15, v16) para começar limpo
    localStorage.removeItem('users_v16');
    localStorage.removeItem('users_backup_v15');
    
    syncDatabase();
  }, []);

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    const localRaw = localStorage.getItem(CACHE_KEY);
    const localUsers: User[] = localRaw ? JSON.parse(localRaw) : [];

    try {
      const remoteUsers = await SyncService.getUsers();
      
      // Merge: Garante que usuários novos locais não sumam, e remotos sejam baixados
      const userMap = new Map<string, User>();
      remoteUsers.forEach(u => userMap.set(u.username, u));
      localUsers.forEach(u => { if (!userMap.has(u.username)) userMap.set(u.username, u); });
      
      const merged = Array.from(userMap.values());
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      setCloudStatus('ONLINE');
      return merged;
    } catch (err) {
      setCloudStatus('OFFLINE');
      return localUsers;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setError('');
    setIsProcessing(true);
    const cleanUsername = username.toLowerCase().trim();

    try {
      // Força uma sincronia antes de tentar logar/cadastrar
      const allUsers = await syncDatabase();

      if (isRegistering) {
        if (allUsers.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe.');
          setIsProcessing(false);
          return;
        }
        
        const finalName = role === 'COORDINATOR' ? COORDINATOR_NAME : name;
        if (!finalName) {
          setError('Selecione seu nome na lista.');
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
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedUsers));
        
        const success = await SyncService.saveUsers(updatedUsers);
        if (!success) {
          setError('Erro de Nuvem: O cadastro foi feito apenas no seu aparelho. O computador não o verá até que o ícone fique verde.');
          // Mesmo sem nuvem, permitimos entrar no aparelho local
        }
        
        onLogin(newUser);
      } else {
        const user = allUsers.find(u => u.username === cleanUsername && u.password === password.trim());
        if (user) {
          onLogin(user);
        } else {
          // Se não achou localmente, tenta um "fetch" de última hora
          const freshRemote = await SyncService.getUsers();
          const freshUser = freshRemote.find(u => u.username === cleanUsername && u.password === password.trim());
          
          if (freshUser) {
            onLogin(freshUser);
          } else {
            setError(cloudStatus === 'OFFLINE' ? 'Usuário não encontrado (Sem conexão com a nuvem)' : 'Usuário ou senha incorretos.');
          }
        }
      }
    } catch (err) {
      setError('Erro ao processar. Verifique sua conexão.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        <div className="absolute top-8 right-8">
           <button 
             type="button"
             onClick={() => syncDatabase()}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${
               cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               cloudStatus === 'OFFLINE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}
           >
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : cloudStatus === 'ONLINE' ? 'fa-cloud' : 'fa-cloud-slash'}`}></i>
             {cloudStatus}
           </button>
        </div>

        <div className="text-center mb-10 pt-4">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-white text-4xl mb-6 shadow-2xl shadow-blue-600/20">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 leading-none">Portal Overtime</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3 italic">Ailton Souza • v17 Final Fix</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-[11px] font-bold border border-amber-200 text-center animate-shake">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Usuário de Acesso</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:border-blue-500 transition-all placeholder:text-slate-300"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: jose.silva"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:border-blue-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-5 pt-4 border-t border-slate-100 mt-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Perfil</label>
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
                    <option value="">-- Selecione seu nome --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Defina o Supervisor abaixo</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-4">Supervisor Direto</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none font-bold text-blue-700 focus:border-blue-600 transition-all" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Escolher --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase mt-4 flex items-center justify-center gap-3">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Criar Minha Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center pt-4 border-t border-slate-50">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 p-2 transition-colors">
            {isRegistering ? 'Já sou cadastrado' : 'Novo usuário? Cadastre-se agora'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AuthSystem;
