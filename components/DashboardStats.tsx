import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { OvertimeRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';

interface DashboardStatsProps {
  records: OvertimeRecord[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ records }) => {
  const totalMinutes = records.reduce((acc, r) => acc + r.durationMinutes, 0);

  const supervisorHoursMap: { [key: string]: number } = {};
  const reasonDataMap: { [key: string]: number } = {};

  records.forEach(r => {
    supervisorHoursMap[r.supervisor] = (supervisorHoursMap[r.supervisor] || 0) + r.durationMinutes;
    reasonDataMap[r.reason] = (reasonDataMap[r.reason] || 0) + 1;
  });

  const supervisorData = Object.keys(supervisorHoursMap).map(name => ({
    name,
    totalMinutes: supervisorHoursMap[name],
    hoursDecimal: parseFloat((supervisorHoursMap[name] / 60).toFixed(2))
  }));

  const reasonPieData = Object.keys(reasonDataMap).map(name => ({
    name,
    value: reasonDataMap[name]
  })).filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444'];

  const formatTooltipValue = (value: number, name: string, props: any) => {
    const minutes = props.payload.totalMinutes;
    return [formatDuration(minutes), "Tempo Total"];
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Registros Totais</p>
          <p className="text-2xl font-black text-slate-800">{records.length}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tempo Acumulado</p>
          <p className="text-xl font-black text-white">{formatDuration(totalMinutes)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Horas por Supervisor */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-6">Horas por Supervisor</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supervisorData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  formatter={formatTooltipValue}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Bar dataKey="hoursDecimal" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Motivos */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-6">Motivos de HE</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reasonPieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reasonPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {reasonPieData.map((d, i) => (
               <div key={d.name} className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                 <span className="text-[9px] font-bold text-slate-500 uppercase">{d.name} ({d.value})</span>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;