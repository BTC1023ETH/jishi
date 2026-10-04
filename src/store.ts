import { create } from 'zustand';
import { db } from './db';
import type { ActiveSession, Settings, TabId, UserProfile, ValueScore, RecordSource } from './types';
import { DEFAULT_SETTINGS } from './constants';

export interface ArchiveDraft {
  startAt: number;
  endAt: number;
  durationMin: number;
  source: RecordSource;
  presetFrameworkId?: string;
  presetSubcategoryId?: string;
  presetValueScore?: ValueScore | null;
  presetNote?: string;
}

interface AppStore {
  tab: TabId;
  activeSession: ActiveSession | null;
  settings: Settings;
  user: UserProfile | null;
  toast: string | null;
  archiveDraft: ArchiveDraft | null;
  sleepSheetOpen: boolean;
  loginOpen: boolean;
  editRecordId: string | null;
  hydrated: boolean;

  setTab: (t: TabId) => void;
  hydrate: () => Promise<void>;
  startTimer: (at?: number) => Promise<void>;
  stopTimer: () => Promise<void>;
  stopTimerAt: (endAt: number) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setUser: (u: UserProfile | null) => Promise<void>;
  showToast: (msg: string) => void;
  setArchiveDraft: (d: ArchiveDraft | null) => void;
  setSleepSheetOpen: (b: boolean) => void;
  setLoginOpen: (b: boolean) => void;
  setEditRecordId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  tab: 'record',
  activeSession: null,
  settings: DEFAULT_SETTINGS,
  user: null,
  toast: null,
  archiveDraft: null,
  sleepSheetOpen: false,
  loginOpen: false,
  editRecordId: null,
  hydrated: false,

  setTab: (tab) => set({ tab }),

  hydrate: async () => {
    try {
      const [session, settings, user] = await Promise.all([
        db.meta.get('activeSession'),
        db.meta.get('settings'),
        db.meta.get('user'),
      ]);
      set({
        activeSession: (session?.value as ActiveSession) ?? null,
        settings: { ...DEFAULT_SETTINGS, ...((settings?.value as Settings) ?? {}) },
        user: (user?.value as UserProfile) ?? null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  startTimer: async (at) => {
    const session: ActiveSession = { startAt: at ?? Date.now() };
    await db.meta.put({ key: 'activeSession', value: session });
    set({ activeSession: session });
  },

  stopTimer: async () => {
    const { activeSession } = get();
    if (!activeSession) return;
    const endAt = Date.now();
    const durationMin = Math.max(1, Math.round((endAt - activeSession.startAt) / 60000));
    await db.meta.delete('activeSession');
    set({
      activeSession: null,
      archiveDraft: {
        startAt: activeSession.startAt,
        endAt,
        durationMin,
        source: 'timer',
      },
    });
  },

  stopTimerAt: async (endAt) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const durationMin = Math.max(1, Math.round((endAt - activeSession.startAt) / 60000));
    await db.meta.delete('activeSession');
    set({
      activeSession: null,
      archiveDraft: {
        startAt: activeSession.startAt,
        endAt,
        durationMin,
        source: 'timer',
      },
    });
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await db.meta.put({ key: 'settings', value: next });
  },

  setUser: async (u) => {
    set({ user: u });
    if (u) await db.meta.put({ key: 'user', value: u });
    else await db.meta.delete('user');
  },

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set((s) => (s.toast === msg ? { toast: null } : s)), 2400);
  },

  setArchiveDraft: (d) => set({ archiveDraft: d }),
  setSleepSheetOpen: (b) => set({ sleepSheetOpen: b }),
  setLoginOpen: (b) => set({ loginOpen: b }),
  setEditRecordId: (id) => set({ editRecordId: id }),
}));
