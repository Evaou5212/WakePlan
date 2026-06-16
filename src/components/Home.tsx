import React, { useState, useEffect } from 'react';
import { Plus, Clock, ChevronDown, ChevronUp, Trash2, Settings2, X, Bell } from 'lucide-react';
import { WakePlan } from '../types';
import { formatTimeDisplay, getNextAlarmInfo, formatCountdown } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface HomeProps {
  plans: WakePlan[];
  onToggle: (id: string) => void;
  onCreateNew: () => void;
  onViewDetail: (id: string) => void;
  onEditPlan: (id: string) => void;
  onDeletePlan: (id: string) => void;
}

const THEMES: Record<string, { bg: string, text: string, border: string, toggle: string }> = {
  blue: { bg: 'bg-[#AFCBFF]', text: 'text-primary', border: 'border-[#AFCBFF]', toggle: 'bg-[#8BAFF5]' },
  yellow: { bg: 'bg-[#F6E8A8]', text: 'text-primary', border: 'border-[#F6E8A8]', toggle: 'bg-[#E5D487]' },
  green: { bg: 'bg-[#CFE7B3]', text: 'text-primary', border: 'border-[#CFE7B3]', toggle: 'bg-[#B2D18E]' },
  orange: { bg: 'bg-[#F5C28B]', text: 'text-primary', border: 'border-[#F5C28B]', toggle: 'bg-[#E3A869]' },
  purple: { bg: 'bg-[#C9B6E4]', text: 'text-primary', border: 'border-[#C9B6E4]', toggle: 'bg-[#B099D1]' },
  red: { bg: 'bg-[#F2A7A0]', text: 'text-primary', border: 'border-[#F2A7A0]', toggle: 'bg-[#E08D85]' },
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Home({ plans, onToggle, onCreateNew, onViewDetail, onEditPlan, onDeletePlan }: HomeProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nextAlarm, setNextAlarm] = useState<any>(null);
  const [isManaging, setIsManaging] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      setNextAlarm(getNextAlarmInfo(plans));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [plans]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isManaging) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  const renderRecurrence = (plan: WakePlan, theme: any) => {
    if (plan.repeatMode === 'once') {
      return <span className={`text-[13px] font-medium ${theme.text} ${!plan.isActive && 'opacity-70'}`}>Once</span>;
    }
    if (plan.repeatMode === 'daily') {
      return <span className={`text-[13px] font-medium ${theme.text} ${!plan.isActive && 'opacity-70'}`}>Everyday</span>;
    }
    return (
      <div className="flex gap-1.5">
        {DAYS.map((day, idx) => {
          const isActive = (plan.repeatDays || []).includes(idx);
          return (
            <span key={idx} className={`text-[13px] font-medium ${theme.text} ${isActive ? '' : 'opacity-30'}`}>
              {day}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-app relative">
      {/* Floating Action Button */}
      <button 
        onClick={onCreateNew}
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-fab hover:scale-105 transition-transform flex items-center justify-center z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      <header className="px-6 pt-page-header pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-semibold text-primary tracking-tight">WakePlan</h1>
          <p className="text-[13px] text-secondary mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsManaging(!isManaging)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isManaging ? 'bg-primary text-white' : 'bg-[#C9B6E4] text-[#5A3A8A] shadow-soft hover:opacity-80'}`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
        {/* Next Alarm Countdown */}
        <div className="flex flex-col items-center justify-center text-center py-2 min-h-[120px]">
          <AnimatePresence mode="wait">
            {nextAlarm ? (
              <motion.div 
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[13px] font-medium text-secondary mb-1">Next Alarm In</p>
                <h2 className="text-[48px] font-semibold text-primary mb-1 tracking-tight">
                  {formatCountdown(nextAlarm.diffSeconds)}
                </h2>
                <p className="text-[13px] font-medium text-secondary">
                  {nextAlarm.planName} • {formatTimeDisplay(nextAlarm.time)}
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-[22px] font-semibold text-primary mb-1">No Active Alarms</h2>
                <p className="text-[13px] text-secondary">Tap + to create a wake plan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          <h3 className="text-[13px] font-medium text-secondary px-2">Your Plans</h3>
          <AnimatePresence>
            {plans.map(plan => {
              const isExpanded = expandedId === plan.id;
              const theme = THEMES[plan.colorTheme || 'blue'] || THEMES.blue;

              return (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  key={plan.id} 
                  className={`rounded-[24px] transition-all overflow-hidden relative shadow-soft ${theme.bg} ${!plan.isActive ? 'opacity-60 grayscale-[0.2]' : ''}`}
                >
                  {/* Card Header */}
                  <div 
                    className={`p-5 ${!isManaging ? 'cursor-pointer' : ''}`}
                    onClick={(e) => toggleExpand(plan.id, e)}
                  >
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1"
                        onClick={(e) => {
                          if (isManaging) return;
                          e.stopPropagation();
                          onViewDetail(plan.id);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className={`text-[32px] font-semibold tracking-tight ${theme.text} ${!isManaging && 'hover:opacity-80'} transition-opacity`}>
                            {formatTimeDisplay(plan.targetTime)}
                          </h2>
                          {!plan.isActive && <span className="text-[11px] bg-white/50 px-2 py-1 rounded-md text-primary">OFF</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <p className={`text-[16px] font-medium ${theme.text}`}>
                            {plan.name || 'Daily Routine'}
                          </p>
                          <div className={`w-1 h-1 rounded-full ${theme.text} opacity-50`} />
                          {renderRecurrence(plan, theme)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-4" onClick={e => e.stopPropagation()}>
                        {isManaging ? (
                          <button 
                            onClick={() => onDeletePlan(plan.id)}
                            className="w-10 h-10 bg-white/50 text-[#E35D5D] rounded-full flex items-center justify-center hover:bg-white/80 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggle(plan.id);
                            }}
                            className={`w-12 h-7 rounded-full p-1 transition-colors ${plan.isActive ? theme.toggle : 'bg-white/50'}`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${plan.isActive ? 'translate-x-5' : 'translate-x-0 shadow-sm'}`} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <p className={`text-[13px] ${theme.text} opacity-80`}>
                        Starts at {formatTimeDisplay(plan.schedule[0])} • {plan.alarmCount} steps
                      </p>
                      {!isManaging && (
                        <button className={`p-1.5 rounded-full bg-white/30 ${theme.text} hover:bg-white/50 transition-colors`}>
                          {expandedId === plan.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedId === plan.id && !isManaging && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`border-t border-white/30`}
                      >
                        <div className="p-5 space-y-3">
                          {plan.schedule.map((time, idx) => {
                            let label = 'Early Wake';
                            if (idx === plan.schedule.length - 1) label = 'Target Time';
                            else if (idx === plan.schedule.length - 2) label = 'Final Push';
                            else if (idx === 1) label = 'Reminder';

                            return (
                              <div key={idx} className="flex items-center gap-4 text-[16px]">
                                <div className={`w-2 h-2 rounded-full ${idx === plan.schedule.length - 1 ? 'bg-primary' : 'bg-primary/30'}`} />
                                <span className={`font-medium ${idx === plan.schedule.length - 1 ? 'text-primary' : `${theme.text} opacity-90`}`}>
                                  {formatTimeDisplay(time)}
                                </span>
                                <span className={`text-[13px] ${idx === plan.schedule.length - 1 ? 'text-primary font-medium' : `${theme.text} opacity-70`}`}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                          
                          <div className="pt-4 mt-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditPlan(plan.id);
                              }}
                              className="w-full bg-white/60 py-3 rounded-[16px] font-medium text-[16px] flex items-center justify-center gap-2 hover:bg-white/80 transition-colors text-primary"
                            >
                              Edit Plan
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
