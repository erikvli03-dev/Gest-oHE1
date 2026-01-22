
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

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let isVisible = false;
      if (currentUser.role === 'COORDINATOR') isVisible = true;
      else if (currentUser.role === 'SUPERVISOR') isVisible = r.supervisor === currentUser.name;
      else isVisible = r.ownerUsername === currentUser.username;

      if (!isVisible) return false;

      const matchesName = r.employee.toLowerCase().includes(filterName.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
      
      let matchesMonth = true;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        const recordDate = new Date(r.startDate);
        matchesMonth = recordDate.getFullYear() === parseInt(year) && (recordDate.getMonth() + 1) === parseInt(month);
      }

      return matchesName && matchesMonth && matchesStatus;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [records, filterName, filterMonth, filterStatus, currentUser]);

  const totalMinutes = filteredRecords.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const canModify = (record: OvertimeRecord) => {
    if (currentUser.role === 'COORDINATOR') return true;
    if (currentUser.role === 'SUPERVISOR' && record.supervisor === currentUser.name) return true;
    if (record.ownerUsername === currentUser.username && record.status === 'PENDING') return true;
    return false;
  };

  const getStatusBadge = (status: OvertimeStatus) => {
    switch (status) {
      case 'PENDING': return <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200 uppercase">Pendente</span>;
      case 'APPROVED': return <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 uppercase">Aprovado</span>;
      case 'REJECTED': return <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200 uppercase">Recusado</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-blue-600"></i>
              Histórico de Lançamentos
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Filtrado: <span className="font-bold text-blue-600">{formatDuration(totalMinutes)}</span>
            </p>
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">Pendentes</option>
            <option value="APPROVED">Aprovados</option>
            <option value="REJECTED">Recusados</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Filtrar colaborador..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full outline-none"
          />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <div key={record.id} className={`bg-white p-5 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-all ${
              record.status === 'PENDING' ? 'border-l-blue-500' : 
              record.status === 'APPROVED' ? 'border-l-emerald-500' : 'border-l-red-500'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold text-slate-900 leading-tight">{record.employee}</h4>
                    {getStatusBadge(record.status)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Supervisor: {record.supervisor}</p>
                </div>
                
                <div className="flex gap-2">
                  {/* Approval Actions for Supervisors/Coordinator */}
                  {(currentUser.role === 'COORDINATOR' || currentUser.role === 'SUPERVISOR') && record.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => onUpdateStatus(record.id, 'APPROVED')}
                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Aprovar"
                      >
                        <i className="fa-solid fa-check text-xs"></i>
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(record.id, 'REJECTED')}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        title="Recusar"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </>
                  )}
                  
                  {canModify(record) && (
                    <>
                      <button 
                        onClick={() => onEdit(record)} 
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                      <button 
                        onClick={() => {
                          if (deletingId === record.id) {
                            onDelete(record.id);
                            setDeletingId(null);
                          } else {
                            setDeletingId(record.id);
                            setTimeout(() => setDeletingId(null), 3000);
                          }
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          deletingId === record.id ? 'bg-red-600 text-white' : 'bg-slate-50 text-red-500 border border-slate-200'
                        }`}
                      >
                        <i className={`fa-solid ${deletingId === record.id ? 'fa-question' : 'fa-trash-can'} text-xs`}></i>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Duração</span>
                  <span className="text-blue-700 font-extrabold text-sm">{formatDuration(record.durationMinutes)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Local</span>
                  <span className="text-slate-700 font-bold text-sm">{record.location}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50/50 p-3 rounded-xl border-l-4 border-slate-200 mb-3 italic">
                {record.reason}
              </div>
              
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
                <span>Início: {new Date(record.startDate).toLocaleDateString('pt-BR')} {record.startTime}</span>
                <span>Fim: {new Date(record.endDate).toLocaleDateString('pt-BR')} {record.endTime}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium">Nenhum registro para exibir.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OvertimeList;
