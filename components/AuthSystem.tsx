
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

  // Auto-limpeza de erro
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setError('');
    setIsProcessing(true);
    setProcessStep('Conectando ao banco...');

    // Limpeza do username para evitar erros de digitação (remove espaços e põe minusculo)
    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '.');

    try {
      let users: User[] = [];
      try {
        users = await SyncService.getUsers();
      } catch (e) {
        console.log("Servidor inacessível, verificando cache local...");
        const localUsers = localStorage.getItem('users_emergency_backup');
        if (localUsers) users = JSON.parse(localUsers);
      }

      if (isRegistering) {
        setProcessStep('Validando dados...');
        if (users.some(u => u.username === cleanUsername)) {
          setError('Este usuário já existe. Tente fazer login.');
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
        
        setProcessStep('Salvando credenciais...');
        const updatedUsers = [...users, newUser];
        
        // Backup local imediato por segurança
        localStorage.setItem('users_emergency_backup', JSON.stringify(updatedUsers));
        
        const success = await SyncService.saveUsers(updatedUsers);
        
        if (success) {
          onLogin(newUser);
        } else {
          // Se falhou o sync mas salvou no backup local, permite logar avisando
          console.warn("Falha no sync, usando backup local.");
          onLogin(newUser);
          alert("Aviso: Cadastro realizado com sucesso no dispositivo, mas a sincronização com a nuvem falhou. Seus dados serão sincronizados na próxima vez que abrir o app com internet.");
        }
      } else {
        setProcessStep('Verificando acesso...');
        const user = users.find(u => 
          u.username === cleanUsername && 
          u.password === password.trim()
        );

        if (user) {
          onLogin(user);
        } else {
          setError(users.length === 0 
            ? 'Nenhum usuário no banco. Cadastre-se primeiro.' 
            : 'Usuário ou senha incorretos.');
        }
      }
    } catch (err) {
      setError('Erro crítico: Verifique sua conexão. O servidor de dados pode estar em manutenção.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-10 border border-slate-200 my-auto relative overflow-hidden">
        
        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">{processStep}</p>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl mb-6 shadow-xl rotate-3">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Overtime</h2>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-2 rounded-full"></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-bold text-center border border-red-100 flex items-center gap-3 animate-shake">
              <i className="fa-solid fa-triangle-exclamation text-lg"></i>
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Login (Sem espaços)</label>
            <input 
              required 
              disabled={isProcessing}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-normal"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: erik.salvador"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:font-normal"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Cargo</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700"
                  value={role}
                  onChange={e => {setRole(e.target.value as UserRole); setName('');}}
                >
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role === 'SUPERVISOR' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2">Qual seu nome?</label>
                  <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecione na Lista --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <div className="space-y-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-blue-500 uppercase">Seu Supervisor</label>
                    <select required className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none font-bold" value={selectedSup} onChange={e => {setSelectedSup(e.target.value); setName('');}}>
                      <option value="">-- Selecione --</option>
                      {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {selectedSup && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-blue-500 uppercase">Seu Nome</label>
                      <select required className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none font-bold" value={name} onChange={e => setName(e.target.value)}>
                        <option value="">-- Selecione --</option>
                        {EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-50 mt-6 text-sm"
          >
            {isRegistering ? 'CRIAR MINHA CONTA' : 'ACESSAR AGORA'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            disabled={isProcessing}
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-[11px] text-slate-400 font-bold uppercase tracking-widest hover:text-blue-600 transition-colors"
          >
            {isRegistering ? 'Já tenho conta? Fazer Login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
