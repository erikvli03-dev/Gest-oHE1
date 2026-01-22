
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { OvertimeRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';

interface DashboardStatsProps {
  records: OvertimeRecord[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ records }) => {
  // Horas totais por Supervisor
  const supervisorHoursMap: { [key: string]: number } = {};
  // Registros por Localidade
  const locationDataMap: { [key: string]: number } = { 'Guarujá': 0, 'Santos': 0 };

  records.forEach(r => {
    // Soma minutos e depois converte para horas decimais no gráfico
    supervisorHoursMap[r.supervisor] = (supervisorHoursMap[r.supervisor] || 0) + r.durationMinutes;
    locationDataMap[r.location] = (locationDataMap[r.location] || 0) + 1;
  });

  const supervisorData = Object.keys(supervisorHoursMap).map(name => ({
    name,
    totalMinutes: supervisorHoursMap[name],
    // Horas decimais para o gráfico (ex: 1h30m = 1.5)
    hours: parseFloat((supervisorHoursMap[name] / 60).toFixed(2))
  }));

  const locationData = Object.keys(locationDataMap).map(name => ({
    name,
    value: locationDataMap[name]
  }));

  const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs">
          <p className="font-bold text-slate-800 mb-1">{payload[0].payload.name}</p>
          <p className="text-blue-600 font-bold">Total: {formatDuration(payload[0].payload.totalMinutes)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Horas Totais por Supervisor</h3>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">EM HORAS</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supervisorData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40}>
                {supervisorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Distribuição de Chamados</h3>
        <div className="h-64 flex">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={locationData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {locationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center gap-4 pr-4">
            {locationData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs text-slate-600 font-bold">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
