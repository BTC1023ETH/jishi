export type TabId = 'record' | 'stats' | 'insights' | 'profile';

export type ValueScore = 'nourish' | 'neutral' | 'drain';

export type RecordSource = 'timer' | 'manual' | 'sleep';

export interface Framework {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Subcategory {
  id: string;
  frameworkId: string;
  name: string;
  order: number;
}

export interface TimeRecord {
  id?: string;
  startAt: number;
  endAt: number;
  durationMin: number;
  frameworkId: string;
  subcategoryId: string;
  note: string;
  valueScore: ValueScore | null;
  source: RecordSource;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  sleepStart: string; // '23:00'
  sleepEnd: string; // '07:00'
  timeoutInterval: '1h' | '4h' | 'off';
  forgotStopReminder: boolean;
}

export interface UserProfile {
  email: string;
  syncedAt?: number;
}

export interface ActiveSession {
  startAt: number;
}
