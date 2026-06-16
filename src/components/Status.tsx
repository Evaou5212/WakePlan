import { useState, useEffect, useMemo } from 'react';
import { Trophy, Clock, Zap, Target, CheckCircle } from 'lucide-react';
import { AppStats } from '../types';
import {
  getStats,
  formatTimeDisplay,
  formatDuration,
  formatScheduleOffset,
  minutesFromTarget,
  getLast7Days,
  getCompletedWakesForDay,
  historyEntryToWakeSession,
} from '../utils';

function minutesToHhmm(mins: number): string {
  const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function minutesToPercent(mins: number, min: number, max: number): number {
  if (max <= min) return 50;
  return ((mins - min) / (max - min)) * 100;
}

const PLOT_INSET_PCT = 12;

function minutesToPlotPercent(mins: number, min: number, max: number): number {
  const raw = minutesToPercent(mins, min, max);
  const inner = 100 - PLOT_INSET_PCT * 2;
  return PLOT_INSET_PCT + (raw / 100) * inner;
}

function timeToAxisMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function hhmmToAxisMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function collectChartTimePoints(
  history: AppStats['history'],
  weekDates: Date[]
): number[] {
  const inWeek = (iso: string) => {
    const d = new Date(iso);
    return weekDates.some(
      wd =>
        d.getDate() === wd.getDate() &&
        d.getMonth() === wd.getMonth() &&
        d.getFullYear() === wd.getFullYear()
    );
  };

  const points: number[] = [];
  for (const entry of history) {
    if (entry.status !== 'completed' || !inWeek(entry.time)) continue;

    const session = historyEntryToWakeSession(entry);
    points.push(timeToAxisMinutes(session.alarmAt));
    points.push(timeToAxisMinutes(session.completedAt));

    if (entry.wakeUpTime) points.push(hhmmToAxisMinutes(entry.wakeUpTime));
    if (entry.firstRingTime) points.push(hhmmToAxisMinutes(entry.firstRingTime));
    if (entry.alarmRingAt) points.push(timeToAxisMinutes(new Date(entry.alarmRingAt)));
    if (entry.targetTime) points.push(hhmmToAxisMinutes(entry.targetTime));
  }
  return points;
}

function computeChartTimeRange(points: number[]) {
  if (points.length === 0) return null;

  let dataMin = Math.min(...points);
  let dataMax = Math.max(...points);

  const dataSpan = Math.max(dataMax - dataMin, 0);
  const padding = dataSpan <= 3 ? 45 : Math.max(35, Math.ceil(dataSpan * 0.15));

  let min = dataMin - padding;
  let max = dataMax + padding;

  const minWindow = 90;
  if (max - min < minWindow) {
    const mid = (dataMin + dataMax) / 2;
    min = mid - minWindow / 2;
    max = mid + minWindow / 2;
  }

  min = Math.max(0, min);
  max = Math.min(24 * 60, max);

  if (dataMin < min) min = Math.max(0, dataMin - 30);
  if (dataMax > max) max = Math.min(24 * 60, dataMax + 30);
  if (max <= min) max = Math.min(24 * 60, min + minWindow);

  const mid = (min + max) / 2;
  return {
    min,
    max,
    labelTop: formatTimeDisplay(minutesToHhmm(Math.floor(max))),
    labelMid: formatTimeDisplay(minutesToHhmm(Math.round(mid))),
    labelBottom: formatTimeDisplay(minutesToHhmm(Math.ceil(min))),
  };
}

function dotVisualSize(durationSeconds: number): number {
  const minSize = 8;
  const maxSize = 32;
  const maxDuration = 900;
  if (durationSeconds <= 0) return minSize;
  const t = Math.min(durationSeconds / maxDuration, 1);
  return Math.round(minSize + (maxSize - minSize) * Math.sqrt(t));
}

export default function Status() {
  const [stats, setStats] = useState<AppStats>({ wakeSuccess: 0, snoozeCount: 0, history: [] });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setStats(getStats());
    refresh();
    window.addEventListener('wakeStatsUpdated', refresh);
    return () => window.removeEventListener('wakeStatsUpdated', refresh);
  }, []);

  const completedWakes = useMemo(
    () => stats.history.filter(h => h.status === 'completed'),
    [stats.history]
  );

  const totalAlarms = stats.wakeSuccess + stats.history.filter(h => h.status === 'missed').length;
  const successRate = totalAlarms > 0 ? Math.round((stats.wakeSuccess / totalAlarms) * 100) : 0;

  const weekDays = useMemo(() => getLast7Days(), []);

  const chartDays = useMemo(() => {
    return weekDays.map(({ date, day, isToday }) => ({
      day,
      isToday,
      sessions: getCompletedWakesForDay(stats.history, date).map(historyEntryToWakeSession),
    }));
  }, [stats.history, weekDays]);

  const allSessions = useMemo(
    () => chartDays.flatMap(d => d.sessions),
    [chartDays]
  );

  const weekDates = useMemo(() => weekDays.map(d => d.date), [weekDays]);

  const timeRange = useMemo(() => {
    const points = collectChartTimePoints(stats.history, weekDates);
    return computeChartTimeRange(points);
  }, [stats.history, weekDates]);

  const chartDaysWithLayout = useMemo(() => {
    if (!timeRange) {
      return chartDays.map(d => ({ ...d, dots: [] as (ReturnType<typeof historyEntryToWakeSession> & {
        dotBottomPct: number;
        dotSize: number;
        dotLeftPct: number;
      })[] }));
    }

    return chartDays.map(dayCol => {
      const count = dayCol.sessions.length;
      const dots = dayCol.sessions.map((session, j) => {
        const alarmMins = timeToAxisMinutes(session.alarmAt);
        const dotBottomPct = minutesToPlotPercent(alarmMins, timeRange.min, timeRange.max);
        const dotLeftPct = count === 1 ? 50 : ((j + 0.5) / count) * 100;

        return {
          ...session,
          dotBottomPct,
          dotSize: dotVisualSize(session.durationSeconds),
          dotLeftPct,
        };
      });

      return { ...dayCol, dots };
    });
  }, [chartDays, timeRange]);

  const selectedSession = useMemo(
    () => allSessions.find(s => s.id === selectedSessionId) ?? null,
    [allSessions, selectedSessionId]
  );

  const firstTryRate = useMemo(() => {
    const withSnoozeData = completedWakes.filter(w => w.sessionSnoozes != null);
    if (withSnoozeData.length === 0) return null;
    const firstTry = withSnoozeData.filter(w => w.sessionSnoozes === 0).length;
    return { firstTry, total: withSnoozeData.length };
  }, [completedWakes]);

  const scheduleOffset = useMemo(() => {
    const withTarget = completedWakes.filter(w => w.wakeUpTime && w.targetTime);
    if (withTarget.length === 0) return null;
    const avgDelta = Math.round(
      withTarget.reduce((sum, w) => sum + minutesFromTarget(w.wakeUpTime!, w.targetTime!), 0) /
        withTarget.length
    );
    return formatScheduleOffset(avgDelta);
  }, [completedWakes]);

  const noSnoozeStreak = useMemo(() => {
    let streak = 0;
    for (const entry of completedWakes) {
      if (entry.sessionSnoozes === 0) streak++;
      else break;
    }
    return streak;
  }, [completedWakes]);

  return (
    <div className="flex flex-col h-full bg-app">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-[22px] font-semibold text-primary tracking-tight">Insights</h1>
        <p className="text-[13px] font-medium text-secondary mt-1">Your wake-up patterns</p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#F6E8A8] rounded-[24px] p-6 shadow-soft">
            <Trophy className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-[32px] font-semibold tracking-tighter text-primary">{successRate}%</h3>
            <p className="text-[11px] font-medium text-primary opacity-70 uppercase tracking-wider mt-1">Success Rate</p>
          </div>
          <div className="bg-[#F5C28B] rounded-[24px] p-6 shadow-soft">
            <Clock className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-[32px] font-semibold tracking-tighter text-primary">{stats.snoozeCount}</h3>
            <p className="text-[11px] font-medium text-primary opacity-70 uppercase tracking-wider mt-1">Total Snoozes</p>
          </div>
        </div>

        <div className="bg-[#AFCBFF] rounded-[24px] p-6 shadow-soft space-y-4">
          <h3 className="text-[13px] font-medium text-primary opacity-70 uppercase tracking-wider">
            Weekly Wake Overview
          </h3>

          <div className="relative h-64">
            {timeRange ? (
              <>
                {selectedSession && (
                  <div className="absolute top-0 left-14 right-1 z-20 bg-white rounded-[16px] px-4 py-3 shadow-soft text-[12px] text-primary">
                    <div className="space-y-1 text-primary/80">
                      <div>Woke up · {selectedSession.wakeTimeLabel}</div>
                      <div>Time to wake · {selectedSession.durationLabel}</div>
                    </div>
                  </div>
                )}

                <div className="absolute left-0 top-4 bottom-10 flex flex-col justify-between text-[10px] text-primary/45 font-medium w-12 leading-none pointer-events-none">
                  <span>{timeRange.labelTop}</span>
                  <span>{timeRange.labelMid}</span>
                  <span>{timeRange.labelBottom}</span>
                </div>

                <div
                  className="ml-14 mr-1 grid grid-cols-7 gap-0.5 px-1 pt-2 pb-3"
                  style={{ height: 'calc(100% - 28px)' }}
                  onClick={() => setSelectedSessionId(null)}
                >
                  {chartDaysWithLayout.map((dayCol, i) => (
                    <div key={i} className="relative h-full">
                      {dayCol.dots.length > 0 ? (
                        dayCol.dots.map(dot => (
                            <button
                              key={dot.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSessionId(selectedSessionId === dot.id ? null : dot.id);
                              }}
                              className="absolute z-10 flex items-center justify-center border-0 bg-transparent p-0 outline-none shadow-none ring-0 appearance-none"
                              style={{
                                bottom: `${dot.dotBottomPct}%`,
                                left: `${dot.dotLeftPct}%`,
                                width: 44,
                                height: 44,
                                transform: 'translate(-50%, 50%)',
                              }}
                              aria-label={`Alarm at ${dot.alarmTimeLabel} on ${dayCol.day}`}
                            >
                              <span
                                style={{
                                  width: dot.dotSize,
                                  height: dot.dotSize,
                                  minWidth: dot.dotSize,
                                  minHeight: dot.dotSize,
                                  borderRadius: '50%',
                                  backgroundColor: '#1A1A1A',
                                  border: 'none',
                                  outline: 'none',
                                  boxShadow: 'none',
                                  display: 'block',
                                  flexShrink: 0,
                                  aspectRatio: '1 / 1',
                                }}
                              />
                            </button>
                          ))
                      ) : (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(26,26,26,0.1)]" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="ml-14 mr-1 grid grid-cols-7 gap-0.5 px-1 mt-2">
                  {chartDaysWithLayout.map((dayCol, i) => (
                    <span
                      key={i}
                      className={`text-center text-[11px] font-medium ${dayCol.isToday ? 'text-primary' : 'text-primary/55'}`}
                    >
                      {dayCol.day}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-[13px] text-primary/50 pb-6">
                Complete an alarm to see your wake chart
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#C9B6E4] rounded-[24px] p-6 shadow-soft space-y-4">
          <h3 className="text-[13px] font-medium text-primary opacity-70 uppercase tracking-wider">
            Highlights
          </h3>

          <div className="space-y-5">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <span className="font-medium text-[16px] text-primary block">First-Try Rate</span>
                <span className="text-[11px] text-primary/60">Woke without snoozing</span>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-primary">
              {firstTryRate ? `${firstTryRate.firstTry}/${firstTryRate.total}` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <span className="font-medium text-[16px] text-primary block">vs Target Time</span>
                <span className="text-[11px] text-primary/60">Average schedule offset</span>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-primary">{scheduleOffset ?? '—'}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <span className="font-medium text-[16px] text-primary block">No-Snooze Streak</span>
                <span className="text-[11px] text-primary/60">Consecutive clean wakes</span>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-primary">
              {noSnoozeStreak > 0 ? `${noSnoozeStreak} day${noSnoozeStreak > 1 ? 's' : ''}` : '—'}
            </span>
          </div>
          </div>
        </div>

        <div className="bg-[#CFE7B3] rounded-[24px] p-6 shadow-soft space-y-4">
          <h3 className="text-[13px] font-medium text-primary opacity-70 uppercase tracking-wider">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {stats.history.length === 0 ? (
              <p className="text-[13px] text-primary opacity-70 text-center py-4">
                Complete an alarm to see your data here.
              </p>
            ) : (
              stats.history.slice(0, 5).map((item) => {
                const date = new Date(item.time);
                const wakeLabel = item.wakeUpTime
                  ? formatTimeDisplay(item.wakeUpTime)
                  : formatTimeDisplay(`${date.getHours()}:${date.getMinutes()}`);
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-[16px] bg-white/50">
                    <div>
                      <div className="font-medium text-[16px] text-primary">{item.planName}</div>
                      <div className="text-[11px] text-primary opacity-70 mt-1">
                        {date.toLocaleDateString()} · Up at {wakeLabel}
                        {item.timeToWakeUpSeconds != null && (
                          <> · {formatDuration(item.timeToWakeUpSeconds)} to wake</>
                        )}
                        {item.sessionSnoozes != null && item.sessionSnoozes > 0 && (
                          <> · {item.sessionSnoozes} snooze{item.sessionSnoozes > 1 ? 's' : ''}</>
                        )}
                      </div>
                    </div>
                    {item.status === 'completed' ? (
                      <div className="flex items-center gap-1 text-primary bg-white/80 px-3 py-1.5 rounded-[12px] text-[11px] font-medium shadow-sm">
                        <CheckCircle className="w-4 h-4" /> Up
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-primary opacity-70 bg-white/40 px-3 py-1.5 rounded-[12px] text-[11px] font-medium">
                        <Clock className="w-4 h-4" /> Snoozed
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
