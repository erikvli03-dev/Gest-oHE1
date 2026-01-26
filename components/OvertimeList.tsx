
import React, { useState, useMemo } from 'react';
import { OvertimeRecord, User, OvertimeStatus } from '../types';
import { formatDuration } from '../utils/timeUtils';

interface OvertimeListProps {
  records: OvertimeRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: OvertimeRecord) => void;
  onUpdateStatus: (id: string, status: OvertimeStatus) => void;
  currentUser: User;
}

const OvertimeList: React.FC<OvertimeListProps> = ({ records, onDelete, onEdit, currentUser }) => {
  const [filterName, setFilterName] = useState('');

  const normalize = (str: string) => 
    (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const recordOwner = normalize(r.ownerUsername);
      const currentUsername = normalize(currentUser.username);
      const recordSupervisor = normalize(r.supervisor);
      const currentUserName = normalize(currentUser.name);

      let isVisible = currentUser.role === 'COORDINATOR' || 
                      (currentUser.role === 'SUPERVISOR' && recordSupervisor === currentUserName) ||
                      (recordOwner === currentUsername);

      if (!isVisible) return false;
      return normalize(r.employee).includes(normalize(filterName));
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [records, filterName, currentUser]);

  const totalMinutes = filteredRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
        <div className="relative flex-1 mr-4">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
          <input type="text" placeholder="Filtrar histórico..." value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none font-bold" />
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase">Total Acumulado</p>
          <p className="text-xs font-black text-blue-600">{formatDuration(totalMinutes)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRecords.map(record => (
          <div key={record.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase">{record.location}</span>
                <h4 className="font-black text-slate-800 text-xs mt-1">{record.employee}</h4>
              </div>
              <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(record.startDate).toLocaleDateString('pt-BR')}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl mb-3 border-l-4 border-blue-500">
              <p className="text-[10px] font-black text-slate-700">{record.reason}</p>
              {record.observations && <p className="text-[9px] text-slate-500 mt-1 italic">"{record.observations}"</p>}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-[10px] text-slate-600 font-bold">
                  <i className="fa-regular fa-clock text-blue-500 mr-1"></i>
                  {record.startTime} - {record.endTime}
                </div>
                <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black">
                  {formatDuration(record.durationMinutes)}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => onEdit(record)} className="w-8 h-8 bg-slate-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] active:scale-90 transition-all"><i className="fa-solid fa-pen"></i></button>
                <button onClick={() => onDelete(record.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-[10px] active:scale-90 transition-all"><i className="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OvertimeList;
