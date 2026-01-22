
import React, { useState } from 'react';
import { COORDINATOR_NAME, SUPERVISORS, EMPLOYEE_HIERARCHY } from '../constants';
// Fix: Import User instead of UserSession as it is the correct type defined in types.ts
import { User, UserRole } from '../types';

interface IdentitySelectorProps {
  onSelect: (user: User) => void;
}

const IdentitySelector: React.FC<IdentitySelectorProps> = ({ onSelect }) => {
  const [role, setRole] = useState<UserRole | ''>('');
  const [selectedSup, setSelectedSup] = useState('');

  const handleSelectUser = (name: string, role: UserRole, supName?: string) => {
    // Fix: Pass valid User object satisfying the User interface
    onSelect({ username: name.toLowerCase().replace(/\s+/g, '.'), name, role, supervisorName: supName });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-lg">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Identifique-se</h2>
          <p className="text-slate-500 text-sm italic">Para garantir a privacidade dos data, escolha seu perfil.</p>
        </div>

        {!role && (
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => setRole('COORDINATOR')} className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
              <span className="block font-bold text-slate-700 group-hover:text-blue-700">Coordenador</span>
              <span className="text-xs text-slate-400">Acesso total ao sistema</span>
            </button>
            <button onClick={() => setRole('SUPERVISOR')} className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
              <span className="block font-bold text-slate-700 group-hover:text-blue-700">Supervisor</span>
              <span className="text-xs text-slate-400">Ver seus registros e de sua equipe</span>
            </button>
            <button onClick={() => setRole('EMPLOYEE')} className="p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
              <span className="block font-bold text-slate-700 group-hover:text-blue-700">Colaborador</span>
              <span className="text-xs text-slate-400">Ver apenas seus próprios registros</span>
            </button>
          </div>
        )}

        {role === 'COORDINATOR' && (
          <div className="space-y-4">
             <button onClick={() => handleSelectUser(COORDINATOR_NAME, 'COORDINATOR')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">
               Acessar como {COORDINATOR_NAME}
             </button>
             <button onClick={() => setRole('')} className="w-full text-slate-400 text-sm">Voltar</button>
          </div>
        )}

        {role === 'SUPERVISOR' && (
          <div className="space-y-4">
            <select 
              className="w-full p-3 border border-slate-300 rounded-xl"
              onChange={(e) => handleSelectUser(e.target.value, 'SUPERVISOR')}
              defaultValue=""
            >
              <option value="" disabled>Selecione seu nome...</option>
              {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setRole('')} className="w-full text-slate-400 text-sm">Voltar</button>
          </div>
        )}

        {role === 'EMPLOYEE' && (
          <div className="space-y-4">
            {!selectedSup ? (
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl"
                onChange={(e) => setSelectedSup(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Quem é seu Supervisor?</option>
                {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl"
                onChange={(e) => handleSelectUser(e.target.value, 'EMPLOYEE', selectedSup)}
                defaultValue=""
              >
                <option value="" disabled>Selecione seu nome...</option>
                {EMPLOYEE_HIERARCHY[selectedSup].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            <button onClick={() => {setRole(''); setSelectedSup('')}} className="w-full text-slate-400 text-sm">Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentitySelector;
