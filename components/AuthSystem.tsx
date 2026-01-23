
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

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    try {
      const remoteUsers = await SyncService.getUsers();
      localStorage.setItem('users_backup_v13', JSON.stringify(remoteUsers));
      setCloudStatus('ONLINE');
      return remoteUsers;
    } catch (err) {
      setCloudStatus('OFFLINE');
      const local = localStorage.getItem('users_backup_v13');
      return local ? JSON.parse(local) : [];
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
      // 1. Pega os usuários atuais (nuvem ou local)
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
        
        // 2. Salva LOCAL primeiro (Garante o acesso)
        localStorage.setItem('users_backup_v13', JSON.stringify(updatedUsers));
        
        // 3. Tenta salvar na nuvem
        try {
          const success = await SyncService.saveUsers(updatedUsers);
          if (!success) {
            console.warn("Could not sync user to cloud, but saved locally.");
            // Não barramos o usuário aqui. Deixamos ele entrar.
          }
        } catch {
          console.warn("Network failure during cloud save, using local fallback.");
        }
        
        onLogin(newUser);
      } else {
        const user = allUsers.find(u => u.username === cleanUsername && u.password === password.trim());
        if (user) {
          onLogin(user);
        } else {
          setError('Usuário ou senha incorretos.');
        }
      }
    } catch (err) {
      setError('Erro de sistema. Tente recarregar a página.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
        
        <div className="absolute top-4 right-4">
           <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black border transition-all ${
             cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
             cloudStatus === 'OFFLINE' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
           }`}>
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : 'fa-circle'}`}></i>
             {cloudStatus}
           </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl mb-4 shadow-xl">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-none">Overtime</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 italic">Ailton Souza • v13 Stability</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-100 text-center animate-bounce">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: joao.silva"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-4 pt-2 border-t border-slate-100 mt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tipo de Perfil</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Seu Nome</label>
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
                  <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Seu Supervisor</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl outline-none font-bold text-blue-700" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Selecionar Supervisor --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all text-sm tracking-widest uppercase mt-4 flex items-center justify-center gap-3">
            {isProcessing && <i className="fa-solid fa-spinner animate-spin"></i>}
            {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-50 pt-4">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 p-2 transition-colors">
            {isRegistering ? 'Já tenho conta? Fazer Login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
