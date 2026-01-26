
import React, { useState, useEffect } from 'react';
import { OvertimeRecord, Location, User } from '../types';
import { COORDINATOR_NAME, SUPERVISORS, EMPLOYEE_HIERARCHY } from '../constants';

interface OvertimeFormProps {
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
    if (currentUser.role === 'SUPERVISOR') return fieldName === 'supervisor';
    if (currentUser.role === 'EMPLOYEE') return fieldName === 'supervisor' || fieldName === 'employee';
    return false;
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <i className={`fa-solid ${initialData ? 'fa-pen-to-square' : 'fa-plus-circle'} text-blue-600`}></i>
            {initialData ? 'Editar Registro' : 'Lançar Hora Extra'}
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Supervisor</label>
            <select
              name="supervisor"
              required
              disabled={isFieldDisabled('supervisor')}
              value={formData.supervisor}
              onChange={handleChange}
              className="w-full border border-slate-200 bg-slate-50 rounded-2xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-60 outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {SUPERVISORS.map(sup => <option key={sup} value={sup}>{sup}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Colaborador</label>
            <select
              name="employee"
              required
              disabled={isFieldDisabled('employee')}
              value={formData.employee}
              onChange={handleChange}
              className="w-full border border-slate-200 bg-slate-50 rounded-2xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-60 outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {availableEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Local</label>
          <select 
            name="location" 
            required 
            value={formData.location} 
            onChange={handleChange} 
            className="w-full border border-slate-200 bg-slate-50 rounded-2xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            {Object.values(Location).map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>

        {/* v33: Layout corrigido para Data/Hora */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Início da Jornada</label>
            <div className="grid grid-cols-5 gap-2">
              <input type="date" name="startDate" required value={formData.startDate} onChange={handleChange} className="col-span-3 border border-slate-200 rounded-xl py-2.5 px-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-400" />
              <input type="time" name="startTime" required value={formData.startTime} onChange={handleChange} className="col-span-2 border border-slate-200 rounded-xl py-2.5 px-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Término da Jornada</label>
            <div className="grid grid-cols-5 gap-2">
              <input type="date" name="endDate" required min={formData.startDate} value={formData.endDate} onChange={handleChange} className="col-span-3 border border-slate-200 rounded-xl py-2.5 px-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-400" />
              <input type="time" name="endTime" required value={formData.endTime} onChange={handleChange} className="col-span-2 border border-slate-200 rounded-xl py-2.5 px-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Motivo Justificado</label>
          <textarea 
            name="reason" 
            required 
            rows={2} 
            value={formData.reason} 
            onChange={handleChange} 
            className="w-full border border-slate-200 bg-slate-50 rounded-2xl py-3 px-4 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            placeholder="Descreva o motivo..."
          ></textarea>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button 
          type="submit" 
          className="flex-1 bg-blue-600 shadow-lg shadow-blue-500/20 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all transform active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-check"></i>
          Confirmar Lançamento
        </button>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="bg-slate-100 text-slate-500 px-6 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-colors"
          >
            Sair
          </button>
        )}
      </div>
    </form>
  );
};

export default OvertimeForm;
