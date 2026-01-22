
import { GoogleGenAI } from "@google/genai";
import { OvertimeRecord } from "../types";

export const analyzeOvertimeTrends = async (records: OvertimeRecord[]) => {
  if (records.length === 0) return "Nenhum dado disponível para análise.";

  // No Vite/Netlify, as variáveis de ambiente podem ser injetadas de formas diferentes.
  // Tentamos pegar de process.env ou import.meta.env (Vite)
  const apiKey = (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return "Erro: Chave de API não configurada no ambiente de publicação.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const dataSummary = records.map(r => ({
    local: r.location,
    supervisor: r.supervisor,
    colaborador: r.employee,
    duracao: r.durationMinutes,
    motivo: r.reason,
    status: r.status,
    data: r.startDate
  }));

  const prompt = `
    Analise os registros de horas extras abaixo e retorne um relatório curto para celular:
    ${JSON.stringify(dataSummary)}

    Retorne:
    1. Motivo principal da semana.
    2. Supervisor com mais horas pendentes.
    3. Uma dica rápida para reduzir custos.

    Seja extremamente breve.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error("Erro na análise da IA:", error);
    if (!navigator.onLine) return "Sem conexão com a internet. A análise de IA requer rede ativa.";
    return "A IA está temporariamente indisponível. Verifique as configurações de rede.";
  }
};
