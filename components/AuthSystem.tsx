
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
  const [processStep, setProcessStep] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setError('');
    setIsProcessing(true);
    setProcessStep('Conectando...');

    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '.');
    const localUsersStr = localStorage.getItem('users_emergency_backup');
    const localUsers: User[] = localUsersStr ? JSON.parse(localUsersStr) : [];

    try {
      let remoteUsers: User[] = [];
      let isCloudActive = true;

      try {
        remoteUsers = await SyncService.getUsers();
      } catch (err) {
        isCloudActive = false;
        console.warn("Modo offline detectado.");
      }

      const usersMap = new Map<string, User>();
      localUsers.forEach(u => usersMap.set(u.username, u));
      remoteUsers.forEach(u => usersMap.set(u.username, u));
      const allUsers = Array.from(usersMap.values());

      if (isRegistering) {
        setProcessStep('Criando conta...');
        
        if (allUsers.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe. Tente fazer login.');
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
        
        // SALVAMENTO HÍBRIDO: Salva local e tenta nuvem
        localStorage.setItem('users_emergency_backup', JSON.stringify(updatedUsers));
        
        setProcessStep('Sincronizando...');
        const cloudSaved = await SyncService.saveUsers(updatedUsers);
        
        if (!cloudSaved) {
          console.warn("Salvo apenas localmente por enquanto.");
        }
        
        onLogin(newUser);
      } else {
        setProcessStep('Autenticando...');
        
        const user = allUsers.find(u => 
          u.username === cleanUsername && 
          u.password === password.trim()
        );

        if (user) {
          localStorage.setItem('users_emergency_backup', JSON.stringify(allUsers));
          onLogin(user);
        } else {
          if (!isCloudActive && allUsers.length === 0) {
            setError('Sem conexão e sem dados salvos neste aparelho.');
          } else {
            setError('Usuário ou senha incorretos ou não cadastrados.');
          }
        }
      }
    } catch (err) {
      setError('Falha no sistema. Tente novamente em instantes.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-10 border border-slate-200 relative">
        
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest">{processStep}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl mb-4 shadow-xl">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Overtime</h2>
          <div className="h-1 w-6 bg-blue-600 mx-auto mt-1 rounded-full"></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-bold text-center border border-red-100 animate-pulse">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: erik.salvador"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-4 pt-4 animate-fadeIn">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Cargo</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Seu Nome</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecione na Lista --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Selecione o Supervisor abaixo primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-blue-500 uppercase ml-2">Quem é seu Supervisor?</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-bold text-blue-700" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Selecione --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all text-xs tracking-widest mt-4">
            {isRegistering ? 'CADASTRAR E ACESSAR' : 'ACESSAR AGORA'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => {setIsRegistering(!isRegistering); setError('');}} className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">
            {isRegistering ? 'Já tenho conta' : 'Criar nova conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
