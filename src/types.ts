export interface PassChange {
  date: string;
  old: string;
  new: string;
}

export interface NotificationEvent {
  id: string;
  date: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
}

export interface ModelEvent {
  id: string;
  date: string;
  endDate?: string;
  type: 'photoshoot' | 'fashion_week' | 'local_show';
  title: string;
  status: 'pending' | 'completed' | 'missed';
}

export interface Note {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface Model {
  id: string;
  name: string;
  patronymic?: string;
  modelLogin: string;
  modelPass: string;
  phone: string;
  insta: string;
  email: string;
  finCode?: string;
  idCardNum?: string;
  signature?: string;
  status: string;
  isPending?: boolean;
  contractStart?: string | null;
  expiry: string | null;
  payExpiry: string | null;
  cat: string;
  height: string;
  weight: string;
  shoe: string;
  params: string;
  shows: string;
  imgs: string[];
  videos?: string[];
  signedContract?: string;
  contractSignedAt?: string;
  signedContracts?: Record<string, {
    signedAt: string;
    pdfBase64?: string;
    signatureDataUrl?: string;
  }>;
  passHistory?: PassChange[];
  timeSpent?: number;
  lastLogin?: string;
  events?: ModelEvent[];
  notes?: Note[];
  applicationId?: string;
}

export interface Coordinates {
  id: string; // unique string to indentify multiple same type coordinate
  type: string;
  x: number;
  y: number;
  page: number;
}

export interface ContractDocument {
  id: string;
  title: string;
  base64: string;
  markers: Coordinates[];
  assignedTo: Record<string, { contractNum: string; date: string }>;
  createdAt: string;
}

export interface Agency {
  id: string;
  name: string;
  agencySignature?: string;
  agencyStamp?: string;
  domain?: string;
  logo?: string;
  pdfLogo?: string;
  subscriptionTier: 'basic' | 'pro' | 'premium' | 'enterprise';
  status: 'active' | 'suspended';
}

export interface User {
  login: string;
  email?: string;
  hash?: string;
  pass?: string;
  timeSpent?: number;
  lastLogin?: string;
  role?: 'admin' | 'manager' | 'superadmin';
  agencyId?: string;
}

export interface Application {
  id: string;
  name: string;
  phone: string;
  insta: string;
  email: string;
  height: string;
  weight: string;
  shoe: string;
  params: string;
  imgs: string[];
  date: string;
  status: 'pending' | 'reviewed';
  answers?: { question: string; answer: string }[];
}

export interface AppState {
  lang: 'ru' | 'az' | 'en';
  logo: string;
  categories: string[];
  models: Model[];
  applications: Application[];
  users: User[];
  pdfLogo: string | null;
  agencySignature?: string | null;
  agencyStamp?: string | null;
  lastLoginTime: Record<string, Record<string, number>>;
  notifications: NotificationEvent[];
  applicationQuestions?: string[];
}
