export enum UserRole {
  ADMIN = 'ADMIN',
  SECRETARIAT = 'SECRETARIAT',
  REVIEWER = 'REVIEWER',
  COMMITTEE = 'COMMITTEE'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  institution?: string;
  lastLogin?: string;
}

export interface AuthResponse {
  status: string;
  token: string;
  data: {
    user: User;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}