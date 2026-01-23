
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

  const CACHE_KEY = 'users_v19_cache';

  useEffect(() => {
    // Limpa versões antigas para garantir que o computador busque do zero
    localStorage.removeItem('users_v18_final');
    syncDatabase();
  }, []);

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    setError('');
    try {
      const remoteUsers = await SyncService.getUsers();
      localStorage.setItem(CACHE_KEY, JSON.stringify(remoteUsers));
      setCloudStatus('ONLINE');
      return remoteUsers;
    } catch (err) {
      setCloudStatus('OFFLINE');
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setError('');
    setIsProcessing(true);
    const cleanUsername = username.toLowerCase().trim();

    try {
      // Força uma tentativa de conexão no momento do clique
      const allUsers = await syncDatabase();

      if (isRegistering) {
        if (allUsers.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe na nuvem.');
          setIsProcessing(false);
          return;
        }
        
        const finalName = role === 'COORDINATOR' ? COORDINATOR_NAME : name;
        if (!finalName) {
          setError('Selecione um nome na lista.');
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
        const success = await SyncService.saveUsers(updatedUsers);
        
        if (success) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(updatedUsers));
          onLogin(newUser);
        } else {
          setError('O celular não conseguiu gravar na nuvem. Verifique se o kvdb.io não está bloqueado.');
          setIsProcessing(false);
        }
      } else {
        const user = allUsers.find(u => u.username === cleanUsername && u.password === password.trim());
        
        if (user) {
          onLogin(user);
        } else {
          if (cloudStatus === 'OFFLINE') {
            setError('Computador OFFLINE: A rede do computador bloqueou o acesso ao banco de dados. Tente usar o roteador do celular ou desativar o AdBlocker.');
          } else {
            setError('Usuário ou senha incorretos. Verifique se digitou exatamente como no celular.');
          }
        }
      }
    } catch (err) {
      setError('Erro crítico de rede. O computador não consegue falar com o servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        <div className="absolute top-8 right-8">
           <button 
             onClick={() => syncDatabase()}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black border transition-all hover:scale-105 active:scale-95 ${
               cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               cloudStatus === 'OFFLINE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}
           >
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : cloudStatus === 'ONLINE' ? 'fa-cloud' : 'fa-triangle-exclamation'}`}></i>
             {cloudStatus === 'OFFLINE' ? 'TENTAR RECONECTAR' : cloudStatus}
           </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl mb-4 shadow-xl shadow-blue-500/20">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Portal de Horas</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Versão v19 • Bypass Ativo</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center animate-shake">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:border-blue-600 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: ailton.souza"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:border-blue-600 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-4 pt-4 border-t border-slate-100 mt-2 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Cargo</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Seu Nome na Lista</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecionar --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-500 uppercase ml-2">Supervisor</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl outline-none font-bold text-blue-700" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Escolher --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-5 rounded-xl shadow-lg active:scale-95 transition-all text-[10px] tracking-widest uppercase mt-4 flex items-center justify-center gap-3 shadow-blue-600/20">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Cadastrar agora' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] text-slate-400 font-black uppercase hover:text-blue-600 transition-colors tracking-tighter">
            {isRegistering ? 'Já tenho uma conta' : 'Ainda não tem conta? Clique aqui'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AuthSystem;
