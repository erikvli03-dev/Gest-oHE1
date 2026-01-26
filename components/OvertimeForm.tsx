
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, Location, User } from '../types';
import { COORDINATOR_NAME, SUPERVISORS, EMPLOYEE_HIERARCHY } from '../constants';

interface OvertimeFormProps {
  onSubmit: (data: Omit<OvertimeRecord, 'id' | 'createdAt' | 'durationMinutes' | 'ownerUsername' | 'status'>) => void;
  initialData?: OvertimeRecord | null;
  onCancel?: () => void;
  currentUser: User;
}

const OvertimeForm: React.FC<OvertimeFormProps> = ({ onSubmit, initialData, onCancel, currentUser }) => {
  const [formData, setFormData] = useState({
    coordinator: COORDINATOR_NAME,
    supervisor: currentUser.role === 'SUPERVISOR' ? currentUser.name : currentUser.supervisorName || '',
    employee: currentUser.role === 'EMPLOYEE' ? currentUser.name : '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location: Location.SANTOS,
    startTime: '',
    endTime: '',
    reason: 'Trabalho emergencial' as 'Trabalho emergencial' | 'Atraso na execução diária',
    observations: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        coordinator: initialData.coordinator,
        supervisor: initialData.supervisor,
        employee: initialData.employee,
        startDate: initialData.startDate,
        endDate: initialData.endDate,
        location: initialData.location,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        reason: initialData.reason,
        observations: initialData.observations || '',
      });
    }
  }, [initialData]);

  const [availableEmployees, setAvailableEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (formData.supervisor) {
      const employees = EMPLOYEE_HIERARCHY[formData.supervisor] || [];
      setAvailableEmployees([formData.supervisor, ...employees]);
    }
  }, [formData.supervisor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);
    if (end <= start) return alert('Data/hora inválida.');
    onSubmit(formData);
    if (!initialData) {
      setFormData(prev => ({ ...prev, startTime: '', endTime: '', observations: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-5">
      <h2 className="text-xs font-black text-blue-600 uppercase tracking-tighter flex items-center gap-2">
        <i className={`fa-solid ${initialData ? 'fa-pen-to-square' : 'fa-plus-circle'}`}></i>
        {initialData ? 'Editar Registro' : 'Novo Lançamento'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Colaborador</label>
          <select name="employee" required disabled={currentUser.role === 'EMPLOYEE'} value={formData.employee} onChange={handleChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl p-3 text-xs font-bold outline-none">
            <option value="">Selecione...</option>
            {availableEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Local</label>
          <select name="location" required value={formData.location} onChange={handleChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl p-3 text-xs font-bold outline-none">
            {Object.values(Location).map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Início</label>
          <input type="date" name="startDate" required value={formData.startDate} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none mb-2" />
          <input type="time" name="startTime" required value={formData.startTime} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none" />
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Fim</label>
          <input type="date" name="endDate" required min={formData.startDate} value={formData.endDate} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none mb-2" />
          <input type="time" name="endTime" required value={formData.endTime} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Motivo Principal</label>
        <select name="reason" required value={formData.reason} onChange={handleChange} className="w-full border border-slate-100 bg-blue-50 text-blue-800 rounded-xl p-3 text-xs font-black outline-none">
          <option value="Trabalho emergencial">Trabalho emergencial</option>
          <option value="Atraso na execução diária">Atraso na execução diária</option>
        </select>
      </div>

      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Observações (Opcional)</label>
        <textarea name="observations" rows={2} value={formData.observations} onChange={handleChange} className="w-full border border-slate-100 bg-slate-50 rounded-xl p-3 text-xs outline-none resize-none" placeholder="Detalhes adicionais..."></textarea>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-slate-900 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          {initialData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 bg-slate-100 text-slate-500 font-black rounded-xl text-[10px] uppercase">Sair</button>
        )}
      </div>
    </form>
  );
};

export default OvertimeForm;
