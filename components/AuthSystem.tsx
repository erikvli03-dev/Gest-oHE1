
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

  const CACHE_KEY = 'users_v21_final';

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
      // Tenta atualizar a lista da nuvem antes de qualquer ação
      const allUsers = await syncDatabase();

      if (isRegistering) {
        if (allUsers.some((u: any) => u.username === cleanUsername)) {
          setError('Este usuário já existe no sistema.');
          setIsProcessing(false);
          return;
        }
        
        const finalName = role === 'COORDINATOR' ? COORDINATOR_NAME : name;
        if (!finalName) {
          setError('Por favor, selecione seu nome na lista.');
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
          setError('ERRO DE REDE: O celular não conseguiu enviar os dados para a nuvem. Tente usar os dados móveis (4G/5G) em vez do Wi-Fi.');
          setIsProcessing(false);
        }
      } else {
        // Lógica de LOGIN - Só permite se estiver ONLINE ou tiver cache
        if (cloudStatus === 'OFFLINE' && allUsers.length === 0) {
          setError('ERRO DE CONEXÃO: O computador está sem acesso ao servidor de usuários. Verifique se o firewall bloqueia o site kvdb.io.');
          setIsProcessing(false);
          return;
        }

        const user = allUsers.find((u: any) => u.username === cleanUsername && u.password === password.trim());
        
        if (user) {
          onLogin(user);
        } else {
          if (cloudStatus === 'OFFLINE') {
            setError('OFFLINE: Não foi possível validar sua senha na nuvem agora.');
          } else {
            setError('Usuário ou senha incorretos. Verifique se você já criou a conta no celular nesta versão (v21).');
          }
        }
      }
    } catch (err) {
      setError('Falha técnica de comunicação. Tente novamente em alguns instantes.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        {/* Status da Nuvem */}
        <div className="absolute top-6 right-6">
           <button 
             onClick={() => syncDatabase()}
             disabled={isProcessing}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black border transition-all ${
               cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               cloudStatus === 'OFFLINE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}
           >
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : cloudStatus === 'ONLINE' ? 'fa-cloud' : 'fa-plug-circle-xmark'}`}></i>
             {cloudStatus === 'OFFLINE' ? 'RECONECTAR' : `${userCount} REGISTROS`}
           </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl mb-4 shadow-xl shadow-blue-500/30">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Portal de Acesso</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Versão v21 • Canal de Segurança</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center animate-pulse">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-3">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:border-blue-500 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: erik.salvador"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-3">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:border-blue-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-4 pt-4 border-t border-slate-100 mt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-3">Seu Cargo</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-3">Nome na Lista</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none" value={name} onChange={e => setName(e.target.value)}>
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
                  <label className="text-[9px] font-black text-blue-600 uppercase ml-3">Supervisor Direto</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-800 outline-none" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Escolher --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing} 
            className="w-full bg-slate-900 text-white font-black py-5 rounded-xl shadow-xl active:scale-95 transition-all text-[10px] tracking-widest uppercase mt-4 flex items-center justify-center gap-3"
          >
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-circle-check"></i>}
            {isRegistering ? 'Confirmar Cadastro' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
            className="text-[10px] text-slate-400 font-black uppercase hover:text-blue-600 transition-colors"
          >
            {isRegistering ? 'Já tem conta? Voltar ao login' : 'Não tem conta? Clique para criar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
