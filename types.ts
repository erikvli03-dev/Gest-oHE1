
export enum Location {
  GUARUJA = 'Guarujá',
  SANTOS = 'Santos'
}

export type UserRole = 'COORDINATOR' | 'SUPERVISOR' | 'EMPLOYEE';

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
  reason: string;
  durationMinutes: number;
  createdAt: number;
  ownerUsername: string;
  status: OvertimeStatus; // Novo campo
}

export interface HierarchyData {
  [supervisorName: string]: string[];
}
