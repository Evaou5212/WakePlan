export type ReminderType = 'text' | 'voice';
export type TaskType = 'hold' | 'tap' | 'math' | 'rhythm' | 'type' | 'pattern';
export type RepeatMode = 'once' | 'daily' | 'custom';

export interface TaskConfig {
  holdSeconds: number;
  holdRounds: number;
  tapCount: number;
  tapRounds: number;
  mathProblems: number;
  mathDifficulty: 'easy' | 'medium' | 'hard';
  rhythmRounds: number;
  rhythmDifficulty: 'easy' | 'medium' | 'hard';
  typeRounds: number;
  typeLength: 'short' | 'medium' | 'long';
  patternRounds: number;
  patternDifficulty: 'easy' | 'medium' | 'hard';
}

export interface WakePlan {
  id: string;
  name: string;
  targetTime: string;
  startOffset: number;
  alarmCount: number;
  schedule: string[];
  reminderType: ReminderType;
  reminderContent: string; // text or base64 audio
  timeAnnouncementEnabled: boolean;
  oversleepProtectionEnabled: boolean;
  isActive: boolean;
  repeatMode: RepeatMode;
  repeatDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  taskPool: TaskType[]; // If empty, use global
  taskMode?: 'random_all' | 'custom';
  colorTheme?: string;
  taskConfig?: TaskConfig;
  alarmSound?: string;
  alarmVolume?: number;
}

export interface GlobalSettings {
  taskMode: 'random_all' | 'custom';
  activeTasks: TaskType[];
  applyTo: 'all' | 'specific';
  specificPlanIds: string[];
  useGlobalTasks: boolean;
  taskConfig: TaskConfig;
}

export interface WakeHistoryEntry {
  id: string;
  planName: string;
  time: string;
  status: 'completed' | 'missed';
  wakeUpTime?: string;
  targetTime?: string;
  alarmRingAt?: string;
  firstRingTime?: string;
  timeToWakeUpSeconds?: number;
  sessionSnoozes?: number;
}

export interface AppStats {
  wakeSuccess: number;
  snoozeCount: number;
  history: WakeHistoryEntry[];
}

export type ViewState = 'home' | 'create' | 'edit' | 'detail' | 'alarm' | 'task';
export type TabState = 'plans' | 'library' | 'status';
