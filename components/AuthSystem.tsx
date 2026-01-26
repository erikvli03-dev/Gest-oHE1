
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
  
  const CACHE_KEY = 'users_v30_local';
  const APP_VERSION = "v46.0.0-final"; 

  useEffect(() => {
    if (isRegistering && role === 'COORDINATOR') {
      setName(COORDINATOR_NAME);
    }
  }, [role, isRegistering]);

  const getLocalUsers = (): User[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setError('');
    setIsProcessing(true);
    
    const cleanUser = username.toLowerCase().trim();
    const cleanPass = password.trim();
    const localUsers = getLocalUsers();

    const localMatch = localUsers.find(u => u.username === cleanUser && u.password === cleanPass);
    if (localMatch) {
      onLogin(localMatch);
      setIsProcessing(false);
      return;
    }

    try {
      let allUsers = localUsers;
      if (SyncService.isCloudReady()) {
        const cloudUsers = await SyncService.getUsers();
        if (cloudUsers && cloudUsers.length > 0) allUsers = cloudUsers;
      }

      if (isRegistering) {
        if (allUsers.some((u: User) => u.username === cleanUser)) {
          setError('USER_EXISTS');
          setIsProcessing(false);
          return;
        }
        
        const newUser: User = { 
          username: cleanUser, 
          password: cleanPass, 
          name: name || cleanUser, 
          role,
          supervisorName: role === 'EMPLOYEE' ? selectedSup : undefined
        };
        
        const updated = [...allUsers, newUser];
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        SyncService.saveUsers(updated).catch(() => {}); 
        onLogin(newUser);
      } else {
        const user = allUsers.find((u: User) => u.username === cleanUser && u.password === cleanPass);
        if (user) {
          localStorage.setItem(CACHE_KEY, JSON.stringify([...localUsers.filter(u => u.username !== user.username), user]));
          onLogin(user);
        } else {
          setError('Usuário ou senha incorretos.');
        }
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 shadow-xl">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gestão de HE FIPS</h2>
          <span className="text-[9px] font-mono text-slate-300 mt-1 uppercase tracking-widest">{APP_VERSION}</span>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error === 'USER_EXISTS' ? (
            <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-200 text-center space-y-3">
              <i className="fa-solid fa-circle-exclamation text-amber-500 text-2xl"></i>
              <p className="text-xs font-black text-amber-900 uppercase">Este usuário já possui cadastro!</p>
              <button 
                type="button" 
                onClick={() => { setIsRegistering(false); setError(''); }}
                className="w-full bg-amber-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Ir para Tela de Login
              </button>
            </div>
          ) : error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center">{error}</div>
          )}
          
          {isRegistering && error !== 'USER_EXISTS' && (
            <div className="space-y-3 mb-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
              <select 
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" 
                value={role} 
                onChange={e => setRole(e.target.value as UserRole)}
              >
                <option value="EMPLOYEE">Colaborador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="COORDINATOR">Coordenador</option>
              </select>

              {role === 'EMPLOYEE' && (
                <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-800 outline-none" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                  <option value="">Quem é seu Supervisor?</option>
                  {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <select 
                required 
                disabled={role === 'COORDINATOR'}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none disabled:bg-slate-100 disabled:text-slate-400" 
                value={name} 
                onChange={e => setName(e.target.value)}
              >
                <option value="">Seu Nome Oficial...</option>
                {role === 'COORDINATOR' && <option value={COORDINATOR_NAME}>{COORDINATOR_NAME}</option>}
                {role === 'SUPERVISOR' && SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                {role === 'EMPLOYEE' && (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)}
              </select>
            </div>
          )}

          {error !== 'USER_EXISTS' && (
            <>
              <div className="space-y-3">
                <input required disabled={isProcessing} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500" value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuário (ex:ailton.souza)" />
                <input required type="password" disabled={isProcessing} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" />
              </div>

              <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all mt-4">
                {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
                {isRegistering ? 'Criar Minha Conta' : 'Acessar App'}
              </button>
              
              <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="w-full text-[10px] text-blue-600 font-black uppercase tracking-widest mt-4">
                {isRegistering ? 'Já tenho conta? Fazer Login' : 'Novo por aqui? Criar Cadastro'}
              </button>
            </>
          )}
          
          <button type="button" onClick={() => { if(confirm('Limpar cache?')) { localStorage.clear(); window.location.reload(); } }} className="w-full text-[9px] text-slate-300 font-bold uppercase mt-8 opacity-50">
            Resetar App
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthSystem;
