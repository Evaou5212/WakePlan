import React, { useState, useEffect } from 'react';
import { Settings2, Hand, MousePointerClick, Calculator, Check, ChevronDown, X, Activity, Type as TypeIcon, Grid3X3, MousePointer2 } from 'lucide-react';
import { GlobalSettings, TaskType, WakePlan, TaskConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const HandPointerIcon = ({ className }: { className?: string }) => (
  <img src="/hand-pointer.png" alt="Pointer" className={className} />
);

const RhythmExample = ({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) => {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let pattern = [800, 800, 800];
    if (difficulty === 'medium') pattern = [600, 400, 600, 400];
    if (difficulty === 'hard') pattern = [400, 200, 400, 200, 600];

    let isActive = true;
    const play = async () => {
      while (isActive) {
        setFlash(true);
        await new Promise(r => setTimeout(r, 150));
        if (!isActive) break;
        setFlash(false);
        for (const interval of pattern) {
          await new Promise(r => setTimeout(r, interval - 150));
          if (!isActive) break;
          setFlash(true);
          await new Promise(r => setTimeout(r, 150));
          if (!isActive) break;
          setFlash(false);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    play();
    return () => { isActive = false; };
  }, [difficulty]);

  return (
    <div className={`w-12 h-12 rounded-full transition-colors duration-100 ${flash ? 'bg-primary' : 'bg-divider'}`} />
  );
};

const PatternExample = ({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) => {
  const [activeDots, setActiveDots] = useState<number[]>([]);
  
  useEffect(() => {
    let pattern = [0, 1, 4, 5];
    if (difficulty === 'medium') pattern = [0, 3, 4, 1, 2, 5];
    if (difficulty === 'hard') pattern = [0, 1, 2, 5, 8, 7, 4, 3];

    let isActive = true;
    const play = async () => {
      while (isActive) {
        setActiveDots([]);
        await new Promise(r => setTimeout(r, 500));
        for (const dot of pattern) {
          if (!isActive) break;
          setActiveDots(prev => [...prev, dot]);
          await new Promise(r => setTimeout(r, 400));
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    play();
    return () => { isActive = false; };
  }, [difficulty]);

  return (
    <div className="grid grid-cols-3 gap-4 relative p-4">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className={`w-3 h-3 rounded-full transition-all duration-200 ${activeDots.includes(i) ? 'bg-primary scale-125' : 'bg-divider'}`} />
      ))}
      {activeDots.length > 0 && (
        <motion.div
          className="absolute w-8 h-8 z-20 drop-shadow-md"
          initial={{ rotate: -45 }}
          animate={{
            x: 16 + (activeDots[activeDots.length - 1] % 3) * 28, // 16px padding + index * (12px width + 16px gap) = 28px
            y: 16 + Math.floor(activeDots[activeDots.length - 1] / 3) * 28
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <HandPointerIcon className="w-full h-full text-primary" />
        </motion.div>
      )}
    </div>
  );
};

interface LibraryProps {
  settings: GlobalSettings;
  plans: WakePlan[];
  onUpdateSettings: (settings: GlobalSettings) => void;
  onUpdatePlan: (plan: WakePlan) => void;
}

const TASKS: { id: TaskType; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'hold',
    title: 'Hold Button',
    desc: 'Press and hold continuously for 3s',
    icon: <Hand className="w-6 h-6" />
  },
  {
    id: 'tap',
    title: 'Rapid Tap',
    desc: 'Tap the screen 15 times fast',
    icon: <MousePointerClick className="w-6 h-6" />
  },
  {
    id: 'math',
    title: 'Math Problem',
    desc: 'Solve a simple equation',
    icon: <Calculator className="w-6 h-6" />
  },
  {
    id: 'rhythm',
    title: 'Rhythm Tap',
    desc: 'Tap to the flashing rhythm',
    icon: <Activity className="w-6 h-6" />
  },
  {
    id: 'type',
    title: 'Type Phrase',
    desc: 'Type the displayed text',
    icon: <TypeIcon className="w-6 h-6" />
  },
  {
    id: 'pattern',
    title: 'Pattern Lock',
    desc: 'Observe and draw the pattern',
    icon: <Grid3X3 className="w-6 h-6" />
  }
];

const TASK_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  hold: { bg: 'bg-[#D0E3FF]', text: 'text-[#2B5A9B]', border: 'border-[#A1C4FD]' },
  tap: { bg: 'bg-[#FADAC6]', text: 'text-[#8A4A24]', border: 'border-[#F5BCA0]' },
  math: { bg: 'bg-[#E3D4F4]', text: 'text-[#5A3A8A]', border: 'border-[#CDB4EA]' },
  rhythm: { bg: 'bg-[#CFE7B3]', text: 'text-[#4A7A24]', border: 'border-[#A1C4FD]' },
  type: { bg: 'bg-[#F6E8A8]', text: 'text-[#8A7A24]', border: 'border-[#F5BCA0]' },
  pattern: { bg: 'bg-[#F2A7A0]', text: 'text-[#8A2A24]', border: 'border-[#F5BCA0]' }
};

export default function Library({ settings, plans, onUpdateSettings, onUpdatePlan }: LibraryProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(plans.length > 0 ? plans[0].id : 'global');
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);

  const useGlobal = settings.useGlobalTasks;
  const isGlobal = useGlobal || selectedTargetId === 'global';
  const currentPlan = isGlobal ? null : plans.find(p => p.id === selectedTargetId);

  const currentTaskMode = isGlobal 
    ? settings.taskMode 
    : (currentPlan?.taskMode || 'random_all');

  const activeTasks = isGlobal 
    ? (settings.activeTasks || [])
    : (currentPlan?.taskPool || []);

  const rawConfig = isGlobal
    ? settings.taskConfig
    : (currentPlan?.taskConfig || settings.taskConfig);

  const currentTaskConfig = {
    holdSeconds: 3,
    holdRounds: 1,
    tapCount: 15,
    tapRounds: 1,
    mathProblems: 1,
    mathDifficulty: 'easy' as const,
    rhythmRounds: 3,
    rhythmDifficulty: 'easy' as const,
    typeRounds: 1,
    typeLength: 'short' as const,
    patternRounds: 1,
    patternDifficulty: 'easy' as const,
    ...rawConfig
  };

  const handleTaskModeChange = (mode: 'random_all' | 'custom') => {
    if (isGlobal) {
      onUpdateSettings({ ...settings, taskMode: mode });
    } else if (currentPlan) {
      onUpdatePlan({ ...currentPlan, taskMode: mode });
    }
  };

  const toggleGlobal = () => {
    onUpdateSettings({ ...settings, useGlobalTasks: !settings.useGlobalTasks });
  };

  const updateTaskConfig = (updates: Partial<TaskConfig>) => {
    if (isGlobal) {
      onUpdateSettings({ ...settings, taskConfig: { ...settings.taskConfig, ...updates } });
    } else if (currentPlan) {
      onUpdatePlan({ ...currentPlan, taskConfig: { ...(currentPlan.taskConfig || settings.taskConfig), ...updates } });
    }
  };

  const toggleTask = (taskId: TaskType) => {
    if (currentTaskMode === 'random_all') return; // Disabled when random_all

    const updated = activeTasks.includes(taskId) 
      ? activeTasks.filter(id => id !== taskId)
      : [...activeTasks, taskId];
    
    if (updated.length === 0) return; // Ensure at least one task is active

    if (isGlobal) {
      onUpdateSettings({ ...settings, activeTasks: updated });
    } else if (currentPlan) {
      onUpdatePlan({ ...currentPlan, taskPool: updated });
    }
  };

  return (
    <div className="flex flex-col h-full bg-app">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Task Library</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          Select which tasks appear when an alarm requires dismissal.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        
        {/* Global Toggle */}
        <div className="bg-white/60 p-6 rounded-[24px] shadow-soft flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[16px] text-primary">Use Global Settings</h2>
            <p className="text-[13px] text-secondary mt-1">Apply same tasks to all alarms</p>
          </div>
          <button 
            onClick={toggleGlobal}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${useGlobal ? 'bg-[#2C2C2C]' : 'bg-[#E0E0E0]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${useGlobal ? 'translate-x-5' : 'translate-x-0 shadow-sm'}`} />
          </button>
        </div>

        {/* Target Selector */}
        {!useGlobal && plans.length > 0 && (
          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-secondary uppercase tracking-wider px-2">Configure For</label>
            <div className="relative">
              <select 
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full appearance-none bg-white border-none rounded-[24px] px-6 py-4 font-semibold text-[16px] text-primary shadow-soft outline-none"
              >
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.name || 'Wake Plan'} - {plan.targetTime}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary pointer-events-none" />
            </div>
          </div>
        )}

        {/* Task Assignment */}
        <div className="bg-white/60 p-6 rounded-[24px] shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-[16px] text-primary">Task Selection</h2>
          </div>
          <p className="text-[13px] text-secondary mb-4">
            {currentTaskMode === 'random_all' 
              ? 'A random task will be chosen for every alarm.' 
              : 'Select specific tasks from the pool below.'}
          </p>
          
          <div className="flex bg-app p-1 rounded-[16px]">
            <button 
              onClick={() => handleTaskModeChange('random_all')}
              className={`flex-1 py-2.5 text-[13px] font-medium rounded-[12px] transition-all ${currentTaskMode === 'random_all' ? 'bg-white shadow-soft text-primary' : 'text-secondary hover:text-primary'}`}
            >
              All Random
            </button>
            <button 
              onClick={() => handleTaskModeChange('custom')}
              className={`flex-1 py-2.5 text-[13px] font-medium rounded-[12px] transition-all ${currentTaskMode === 'custom' ? 'bg-white shadow-soft text-primary' : 'text-secondary hover:text-primary'}`}
            >
              Custom Selection
            </button>
          </div>
        </div>

        {/* Task Pool */}
        <div className="space-y-4">
          <h3 className="text-[13px] font-medium uppercase tracking-wider text-secondary px-2">Task Pool</h3>
          <div className="grid grid-cols-2 gap-4">
            {TASKS.map(task => {
              const isSelected = currentTaskMode === 'random_all' || activeTasks.includes(task.id);
              const isDisabled = currentTaskMode === 'random_all';
              const theme = TASK_COLORS[task.id] || { bg: 'bg-white', text: 'text-primary', border: 'border-transparent' };
              
              return (
                <div key={task.id} className="relative">
                  <motion.button
                    whileTap={isDisabled ? {} : { scale: 0.95 }}
                    onClick={() => toggleTask(task.id)}
                    className={`w-full aspect-square rounded-[24px] p-5 flex flex-col items-start justify-between relative overflow-hidden transition-all text-left shadow-soft 
                      ${isSelected ? `${theme.bg} opacity-100` : `${theme.bg} opacity-40 hover:opacity-60`}
                      ${isDisabled ? 'opacity-60 cursor-not-allowed grayscale-[0.2]' : ''}`}
                  >
                    <div className="flex justify-between w-full items-start">
                      <div className={`p-3 rounded-[16px] ${isSelected ? 'bg-white/50' : 'bg-white/30'}`}>
                        <div className={isSelected ? theme.text : 'text-secondary'}>
                          {task.icon}
                        </div>
                      </div>
                      {isSelected && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task.id);
                          }}
                          className={`p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors ${theme.text}`}
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div>
                      <h4 className={`font-semibold text-[16px] leading-tight mb-1 ${isSelected ? theme.text : 'text-primary'}`}>{task.title}</h4>
                      <p className={`text-[11px] font-medium ${isSelected ? theme.text : 'text-secondary'} opacity-70 line-clamp-2`}>{task.desc}</p>
                    </div>

                    {isSelected && !isDisabled && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm pointer-events-none hidden">
                        <Check className={`w-4 h-4 ${theme.text}`} />
                      </div>
                    )}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Task Settings Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-app w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 pb-12 sm:pb-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingTask(null)}
                className="absolute top-6 right-6 p-2 bg-app rounded-full text-secondary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-[22px] font-semibold text-primary mb-6">
                {TASKS.find(t => t.id === editingTask)?.title} Settings
              </h2>

              <div className="space-y-6">
                {editingTask === 'hold' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Number of Rounds</label>
                      <div className="flex gap-3">
                        {[1, 3, 5].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ holdRounds: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.holdRounds === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Hold Duration (Seconds)</label>
                      <div className="flex gap-3">
                        {[3, 5, 10].map(sec => (
                          <button
                            key={sec}
                            onClick={() => updateTaskConfig({ holdSeconds: sec })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.holdSeconds === sec ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-app rounded-[16px] flex items-center justify-center h-32 relative">
                        <div className="w-20 h-20 rounded-full border-4 border-divider flex items-center justify-center relative overflow-hidden">
                          <motion.div 
                            className="absolute bottom-0 left-0 right-0 bg-primary/20"
                            animate={{ height: ['0%', '100%'] }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: currentTaskConfig.holdSeconds,
                              ease: "linear"
                            }}
                          />
                          <span className="relative z-10 font-bold text-[12px] tracking-widest text-primary">HOLD</span>
                        </div>
                        <motion.div 
                          className="absolute left-1/2 top-1/2 ml-2 mt-2 z-20 drop-shadow-md"
                          initial={{ rotate: -45 }}
                          animate={{ scale: [1.2, 0.9, 0.9, 1.2], y: [10, 0, 0, 10], x: [10, 0, 0, 10] }}
                          transition={{ repeat: Infinity, duration: currentTaskConfig.holdSeconds, ease: "linear" }}
                        >
                          <HandPointerIcon className="w-8 h-8 text-primary" />
                        </motion.div>
                      </div>
                    </div>
                  </>
                )}

                {editingTask === 'tap' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Number of Rounds</label>
                      <div className="flex gap-3">
                        {[1, 3, 5].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ tapRounds: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.tapRounds === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Tap Count</label>
                      <div className="flex gap-3">
                        {[10, 15, 30].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ tapCount: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.tapCount === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-app rounded-[16px] flex items-center justify-center h-32 relative">
                        <motion.div 
                          className="w-20 h-20 rounded-full border-4 border-divider flex items-center justify-center relative overflow-hidden"
                          animate={{ scale: [1, 0.9, 1] }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 0.5,
                            ease: "easeInOut"
                          }}
                        >
                          <span className="relative z-10 font-semibold text-[24px] text-primary">{currentTaskConfig.tapCount}</span>
                        </motion.div>
                        <motion.div 
                          className="absolute left-1/2 top-1/2 ml-2 mt-2 z-20 drop-shadow-md"
                          initial={{ rotate: -45 }}
                          animate={{ scale: [1.2, 0.9, 1.2], y: [10, 0, 10], x: [10, 0, 10] }}
                          transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                        >
                          <HandPointerIcon className="w-8 h-8 text-primary" />
                        </motion.div>
                      </div>
                    </div>
                  </>
                )}

                {editingTask === 'math' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Number of Problems</label>
                      <div className="flex gap-3">
                        {[1, 3, 5].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ mathProblems: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.mathProblems === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Difficulty</label>
                      <div className="flex gap-3">
                        {['easy', 'medium', 'hard'].map(diff => (
                          <button
                            key={diff}
                            onClick={() => updateTaskConfig({ mathDifficulty: diff as any })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] capitalize transition-all ${currentTaskConfig.mathDifficulty === diff ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-app rounded-[16px] flex items-center justify-center">
                        <span className="text-[24px] font-semibold text-primary tracking-tighter">
                          {currentTaskConfig.mathDifficulty === 'easy' && '23 + 14'}
                          {currentTaskConfig.mathDifficulty === 'medium' && '45 + 22 + 31'}
                          {currentTaskConfig.mathDifficulty === 'hard' && '124 + 85 + 65 + 112'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {editingTask === 'rhythm' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Number of Rounds</label>
                      <div className="flex gap-3">
                        {[1, 3, 5].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ rhythmRounds: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.rhythmRounds === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Difficulty</label>
                      <div className="flex gap-3">
                        {['easy', 'medium', 'hard'].map(diff => (
                          <button
                            key={diff}
                            onClick={() => updateTaskConfig({ rhythmDifficulty: diff as any })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] capitalize transition-all ${currentTaskConfig.rhythmDifficulty === diff ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-app rounded-[16px] flex items-center justify-center h-24">
                        <RhythmExample difficulty={currentTaskConfig.rhythmDifficulty} />
                      </div>
                    </div>
                  </>
                )}

                {editingTask === 'type' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Number of Rounds</label>
                      <div className="flex gap-3">
                        {[1, 3, 5].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ typeRounds: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.typeRounds === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Phrase Length</label>
                      <div className="flex gap-3">
                        {['short', 'medium', 'long'].map(len => (
                          <button
                            key={len}
                            onClick={() => updateTaskConfig({ typeLength: len as any })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] capitalize transition-all ${currentTaskConfig.typeLength === len ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {len}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-app rounded-[16px] flex items-center justify-center text-center">
                        <span className="text-[16px] font-medium text-primary">
                          {currentTaskConfig.typeLength === 'short' && '"Wake up"'}
                          {currentTaskConfig.typeLength === 'medium' && '"Today is a beautiful day"'}
                          {currentTaskConfig.typeLength === 'long' && '"Early to bed and early to rise makes a man healthy"'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {editingTask === 'pattern' && (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Number of Rounds</label>
                      <div className="flex gap-3">
                        {[1, 3, 5].map(count => (
                          <button
                            key={count}
                            onClick={() => updateTaskConfig({ patternRounds: count })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] transition-all ${currentTaskConfig.patternRounds === count ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-secondary mb-3">Difficulty</label>
                      <div className="flex gap-3">
                        {['easy', 'medium', 'hard'].map(diff => (
                          <button
                            key={diff}
                            onClick={() => updateTaskConfig({ patternDifficulty: diff as any })}
                            className={`flex-1 py-3 rounded-[16px] font-medium text-[16px] capitalize transition-all ${currentTaskConfig.patternDifficulty === diff ? 'bg-primary text-white shadow-soft' : 'bg-app text-secondary hover:bg-gray-200'}`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 bg-app rounded-[16px] flex items-center justify-center h-40">
                        <PatternExample difficulty={currentTaskConfig.patternDifficulty} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <button 
                onClick={() => setEditingTask(null)}
                className="w-full mt-8 bg-primary text-white py-4 rounded-[16px] font-medium text-[16px] shadow-fab hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
