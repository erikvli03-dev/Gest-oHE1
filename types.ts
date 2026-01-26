
export enum Location {
  GUARUJA = 'Guarujá',
  SANTOS = 'Santos'
}

export type UserRole = 'COORDINATOR' | 'SUPERVISOR' | 'EMPLOYEE';

export type OvertimeStatus = 'REGISTERED'; // Obsoleto approval

export interface User {
  username: string;
  password?: string;
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
  reason: 'Trabalho emergencial' | 'Atraso na execução diária';
  observations?: string;
  durationMinutes: number;
  createdAt: number;
  ownerUsername: string;
  status: OvertimeStatus;
}

export interface HierarchyData {
  [supervisorName: string]: string[];
}
