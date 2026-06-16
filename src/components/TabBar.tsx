import React from 'react';
import { Clock, Library as LibraryIcon, Activity } from 'lucide-react';
import { TabState } from '../types';

interface TabBarProps {
  currentTab: TabState;
  onChange: (tab: TabState) => void;
}

export default function TabBar({ currentTab, onChange }: TabBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#F8F6F0]/90 backdrop-blur-md border-t border-divider pb-safe z-50">
      <div className="tab-bar-inner px-6 flex justify-between items-center">
        <button 
          onClick={() => onChange('plans')}
          className={`flex flex-col items-center gap-1 flex-1 transition-colors ${currentTab === 'plans' ? 'text-primary' : 'text-disabled hover:text-secondary'}`}
        >
          <Clock className="w-6 h-6" />
          <span className="text-[11px] font-medium tracking-wide">Plans</span>
        </button>
        
        <button 
          onClick={() => onChange('library')}
          className={`flex flex-col items-center gap-1 flex-1 transition-colors ${currentTab === 'library' ? 'text-primary' : 'text-disabled hover:text-secondary'}`}
        >
          <LibraryIcon className="w-6 h-6" />
          <span className="text-[11px] font-medium tracking-wide">Library</span>
        </button>
        
        <button 
          onClick={() => onChange('status')}
          className={`flex flex-col items-center gap-1 flex-1 transition-colors ${currentTab === 'status' ? 'text-primary' : 'text-disabled hover:text-secondary'}`}
        >
          <Activity className="w-6 h-6" />
          <span className="text-[11px] font-medium tracking-wide">Insights</span>
        </button>
      </div>
    </div>
  );
}
