
export enum UserRole {
  ADMIN = 'ADMIN',
  DEPT_DIRECTOR = 'DEPT_DIRECTOR',
  TECHNICIAN = 'TECHNICIAN',
  DRIVER = 'DRIVER',
  CAMERAMAN = 'CAMERAMAN',
  SECURITY = 'SECURITY',
  ALL_IN_ONE = 'ALL_IN_ONE',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SUPERVISOR = 'SUPERVISOR'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roles?: UserRole[]; 
  department?: string;
  phoneNumber?: string;
  fcmToken?: string;
  approved?: boolean;
}

export interface Item {
  name: string;
  serialNumber: string;
  quantity: number;
}
