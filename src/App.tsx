import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import CreatePlan from './components/CreatePlan';
import PlanDetail from './components/PlanDetail';
import AlarmScreen from './components/AlarmScreen';
import TaskScreen from './components/TaskScreen';
import TabBar from './components/TabBar';
import Library from './components/Library';
import Status from './components/Status';
import { WakePlan, ViewState, TabState, GlobalSettings } from './types';
import { getSettings, saveSettings, beginWakeSession } from './utils';

function App() {
  const [plans, setPlans] = useState<WakePlan[]>(() => {
    const saved = localStorage.getItem('wakePlans');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [settings, setSettings] = useState<GlobalSettings>(() => getSettings());

  useEffect(() => {
    const unlockAudio = () => {
      const bg = document.getElementById('global-bg-audio') as HTMLAudioElement;
      const voice = document.getElementById('global-voice-audio') as HTMLAudioElement;
      if (bg && voice) {
        bg.play().then(() => bg.pause()).catch(() => {});
        voice.play().then(() => voice.pause()).catch(() => {});
      }
    };
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
  }, []);

  const [view, setView] = useState<ViewState>('home');
  const [currentTab, setCurrentTab] = useState<TabState>('plans');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Alarm State
  const [activeAlarmPlanId, setActiveAlarmPlanId] = useState<string | null>(null);
  const [currentAlarmIndex, setCurrentAlarmIndex] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('wakePlans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Alarm Check Loop
  useEffect(() => {
    const checkAlarms = () => {
      if (view === 'alarm' || view === 'task') return;

      const now = new Date();
      const currentH = now.getHours().toString().padStart(2, '0');
      const currentM = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentH}:${currentM}`;
      const currentDay = now.getDay();

      for (const plan of plans) {
        if (!plan.isActive) continue;

        // Check repeat mode
        if (plan.repeatMode === 'custom' && !plan.repeatDays?.includes(currentDay)) continue;
        
        const alarmIdx = plan.schedule.findIndex(time => time === currentTime);
        if (alarmIdx !== -1) {
          // Check if we already triggered this specific alarm minute to avoid re-triggering
          const lastTriggered = sessionStorage.getItem(`lastAlarm_${plan.id}`);
          if (lastTriggered !== currentTime) {
            sessionStorage.setItem(`lastAlarm_${plan.id}`, currentTime);
            beginWakeSession(plan, plan.schedule[alarmIdx]);
            setActiveAlarmPlanId(plan.id);
            setCurrentAlarmIndex(alarmIdx);
            setView('alarm');
            break;
          }
        }
      }
    };

    const interval = setInterval(checkAlarms, 1000);
    return () => clearInterval(interval);
  }, [plans, view]);

  const handleTogglePlan = (id: string) => {
    setPlans(plans.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const handleSavePlan = (plan: WakePlan) => {
    if (plans.some(p => p.id === plan.id)) {
      setPlans(plans.map(p => p.id === plan.id ? plan : p));
    } else {
      setPlans([...plans, plan]);
    }
    setSelectedPlanId(null);
    setView('home');
  };

  const handleDeletePlan = (id: string) => {
    setPlans(plans.filter(p => p.id !== id));
    setSelectedPlanId(null);
    setView('home');
  };

  const activePlan = plans.find(p => p.id === activeAlarmPlanId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="app-shell h-dvh min-h-dvh w-full bg-black flex items-center justify-center overflow-hidden font-sans text-primary">
      <div className="app-frame w-full h-full max-w-md bg-app relative shadow-2xl overflow-hidden flex flex-col">
        
        {view === 'home' && currentTab === 'plans' && (
          <Home 
            plans={plans} 
            onToggle={handleTogglePlan} 
            onCreateNew={() => setView('create')}
            onViewDetail={(id) => {
              setSelectedPlanId(id);
              setView('detail');
            }}
            onEditPlan={(id) => {
              setSelectedPlanId(id);
              setView('edit');
            }}
            onDeletePlan={handleDeletePlan}
          />
        )}
        {view === 'home' && currentTab === 'library' && (
          <Library 
            settings={settings}
            plans={plans}
            onUpdateSettings={setSettings}
            onUpdatePlan={handleSavePlan}
          />
        )}
        {view === 'home' && currentTab === 'status' && <Status />}

        {view === 'create' && (
          <CreatePlan 
            onSave={handleSavePlan} 
            onCancel={() => setView('home')} 
          />
        )}

        {view === 'edit' && selectedPlan && (
          <CreatePlan 
            initialPlan={selectedPlan}
            onSave={handleSavePlan} 
            onCancel={() => {
              setSelectedPlanId(null);
              setView('home');
            }} 
          />
        )}

        {view === 'detail' && selectedPlan && (
          <PlanDetail 
            plan={selectedPlan}
            onBack={() => {
              setSelectedPlanId(null);
              setView('home');
            }}
            onEdit={() => setView('edit')}
            onDelete={() => handleDeletePlan(selectedPlan.id)}
          />
        )}

        {(view === 'alarm' || view === 'task') && activePlan && (
          <div className="absolute inset-0 z-40" style={{ display: view === 'alarm' ? 'block' : 'none' }}>
            <AlarmScreen 
              plan={activePlan}
              alarmIndex={currentAlarmIndex}
              isActive={view === 'alarm'}
              onSnooze={() => {
                setView('home');
                setActiveAlarmPlanId(null);
              }}
              onStop={() => {
                setView('home');
                setActiveAlarmPlanId(null);
              }}
              onRequireTask={() => setView('task')}
            />
          </div>
        )}

        {view === 'task' && activePlan && (
          <div className="absolute inset-0 z-50 bg-app">
            <TaskScreen 
              plan={activePlan}
              onComplete={() => {
                setView('home');
                setActiveAlarmPlanId(null);
              }}
              onTimeout={() => {
                setView('alarm');
              }}
            />
          </div>
        )}

        {view === 'home' && (
          <TabBar currentTab={currentTab} onChange={setCurrentTab} />
        )}
      </div>
    </div>
  );
}

export default App;
