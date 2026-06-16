import React, { useEffect, useRef } from 'react';
import { Bell, Clock, CheckCircle2 } from 'lucide-react';
import { WakePlan } from '../types';
import { formatTimeDisplay, recordSnooze, recordWake } from '../utils';
import { generateTTSAudioUrl } from '../tts';
import { motion } from 'motion/react';

interface AlarmScreenProps {
  plan: WakePlan;
  alarmIndex: number;
  isActive: boolean;
  onSnooze: () => void;
  onStop: () => void;
  onRequireTask: () => void;
}

export default function AlarmScreen({ plan, alarmIndex, isActive, onSnooze, onStop, onRequireTask }: AlarmScreenProps) {
  const isTargetAlarm = alarmIndex === plan.schedule.length - 1;
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isUnmounted = false;
    const volume = (plan.alarmVolume ?? 50) / 100;

    if (!bgAudioRef.current) {
      const globalBg = document.getElementById('global-bg-audio') as HTMLAudioElement;
      if (globalBg) {
        bgAudioRef.current = globalBg;
        bgAudioRef.current.src = plan.alarmSound || '/ringtone1.mp3';
        bgAudioRef.current.loop = true;
      } else {
        bgAudioRef.current = new Audio(plan.alarmSound || '/ringtone1.mp3');
        bgAudioRef.current.loop = true;
      }
    } else {
      // Just in case it's a new plan
      bgAudioRef.current.src = plan.alarmSound || '/ringtone1.mp3';
    }

    const playVoice = () => {
      if (isUnmounted || !isActive) return;
      if (bgAudioRef.current) bgAudioRef.current.volume = volume * 0.2; // ducking

      if (plan.reminderContent.startsWith('data:audio')) {
        if (!voiceAudioRef.current) {
          const globalVoice = document.getElementById('global-voice-audio') as HTMLAudioElement;
          voiceAudioRef.current = globalVoice || new Audio();
        }
        voiceAudioRef.current.src = plan.reminderContent;
        voiceAudioRef.current.onended = () => {
          if (isUnmounted || !isActive) return;
          if (bgAudioRef.current) bgAudioRef.current.volume = volume;
          timeoutRef.current = setTimeout(playVoice, 3000);
        };
        voiceAudioRef.current.play().catch(e => {
          console.error("Voice play failed:", e);
          if (isUnmounted || !isActive) return;
          if (bgAudioRef.current) bgAudioRef.current.volume = volume;
          timeoutRef.current = setTimeout(playVoice, 3000);
        });
      } else if (plan.reminderContent || plan.timeAnnouncementEnabled) {
        let text = plan.reminderContent || '';
        if (plan.timeAnnouncementEnabled) {
          const now = new Date();
          text = `It is ${formatTimeDisplay(`${now.getHours()}:${now.getMinutes()}`)}. ${text}`;
        }
        
        const playCachedTTS = async () => {
          const url = await generateTTSAudioUrl(text);

          if (url) {
            if (!voiceAudioRef.current) {
              voiceAudioRef.current = document.getElementById('global-voice-audio') as HTMLAudioElement || new Audio();
            }
            voiceAudioRef.current.src = url;
            voiceAudioRef.current.onended = () => {
              if (isUnmounted || !isActive) return;
              const globalBg = document.getElementById('global-bg-audio') as HTMLAudioElement;
              if (globalBg) globalBg.volume = volume;
              timeoutRef.current = setTimeout(playVoice, 3000);
            };
            voiceAudioRef.current.play().catch(e => {
              console.error("TTS play failed:", e);
              if (isUnmounted || !isActive) return;
              const globalBg = document.getElementById('global-bg-audio') as HTMLAudioElement;
              if (globalBg) globalBg.volume = volume;
              timeoutRef.current = setTimeout(playVoice, 3000);
            });
          } else {
            // Fallback to speechSynthesis if network fails or no key
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.rate = 0.9;
              utterance.onend = () => {
                if (isUnmounted || !isActive) return;
                const globalBg = document.getElementById('global-bg-audio') as HTMLAudioElement;
                if (globalBg) globalBg.volume = volume;
                timeoutRef.current = setTimeout(playVoice, 3000);
              };
              utterance.onerror = () => {
                if (isUnmounted || !isActive) return;
                const globalBg = document.getElementById('global-bg-audio') as HTMLAudioElement;
                if (globalBg) globalBg.volume = volume;
                timeoutRef.current = setTimeout(playVoice, 3000);
              };
              window.speechSynthesis.speak(utterance);
            }
          }
        };
        
        playCachedTTS();
      } else {
        if (bgAudioRef.current) bgAudioRef.current.volume = volume;
      }
    };

    if (isActive) {
      if (bgAudioRef.current) {
        bgAudioRef.current.volume = volume;
        if (bgAudioRef.current.paused) {
          bgAudioRef.current.play().catch(e => console.error("BG Audio play failed:", e));
        }
      }

      if (plan.reminderContent || plan.timeAnnouncementEnabled) {
        playVoice();
      }
    } else {
      if (bgAudioRef.current) {
        // Mute instead of pause to keep audio unlocked and playing on iOS
        bgAudioRef.current.volume = 0;
      }
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }

    return () => {
      isUnmounted = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // If unmounting conceptually, stop completely.
      // But we just pause here to be safe and reuse if it mounts again quickly.
    };
  }, [plan, isActive]);

  // Handle final complete unmount cleanup
  useEffect(() => {
    return () => {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current.src = '';
      }
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.src = '';
      }
    };
  }, []);

  const handleSnooze = () => {
    recordSnooze(plan.name || 'Wake Plan', plan.id);
    onSnooze();
  };

  const handleStop = () => {
    if (isTargetAlarm && !plan.oversleepProtectionEnabled) {
      recordWake(plan.name || 'Wake Plan', plan.id);
    }
    onStop();
  };

  return (
    <div className="flex flex-col h-full bg-app text-primary relative overflow-hidden">
      {/* Background Pulse */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-96 h-96 rounded-full blur-3xl bg-primary/10" />
      </motion.div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center bg-white p-12 rounded-[32px] shadow-soft w-full max-w-sm"
        >
          <Bell className="w-16 h-16 mx-auto mb-6 text-primary animate-bounce" />
          <h1 className="text-[64px] font-semibold tracking-tighter mb-4 text-primary">
            {formatTimeDisplay(plan.schedule[alarmIndex])}
          </h1>
          <p className="text-[18px] font-medium text-secondary">
            {plan.name || 'Wake Plan'}
          </p>
          <div className="mt-6 inline-block px-4 py-1.5 rounded-full bg-app border border-divider text-[11px] font-medium tracking-wider uppercase text-secondary">
            {isTargetAlarm ? 'Target Time' : `Alarm ${alarmIndex + 1} of ${plan.schedule.length}`}
          </div>
        </motion.div>
      </main>

      <div className="p-6 pb-12 space-y-4 z-10 w-full max-w-md mx-auto">
        {!isTargetAlarm ? (
          <>
            <button 
              onClick={handleSnooze}
              className="w-full bg-white text-primary border border-divider rounded-[16px] py-5 font-medium text-[16px] hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-soft"
            >
              <Clock className="w-6 h-6" />
              Snooze (5m)
            </button>
            <button 
              onClick={handleStop}
              className="w-full bg-primary text-white rounded-[16px] py-5 font-medium text-[16px] hover:opacity-90 active:scale-[0.98] transition-all shadow-fab"
            >
              Stop Alarm
            </button>
          </>
        ) : (
          plan.oversleepProtectionEnabled ? (
            <button 
              onClick={onRequireTask}
              className="w-full bg-primary text-white rounded-[16px] py-6 font-medium text-[16px] hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-fab"
            >
              <CheckCircle2 className="w-7 h-7" />
              Complete Task to Stop
            </button>
          ) : (
            <button 
              onClick={handleStop}
              className="w-full bg-primary text-white rounded-[16px] py-6 font-medium text-[16px] hover:opacity-90 active:scale-[0.98] transition-all shadow-fab"
            >
              Stop Final Alarm
            </button>
          )
        )}
      </div>
    </div>
  );
}
