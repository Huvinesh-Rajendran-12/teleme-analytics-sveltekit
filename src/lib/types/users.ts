/**
 * User Management Types
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
  organizations?: string[];
  preferences?: UserPreferences;
}

export type UserRole = 'admin' | 'user' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: boolean;
  dashboardLayout?: Record<string, unknown>;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  organizations?: string[];
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  organizations?: string[];
  preferences?: Partial<UserPreferences>;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface AuthResponse {
  user: User;
  token: string;
}
