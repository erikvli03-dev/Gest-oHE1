
import React, { useState } from 'react';
import { User } from '../types';
import { SyncService } from '../services/syncService';

interface PasswordModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (newUser: User) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ user, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    if (user.password && currentPassword !== user.password) {
      setError('Senha atual incorreta.');
      setIsSaving(false);
      return;
    }

    if (newPassword.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.');
      setIsSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      setIsSaving(false);
      return;
    }

    try {
      const users: User[] = await SyncService.getUsers();
      const userIndex = users.findIndex(u => u.username === user.username);
      
      if (userIndex !== -1) {
        const updatedUser = { ...users[userIndex], password: newPassword };
        users[userIndex] = updatedUser;
        const success = await SyncService.saveUsers(users);
        
        if (success) {
          onSuccess(updatedUser);
          alert('Senha alterada com sucesso em todos os seus dispositivos!');
          onClose();
        } else {
          setError('Erro de conexão ao salvar nova senha.');
        }
      } else {
        setError('Usuário não encontrado no sistema remoto.');
      }
    } catch (err) {
      setError('Erro ao sincronizar com a nuvem.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Alterar Minha Senha</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" disabled={isSaving}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold border border-red-100">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha Atual</label>
            <input 
              type="password" 
              required 
              disabled={isSaving}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nova Senha</label>
            <input 
              type="password" 
              required 
              disabled={isSaving}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Confirmar Nova Senha</label>
            <input 
              type="password" 
              required 
              disabled={isSaving}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:bg-slate-400"
          >
            {isSaving ? 'Salvando na Nuvem...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
