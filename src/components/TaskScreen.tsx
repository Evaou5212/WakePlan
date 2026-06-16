import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TaskType, WakePlan, TaskConfig } from '../types';
import { getSettings, recordWake } from '../utils';

interface TaskScreenProps {
  plan: WakePlan;
  onComplete: () => void;
  onTimeout?: () => void;
}

const COUNTDOWN_MS = 20000;

export default function TaskScreen({ plan, onComplete, onTimeout }: TaskScreenProps) {
  const [taskType, setTaskType] = useState<TaskType>('hold');
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [mathProblem, setMathProblem] = useState({ text: '', answer: 0 });
  const [mathInput, setMathInput] = useState('');
  const [taskConfig, setTaskConfig] = useState<TaskConfig>({
    holdSeconds: 3,
    holdRounds: 1,
    tapCount: 15,
    tapRounds: 1,
    mathProblems: 1,
    mathDifficulty: 'easy',
    rhythmRounds: 3,
    rhythmDifficulty: 'easy',
    typeRounds: 1,
    typeLength: 'short'
  });
  const [mathProblemsLeft, setMathProblemsLeft] = useState(1);
  const [holdRoundsLeft, setHoldRoundsLeft] = useState(1);
  const [tapRoundsLeft, setTapRoundsLeft] = useState(1);

  // Type Task State
  const [typePhrase, setTypePhrase] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [typeRoundsLeft, setTypeRoundsLeft] = useState(1);

  // Rhythm Task State
  const [rhythmPhase, setRhythmPhase] = useState<'demo' | 'user' | 'success' | 'fail'>('demo');
  const [rhythmPattern, setRhythmPattern] = useState<number[]>([]);
  const [rhythmFlash, setRhythmFlash] = useState(false);
  const [userTaps, setUserTaps] = useState<number[]>([]);
  const [rhythmRoundsLeft, setRhythmRoundsLeft] = useState(3);

  // Pattern Task State
  const [patternPhase, setPatternPhase] = useState<'demo' | 'user' | 'success' | 'fail'>('demo');
  const [targetPattern, setTargetPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [patternRoundsLeft, setPatternRoundsLeft] = useState(1);
  const patternGridRef = useRef<HTMLDivElement>(null);

  const countdownDeadlineRef = useRef(Date.now() + COUNTDOWN_MS);
  const timeoutCalledRef = useRef(false);
  const [countdownPct, setCountdownPct] = useState(100);

  const resetCountdown = () => {
    countdownDeadlineRef.current = Date.now() + COUNTDOWN_MS;
    setCountdownPct(100);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = countdownDeadlineRef.current - Date.now();
      if (remaining <= 0) {
        setCountdownPct(0);
        if (!timeoutCalledRef.current && onTimeout) {
          timeoutCalledRef.current = true;
          onTimeout();
        }
        return;
      }
      setCountdownPct((remaining / COUNTDOWN_MS) * 100);
    }, 50);

    return () => clearInterval(interval);
  }, [onTimeout]);

  useEffect(() => {
    const settings = getSettings();
    
    const useGlobal = settings.useGlobalTasks;
    const rawConfig = useGlobal ? settings.taskConfig : (plan.taskConfig || settings.taskConfig);
    
    // Merge with defaults to prevent NaN if localStorage has missing fields
    const config: TaskConfig = {
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
      patternDifficulty: 'easy',
      ...rawConfig
    };

    setTaskConfig(config);
    setMathProblemsLeft(config.mathProblems || 1);
    setTypeRoundsLeft(config.typeRounds || 1);
    setRhythmRoundsLeft(config.rhythmRounds || 3);
    setHoldRoundsLeft(config.holdRounds || 1);
    setTapRoundsLeft(config.tapRounds || 1);
    setPatternRoundsLeft(config.patternRounds || 1);

    // Determine which task pool and mode to use
    const taskMode = useGlobal ? settings.taskMode : (plan.taskMode || 'random_all');
    let pool = useGlobal ? settings.activeTasks : (plan.taskPool && plan.taskPool.length > 0 ? plan.taskPool : settings.activeTasks);
    
    if (taskMode === 'random_all' || pool.length === 0) {
      pool = ['hold', 'tap', 'math', 'rhythm', 'type', 'pattern'];
    }
    
    const randomTask = pool[Math.floor(Math.random() * pool.length)];
    setTaskType(randomTask);

    if (randomTask === 'math') {
      generateMathProblem(config.mathDifficulty || 'easy');
    } else if (randomTask === 'type') {
      generateTypePhrase(config.typeLength || 'short');
    } else if (randomTask === 'rhythm') {
      generateRhythmPattern(config.rhythmDifficulty || 'easy');
    } else if (randomTask === 'pattern') {
      generatePattern(config.patternDifficulty || 'easy');
    }
  }, [plan]);

  const generateTypePhrase = (length: 'short' | 'medium' | 'long') => {
    const phrases = {
      short: ["Wake up", "Good morning", "Rise and shine", "New day"],
      medium: ["Today is a beautiful day", "Time to achieve my goals", "I am ready for the day", "Let's get things done"],
      long: ["Early to bed and early to rise makes a man healthy", "The future belongs to those who believe in their dreams", "Success is not final, failure is not fatal: it is the courage to continue that counts"]
    };
    const pool = phrases[length];
    setTypePhrase(pool[Math.floor(Math.random() * pool.length)]);
    setTypeInput('');
  };

  const generateRhythmPattern = (difficulty: 'easy' | 'medium' | 'hard') => {
    let pattern: number[] = [];
    if (difficulty === 'easy') {
      const beats = [
        [600, 600, 1200],
        [1000, 500, 500],
        [500, 1000, 500],
        [500, 500, 1000]
      ];
      pattern = beats[Math.floor(Math.random() * beats.length)];
    } else if (difficulty === 'medium') {
      const beats = [
        [600, 400, 600, 400],
        [400, 400, 800, 800],
        [800, 400, 400, 800],
        [400, 800, 400, 800]
      ];
      pattern = beats[Math.floor(Math.random() * beats.length)];
    } else {
      const beats = [
        [400, 200, 400, 200, 600],
        [200, 200, 400, 400, 200],
        [600, 200, 200, 600, 200],
        [200, 400, 200, 400, 200]
      ];
      pattern = beats[Math.floor(Math.random() * beats.length)];
    }
    setRhythmPattern(pattern);
    setRhythmPhase('demo');
    setUserTaps([]);
    playRhythmDemo(pattern);
  };

  const generatePattern = (difficulty: 'easy' | 'medium' | 'hard') => {
    const easyPool = [[0, 1, 4, 5], [0, 3, 6, 7], [2, 5, 8, 7], [0, 4, 8, 5]];
    const mediumPool = [[0, 3, 4, 1, 2, 5], [2, 1, 4, 5, 8, 7], [6, 3, 4, 7, 8, 5]];
    const hardPool = [[0, 1, 2, 5, 8, 7, 4, 3], [2, 1, 0, 3, 6, 7, 4, 5], [6, 3, 0, 1, 4, 7, 8, 5]];
    
    let pool = easyPool;
    if (difficulty === 'medium') pool = mediumPool;
    if (difficulty === 'hard') pool = hardPool;
    
    // Convert current targetPattern to string for comparison
    const currentPatternStr = targetPattern.join(',');
    
    // Filter out the current pattern if there are other options
    const filteredPool = pool.filter(p => p.join(',') !== currentPatternStr);
    const validPool = filteredPool.length > 0 ? filteredPool : pool;
    
    const newPattern = validPool[Math.floor(Math.random() * validPool.length)];
    
    setTargetPattern(newPattern);
    playPatternDemo(newPattern);
  };

  const playPatternDemo = async (pattern: number[]) => {
    setPatternPhase('demo');
    setUserPattern([]);
    await new Promise(r => setTimeout(r, 1000));
    
    const demoPattern: number[] = [];
    for (const point of pattern) {
      demoPattern.push(point);
      setUserPattern([...demoPattern]);
      await new Promise(r => setTimeout(r, 500));
    }
    
    await new Promise(r => setTimeout(r, 1000));
    setUserPattern([]);
    setPatternPhase('user');
  };

  const playRhythmDemo = async (pattern: number[]) => {
    setRhythmPhase('demo');
    setRhythmFlash(false);
    await new Promise(r => setTimeout(r, 1000)); // Wait before starting

    // First beat
    setRhythmFlash(true);
    await new Promise(r => setTimeout(r, 150));
    setRhythmFlash(false);

    for (const interval of pattern) {
      await new Promise(r => setTimeout(r, interval - 150));
      setRhythmFlash(true);
      await new Promise(r => setTimeout(r, 150));
      setRhythmFlash(false);
    }

    setRhythmPhase('user');
    setUserTaps([]);
  };

  const generateMathProblem = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (difficulty === 'easy') {
      const a = Math.floor(Math.random() * 40) + 10;
      const b = Math.floor(Math.random() * 40) + 10;
      setMathProblem({ text: `${a} + ${b}`, answer: a + b });
    } else if (difficulty === 'medium') {
      const a = Math.floor(Math.random() * 50) + 20;
      const b = Math.floor(Math.random() * 50) + 20;
      const c = Math.floor(Math.random() * 50) + 20;
      setMathProblem({ text: `${a} + ${b} + ${c}`, answer: a + b + c });
    } else {
      const a = Math.floor(Math.random() * 100) + 50;
      const b = Math.floor(Math.random() * 100) + 50;
      const c = Math.floor(Math.random() * 100) + 50;
      const d = Math.floor(Math.random() * 100) + 50;
      setMathProblem({ text: `${a} + ${b} + ${c} + ${d}`, answer: a + b + c + d });
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isHolding && taskType === 'hold') {
      const totalTicks = (taskConfig.holdSeconds * 1000) / 50;
      const progressPerTick = 100 / totalTicks;
      
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setIsHolding(false);
            const newLeft = holdRoundsLeft - 1;
            if (newLeft <= 0) {
              handleSuccess();
            } else {
              setHoldRoundsLeft(newLeft);
              setTimeout(() => setProgress(0), 500);
            }
            return 100;
          }
          return p + progressPerTick;
        });
      }, 50);
    } else if (!isHolding && taskType === 'hold' && progress < 100) {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding, taskType, taskConfig, holdRoundsLeft]);

  const handleSuccess = () => {
    recordWake(plan.name || 'Wake Plan', plan.id);
    onComplete();
  };

  const handleTap = () => {
    if (taskType !== 'tap') return;
    setProgress(p => {
      const next = p + (100 / taskConfig.tapCount);
      if (next >= 100) {
        const newLeft = tapRoundsLeft - 1;
        if (newLeft <= 0) {
          handleSuccess();
          return 100;
        } else {
          setTapRoundsLeft(newLeft);
          return 0;
        }
      }
      return next;
    });
  };

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(mathInput) === mathProblem.answer) {
      const newLeft = mathProblemsLeft - 1;
      if (newLeft <= 0) {
        setProgress(100);
        handleSuccess();
      } else {
        setMathProblemsLeft(newLeft);
        setMathInput('');
        generateMathProblem(taskConfig.mathDifficulty);
      }
    } else {
      setMathInput('');
      // Shake animation could go here
    }
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeInput.trim().toLowerCase() === typePhrase.toLowerCase()) {
      const newLeft = typeRoundsLeft - 1;
      if (newLeft <= 0) {
        setProgress(100);
        handleSuccess();
      } else {
        setTypeRoundsLeft(newLeft);
        generateTypePhrase(taskConfig.typeLength);
      }
    } else {
      // Shake animation
    }
  };

  const handleRhythmTap = () => {
    if (rhythmPhase !== 'user') return;
    
    const now = Date.now();
    const newTaps = [...userTaps, now];
    setUserTaps(newTaps);

    // Visual feedback
    setRhythmFlash(true);
    setTimeout(() => setRhythmFlash(false), 100);

    // If we have enough taps (pattern length + 1 for the first beat)
    if (newTaps.length === rhythmPattern.length + 1) {
      // Calculate intervals
      const userIntervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        userIntervals.push(newTaps[i] - newTaps[i - 1]);
      }

      // Compare
      let isMatch = true;
      for (let i = 0; i < rhythmPattern.length; i++) {
        if (Math.abs(userIntervals[i] - rhythmPattern[i]) > 300) { // 300ms margin of error
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        setRhythmPhase('success');
        const newLeft = rhythmRoundsLeft - 1;
        if (newLeft <= 0) {
          setTimeout(() => {
            setProgress(100);
            handleSuccess();
          }, 500);
        } else {
          setRhythmRoundsLeft(newLeft);
          setTimeout(() => {
            generateRhythmPattern(taskConfig.rhythmDifficulty);
          }, 1000);
        }
      } else {
        setRhythmPhase('fail');
        setTimeout(() => {
          generateRhythmPattern(taskConfig.rhythmDifficulty);
        }, 1500);
      }
    }
  };

  const handlePatternPointerDown = (index: number) => {
    if (patternPhase !== 'user') return;
    setUserPattern([index]);
  };

  const handlePatternMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (patternPhase !== 'user') return;
    
    // Check if dragging (touch always dragging, mouse needs buttons > 0)
    if ('pointerType' in e && e.pointerType === 'mouse' && e.buttons === 0) return;
    
    // If not dragging and userPattern is empty, we don't do anything
    // We allow starting via drag, but only if they are actively pressing
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.PointerEvent).clientX;
      clientY = (e as React.PointerEvent).clientY;
    }

    const element = document.elementFromPoint(clientX, clientY);
    if (element && element.hasAttribute('data-pattern-index')) {
      const index = parseInt(element.getAttribute('data-pattern-index')!);
      if (!userPattern.includes(index)) {
        setUserPattern(prev => {
          const newPattern = [...prev];
          if (newPattern.length > 0) {
            const last = newPattern[newPattern.length - 1];
            const dx = (index % 3) - (last % 3);
            const dy = Math.floor(index / 3) - Math.floor(last / 3);
            if (Math.abs(dx) % 2 === 0 && Math.abs(dy) % 2 === 0) {
              const midX = (last % 3) + dx / 2;
              const midY = Math.floor(last / 3) + dy / 2;
              const mid = midY * 3 + midX;
              if (mid !== -1 && !newPattern.includes(mid)) {
                newPattern.push(mid);
              }
            }
          }
          newPattern.push(index);
          return newPattern;
        });
      }
    }
  };

  const handlePatternPointerUp = () => {
    if (patternPhase !== 'user' || userPattern.length === 0) return;
    
    if (userPattern.length === targetPattern.length && userPattern.every((v, i) => v === targetPattern[i])) {
      setPatternPhase('success');
      const newLeft = patternRoundsLeft - 1;
      if (newLeft <= 0) {
        setTimeout(() => {
          setProgress(100);
          handleSuccess();
        }, 500);
      } else {
        setPatternRoundsLeft(newLeft);
        setTimeout(() => {
          generatePattern(taskConfig.patternDifficulty);
        }, 1000);
      }
    } else {
      setPatternPhase('fail');
      setTimeout(() => {
        playPatternDemo(targetPattern);
      }, 1000);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-app text-primary"
      onPointerDown={resetCountdown}
      onKeyDown={resetCountdown}
      onChange={resetCountdown}
      onTouchStart={resetCountdown}
    >
      <div className="pt-page-header px-6 pb-4">
        <div className="h-1.5 w-full bg-divider rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-100 ease-linear"
            style={{ width: `${countdownPct}%` }}
          />
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 px-6 pb-6">
        {taskType === 'hold' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-[22px] font-semibold text-center text-primary">
              Press and hold ({taskConfig.holdRounds - holdRoundsLeft + 1}/{taskConfig.holdRounds})
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onPointerDown={(e) => { e.preventDefault(); setIsHolding(true); }}
              onPointerUp={() => setIsHolding(false)}
              onPointerLeave={() => setIsHolding(false)}
              onContextMenu={(e) => e.preventDefault()}
              className="w-48 h-48 rounded-full bg-white shadow-soft border-4 border-divider flex items-center justify-center relative overflow-hidden touch-none select-none"
              style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            >
              <div 
                className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-75"
                style={{ height: `${progress}%` }}
              />
              <span className="relative z-10 font-bold text-[22px] tracking-widest text-primary">HOLD</span>
            </motion.button>
          </div>
        )}

        {taskType === 'tap' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-[22px] font-semibold text-center text-primary">
              Tap {taskConfig.tapCount} times quickly ({taskConfig.tapRounds - tapRoundsLeft + 1}/{taskConfig.tapRounds})
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleTap}
              className="w-48 h-48 rounded-full bg-white shadow-soft border-4 border-divider flex items-center justify-center relative overflow-hidden touch-none"
            >
              <div 
                className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-75"
                style={{ height: `${progress}%` }}
              />
              <span className="relative z-10 font-semibold text-[64px] text-primary">{Math.floor(progress / (100/taskConfig.tapCount))}</span>
            </motion.button>
          </div>
        )}

        {taskType === 'math' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-[22px] font-semibold text-center text-primary">
              Solve to dismiss ({taskConfig.mathProblems - mathProblemsLeft + 1}/{taskConfig.mathProblems})
            </div>
            <div className="text-[48px] font-semibold tracking-tighter text-primary">
              {mathProblem.text}
            </div>
            <form onSubmit={handleMathSubmit} className="w-full flex flex-col gap-4">
              <input 
                type="number" 
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                className="w-full bg-white shadow-soft border-2 border-divider rounded-[24px] px-4 py-6 text-[32px] font-semibold text-center outline-none focus:border-primary transition-colors text-primary"
                placeholder="?"
                autoFocus
              />
              <button 
                type="submit"
                className="w-full bg-primary text-white py-5 rounded-[16px] font-medium text-[16px] hover:opacity-90 transition-colors shadow-fab"
              >
                Enter
              </button>
            </form>
          </div>
        )}

        {taskType === 'type' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-md">
            <div className="text-[22px] font-semibold text-center text-primary">
              Type to dismiss ({taskConfig.typeRounds - typeRoundsLeft + 1}/{taskConfig.typeRounds})
            </div>
            <div className="text-[24px] font-medium text-center text-primary bg-white p-6 rounded-[24px] shadow-soft w-full">
              "{typePhrase}"
            </div>
            <form onSubmit={handleTypeSubmit} className="w-full flex flex-col gap-4">
              <input 
                type="text" 
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                className="w-full bg-white shadow-soft border-2 border-divider rounded-[24px] px-6 py-6 text-[18px] font-medium text-center outline-none focus:border-primary transition-colors text-primary"
                placeholder="Type the phrase above..."
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button 
                type="submit"
                className="w-full bg-primary text-white py-5 rounded-[16px] font-medium text-[16px] hover:opacity-90 transition-colors shadow-fab"
              >
                Enter
              </button>
            </form>
          </div>
        )}

        {taskType === 'rhythm' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-[22px] font-semibold text-center text-primary">
              {rhythmPhase === 'demo' && 'Watch the rhythm...'}
              {rhythmPhase === 'user' && `Tap the rhythm (${taskConfig.rhythmRounds - rhythmRoundsLeft + 1}/${taskConfig.rhythmRounds})`}
              {rhythmPhase === 'success' && 'Perfect!'}
              {rhythmPhase === 'fail' && 'Missed! Try again'}
            </div>
            
            <motion.button
              whileTap={rhythmPhase === 'user' ? { scale: 0.9 } : {}}
              onPointerDown={handleRhythmTap}
              className={`w-48 h-48 rounded-full shadow-soft border-4 flex items-center justify-center relative overflow-hidden touch-none transition-colors duration-100
                ${rhythmPhase === 'demo' ? 'border-divider bg-white' : ''}
                ${rhythmPhase === 'user' ? 'border-primary bg-white cursor-pointer' : ''}
                ${rhythmPhase === 'success' ? 'border-[#6BCB77] bg-[#6BCB77]/20' : ''}
                ${rhythmPhase === 'fail' ? 'border-[#E35D5D] bg-[#E35D5D]/20' : ''}
              `}
            >
              <div 
                className={`absolute inset-0 transition-opacity duration-100 ${rhythmFlash ? 'opacity-100' : 'opacity-0'}
                  ${rhythmPhase === 'demo' ? 'bg-primary' : 'bg-primary/30'}
                `}
              />
              <span className="relative z-10 font-semibold text-[32px] text-primary">
                {rhythmPhase === 'demo' ? 'Watch' : 'TAP'}
              </span>
            </motion.button>
            
            {rhythmPhase === 'user' && (
              <div className="flex gap-2">
                {Array.from({ length: rhythmPattern.length + 1 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 rounded-full transition-colors ${i < userTaps.length ? 'bg-primary' : 'bg-divider'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {taskType === 'pattern' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-[22px] font-semibold text-center text-primary">
              {patternPhase === 'demo' && 'Watch the pattern...'}
              {patternPhase === 'user' && `Draw the pattern (${taskConfig.patternRounds - patternRoundsLeft + 1}/${taskConfig.patternRounds})`}
              {patternPhase === 'success' && 'Perfect!'}
              {patternPhase === 'fail' && 'Missed! Try again'}
            </div>
            
            <div 
              ref={patternGridRef}
              onPointerMove={handlePatternMove}
              onTouchMove={handlePatternMove}
              onPointerUp={handlePatternPointerUp}
              onTouchEnd={handlePatternPointerUp}
              className="w-64 h-64 bg-white rounded-[32px] shadow-soft p-6 grid grid-cols-3 gap-4 touch-none relative"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                const isTarget = patternPhase === 'demo' && userPattern.includes(i);
                const isUser = patternPhase !== 'demo' && userPattern.includes(i);
                const isLast = userPattern[userPattern.length - 1] === i;
                
                let dotClass = 'bg-divider';
                if (isTarget) dotClass = 'bg-primary scale-125';
                if (isUser) {
                  if (patternPhase === 'success') dotClass = 'bg-[#6BCB77] scale-125';
                  else if (patternPhase === 'fail') dotClass = 'bg-[#E35D5D] scale-125';
                  else dotClass = 'bg-primary scale-125';
                }

                return (
                  <div 
                    key={i}
                    className="w-full h-full flex items-center justify-center relative z-10"
                  >
                    <div
                      data-pattern-index={i}
                      onPointerDown={() => handlePatternPointerDown(i)}
                      className="w-16 h-16 flex items-center justify-center rounded-full cursor-pointer touch-none"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className={`w-4 h-4 rounded-full transition-all duration-200 pointer-events-none ${dotClass}`} />
                      {isLast && patternPhase === 'user' && (
                        <div className="absolute w-12 h-12 rounded-full border-2 border-primary animate-ping opacity-50 pointer-events-none" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
