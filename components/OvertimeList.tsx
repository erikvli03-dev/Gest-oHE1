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

  // Fix: Added missing resetFilters function to clear search and filter criteria
  const resetFilters = () => {
    setFilterName('');
    setFilterMonth('');
    setFilterStatus('ALL');
  };

  const normalize = (str: string) => 
    (str || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let isVisible = false;
      
      const recordOwner = normalize(r.ownerUsername);
      const currentUsername = normalize(currentUser.username);
      const recordSupervisor = normalize(r.supervisor);
      const currentUserName = normalize(currentUser.name);

      // v36: Visibilidade com normalização rigorosa
      if (currentUser.role === 'COORDINATOR') {
        isVisible = true;
      } else if (currentUser.role === 'SUPERVISOR') {
        // Supervisor vê o que ele é o supervisor designado
        isVisible = recordSupervisor === currentUserName;
      } else {
        // Colaborador vê o que ele mesmo lançou
        isVisible = recordOwner === currentUsername;
      }

      if (!isVisible) return false;

      const matchesName = normalize(r.employee).includes(normalize(filterName));
      const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
      
      let matchesMonth = true;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        const recordDate = new Date(r.startDate + 'T12:00:00');
        matchesMonth = recordDate.getFullYear() === parseInt(year) && (recordDate.getMonth() + 1) === parseInt(month);
      }

      return matchesName && matchesMonth && matchesStatus;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [records, filterName, filterMonth, filterStatus, currentUser]);

  const totalMinutes = filteredRecords.reduce((acc, curr) => acc + (curr.status === 'APPROVED' ? curr.durationMinutes : 0), 0);
  const totalPending = filteredRecords.reduce((acc, curr) => acc + (curr.status === 'PENDING' ? curr.durationMinutes : 0), 0);

  const getStatusBadge = (status: OvertimeStatus) => {
    switch (status) {
      case 'PENDING': return <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black border border-amber-200 uppercase">Aguardando</span>;
      case 'APPROVED': return <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black border border-emerald-200 uppercase">Aprovado</span>;
      case 'REJECTED': return <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black border border-red-200 uppercase">Recusado</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <i className="fa-solid fa-list-check text-blue-600"></i> Relatório Geral
          </h3>
          <div className="text-right">
            <p className="text-[9px] font-black text-emerald-600 uppercase">Aprovadas: {formatDuration(totalMinutes)}</p>
            <p className="text-[9px] font-black text-amber-600 uppercase">Pendentes: {formatDuration(totalPending)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
            <input type="text" placeholder="Buscar nome..." value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
          </div>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none font-bold" />
        </div>
        
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s as any)} className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${filterStatus === s ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-100'}`}>
              {s === 'ALL' ? 'Todos' : s === 'PENDING' ? 'Pendentes' : s === 'APPROVED' ? 'Aprovados' : 'Recusados'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <div key={record.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden active:scale-[0.99] transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                     <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">{record.location}</span>
                     <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{record.supervisor}</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm leading-tight mt-1">{record.employee}</h4>
                </div>
                {getStatusBadge(record.status)}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl mb-3 font-medium text-[10px] text-slate-600 italic border-l-2 border-blue-500/30">
                "{record.reason}"
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 font-bold uppercase">Período</span>
                  <div className="text-[10px] text-slate-700 font-black flex items-center gap-1">
                    <i className="fa-regular fa-calendar text-blue-500"></i>
                    {new Date(record.startDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                    <span className="mx-1 text-slate-300">|</span>
                    <i className="fa-regular fa-clock text-blue-500"></i>
                    {record.startTime} - {record.endTime}
                    <span className="ml-2 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px]">
                      {formatDuration(record.durationMinutes)}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1.5">
                   {(currentUser.role === 'COORDINATOR' || (currentUser.role === 'SUPERVISOR' && normalize(record.supervisor) === normalize(currentUser.name))) && record.status === 'PENDING' && (
                     <>
                       <button onClick={() => onUpdateStatus(record.id, 'APPROVED')} className="w-8 h-8 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center text-xs hover:bg-emerald-600 transition-colors"><i className="fa-solid fa-check"></i></button>
                       <button onClick={() => onUpdateStatus(record.id, 'REJECTED')} className="w-8 h-8 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                     </>
                   )}
                   {(normalize(record.ownerUsername) === normalize(currentUser.username) && record.status === 'PENDING') && (
                     <button onClick={() => onDelete(record.id)} className="w-8 h-8 bg-slate-100 text-red-500 rounded-xl flex items-center justify-center text-xs hover:bg-red-50 transition-colors border border-red-100"><i className="fa-solid fa-trash-can"></i></button>
                   )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <i className="fa-solid fa-folder-open text-slate-200 text-2xl"></i>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-8">Nenhum registro encontrado</p>
            {(filterName || filterMonth || filterStatus !== 'ALL') && (
              <button onClick={resetFilters} className="mt-4 text-blue-600 font-black text-[10px] uppercase underline">Limpar filtros</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OvertimeList;