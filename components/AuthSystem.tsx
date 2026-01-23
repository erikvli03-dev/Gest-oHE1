
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
  
  const CACHE_KEY = 'users_v27_local';

  // Tenta carregar usuários locais ao iniciar
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
      // 1. Tenta pegar da nuvem, mas não trava se falhar
      let allUsers = await SyncService.getUsers();
      if (!allUsers || allUsers.length === 0) {
        allUsers = getLocalUsers();
      }

      if (isRegistering) {
        if (allUsers.some((u: User) => u.username === cleanUser)) {
          setError('Este usuário já existe.');
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
        
        // Salva local imediatamente para garantir acesso
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        
        // Tenta salvar na nuvem em background (silenciosamente)
        SyncService.saveUsers(updated).catch(() => console.log("Nuvem offline"));
        
        onLogin(newUser);
      } else {
        const user = allUsers.find((u: User) => u.username === cleanUser && u.password === cleanPass);
        if (user) {
          onLogin(user);
        } else {
          setError('Usuário ou senha incorretos ou não cadastrados neste aparelho.');
        }
      }
    } catch (err) {
      setError('Erro ao processar login. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAllData = () => {
    if (confirm("Isso apagará seus dados locais e resolverá problemas de tela branca. Continuar?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200">
        
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 shadow-xl shadow-blue-500/30">
            <i className="fa-solid fa-clock"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Gestão HE v27</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Modo de Alta Disponibilidade</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[10px] font-bold border border-red-100 text-center animate-pulse">
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
              placeholder="ex: joao.silva"
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
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Seu Perfil</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Seu Nome</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">Escolha na lista...</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Escolha o Supervisor primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-2 tracking-widest">Seu Supervisor</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-800 outline-none" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">Quem te lidera?</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3">
            {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
            {isRegistering ? 'Cadastrar e Entrar' : 'Entrar no Sistema'}
          </button>
          
          <div className="flex flex-col gap-4 pt-6 border-t mt-4 text-center">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
              {isRegistering ? 'Voltar para Login' : 'Não tem conta? Clique aqui'}
            </button>
            <button type="button" onClick={clearAllData} className="text-[9px] text-slate-400 font-bold uppercase tracking-widest py-2">
              <i className="fa-solid fa-broom mr-2"></i> Limpar Cache (Resolver Tela Branca)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthSystem;
