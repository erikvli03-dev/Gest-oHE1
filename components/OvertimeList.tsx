
import React, { useState, useMemo } from 'react';
import { OvertimeRecord, User } from '../types';
import { formatDuration } from '../utils/timeUtils';

interface OvertimeListProps {
  records: OvertimeRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: OvertimeRecord) => void;
  currentUser: User;
}

const OvertimeList: React.FC<OvertimeListProps> = ({ records, onDelete, onEdit, currentUser }) => {
  const [filterName, setFilterName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let isVisible = false;
      if (currentUser.role === 'COORDINATOR') isVisible = true;
      else if (currentUser.role === 'SUPERVISOR') isVisible = r.supervisor === currentUser.name;
      else isVisible = r.ownerUsername === currentUser.username;

      if (!isVisible) return false;

      const matchesName = r.employee.toLowerCase().includes(filterName.toLowerCase());
      
      let matchesMonth = true;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        const recordDate = new Date(r.startDate);
        matchesMonth = recordDate.getFullYear() === parseInt(year) && (recordDate.getMonth() + 1) === parseInt(month);
      }

      return matchesName && matchesMonth;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [records, filterName, filterMonth, currentUser]);

  const totalMinutes = filteredRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const canModify = (record: OvertimeRecord) => {
    if (currentUser.role === 'COORDINATOR') return true;
    if (currentUser.role === 'SUPERVISOR' && record.supervisor === currentUser.name) return true;
    if (record.ownerUsername === currentUser.username) return true;
    return false;
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Data Inicio', 'Hora Inicio', 'Data Fim', 'Hora Fim', 'Supervisor', 'Colaborador', 'Local', 'Duracao (min)', 'Motivo'];
    const rows = filteredRecords.map(r => [
      new Date(r.startDate).toLocaleDateString('pt-BR'),
      r.startTime,
      new Date(r.endDate).toLocaleDateString('pt-BR'),
      r.endTime,
      r.supervisor,
      r.employee,
      r.location,
      r.durationMinutes,
      `"${r.reason.replace(/"/g, '""')}"`
    ]);
    const csvContent = ["\ufeff" + headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_HE_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-blue-600"></i>
              Registros Lançados
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Total filtrado: <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-1">{formatDuration(totalMinutes)}</span>
            </p>
          </div>
          
          {(currentUser.role === 'COORDINATOR' || currentUser.role === 'SUPERVISOR') && (
            <button 
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg cursor-pointer border-none"
            >
              <i className="fa-solid fa-file-excel pointer-events-none"></i>
              Exportar CSV
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Filtrar por nome..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          </div>
          <div className="relative">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <div key={record.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group overflow-hidden flex flex-col h-full border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-slate-900 leading-tight truncate">{record.employee}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Supervisor: {record.supervisor}</p>
                </div>
                
                {canModify(record) && (
                  <div className="flex gap-2 shrink-0 relative z-30">
                    {/* EDITAR */}
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        onEdit(record); 
                      }} 
                      className="text-blue-600 hover:bg-blue-50 w-10 h-10 flex items-center justify-center rounded-xl border border-blue-100 bg-white transition-all shadow-sm active:scale-90 cursor-pointer"
                      title="Editar"
                    >
                      <i className="fa-solid fa-pen text-sm pointer-events-none"></i>
                    </button>

                    {/* EXCLUIR COM CONFIRMAÇÃO VISUAL */}
                    {deletingId !== record.id ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingId(record.id);
                          // Reset automático após 3 segundos
                          setTimeout(() => setDeletingId(null), 3000);
                        }} 
                        className="text-red-600 hover:bg-red-50 w-10 h-10 flex items-center justify-center rounded-xl border border-red-100 bg-white transition-all shadow-sm active:scale-90 cursor-pointer"
                        title="Excluir"
                      >
                        <i className="fa-solid fa-trash-can text-sm pointer-events-none"></i>
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={(e) => confirmDelete(e, record.id)} 
                        className="bg-red-600 text-white px-2 h-10 flex items-center justify-center rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none text-[10px] font-black uppercase animate-pulse"
                        title="Clique para confirmar exclusão"
                      >
                        Apagar?
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl mb-3 flex items-center justify-between border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Duração Total</span>
                  <div className="text-blue-700 font-extrabold text-sm">
                    {formatDuration(record.durationMinutes)}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Local</span>
                   <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-600">
                     {record.location}
                   </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg italic border-l-2 border-slate-200">
                  {record.reason}
                </div>
              </div>
              
              <div className="mt-4 pt-2 border-t border-slate-100 text-[9px] text-slate-400 flex justify-between items-center">
                <span>Início: {new Date(record.startDate).toLocaleDateString('pt-BR')} {record.startTime}</span>
                <span>Fim: {new Date(record.endDate).toLocaleDateString('pt-BR')} {record.endTime}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium">Nenhum registro encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OvertimeList;
