
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { OvertimeRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { analyzeOvertimeTrends } from '../services/geminiService';

interface DashboardStatsProps {
  records: OvertimeRecord[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ records }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

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
    hours: parseFloat((supervisorHoursMap[name] / 60).toFixed(2))
  }));

  const statusPieData = Object.keys(statusDataMap).map(name => ({
    name,
    value: statusDataMap[name as keyof typeof statusDataMap]
  })).filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316'];

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeOvertimeTrends(records);
    setAiInsight(result);
    setIsAnalyzing(false);
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
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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

      {/* AI Intelligence Panel */}
      <div className="bg-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl">
                <i className="fa-solid fa-microchip"></i>
              </div>
              <div>
                <h3 className="font-bold text-xl">Análise de Gestão (IA)</h3>
                <p className="text-indigo-200 text-xs">Identificação automática de gargalos e motivos recorrentes</p>
              </div>
            </div>
            <button
              onClick={handleAIAnalysis}
              disabled={isAnalyzing || records.length === 0}
              className="bg-white text-indigo-700 px-6 py-3 rounded-2xl font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
              {isAnalyzing ? 'Processando Dados...' : 'Gerar Insights'}
            </button>
          </div>

          {aiInsight && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {aiInsight}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
