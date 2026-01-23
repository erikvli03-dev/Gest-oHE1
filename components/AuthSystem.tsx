
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
  const [userCount, setUserCount] = useState(0);

  const CACHE_KEY = 'users_v20_cache';

  useEffect(() => {
    syncDatabase();
  }, []);

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    setError('');
    try {
      const remoteUsers = await SyncService.getUsers();
      localStorage.setItem(CACHE_KEY, JSON.stringify(remoteUsers));
      setUserCount(remoteUsers.length);
      setCloudStatus('ONLINE');
      return remoteUsers;
    } catch (err: any) {
      setCloudStatus('OFFLINE');
      const cached = localStorage.getItem(CACHE_KEY);
      const data = cached ? JSON.parse(cached) : [];
      setUserCount(data.length);
      return data;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setError('');
    setIsProcessing(true);
    const cleanUsername = username.toLowerCase().trim();

    try {
      // Tenta sempre sincronizar antes de validar
      const allUsers = await syncDatabase();

      if (isRegistering) {
        if (allUsers.some((u: any) => u.username === cleanUsername)) {
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
          setError('O celular não conseguiu salvar. Tente o 4G/5G.');
          setIsProcessing(false);
        }
      } else {
        // Lógica de LOGIN
        if (cloudStatus === 'OFFLINE') {
          setError('BLOQUEIO DE REDE: O computador não consegue ver quem está na nuvem. Verifique o Wi-Fi ou Firewall.');
          setIsProcessing(false);
          return;
        }

        const user = allUsers.find((u: any) => u.username === cleanUsername && u.password === password.trim());
        
        if (user) {
          onLogin(user);
        } else {
          setError('Dados incorretos ou usuário ainda não sincronizou do celular.');
        }
      }
    } catch (err) {
      setError('Falha de conexão com o servidor de dados.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        <div className="absolute top-8 right-8">
           <button 
             onClick={() => syncDatabase()}
             className={`flex items-center gap-2 px-3 py-2 rounded-full text-[9px] font-black border transition-all ${
               cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               cloudStatus === 'OFFLINE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}
           >
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : cloudStatus === 'ONLINE' ? 'fa-check-circle' : 'fa-triangle-exclamation'}`}></i>
             {cloudStatus === 'OFFLINE' ? 'RECONECTAR' : `${userCount} USUÁRIOS`}
           </button>
        </div>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl mb-4 shadow-2xl shadow-slate-900/20">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Acesso Seguro</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Versão v20 • Estabilidade Total</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-[10px] font-bold border border-red-100 text-center animate-bounce">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Usuário do Sistema</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              autoComplete="username"
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: erik.salvador"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Senha de Acesso</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              autoComplete="current-password"
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-4 pt-4 border-t border-slate-100 mt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Cargo</label>
                <select className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Seu Nome Oficial</label>
                  <select required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecione seu nome --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-4">Seu Supervisor</label>
                  <select required className="w-full p-5 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-800 outline-none" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Escolher Supervisor --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing || (cloudStatus !== 'ONLINE' && !isRegistering)} 
            className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl shadow-2xl active:scale-95 transition-all text-[11px] tracking-widest uppercase mt-4 flex items-center justify-center gap-4 disabled:bg-slate-300 disabled:shadow-none"
          >
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-shield-check"></i>}
            {isRegistering ? 'Criar Conta Agora' : cloudStatus === 'ONLINE' ? 'Entrar no Painel' : 'Aguardando Conexão...'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
            className="text-[10px] text-slate-400 font-black uppercase hover:text-slate-900 transition-colors tracking-tighter"
          >
            {isRegistering ? 'Já tenho acesso? Voltar ao login' : 'Não tem conta? Cadastrar no Celular'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
