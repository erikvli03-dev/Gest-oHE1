
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
  
  const CACHE_KEY = 'users_v28_local';

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

    try {
      // 1. SEMPRE VERIFICA LOCAL PRIMEIRO (Não gasta limite de rede)
      const localUsers = getLocalUsers();
      const localMatch = localUsers.find(u => u.username === cleanUser && u.password === cleanPass);

      if (!isRegistering && localMatch) {
        onLogin(localMatch);
        setIsProcessing(false);
        return;
      }

      // 2. Se não achou local ou está cadastrando, tenta a rede sem travar
      let cloudUsers = await SyncService.getUsers();
      const allUsers = cloudUsers && cloudUsers.length > 0 ? cloudUsers : localUsers;

      if (isRegistering) {
        if (allUsers.some((u: User) => u.username === cleanUser)) {
          setError('Este usuário já existe no sistema.');
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
        SyncService.saveUsers(updated).catch(() => {}); // Salva na nuvem se der
        onLogin(newUser);
      } else {
        const user = allUsers.find((u: User) => u.username === cleanUser && u.password === cleanPass);
        if (user) {
          // Atualiza o cache local para o próximo login ser instantâneo
          const newLocal = [...localUsers.filter(u => u.username !== user.username), user];
          localStorage.setItem(CACHE_KEY, JSON.stringify(newLocal));
          onLogin(user);
        } else {
          setError('Usuário/Senha incorretos. Se você acabou de instalar o app, crie sua conta novamente.');
        }
      }
    } catch (err) {
      setError('O servidor está instável. Tente novamente em alguns segundos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    if (confirm("Isso limpará os dados de versões antigas e pode resolver problemas de carregamento. Deseja continuar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200">
        
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 shadow-xl">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gestão HE v28</h2>
          <div className="mt-1 flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-amber-700 font-black uppercase tracking-widest">Modo Offline Habilitado</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:border-blue-500"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="joao.silva"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:border-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-3 pt-3 border-t animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Seu Nome Completo</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">Selecione na lista...</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)
                    }
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Seu Perfil</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                    <option value="EMPLOYEE">Colaborador</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="COORDINATOR">Coordenador</option>
                  </select>
                </div>

                {role === 'EMPLOYEE' && (
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase ml-2 tracking-widest">Seu Supervisor</label>
                    <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-800 outline-none" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                      <option value="">Quem é seu Supervisor?</option>
                      {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Criar Minha Conta' : 'Entrar Agora'}
          </button>
          
          <div className="flex flex-col gap-4 pt-6 border-t mt-4 text-center">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
              {isRegistering ? 'Já tenho uma conta → Entrar' : 'Não tem conta? Cadastre-se agora'}
            </button>
            <button type="button" onClick={resetApp} className="text-[9px] text-slate-300 font-bold uppercase tracking-widest py-2">
              <i className="fa-solid fa-rotate mr-2"></i> Limpar Tudo / Restaurar App
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthSystem;
