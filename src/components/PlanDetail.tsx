import React from 'react';
import { ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { WakePlan } from '../types';
import { formatTimeDisplay } from '../utils';

interface PlanDetailProps {
  plan: WakePlan;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PlanDetail({ plan, onBack, onEdit, onDelete }: PlanDetailProps) {
  return (
    <div className="flex flex-col h-full bg-app">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-divider">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[22px] font-semibold text-primary">{plan.name || 'Wake Plan'}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="bg-white rounded-[24px] p-6 shadow-soft">
          <h2 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-2">Target Time</h2>
          <p className="text-[64px] font-semibold tracking-tighter text-primary">{formatTimeDisplay(plan.targetTime)}</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-soft">
          <h2 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-4">Schedule</h2>
          <div className="space-y-3">
            {plan.schedule.map((time, idx) => {
              let label = 'Early Wake';
              if (idx === plan.schedule.length - 1) label = 'Target Time';
              else if (idx === plan.schedule.length - 2) label = 'Final Push';
              else if (idx === 1) label = 'Reminder';

              return (
                <div key={idx} className="flex justify-between text-[16px]">
                  <span className={idx === plan.schedule.length - 1 ? 'font-semibold text-primary' : 'text-secondary'}>
                    {formatTimeDisplay(time)}
                  </span>
                  <span className={idx === plan.schedule.length - 1 ? 'font-semibold text-primary' : 'text-secondary'}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-soft">
          <h2 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-2">Reminder</h2>
          <p className="text-[16px] font-medium text-primary leading-relaxed">"{plan.reminderContent}"</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-soft">
          <h2 className="text-[13px] font-medium text-secondary uppercase tracking-wider mb-4">Settings</h2>
          <div className="space-y-3 text-[16px] text-secondary">
            <div className="flex justify-between">
              <span>Start Earlier</span>
              <span className="font-medium text-primary">{plan.startOffset} min</span>
            </div>
            <div className="flex justify-between">
              <span>Time Announcement</span>
              <span className="font-medium text-primary">{plan.timeAnnouncementEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div className="flex justify-between">
              <span>Oversleep Protection</span>
              <span className="font-medium text-primary">{plan.oversleepProtectionEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>
      </main>

      <div className="p-6 pb-8 flex gap-4">
        <button 
          onClick={onEdit}
          className="flex-1 bg-primary text-white rounded-[16px] py-4 font-medium text-[16px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-fab"
        >
          <Edit2 className="w-5 h-5" />
          Edit Plan
        </button>
        <button 
          onClick={onDelete}
          className="px-6 bg-[#F2A7A0]/20 text-[#E35D5D] rounded-[16px] font-medium flex items-center justify-center hover:bg-[#F2A7A0]/30 active:scale-[0.98] transition-all"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
