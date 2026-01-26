import React, { useState } from 'react';
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

    // v30: Tenta local primeiro de forma agressiva
    const localMatch = localUsers.find(u => u.username === cleanUser && u.password === cleanPass);

    if (!isRegistering && localMatch) {
      onLogin(localMatch);
      setIsProcessing(false);
      return;
    }

    // Se não está no local ou é cadastro, tenta rede sem bloquear
    try {
      let allUsers = localUsers;
      
      if (SyncService.isCloudReady()) {
        const cloudUsers = await SyncService.getUsers();
        if (cloudUsers && cloudUsers.length > 0) allUsers = cloudUsers;
      }

      if (isRegistering) {
        if (allUsers.some((u: User) => u.username === cleanUser)) {
          setError('Usuário já existe.');
          setIsProcessing(false);
          return;
        }
        
        const newUser: User = { 
          username: cleanUser, 
          password: cleanPass, 
          name: role === 'COORDINATOR' ? COORDINATOR_NAME : (name || cleanUser), 
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
          setError('Não foi possível validar seu acesso. Se você for novo, crie uma conta. Se o erro persistir, verifique sua internet.');
        }
      }
    } catch (err) {
      setError('Servidor instável. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 shadow-xl">
            <i className="fa-solid fa-mobile-screen-button"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gestão de HE FIPS</h2>
          <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
            <div className={`w-2 h-2 rounded-full ${SyncService.isCloudReady() ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
              {SyncService.isCloudReady() ? 'Rede Ativa' : 'Modo Offline Ativo'}
            </span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center">{error}</div>}
          
          <input required disabled={isProcessing} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuário" />
          <input required type="password" disabled={isProcessing} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" />

          {isRegistering && (
            <div className="space-y-3 pt-3 border-t">
              <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" value={name} onChange={e => setName(e.target.value)}>
                <option value="">Selecione seu nome...</option>
                {role === 'SUPERVISOR' 
                  ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                  : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)
                }
              </select>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                <option value="EMPLOYEE">Colaborador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="COORDINATOR">Coordenador</option>
              </select>
              {role === 'EMPLOYEE' && (
                <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-800" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                  <option value="">Supervisor?</option>
                  {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Cadastrar' : 'Acessar'}
          </button>
          
          <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-[10px] text-blue-600 font-black uppercase tracking-widest mt-2">
            {isRegistering ? 'Voltar para Login' : 'Não tem conta? Clique aqui'}
          </button>
          
          <button type="button" onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-[9px] text-slate-300 font-bold uppercase mt-6">
            Limpar Cache do Celular
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthSystem;