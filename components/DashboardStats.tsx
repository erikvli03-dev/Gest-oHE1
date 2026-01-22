
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { OvertimeRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';

interface DashboardStatsProps {
  records: OvertimeRecord[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ records }) => {
  // Stats logic
  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === 'PENDING').length,
    approved: records.filter(r => r.status === 'APPROVED').length,
    totalMinutes: records.reduce((acc, r) => acc + (r.status === 'APPROVED' ? r.durationMinutes : 0), 0)
  };

  const supervisorHoursMap: { [key: string]: number } = {};
  const statusDataMap = {
    'Pendentes': records.filter(r => r.status === 'PENDING').length,
    'Aprovados': records.filter(r => r.status === 'APPROVED').length,
    'Recusados': records.filter(r => r.status === 'REJECTED').length,
  };

  records.forEach(r => {
    if (r.status === 'APPROVED') {
      supervisorHoursMap[r.supervisor] = (supervisorHoursMap[r.supervisor] || 0) + r.durationMinutes;
    }
  });

  const supervisorData = Object.keys(supervisorHoursMap).map(name => ({
    name,
    totalMinutes: supervisorHoursMap[name],
    // Mantemos o valor numérico para a altura da barra, mas formatamos a exibição
    hoursDecimal: parseFloat((supervisorHoursMap[name] / 60).toFixed(2))
  }));

  const statusPieData = Object.keys(statusDataMap).map(name => ({
    name,
    value: statusDataMap[name as keyof typeof statusDataMap]
  })).filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316'];

  // Formatador para o Tooltip do gráfico de barras
  const formatTooltipValue = (value: number, name: string, props: any) => {
    const minutes = props.payload.totalMinutes;
    return [formatDuration(minutes), "Total de Horas"];
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Lançado</p>
          <p className="text-xl font-black text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aguardando</p>
          <p className="text-xl font-black text-blue-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aprovados</p>
          <p className="text-xl font-black text-emerald-600">{stats.approved}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Horas Pagas</p>
          <p className="text-lg font-black text-white">{formatDuration(stats.totalMinutes)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Horas por Supervisor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Horas Aprovadas por Supervisor</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supervisorData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  formatter={formatTooltipValue}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Bar dataKey="hoursDecimal" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza - Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Status de Aprovação</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
