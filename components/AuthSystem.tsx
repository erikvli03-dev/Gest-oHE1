
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
  const [processStep, setProcessStep] = useState('');
  const [cloudStatus, setCloudStatus] = useState<'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE'>('IDLE');
  const [userCount, setUserCount] = useState<number>(0);

  const syncDatabase = async () => {
    setCloudStatus('SYNCING');
    try {
      const remoteUsers = await SyncService.getUsers();
      localStorage.setItem('users_emergency_backup', JSON.stringify(remoteUsers));
      setUserCount(remoteUsers.length);
      setCloudStatus('ONLINE');
      return remoteUsers;
    } catch (err) {
      setCloudStatus('OFFLINE');
      const local = localStorage.getItem('users_emergency_backup');
      const parsed = local ? JSON.parse(local) : [];
      setUserCount(parsed.length);
      return parsed;
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
    setProcessStep('Verificando...');

    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '.');

    try {
      // Sempre tenta sincronizar antes de autenticar para garantir dados novos
      const allUsers: User[] = await syncDatabase();

      if (isRegistering) {
        setProcessStep('Criando conta...');
        
        if (allUsers.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe no sistema.');
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
        localStorage.setItem('users_emergency_backup', JSON.stringify(updatedUsers));
        
        setProcessStep('Sincronizando...');
        const cloudSaved = await SyncService.saveUsers(updatedUsers);
        
        if (!cloudSaved) {
          setError('Não foi possível salvar na nuvem. Verifique sua conexão.');
          setIsProcessing(false);
          return;
        }
        
        onLogin(newUser);
      } else {
        setProcessStep('Autenticando...');
        
        const user = allUsers.find(u => 
          u.username === cleanUsername && 
          u.password === password.trim()
        );

        if (user) {
          onLogin(user);
        } else {
          setError('Usuário ou senha incorretos. Dica: Clique no ícone de nuvem para atualizar.');
        }
      }
    } catch (err) {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-200 relative overflow-hidden">
        
        {/* Connection Status Badge */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
           <button 
             onClick={syncDatabase}
             disabled={cloudStatus === 'SYNCING'}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black border transition-all ${
               cloudStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               cloudStatus === 'OFFLINE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}
           >
             <i className={`fa-solid ${cloudStatus === 'SYNCING' ? 'fa-spinner animate-spin' : 'fa-cloud'}`}></i>
             {cloudStatus === 'SYNCING' ? 'SINCRONIZANDO...' : `${userCount} USUÁRIOS`}
           </button>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest">{processStep}</p>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl mb-6 shadow-2xl shadow-blue-200">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Overtime</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Controle de Horas Extras</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-[11px] font-bold text-center border border-red-200 animate-fadeIn">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Usuário</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              className="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-800 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: erik.salvador"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-800 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-5 pt-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Seu Cargo</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={role} onChange={e => {setRole(e.target.value as UserRole); setName('');}}>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role !== 'COORDINATOR' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Escolha seu Nome</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecione na Lista --</option>
                    {role === 'SUPERVISOR' 
                      ? SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)
                      : (selectedSup ? EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>) : <option disabled>Selecione o Supervisor abaixo primeiro</option>)
                    }
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-blue-600 uppercase ml-2">Quem é seu Supervisor?</label>
                  <select required className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none font-bold text-blue-700" value={selectedSup} onChange={e => setSelectedSup(e.target.value)}>
                    <option value="">-- Selecione --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-[0.98] transition-all text-[11px] tracking-[0.2em] mt-4 hover:bg-blue-700">
            {isRegistering ? 'CADASTRAR E ACESSAR' : 'ACESSAR AGORA'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button onClick={() => {setIsRegistering(!isRegistering); setError('');}} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 transition-colors py-2 px-4 rounded-xl hover:bg-slate-50">
            {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
