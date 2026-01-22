
export const calculateDuration = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  
  return Math.floor(diffMs / (1000 * 60)); // Retorna em minutos
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};
