
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, Location, User } from '../types';
import { COORDINATOR_NAME, SUPERVISORS, EMPLOYEE_HIERARCHY } from '../constants';

interface OvertimeFormProps {
  // Fix: Omit 'status' from the expected data in onSubmit as it is handled at the app level (App.tsx)
  onSubmit: (data: Omit<OvertimeRecord, 'id' | 'createdAt' | 'durationMinutes' | 'ownerUsername' | 'status'>) => void;
  initialData?: OvertimeRecord;
  onCancel?: () => void;
  currentUser: User;
}

const OvertimeForm: React.FC<OvertimeFormProps> = ({ onSubmit, initialData, onCancel, currentUser }) => {
  const [formData, setFormData] = useState({
    coordinator: COORDINATOR_NAME,
    supervisor: initialData?.supervisor || (currentUser.role === 'SUPERVISOR' ? currentUser.name : currentUser.supervisorName || ''),
    employee: initialData?.employee || (currentUser.role === 'EMPLOYEE' ? currentUser.name : ''),
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    endDate: initialData?.endDate || initialData?.startDate || new Date().toISOString().split('T')[0],
    location: initialData?.location || Location.SANTOS,
    startTime: initialData?.startTime || '',
    endTime: initialData?.endTime || '',
    reason: initialData?.reason || '',
  });

  const [availableEmployees, setAvailableEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (formData.supervisor) {
      const employees = EMPLOYEE_HIERARCHY[formData.supervisor] || [];
      // Se for Coordenador, ele pode selecionar qualquer um, mas vamos manter a regra de Supervisor->Equipe
      // No caso de Supervisor, ele também pode selecionar a si mesmo para justificar suas próprias horas
      setAvailableEmployees([formData.supervisor, ...employees]);
    } else {
      setAvailableEmployees([]);
    }
  }, [formData.supervisor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'startDate' && prev.endDate === prev.startDate) {
        newData.endDate = value;
      }
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificação de segurança de data
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);
    if (end <= start) {
      alert('A data/hora de término deve ser após o início.');
      return;
    }

    onSubmit(formData);
  };

  const isFieldDisabled = (fieldName: string) => {
    if (currentUser.role === 'COORDINATOR') return false;
    if (currentUser.role === 'SUPERVISOR') {
      return fieldName === 'supervisor';
    }
    if (currentUser.role === 'EMPLOYEE') {
      return fieldName === 'supervisor' || fieldName === 'employee';
    }
    return false;
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className={`fa-solid ${initialData ? 'fa-pen-to-square' : 'fa-clock-rotate-left'} text-blue-600`}></i>
            {initialData ? 'Editar Lançamento' : 'Novo Apontamento'}
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Coordenador: {COORDINATOR_NAME}</span>
        </div>
        {initialData && (
          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Modo Edição</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Supervisor</label>
            <select
              name="supervisor"
              required
              disabled={isFieldDisabled('supervisor')}
              value={formData.supervisor}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all outline-none"
            >
              <option value="">Selecione o Supervisor</option>
              {SUPERVISORS.map(sup => <option key={sup} value={sup}>{sup}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Colaborador</label>
            <select
              name="employee"
              required
              disabled={isFieldDisabled('employee')}
              value={formData.employee}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all outline-none"
            >
              <option value="">Selecione o Colaborador</option>
              {availableEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Local da Hora Extra</label>
          <select 
            name="location" 
            required 
            value={formData.location} 
            onChange={handleChange} 
            className="w-full border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Object.values(Location).map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Início da Jornada</label>
              <div className="flex gap-2">
                <input type="date" name="startDate" required value={formData.startDate} onChange={handleChange} className="flex-1 border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-400" />
                <input type="time" name="startTime" required value={formData.startTime} onChange={handleChange} className="w-24 border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Término da Jornada</label>
              <div className="flex gap-2">
                <input type="date" name="endDate" required min={formData.startDate} value={formData.endDate} onChange={handleChange} className="flex-1 border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-400" />
                <input type="time" name="endTime" required value={formData.endTime} onChange={handleChange} className="w-24 border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Motivo Justificado</label>
          <textarea 
            name="reason" 
            required 
            rows={3} 
            value={formData.reason} 
            onChange={handleChange} 
            className="w-full border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Descreva detalhadamente o motivo das horas extras..."
          ></textarea>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button 
          type="submit" 
          className={`flex-1 ${initialData ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-blue-600 shadow-blue-500/20'} text-white font-bold py-3 rounded-xl hover:opacity-90 shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]`}
        >
          <i className={`fa-solid ${initialData ? 'fa-save' : 'fa-check'}`}></i>
          {initialData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
        </button>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="bg-slate-100 text-slate-600 px-6 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

export default OvertimeForm;
