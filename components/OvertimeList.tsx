
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

const OvertimeList: React.FC<OvertimeListProps> = ({ records, onDelete, onEdit, onUpdateStatus, currentUser }) => {
  const [filterName, setFilterName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState<OvertimeStatus | 'ALL'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetFilters = () => {
    setFilterName('');
    setFilterMonth('');
    setFilterStatus('ALL');
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let isVisible = false;
      // Normalização para evitar erros de case-sensitive
      const owner = (r.ownerUsername || '').toLowerCase();
      const current = (currentUser.username || '').toLowerCase();

      if (currentUser.role === 'COORDINATOR') isVisible = true;
      else if (currentUser.role === 'SUPERVISOR') isVisible = r.supervisor === currentUser.name;
      else isVisible = owner === current;

      if (!isVisible) return false;

      const matchesName = r.employee.toLowerCase().includes(filterName.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
      
      let matchesMonth = true;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        const recordDate = new Date(r.startDate + 'T12:00:00'); // Evita problemas de timezone
        matchesMonth = recordDate.getFullYear() === parseInt(year) && (recordDate.getMonth() + 1) === parseInt(month);
      }

      return matchesName && matchesMonth && matchesStatus;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [records, filterName, filterMonth, filterStatus, currentUser]);

  const totalMinutes = filteredRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const getStatusBadge = (status: OvertimeStatus) => {
    switch (status) {
      case 'PENDING': return <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black border border-blue-200 uppercase">Pendente</span>;
      case 'APPROVED': return <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black border border-emerald-200 uppercase">Aprovado</span>;
      case 'REJECTED': return <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black border border-red-200 uppercase">Recusado</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-list-ul text-blue-600"></i> Lançamentos
          </h3>
          <p className="text-[10px] bg-slate-100 px-3 py-1 rounded-full font-black text-slate-500">
            TOTAL: {formatDuration(totalMinutes)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Nome..." value={filterName} onChange={e => setFilterName(e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none" />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s as any)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all ${filterStatus === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {s === 'ALL' ? 'Todos' : s === 'PENDING' ? 'Pendentes' : s === 'APPROVED' ? 'Aprovados' : 'Recusados'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <div key={record.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{record.supervisor}</span>
                  <h4 className="font-black text-slate-900 text-sm leading-tight">{record.employee}</h4>
                </div>
                {getStatusBadge(record.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Duração</span>
                  <span className="text-blue-700 font-black text-xs">{formatDuration(record.durationMinutes)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-black uppercase block">Local</span>
                  <span className="text-slate-700 font-black text-xs uppercase">{record.location}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 bg-slate-50 p-3 rounded-2xl mb-3 font-medium italic border-l-2 border-slate-200">
                "{record.reason}"
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-[8px] text-slate-400 font-bold uppercase">
                  {new Date(record.startDate).toLocaleDateString()} {record.startTime} ➔ {record.endTime}
                </div>
                
                <div className="flex gap-1">
                   {(currentUser.role === 'COORDINATOR' || currentUser.role === 'SUPERVISOR') && record.status === 'PENDING' && (
                     <button onClick={() => onUpdateStatus(record.id, 'APPROVED')} className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[10px]"><i className="fa-solid fa-check"></i></button>
                   )}
                   {(record.ownerUsername === currentUser.username && record.status === 'PENDING') && (
                     <button onClick={() => onDelete(record.id)} className="w-7 h-7 bg-slate-100 text-red-500 rounded-lg flex items-center justify-center text-[10px]"><i className="fa-solid fa-trash-can"></i></button>
                   )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <i className="fa-solid fa-filter-circle-xmark text-slate-300 text-3xl mb-3"></i>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest px-8">Nenhum registro encontrado com estes filtros</p>
            {(filterName || filterMonth || filterStatus !== 'ALL') && (
              <button onClick={resetFilters} className="mt-4 text-blue-600 font-black text-[10px] uppercase underline">Limpar Filtros</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OvertimeList;
