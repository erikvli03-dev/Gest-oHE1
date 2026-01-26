
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
    if (user.password && currentPassword !== user.password) return setError('Senha atual incorreta.');
    if (newPassword.length < 4) return setError('Mínimo 4 caracteres.');
    if (newPassword !== confirmPassword) return setError('Confirmação não confere.');

    setIsSaving(true);
    try {
      const users = await SyncService.getUsers() || [];
      const userIndex = users.findIndex(u => u.username === user.username);
      if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        await SyncService.saveUsers(users);
        onSuccess(users[userIndex]);
        alert('Senha atualizada em todos os dispositivos!');
        onClose();
      }
    } catch (err) { setError('Erro de sincronização.'); } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-sm font-black text-slate-800 uppercase mb-6">Segurança da Conta</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-[10px] font-bold text-center">{error}</p>}
          <input type="password" required placeholder="Senha Atual" className="w-full p-4 bg-slate-50 rounded-2xl text-xs outline-none" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          <input type="password" required placeholder="Nova Senha" className="w-full p-4 bg-slate-50 rounded-2xl text-xs outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input type="password" required placeholder="Confirmar Nova Senha" className="w-full p-4 bg-slate-50 rounded-2xl text-xs outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl text-[10px] uppercase">{isSaving ? 'Salvando...' : 'Atualizar Senha'}</button>
          <button type="button" onClick={onClose} className="w-full text-slate-400 text-[9px] font-bold uppercase mt-2">Cancelar</button>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
