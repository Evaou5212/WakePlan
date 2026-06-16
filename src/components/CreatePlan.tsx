import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Check, Mic, Square, Play, X, Type, Repeat, Calendar, Volume2, Music } from 'lucide-react';
import { WakePlan, ReminderType, RepeatMode } from '../types';
import { generateSchedule, formatTimeDisplay } from '../utils';
import { playTTS } from '../tts';
import { motion, AnimatePresence } from 'motion/react';

interface CreatePlanProps {
  initialPlan?: WakePlan;
  onSave: (plan: WakePlan) => void;
  onCancel: () => void;
}

const SOUND_OPTIONS = [
  { id: '/ringtone1.mp3', name: 'Classic Alarm' },
  { id: '/ringtone2.mp3', name: 'Digital Beep' },
  { id: '/ringtone3.mp3', name: 'Short Beep' },
  { id: '/ringtone4.mp3', name: 'Piano Melody' },
  { id: '/ringtone5.mp3', name: 'Gentle Chime' },
  { id: '/ringtone6.mp3', name: 'Electronic Pulse' },
  { id: '/ringtone7.mp3', name: 'Morning Birds' },
  { id: '/ringtone8.mp3', name: 'Soft Marimba' },
];

const THEMES = [
  { id: 'blue', bg: 'bg-[#AFCBFF]', text: 'text-primary', border: 'border-[#AFCBFF]' },
  { id: 'yellow', bg: 'bg-[#F6E8A8]', text: 'text-primary', border: 'border-[#F6E8A8]' },
  { id: 'green', bg: 'bg-[#CFE7B3]', text: 'text-primary', border: 'border-[#CFE7B3]' },
  { id: 'orange', bg: 'bg-[#F5C28B]', text: 'text-primary', border: 'border-[#F5C28B]' },
  { id: 'purple', bg: 'bg-[#C9B6E4]', text: 'text-primary', border: 'border-[#C9B6E4]' },
  { id: 'red', bg: 'bg-[#F2A7A0]', text: 'text-primary', border: 'border-[#F2A7A0]' },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CreatePlan({ initialPlan, onSave, onCancel }: CreatePlanProps) {
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [targetTime, setTargetTime] = useState(initialPlan?.targetTime || '08:00');
  const [name, setName] = useState(initialPlan?.name || '');
  const [startOffset, setStartOffset] = useState(initialPlan?.startOffset || 30);
  const [alarmCount, setAlarmCount] = useState(initialPlan?.alarmCount || 4);
  const [timeAnnouncementEnabled, setTimeAnnouncementEnabled] = useState(initialPlan ? initialPlan.timeAnnouncementEnabled : true);
  const [oversleepProtectionEnabled, setOversleepProtectionEnabled] = useState(initialPlan ? initialPlan.oversleepProtectionEnabled : true);
  
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initialPlan?.repeatMode || 'once');
  const [repeatDays, setRepeatDays] = useState<number[]>(initialPlan?.repeatDays || []);
  const [colorTheme, setColorTheme] = useState(initialPlan?.colorTheme || THEMES[Math.floor(Math.random() * THEMES.length)].id);
  const [alarmSound, setAlarmSound] = useState(initialPlan?.alarmSound || '/ringtone1.mp3');
  const [alarmVolume, setAlarmVolume] = useState(initialPlan?.alarmVolume ?? 50);
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  // Step 2 State
  const [reminderType, setReminderType] = useState<ReminderType>(initialPlan?.reminderType || 'voice');
  const [reminderContent, setReminderContent] = useState(initialPlan?.reminderContent || '');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showSoundPicker && previewAudioRef.current) {
      previewAudioRef.current.pause();
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    }
  }, [showSoundPicker]);

  const playPreview = (soundId: string, volume: number) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    const audio = new Audio(soundId);
    audio.volume = volume / 100;
    audio.play().catch(console.error);
    previewAudioRef.current = audio;
    
    // Auto stop after 5 seconds
    previewTimeoutRef.current = setTimeout(() => {
      audio.pause();
    }, 5000);
  };
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices API not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        }
      }
      
      mediaRecorder.current = new MediaRecorder(stream, options);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };
      
      mediaRecorder.current.onstop = () => {
        const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setReminderContent(reader.result as string);
        };
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      setMicError("Microphone access is required. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setReminderContent('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const playAudio = () => {
    if (reminderContent.startsWith('data:audio')) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(reminderContent);
      audioRef.current.play();
    }
  };

  const toggleDay = (dayIndex: number) => {
    setRepeatDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSave = () => {
    const schedule = generateSchedule(targetTime, startOffset, alarmCount);
    const newPlan: WakePlan = {
      id: initialPlan ? initialPlan.id : Date.now().toString(),
      name,
      targetTime,
      startOffset,
      alarmCount,
      schedule,
      reminderType,
      reminderContent,
      timeAnnouncementEnabled,
      oversleepProtectionEnabled,
      isActive: initialPlan ? initialPlan.isActive : true,
      repeatMode,
      repeatDays,
      taskPool: initialPlan?.taskPool || [],
      colorTheme,
      alarmSound,
      alarmVolume
    };
    onSave(newPlan);
  };

  const activeTheme = THEMES.find(t => t.id === colorTheme) || THEMES[0];

  return (
    <div className={`flex flex-col h-full bg-app relative`}>
      <header className="px-6 pt-page-header pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[22px] font-semibold text-primary">
            {step === 1 ? 'Time & Schedule' : 'Wake-up Reminder'}
          </h1>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-black/5 rounded-full transition-colors text-secondary">
          <X className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            
            {/* Time & Name Card */}
            <div className={`${activeTheme.bg} rounded-[24px] p-8 shadow-soft transition-colors duration-300`}>
              <div className="text-center mb-6">
                <input 
                  type="time" 
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  className={`text-[56px] font-semibold tracking-tighter outline-none bg-transparent text-center w-full ${activeTheme.text}`}
                  required
                />
              </div>
              
              <div>
                <input 
                  type="text" 
                  placeholder="Plan Name (e.g., Workday)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full text-[18px] font-medium outline-none border-b-2 pb-2 transition-colors bg-transparent placeholder:opacity-50 ${activeTheme.text} ${activeTheme.border} focus:border-black/20`}
                />
              </div>
            </div>

            {/* Repeat Settings */}
            <div className="bg-white/60 rounded-[24px] p-6 shadow-soft space-y-4">
              <h3 className="text-[13px] font-medium text-secondary uppercase tracking-wider flex items-center gap-2">
                <Repeat className="w-4 h-4" /> Repeat
              </h3>
              
              <div className="flex bg-app p-1 rounded-[16px]">
                <button 
                  onClick={() => setRepeatMode('once')}
                  className={`flex-1 py-2 text-[13px] font-medium rounded-[12px] transition-all ${repeatMode === 'once' ? `bg-primary shadow-soft text-white` : 'text-secondary hover:text-primary'}`}
                >
                  Once
                </button>
                <button 
                  onClick={() => setRepeatMode('daily')}
                  className={`flex-1 py-2 text-[13px] font-medium rounded-[12px] transition-all ${repeatMode === 'daily' ? `bg-primary shadow-soft text-white` : 'text-secondary hover:text-primary'}`}
                >
                  Everyday
                </button>
                <button 
                  onClick={() => setRepeatMode('custom')}
                  className={`flex-1 py-2 text-[13px] font-medium rounded-[12px] transition-all ${repeatMode === 'custom' ? `bg-primary shadow-soft text-white` : 'text-secondary hover:text-primary'}`}
                >
                  Custom
                </button>
              </div>

              {repeatMode === 'custom' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex justify-between pt-2">
                  {DAYS.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`w-10 h-10 rounded-full font-medium text-[13px] transition-all ${repeatDays.includes(idx) ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                    >
                      {day}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Sound Settings */}
            <div className="bg-white rounded-[24px] p-6 space-y-6 shadow-soft">
              <h3 className="text-[13px] font-medium text-secondary uppercase tracking-wider flex items-center gap-2">
                <Music className="w-4 h-4" /> Alarm Sound
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary">Sound</span>
                  <button 
                    onClick={() => setShowSoundPicker(true)}
                    className="bg-app px-4 py-2 rounded-[12px] text-[13px] font-medium text-primary flex items-center gap-2"
                  >
                    {SOUND_OPTIONS.find(s => s.id === alarmSound)?.name || 'Classic Alarm'}
                    <ChevronRight className="w-4 h-4 text-secondary" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-primary flex items-center gap-2">
                      <Volume2 className="w-4 h-4" /> Volume
                    </span>
                    <span className="text-[13px] text-secondary">{alarmVolume}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={alarmVolume}
                    onChange={(e) => setAlarmVolume(Number(e.target.value))}
                    onMouseUp={() => {
                      playPreview(alarmSound, alarmVolume);
                    }}
                    onTouchEnd={() => {
                      playPreview(alarmSound, alarmVolume);
                    }}
                    className="w-full h-2 bg-app rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="bg-white rounded-[24px] p-6 space-y-6 shadow-soft">
              <h3 className="text-[13px] font-medium text-secondary uppercase tracking-wider">Schedule Settings</h3>
              
              <div className="flex justify-between items-center">
                <div>
                  <label className="block font-medium text-primary">Start Offset</label>
                  <p className="text-[11px] text-secondary">Minutes before target</p>
                </div>
                <select 
                  value={startOffset} 
                  onChange={(e) => setStartOffset(Number(e.target.value))}
                  className="bg-app border-none rounded-[12px] px-4 py-2 outline-none font-medium text-primary"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <label className="block font-medium text-primary">Alarm Count</label>
                  <p className="text-[11px] text-secondary">Total alarms in sequence</p>
                </div>
                <select 
                  value={alarmCount} 
                  onChange={(e) => setAlarmCount(Number(e.target.value))}
                  className="bg-app border-none rounded-[12px] px-4 py-2 outline-none font-medium text-primary"
                >
                  <option value={2}>2 alarms</option>
                  <option value={3}>3 alarms</option>
                  <option value={4}>4 alarms</option>
                  <option value={5}>5 alarms</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-divider">
                <div>
                  <label className="block font-medium text-primary">Time Announcement</label>
                  <p className="text-[11px] text-secondary">Speak time during alarm</p>
                </div>
                <button 
                  onClick={() => setTimeAnnouncementEnabled(!timeAnnouncementEnabled)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${timeAnnouncementEnabled ? 'bg-[#2C2C2C]' : 'bg-[#E0E0E0]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${timeAnnouncementEnabled ? 'translate-x-5' : 'translate-x-0 shadow-sm'}`} />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <label className="block font-medium text-primary">Oversleep Protection</label>
                  <p className="text-[11px] text-secondary">Require task to stop</p>
                </div>
                <button 
                  onClick={() => setOversleepProtectionEnabled(!oversleepProtectionEnabled)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${oversleepProtectionEnabled ? 'bg-[#2C2C2C]' : 'bg-[#E0E0E0]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${oversleepProtectionEnabled ? 'translate-x-5' : 'translate-x-0 shadow-sm'}`} />
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="bg-white/60 rounded-[24px] p-6 shadow-soft">
              <h3 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-4">Color Theme</h3>
              <div className="flex gap-3">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setColorTheme(theme.id)}
                    className={`w-10 h-10 rounded-full ${theme.bg} transition-transform ${colorTheme === theme.id ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'hover:scale-105'}`}
                  />
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            
            <div className="space-y-4 bg-white p-6 rounded-[24px] shadow-soft">
              <h3 className="text-[15px] font-semibold text-primary flex items-center gap-2">
                <Mic className="w-5 h-5" /> Record Voice Reminder (Recommended)
              </h3>
              <p className="text-[13px] text-secondary">Record your own voice to wake you up. Hearing your own intent is highly effective.</p>
              
              <div className="flex flex-col items-center justify-center gap-6 py-4">
                <div className="flex items-center justify-center gap-6">
                  {isRecording ? (
                    <button 
                      onClick={stopRecording}
                      className="w-24 h-24 bg-[#E35D5D] text-white rounded-full flex items-center justify-center shadow-fab animate-pulse"
                    >
                      <Square className="w-8 h-8 fill-current" />
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording}
                      className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-fab hover:scale-105 transition-transform"
                    >
                      <Mic className="w-10 h-10" />
                    </button>
                  )}
                </div>
                
                {micError && <p className="text-[13px] font-medium text-[#E35D5D] text-center max-w-xs">{micError}</p>}
                {isRecording && <p className="text-[13px] font-medium text-[#E35D5D] animate-pulse">Recording...</p>}
                
                {reminderContent.startsWith('data:audio') && !isRecording && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
                    <span className="text-[13px] font-medium text-[#6BCB77] bg-[#6BCB77]/10 px-4 py-1.5 rounded-full">Recording Saved</span>
                    <div className="flex gap-3">
                      <button 
                        onClick={playAudio}
                        className={`flex items-center gap-2 text-[13px] font-medium text-white bg-primary px-6 py-3 rounded-[12px] hover:opacity-80 transition-opacity`}
                      >
                        <Play className="w-5 h-5 fill-current" /> Play
                      </button>
                      <button 
                        onClick={deleteRecording}
                        className="flex items-center gap-2 text-[13px] font-medium text-[#E35D5D] bg-[#E35D5D]/10 px-6 py-3 rounded-[12px] hover:bg-[#E35D5D]/20 transition-colors"
                      >
                        <X className="w-5 h-5" /> Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-divider"></div>
              <span className="flex-shrink-0 mx-4 text-secondary text-[13px] font-medium">OR</span>
              <div className="flex-grow border-t border-divider"></div>
            </div>

            <div className="space-y-4 bg-white p-6 rounded-[24px] shadow-soft">
              <h3 className="text-[15px] font-semibold text-primary flex items-center gap-2">
                <Type className="w-5 h-5" /> Text-to-Speech
              </h3>
              <p className="text-[13px] text-secondary">This message will be spoken to you during alarms.</p>
              <textarea 
                value={reminderContent.startsWith('data:audio') ? '' : reminderContent}
                onChange={(e) => setReminderContent(e.target.value)}
                className="w-full h-32 p-5 bg-app border-none rounded-[16px] outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-[16px] font-medium text-primary placeholder-gray-400"
                placeholder="e.g., Wake up for your 9 AM meeting! You can do this!"
                disabled={reminderContent.startsWith('data:audio')}
              />
              {reminderContent.startsWith('data:audio') && (
                <p className="text-[11px] text-[#E35D5D] mt-1">Delete your voice recording to use text-to-speech.</p>
              )}
              <button 
                onClick={() => {
                  if (!reminderContent.startsWith('data:audio') && reminderContent) {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    playTTS(reminderContent).catch(console.error);
                  }
                }}
                disabled={reminderContent.startsWith('data:audio') || !reminderContent}
                className={`flex items-center gap-2 text-[13px] font-medium text-white bg-primary px-5 py-3 rounded-[12px] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Play className="w-4 h-4" /> Listen to Text
              </button>
            </div>

          </motion.div>
        )}
      </main>

      <div className="p-6 pb-8">
        {step === 1 ? (
          <button 
            onClick={() => setStep(2)}
            className="w-full bg-primary text-white rounded-[16px] py-4 font-medium text-[16px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-fab"
          >
            Next: Set Reminder
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={handleSave}
            className="w-full bg-primary text-white rounded-[16px] py-4 font-medium text-[16px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-fab"
          >
            <Check className="w-5 h-5" />
            {initialPlan ? 'Save Changes' : 'Activate Plan'}
          </button>
        )}
      </div>
      <AnimatePresence>
        {showSoundPicker && (
          <div className="fixed inset-0 z-50 flex justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowSoundPicker(false)}
            />
            <div className="w-full max-w-md flex flex-col justify-end relative z-10 pointer-events-none">
              <motion.div 
                initial={{ y: '100%' }} 
                animate={{ y: 0 }} 
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    setShowSoundPicker(false);
                  }
                }}
                className="bg-app rounded-t-[32px] p-6 w-full pointer-events-auto max-h-[80vh] overflow-y-auto"
              >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              <h3 className="text-[20px] font-semibold text-primary mb-6">Select Alarm Sound</h3>
              
              <div className="space-y-2">
                {SOUND_OPTIONS.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => {
                      setAlarmSound(sound.id);
                      playPreview(sound.id, alarmVolume);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-[16px] transition-colors ${alarmSound === sound.id ? 'bg-primary text-white' : 'bg-app text-primary hover:bg-gray-100'}`}
                  >
                    <span className="font-medium">{sound.name}</span>
                    {alarmSound === sound.id && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
