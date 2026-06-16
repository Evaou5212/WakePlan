import { GlobalSettings, AppStats, WakePlan, WakeHistoryEntry } from './types';

export function generateSchedule(targetTime: string, startOffset: number, alarmCount: number): string[] {
  if (alarmCount <= 1) return [targetTime];

  const [hours, minutes] = targetTime.split(':').map(Number);
  const targetMinutes = hours * 60 + minutes;
  const startMinutes = targetMinutes - startOffset;
  
  const interval = startOffset / (alarmCount - 1);
  const schedule: string[] = [];

  for (let i = 0; i < alarmCount; i++) {
    const currentMins = Math.round(startMinutes + i * interval);
    const normalizedMins = (currentMins + 24 * 60) % (24 * 60);
    const h = Math.floor(normalizedMins / 60).toString().padStart(2, '0');
    const m = (normalizedMins % 60).toString().padStart(2, '0');
    schedule.push(`${h}:${m}`);
  }

  return schedule;
}

export function formatTimeDisplay(time24: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function getRemainingMinutes(currentTime: string, targetTime: string): number {
  const [ch, cm] = currentTime.split(':').map(Number);
  const [th, tm] = targetTime.split(':').map(Number);
  
  let currentMins = ch * 60 + cm;
  let targetMins = th * 60 + tm;
  
  if (targetMins < currentMins) {
    targetMins += 24 * 60;
  }
  
  return targetMins - currentMins;
}

export function getNextAlarmInfo(plans: any[]) {
  const now = new Date();
  let nextAlarm = null;
  let minDiff = Infinity;

  for (const plan of plans) {
    if (!plan.isActive) continue;

    for (let i = 0; i < plan.schedule.length; i++) {
      const time = plan.schedule[i];
      const [h, m] = time.split(':').map(Number);
      
      // Check next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + dayOffset);
        checkDate.setHours(h, m, 0, 0);
        
        const diff = checkDate.getTime() - now.getTime();
        
        if (diff <= 0) continue; // Already passed

        // Check if this day is allowed
        const dayOfWeek = checkDate.getDay();
        let allowed = false;
        if (plan.repeatMode === 'daily') allowed = true;
        else if (plan.repeatMode === 'once' && dayOffset <= 1) allowed = true; // Can be today or tomorrow
        else if (plan.repeatMode === 'custom' && plan.repeatDays?.includes(dayOfWeek)) allowed = true;
        // Fallback for older plans without repeatMode
        else if (!plan.repeatMode && dayOffset <= 1) allowed = true;

        if (allowed && diff < minDiff) {
          minDiff = diff;
          let label = 'Early Wake';
          if (i === plan.schedule.length - 1) label = 'Target Time';
          else if (i === plan.schedule.length - 2) label = 'Final Push';
          else if (i === 1) label = 'Reminder';

          nextAlarm = {
            planId: plan.id,
            planName: plan.name || 'Wake Plan',
            time,
            label,
            diffSeconds: Math.floor(diff / 1000)
          };
          break; // Found the earliest for this specific schedule item, move to next
        }
      }
    }
  }

  return nextAlarm;
}

export function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Settings & Stats Management
export const getSettings = (): GlobalSettings => {
  const s = localStorage.getItem('wakeSettings');
  const defaultSettings: GlobalSettings = { 
    taskMode: 'random_all', 
    activeTasks: ['hold', 'tap', 'math', 'rhythm', 'type', 'pattern'], 
    applyTo: 'all', 
    specificPlanIds: [],
    useGlobalTasks: true,
    taskConfig: {
      holdSeconds: 3,
      holdRounds: 1,
      tapCount: 15,
      tapRounds: 1,
      mathProblems: 1,
      mathDifficulty: 'easy',
      rhythmRounds: 3,
      rhythmDifficulty: 'easy',
      typeRounds: 1,
      typeLength: 'short',
      patternRounds: 1,
      patternDifficulty: 'easy'
    }
  };
  if (!s) return defaultSettings;
  try {
    const parsed = JSON.parse(s);
    return { ...defaultSettings, ...parsed };
  } catch (e) {
    return defaultSettings;
  }
};

export const saveSettings = (s: GlobalSettings) => localStorage.setItem('wakeSettings', JSON.stringify(s));

export const getStats = (): AppStats => {
  const s = localStorage.getItem('wakeStats');
  if (!s) return { wakeSuccess: 0, snoozeCount: 0, history: [] };
  try {
    const parsed = JSON.parse(s);
    return {
      wakeSuccess: parsed.wakeSuccess || 0,
      snoozeCount: parsed.snoozeCount || 0,
      history: parsed.history || []
    };
  } catch (e) {
    return { wakeSuccess: 0, snoozeCount: 0, history: [] };
  }
};

export const saveStats = (s: AppStats) => {
  localStorage.setItem('wakeStats', JSON.stringify(s));
  window.dispatchEvent(new Event('wakeStatsUpdated'));
};

interface WakeSession {
  planId: string;
  planName: string;
  targetTime: string;
  firstRingTime: string;
  startedAt: number;
  snoozeCount: number;
  dateKey: string;
}

function sessionKey(planId: string) {
  return `wakeSession_${planId}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function beginWakeSession(plan: WakePlan, ringTime?: string) {
  const dateKey = todayKey();
  const key = sessionKey(plan.id);
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) {
      const s: WakeSession = JSON.parse(existing);
      if (s.dateKey === dateKey) return;
    }
  } catch {
    // ignore corrupt session
  }

  const firstRingTime = ringTime ?? plan.schedule[0] ?? plan.targetTime;

  sessionStorage.setItem(
    key,
    JSON.stringify({
      planId: plan.id,
      planName: plan.name || 'Wake Plan',
      targetTime: plan.schedule[plan.schedule.length - 1],
      firstRingTime,
      startedAt: Date.now(),
      snoozeCount: 0,
      dateKey,
    } satisfies WakeSession)
  );
}

function getWakeSession(planId: string): WakeSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(planId));
    if (!raw) return null;
    const s: WakeSession = JSON.parse(raw);
    if (s.dateKey !== todayKey()) return null;
    return s;
  } catch {
    return null;
  }
}

function incrementWakeSessionSnooze(planId: string) {
  const session = getWakeSession(planId);
  if (!session) return;
  session.snoozeCount += 1;
  sessionStorage.setItem(sessionKey(planId), JSON.stringify(session));
}

function clearWakeSession(planId: string) {
  sessionStorage.removeItem(sessionKey(planId));
}

function buildHistoryEntry(
  planName: string,
  status: 'completed' | 'missed',
  planId?: string
): WakeHistoryEntry {
  const now = new Date();
  const wakeUpTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const entry: WakeHistoryEntry = {
    id: Date.now().toString(),
    planName,
    time: now.toISOString(),
    status,
    wakeUpTime,
  };

  if (planId) {
    const session = getWakeSession(planId);
    if (session) {
      entry.targetTime = session.targetTime;
      entry.firstRingTime = session.firstRingTime;
      entry.alarmRingAt = new Date(session.startedAt).toISOString();
      entry.timeToWakeUpSeconds = Math.round((Date.now() - session.startedAt) / 1000);
      entry.sessionSnoozes = session.snoozeCount;
      if (status === 'completed') clearWakeSession(planId);
    } else {
      entry.timeToWakeUpSeconds = 0;
      entry.sessionSnoozes = 0;
    }
  }

  return entry;
}

export const recordSnooze = (planName: string, planId?: string) => {
  if (planId) incrementWakeSessionSnooze(planId);
  const s = getStats();
  s.snoozeCount += 1;
  if (!s.history) s.history = [];
  s.history.unshift(buildHistoryEntry(planName, 'missed', planId));
  if (s.history.length > 50) s.history.pop();
  saveStats(s);
};

export const recordWake = (planName: string, planId?: string) => {
  const s = getStats();
  s.wakeSuccess += 1;
  if (!s.history) s.history = [];
  s.history.unshift(buildHistoryEntry(planName, 'completed', planId));
  if (s.history.length > 50) s.history.pop();
  saveStats(s);
};

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (m < 60) return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function minutesFromTarget(wakeUpTime: string, targetTime: string): number {
  const [wh, wm] = wakeUpTime.split(':').map(Number);
  const [th, tm] = targetTime.split(':').map(Number);
  return wh * 60 + wm - (th * 60 + tm);
}

export function formatScheduleOffset(minutes: number): string {
  if (minutes === 0) return 'On target';
  if (minutes > 0) return `+${minutes} min late`;
  return `${Math.abs(minutes)} min early`;
}

function isSameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return (
    d.getDate() === date.getDate() &&
    d.getMonth() === date.getMonth() &&
    d.getFullYear() === date.getFullYear()
  );
}

export function getLast7Days() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return { date: d, day: days[d.getDay()], isToday: i === 6 };
  });
}

export function getCompletedWakeForDay(history: WakeHistoryEntry[], date: Date) {
  return getCompletedWakesForDay(history, date)[0];
}

export function getCompletedWakesForDay(history: WakeHistoryEntry[], date: Date) {
  return history
    .filter(h => h.status === 'completed' && isSameDay(h.time, date))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

function timeOnDate(hhmm: string, ref: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  return d;
}

export function historyEntryToWakeSession(entry: WakeHistoryEntry) {
  const completedAt = new Date(entry.time);
  if (entry.wakeUpTime) {
    const [h, m] = entry.wakeUpTime.split(':').map(Number);
    completedAt.setHours(h, m, 0, 0);
  }

  const seconds = entry.timeToWakeUpSeconds ?? 0;

  let alarmAt: Date;
  if (entry.alarmRingAt) {
    alarmAt = new Date(entry.alarmRingAt);
  } else if (seconds > 0) {
    alarmAt = new Date(completedAt.getTime() - seconds * 1000);
  } else if (entry.firstRingTime) {
    alarmAt = timeOnDate(entry.firstRingTime, completedAt);
    if (alarmAt.getTime() > completedAt.getTime()) {
      alarmAt.setDate(alarmAt.getDate() - 1);
    }
  } else {
    alarmAt = completedAt;
  }
  return {
    id: entry.id,
    planName: entry.planName,
    completedAt,
    alarmAt,
    durationSeconds: seconds,
    sessionSnoozes: entry.sessionSnoozes ?? 0,
    alarmTimeLabel: formatTimeDisplay(
      `${alarmAt.getHours().toString().padStart(2, '0')}:${alarmAt.getMinutes().toString().padStart(2, '0')}`
    ),
    wakeTimeLabel: entry.wakeUpTime
      ? formatTimeDisplay(entry.wakeUpTime)
      : formatTimeDisplay(
          `${completedAt.getHours().toString().padStart(2, '0')}:${completedAt.getMinutes().toString().padStart(2, '0')}`
        ),
    durationLabel: formatDuration(seconds),
  };
}

export function wakeTimeToPercent(hhmm: string, minHour = 0, maxHour = 12): number {
  const [h, m] = hhmm.split(':').map(Number);
  const mins = h * 60 + m;
  const min = minHour * 60;
  const max = maxHour * 60;
  const pct = ((mins - min) / (max - min)) * 100;
  return Math.min(98, Math.max(2, pct));
}
