
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      const users: User[] = await SyncService.getUsers();

      if (isRegistering) {
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
          setError('Este nome de usuário já existe.');
          setIsProcessing(false);
          return;
        }
        
        const newUser: User = { 
          username: username.toLowerCase().trim(), 
          password: password.trim(), 
          name: role === 'COORDINATOR' ? COORDINATOR_NAME : name, 
          role,
          supervisorName: role === 'EMPLOYEE' ? selectedSup : undefined
        };
        
        const success = await SyncService.saveUsers([...users, newUser]);
        if (success) {
          onLogin(newUser);
        } else {
          setError('Erro de conexão ao salvar na nuvem.');
        }
      } else {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password.trim());
        if (user) {
          onLogin(user);
        } else {
          setError('Usuário ou senha inválidos ou erro de conexão.');
        }
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl mb-4 shadow-lg">
            <i className={`fa-solid ${isProcessing ? 'fa-spinner fa-spin' : 'fa-lock'}`}></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Overtime Insight</h2>
          <p className="text-slate-500 text-sm">{isRegistering ? 'Crie sua conta global' : 'Acesse sua conta'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold text-center border border-red-100">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Usuário (Login)</label>
            <input 
              required 
              disabled={isProcessing}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: joao.silva"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha</label>
            <input 
              required 
              type="password"
              disabled={isProcessing}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Perfil</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                >
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COORDINATOR">Coordenador</option>
                </select>
              </div>

              {role === 'SUPERVISOR' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Selecione seu Nome</label>
                  <select required className="w-full p-3 border border-slate-200 rounded-xl" value={name} onChange={e => setName(e.target.value)}>
                    <option value="">-- Selecione --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {role === 'EMPLOYEE' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Seu Supervisor</label>
                    <select required className="w-full p-3 border border-slate-200 rounded-xl" value={selectedSup} onChange={e => {setSelectedSup(e.target.value); setName('');}}>
                      <option value="">-- Selecione o Supervisor --</option>
                      {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {selectedSup && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Seu Nome</label>
                      <select required className="w-full p-3 border border-slate-200 rounded-xl" value={name} onChange={e => setName(e.target.value)}>
                        <option value="">-- Selecione seu Nome --</option>
                        {EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:bg-slate-400"
          >
            {isProcessing ? 'Sincronizando...' : (isRegistering ? 'Cadastrar Agora' : 'Entrar no Sistema')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            disabled={isProcessing}
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 font-semibold hover:underline disabled:opacity-50"
          >
            {isRegistering ? 'Já tenho uma conta. Fazer Login' : 'Não tem conta? Cadastre-se aqui'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;
