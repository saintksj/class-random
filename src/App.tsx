import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Camera, 
  Trash2, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  BookmarkCheck, 
  Sparkles, 
  CheckCircle, 
  UploadCloud, 
  Play, 
  Shuffle, 
  Award, 
  Layers, 
  Info,
  Calendar,
  Smile,
  X,
  Plus
} from 'lucide-react';
import { Student, PickHistory } from './types';
import { PRESET_CLASSES, CLASSROOM_TIPS } from './data';

export default function App() {
  // State variables
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('class_picker_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pickedHistory, setPickedHistory] = useState<PickHistory[]>(() => {
    try {
      const saved = localStorage.getItem('class_picker_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inputName, setInputName] = useState<string>('');
  const [excludeAlreadyPicked, setExcludeAlreadyPicked] = useState<boolean>(true);
  
  // OCR states
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [detectedNames, setDetectedNames] = useState<string[]>([]);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState<boolean>(false);

  // Audio settings
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);
  const [isTtsOn, setIsTtsOn] = useState<boolean>(true);

  // Spinning / Selection game states
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [tempWinnerName, setTempWinnerName] = useState<string>('?');
  const [winner, setWinner] = useState<Student | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio context reference for mobile compatibility
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(e => console.warn("Failed to resume audio context", e));
    }
    return ctx;
  };

  // Mobile Audio & TTS unlocker
  useEffect(() => {
    const unlock = () => {
      initAudioContext();
      if ('speechSynthesis' in window) {
        try {
          const u = new SpeechSynthesisUtterance('');
          u.volume = 0;
          window.speechSynthesis.speak(u);
        } catch (e) {
          console.warn("TTS silent warm-up failed", e);
        }
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Custom alert and confirm modal states
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
  };

  const showConfirm = (msg: string, onConfirm: () => void) => {
    setConfirmData({ message: msg, onConfirm });
  };

  // Save data to LocalStorage
  useEffect(() => {
    localStorage.setItem('class_picker_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('class_picker_history', JSON.stringify(pickedHistory));
  }, [pickedHistory]);

  // Audio Synthesizer (Beeps for a cute retro tick sound!)
  const playTickSound = () => {
    if (!isSoundOn) return;
    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn("Audio Context could not start", e);
    }
  };

  const playSuccessSound = () => {
    if (!isSoundOn) return;
    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Play a lovely major triad chord sequence
      playTone(523.25, 0, 0.25); // C5
      playTone(659.25, 0.1, 0.25); // E5
      playTone(783.99, 0.2, 0.25); // G5
      playTone(1046.50, 0.3, 0.6); // C6
    } catch (e) {
      console.warn("Audio Context success sound failed", e);
    }
  };

  // Web Speech Synthesis (TTS)
  const speakWinner = (name: string) => {
    if (!isTtsOn || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const sentence = `이번 발표자는 ${name} 학생입니다! 축하합니다!`;
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis error", e);
    }
  };

  // Add student(s) - supports single or bulk input separated by comma, slash, tab, or newline
  const handleAddStudent = () => {
    const rawText = inputName.trim();
    if (!rawText) return;

    // Split by commas, slashes, tabs, or newlines
    const names = rawText
      .split(/[\n,/\t]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    const existingNames = new Set(students.map(s => s.name));
    const addedStudents: Student[] = [];
    const duplicates: string[] = [];

    names.forEach(name => {
      if (!existingNames.has(name)) {
        addedStudents.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5) + name,
          name,
          pickedCount: 0,
          isActive: true
        });
        existingNames.add(name);
      } else {
        duplicates.push(name);
      }
    });

    if (addedStudents.length > 0) {
      setStudents(prev => [...prev, ...addedStudents]);
      setInputName('');
      if (duplicates.length > 0) {
        showAlert(`새로운 학생 ${addedStudents.length}명이 등록되었습니다.\n(중복 이름 제외됨: ${duplicates.join(', ')})`);
      }
    } else {
      showAlert('이미 등록된 동일한 이름의 학생이거나 새로운 이름이 없습니다.');
    }
  };

  // Remove individual student
  const handleRemoveStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  // Toggle individual student participation
  const toggleStudentActive = (id: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  // Toggle all students active/inactive
  const toggleAllStudents = (active: boolean) => {
    setStudents(prev => prev.map(s => ({ ...s, isActive: active })));
  };

  // Load a preset class
  const handleLoadPreset = (classId: string) => {
    const preset = PRESET_CLASSES.find(p => p.id === classId);
    if (!preset) return;

    const loadPresetData = () => {
      const presetStudents = preset.students.map((name, idx) => ({
        id: `preset-${preset.id}-${idx}-${name}`,
        name,
        pickedCount: 0,
        isActive: true
      }));

      setStudents(presetStudents);
      setPickedHistory([]);
      setWinner(null);
      setTempWinnerName('?');
    };

    if (students.length > 0) {
      showConfirm('기존에 등록해 둔 학생 명단이 지워지고 새로운 학급 명단을 불러옵니다. 진행하시겠습니까?', loadPresetData);
    } else {
      loadPresetData();
    }
  };

  // Reset pick counts and history
  const handleResetHistory = () => {
    showConfirm('모든 발표 횟수와 이전 뽑기 역사 기록을 깨끗하게 초기화하시겠습니까?', () => {
      setStudents(prev => prev.map(s => ({ ...s, pickedCount: 0 })));
      setPickedHistory([]);
      setWinner(null);
      setTempWinnerName('?');
    });
  };

  // Entire class deletion
  const handleClearAllStudents = () => {
    showConfirm('현재 등록된 모든 학생 목록을 비우시겠습니까?', () => {
      setStudents([]);
      setPickedHistory([]);
      setWinner(null);
      setTempWinnerName('?');
    });
  };

  // Photo-based Attendance OCR File select and Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      showAlert('출석부 사진 이미지 파일만 업로드해 주세요!');
      return;
    }

    setIsOcrLoading(true);
    setOcrError(null);
    setDetectedNames([]);
    setIsOcrModalOpen(true);

    // Resize photo before upload (Vercel request body limit ~4.5MB)
    const resizeImage = (f: File, maxSide = 1600, quality = 0.85): Promise<string> =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx2d = canvas.getContext('2d');
          if (!ctx2d) { URL.revokeObjectURL(url); reject(new Error('이미지를 처리할 수 없습니다.')); return; }
          ctx2d.fillStyle = '#ffffff';
          ctx2d.fillRect(0, 0, canvas.width, canvas.height);
          ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이 사진 형식은 열 수 없어요. JPG나 PNG 사진으로 올려주세요!')); };
        img.src = url;
      });

    const uploadPhoto = async () => {
      try {
        const base64String = await resizeImage(file);
        const response = await fetch('/api/parse-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64String,
            mimeType: 'image/jpeg'
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || '사진을 읽고 해석하는 중 에러가 발생했습니다.');
        }

        const data = await response.json();
        if (data.names && Array.isArray(data.names)) {
          setDetectedNames(data.names);
        } else {
          throw new Error('이름을 감지하지 못했습니다. 명단 부분이 잘 보이도록 밝은 곳에서 다시 촬영해 주세요!');
        }
      } catch (err: any) {
        console.error(err);
        setOcrError(err.message || '서버 분석 오류가 발생했습니다.');
      } finally {
        setIsOcrLoading(false);
      }
    };
    uploadPhoto();
    
    // reset input
    if (e.target) e.target.value = '';
  };

  // Accept OCR-detected names
  const handleConfirmOcrNames = () => {
    const existingNames = new Set(students.map(s => s.name));
    const newlyAdded: Student[] = [];

    detectedNames.forEach(name => {
      const trimmed = name.trim();
      if (trimmed && !existingNames.has(trimmed)) {
        newlyAdded.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5) + trimmed,
          name: trimmed,
          pickedCount: 0,
          isActive: true
        });
        existingNames.add(trimmed);
      }
    });

    if (newlyAdded.length > 0) {
      setStudents(prev => [...prev, ...newlyAdded]);
      showAlert(`AI 분석을 통해 중복을 제외하고 새로운 학생 ${newlyAdded.length}명이 출석부에 안전하게 등록되었습니다! 🎉`);
    } else {
      showAlert('이미 모든 학생이 명단에 등록되어 있습니다!');
    }
    setIsOcrModalOpen(false);
    setDetectedNames([]);
  };

  // Core Selector Action: PICK A STUDENT!
  const handlePickStudent = () => {
    if (isSpinning) return;

    // Filter available candidates
    const candidates = students.filter(s => s.isActive && (!excludeAlreadyPicked || s.pickedCount === 0));

    if (candidates.length === 0) {
      if (excludeAlreadyPicked && students.some(s => s.isActive && s.pickedCount > 0)) {
        showAlert('모든 학생이 최소 한 번씩 발표했습니다! 우측 상단에서 "중복 뽑기 방지" 옵션을 끄시거나, 아래 초기화 버튼을 누른 후 다시 뽑아 주세요.');
      } else {
        showAlert('선택 가능한 활성화된 학생이 출석부에 없습니다. 학생 이름 체크박스를 켜주시거나 이름을 먼저 등록해 주세요!');
      }
      return;
    }

    // Unmute/resume AudioContext inside user-triggered event handler
    initAudioContext();

    setIsSpinning(true);
    setWinner(null);
    setShowCelebration(false);

    // Let's create an awesome interactive spin interval effect
    let speed = 40; // initial speed ms
    let iterations = 0;
    const maxIterations = 35; // how many cycles to spin
    
    // All active students will cycle visually
    const pool = students.filter(s => s.isActive);

    const spin = () => {
      iterations++;
      const randomTempStudent = pool[Math.floor(Math.random() * pool.length)];
      setTempWinnerName(randomTempStudent?.name || '?');
      
      playTickSound();

      if (iterations < maxIterations) {
        // Linear deceleration
        if (iterations > maxIterations - 10) {
          speed += 25;
        } else if (iterations > maxIterations - 5) {
          speed += 50;
        }
        setTimeout(spin, speed);
      } else {
        // Final selection
        const finalWinner = candidates[Math.floor(Math.random() * candidates.length)];
        
        setWinner(finalWinner);
        setTempWinnerName(finalWinner.name);
        setIsSpinning(false);
        setShowCelebration(true);
        playSuccessSound();

        // Increment picked count
        setStudents(prev => prev.map(s => 
          s.id === finalWinner.id ? { ...s, pickedCount: s.pickedCount + 1 } : s
        ));

        // Add to history list
        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const historyItem: PickHistory = {
          id: Date.now().toString(),
          studentName: finalWinner.name,
          timestamp: timeStr
        };
        setPickedHistory(prev => [historyItem, ...prev]);

        // TTS Announcement
        speakWinner(finalWinner.name);
      }
    };

    spin();
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 font-sans antialiased pb-24">
      {/* Visual Elegant Classroom Banner */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/95 border-b border-amber-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-200 shrink-0">
              🙌
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                AI 사진인식 출석부 & 랜덤 발표자 뽑기
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                  선생님 보조용
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets Buttons */}
            <span className="text-xs font-bold text-slate-400 mr-1">간편 테스트:</span>
            <button
              onClick={() => handleLoadPreset('p1')}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              예시 학급 (15명)
            </button>
            <button
              onClick={() => handleLoadPreset('p2')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              토론반 영문 (8명)
            </button>

          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 flex flex-col gap-8">
        
        {/* Top Section Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side (8 cols): Interactive Chalkboard Screen */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Awesome chalkboard element */}
            <div className="bg-emerald-900 border-[10px] border-[#5c4033] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[460px] sm:min-h-[480px] justify-between p-6 sm:p-8 text-white select-none">
              
              {/* Traditional Chalk border decoration and wooden screws */}
              <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-slate-400 opacity-20" />
              <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-400 opacity-20" />
              <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-slate-400 opacity-20" />
              <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-slate-400 opacity-20" />

              {/* Blackboard Board Header */}
              <div className="border-b border-white/20 pb-4 flex items-center justify-between z-10">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-widest text-emerald-100 uppercase flex items-center gap-3">
                  <Smile className="w-7 h-7 sm:w-8 h-8 text-emerald-300" /> 오늘 수업의 발표자는 누구일까요?
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSoundOn(!isSoundOn)}
                    className="p-1.5 bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-700 rounded-lg text-emerald-200 transition-all cursor-pointer"
                    title={isSoundOn ? "효과음 끄기" : "효과음 켜기"}
                  >
                    {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-emerald-400/50" />}
                  </button>
                  <button
                    onClick={() => setIsTtsOn(!isTtsOn)}
                    className="p-1.5 bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-700 rounded-lg text-emerald-200 transition-all cursor-pointer"
                    title={isTtsOn ? "이름 음성 안내 끄기" : "이름 음성 안내 켜기"}
                  >
                    <span className={`text-[10px] font-bold px-1 ${isTtsOn ? 'text-emerald-200' : 'text-emerald-400/50 line-through'}`}>TTS</span>
                  </button>
                </div>
              </div>

              {/* Centered Dynamic Winner Reveal Area */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 relative z-10">
                
                {showCelebration && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    {/* CSS Sparkle Confetti Animation Fallbacks */}
                    <div className="absolute w-2 h-2 rounded-full bg-yellow-300 animate-ping" style={{ top: '20%', left: '25%' }} />
                    <div className="absolute w-3 h-3 rounded-full bg-pink-400 animate-ping" style={{ top: '70%', left: '15%' }} />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-300 animate-ping" style={{ top: '15%', left: '80%' }} />
                    <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-300 animate-ping" style={{ top: '80%', left: '75%' }} />
                  </div>
                )}

                <div className="text-center">
                  {isSpinning ? (
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-lg text-emerald-200 font-bold tracking-wide animate-pulse">
                        두구두구두구... 후보 고르는 중 ⚡
                      </span>
                      <h2 className="text-6xl sm:text-8xl font-black text-yellow-300 tracking-wider transition-all scale-105 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                        {tempWinnerName}
                      </h2>
                    </div>
                  ) : winner ? (
                    <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                      <div className="p-2 bg-yellow-400/20 text-yellow-300 rounded-full border border-yellow-400/30 animate-pulse">
                        <Award className="w-8 h-8" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-emerald-200 uppercase tracking-widest">
                        🎉 축하합니다! 오늘 최고의 발표 당첨자! 🎉
                      </span>
                      <h2 className="text-7xl sm:text-9xl font-black text-yellow-300 tracking-wide font-sans filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                        {winner.name}
                      </h2>
                      <p className="text-xs text-white/70 bg-black/20 px-3 py-1.5 rounded-full mt-2 border border-white/5 font-semibold">
                        누적 선정 횟수: <span className="text-yellow-300 font-bold">{winner.pickedCount}</span>회
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <h2 className="text-4xl sm:text-5xl font-extrabold text-white/90 tracking-wide">
                        발표 준비 완료!
                      </h2>
                      <p className="text-xs sm:text-sm text-emerald-200 font-medium max-w-sm mt-1 leading-relaxed">
                        현재 뽑기 대상인 유효 학생은 <span className="text-yellow-300 font-bold">{students.filter(s => s.isActive && (!excludeAlreadyPicked || s.pickedCount === 0)).length}명</span>입니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Giant Pick Trigger Button at the bottom of the Chalkboard */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/15 pt-5 z-10">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="exclude-toggle"
                    checked={excludeAlreadyPicked}
                    onChange={(e) => setExcludeAlreadyPicked(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-white/20 bg-emerald-800"
                  />
                  <label htmlFor="exclude-toggle" className="text-xs text-emerald-200 font-semibold cursor-pointer select-none">
                    중복 뽑기 방지 (이미 뽑힌 학생은 제외)
                  </label>
                </div>

                <button
                  onClick={handlePickStudent}
                  disabled={isSpinning || students.length === 0}
                  className="w-full sm:w-auto px-10 py-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-extrabold text-lg rounded-2xl shadow-lg shadow-black/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-b-4 border-yellow-600"
                >
                  <Play className="w-5 h-5 fill-slate-900 text-slate-900" />
                  <span>무작위 학생 뽑기! 🎲</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Side (4 cols): AI OCR Attendance Uploader & History logs */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* AI Attendance OCR Upload Box */}
            <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  AI 출석부 이미지 인식 등록
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  종이 출석부 사진이나 학생 이름 목록을 스캔해서 올려보세요.
                </p>
              </div>

              {/* Hidden Input File */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {/* Clickable Drag & Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/5 hover:bg-emerald-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2.5 group"
              >
                <div className="p-3 bg-white border border-emerald-100 rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">사진 올리기 / 촬영하기</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">JPG, PNG 파일 호환 가능</span>
                </div>
              </div>


            </div>

            {/* Quick Learning Stats / Live History Log */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  실시간 뽑기 기록 ({pickedHistory.length}회)
                </h4>
                {pickedHistory.length > 0 && (
                  <button
                    onClick={handleResetHistory}
                    className="text-[10px] text-slate-400 hover:text-rose-500 font-bold px-2 py-1 rounded hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-colors"
                  >
                    기록 초기화
                  </button>
                )}
              </div>

              {pickedHistory.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {pickedHistory.map((log) => (
                    <div 
                      key={log.id}
                      className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-800">{log.studentName} 학생</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <p className="text-[11px] font-semibold">아직 기록이 없습니다.</p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Bottom Full-Width: Student Names Manager Dashboard */}
        <div className="w-full">
          <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <BookmarkCheck className="w-5 h-5 text-emerald-700" />
                  우리 반 출석부 목록 ({students.length}명)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  활성화된 체크박스가 켜진 학생들만 랜덤 뽑기에 참여합니다.
                </p>
              </div>
              <div className="flex gap-2 self-stretch sm:self-auto">
                <button
                  onClick={() => toggleAllStudents(true)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold rounded-xl transition-colors text-slate-600 cursor-pointer"
                >
                  전체 체크
                </button>
                <button
                  onClick={() => toggleAllStudents(false)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold rounded-xl transition-colors text-slate-600 cursor-pointer"
                >
                  전체 해제
                </button>
                <button
                  onClick={handleClearAllStudents}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  명단 비우기
                </button>
              </div>
            </div>

            {/* Quick manual entry tool */}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                    placeholder="추가할 학생 이름을 입력하세요..."
                    className="w-full pl-9 pr-3 py-2.5 bg-transparent rounded-xl text-sm font-semibold focus:outline-none text-slate-800 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={handleAddStudent}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> 추가하기
                </button>
              </div>
              <p className="text-[11px] text-slate-400 pl-2 font-medium">
                💡 쉼표(,) 등으로 구분하여 여러 명의 이름을 한 번에 입력할 수 있습니다. (예: 김철수, 이영희, 박민수)
              </p>
            </div>

            {/* List grid of currently registered students */}
            {students.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-1">
                {students.map((student) => {
                  const cannotBePicked = excludeAlreadyPicked && student.pickedCount > 0;
                  return (
                    <div 
                      key={student.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        student.isActive 
                          ? cannotBePicked 
                            ? 'bg-slate-100/75 border-slate-200 text-slate-400 line-through' 
                            : 'bg-emerald-50/20 border-emerald-100/80 hover:border-emerald-300' 
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={student.isActive}
                          onChange={() => toggleStudentActive(student.id)}
                          className="w-4 h-4 text-emerald-700 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <div className="truncate text-xs font-bold text-slate-800 flex flex-col">
                          <span className={`${student.isActive && !cannotBePicked ? 'text-slate-800' : 'text-slate-400'}`}>{student.name}</span>
                          {student.pickedCount > 0 && (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-100/50 px-1 py-0.5 rounded-md w-fit mt-0.5">
                              발표 {student.pickedCount}회
                            </span>
                          )}
                        </div>
                      </label>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded transition-colors shrink-0 cursor-pointer"
                        title="학생 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Users className="w-10 h-10 text-slate-300 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-slate-700">현재 등록된 학생이 없습니다.</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                    상단의 <strong>체험용 예시 학급</strong> 단추를 누르시거나, 아래 <strong>출석부 이미지 업로드</strong>를 눌러 AI 분석 등록을 체험해 보세요!
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-6 mb-4">
            <span className="text-slate-500 font-extrabold text-sm tracking-wide">by saintk</span>
          </div>
        </div>

      </main>

      {/* AI OCR Processing Modal */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                출석부 사진 읽는 중
              </h3>
              <button 
                onClick={() => setIsOcrModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-center">
              {isOcrLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">잠시만 기다려 주세요.</p>
                  </div>
                </div>
              ) : ocrError ? (
                <div className="py-4 flex flex-col items-center gap-2">
                  <span className="p-3 bg-rose-50 text-rose-600 rounded-full">⚠️</span>
                  <p className="text-xs font-bold text-rose-800">5초후 다시 시도해주세요.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-2xl inline-flex items-center justify-center gap-1.5 w-fit mx-auto">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-950">성공적으로 한글 이름 {detectedNames.length}개를 추출했습니다!</span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border border-slate-100 bg-slate-50 p-3 rounded-2xl flex flex-wrap gap-1.5 justify-center">
                    {detectedNames.map((name, i) => (
                      <span key={i} className="text-xs bg-white text-slate-800 font-semibold px-2.5 py-1 rounded-xl border border-slate-200">
                        {name}
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    위의 이름 목록이 출석부 사진과 잘 부합하는지 눈으로 한 번 스캔해 주세요!
                  </p>
                </div>
              )}
            </div>

            {!isOcrLoading && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => setIsOcrModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  취소
                </button>
                {detectedNames.length > 0 && (
                  <button
                    onClick={handleConfirmOcrNames}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    출석부 목록에 등록 완료
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold border border-amber-100">
              💡
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">알림</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{alertMessage}</p>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-lg font-bold border border-rose-100 shrink-0">
                ❓
              </div>
              <h3 className="text-sm font-black text-slate-900">정말로 진행할까요?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{confirmData.message}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setConfirmData(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  confirmData.onConfirm();
                  setConfirmData(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                진행하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
