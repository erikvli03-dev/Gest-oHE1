
export enum Location {
  GUARUJA = 'Guarujá',
  SANTOS = 'Santos'
}

export type UserRole = 'COORDINATOR' | 'SUPERVISOR' | 'EMPLOYEE';

export interface User {
  username: string;
  password?: string; // Para o sistema de login
  name: string;
  role: UserRole;
  supervisorName?: string;
}

export interface OvertimeRecord {
  id: string;
  coordinator: string;
  supervisor: string;
  employee: string;
  startDate: string;
  endDate: string;
  location: Location;
  startTime: string;
  endTime: string;
  reason: string;
  durationMinutes: number;
  createdAt: number;
  ownerUsername: string; // Para garantir que o colaborador só veja o que ele criou
}

export interface HierarchyData {
  [supervisorName: string]: string[];
}
