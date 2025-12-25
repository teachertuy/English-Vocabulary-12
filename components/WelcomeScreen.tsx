
import React, { useState, useEffect, useRef } from 'react';
import { PlayerData } from '../types';
import { getGameStatus } from '../services/firebaseService';

interface WelcomeScreenProps {
  onLogin: (player: PlayerData) => void;
  onHostRequest: () => void;
  classroomId: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onHostRequest, classroomId }) => {
  const [playerName, setPlayerName] = useState('');
  const [playerClass, setPlayerClass] = useState('');
  const [error, setError] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const [shakeClass, setShakeClass] = useState(false);
  const [isGameEnabled, setIsGameEnabled] = useState(true);
  
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to avoid "Cannot find namespace 'NodeJS'" in browser environments
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsCheckingStatus(true);
    
    // Cơ chế Safety Timeout: Nếu sau 3.5 giây Firebase không phản hồi, cho phép học sinh vào học
    safetyTimerRef.current = setTimeout(() => {
        if (isCheckingStatus) {
            console.warn("Firebase connection timed out, enabling login by default.");
            setIsCheckingStatus(false);
            setIsGameEnabled(true);
        }
    }, 3500);

    const unsubscribe = getGameStatus(classroomId, (isEnabled) => {
      // Khi nhận được phản hồi từ Firebase, xóa bộ đếm thời gian an toàn
      if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
      }
      
      setIsGameEnabled(isEnabled);
      if (!isEnabled) {
        setError("Giáo viên đã tạm ngắt kết nối, vui lòng chờ!");
      } else {
        setError('');
      }
      setIsCheckingStatus(false);
    });

    return () => {
        unsubscribe();
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [classroomId]);

  const handleStartClick = () => {
    if (!isGameEnabled) {
      setError("Giáo viên đã tạm ngắt kết nối, vui lòng chờ!");
      return;
    }
    
    const trimmedName = playerName.trim();
    const trimmedClass = playerClass.trim();

    if (!trimmedName || !trimmedClass) {
      setError('Vui lòng nhập đầy đủ họ tên và lớp.');
      if (!trimmedName) {
        setShakeName(true);
        setTimeout(() => setShakeName(false), 500);
      }
      if (!trimmedClass) {
        setShakeClass(true);
        setTimeout(() => setShakeClass(false), 500);
      }
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    // Gọi login ngay lập tức
    onLogin({ name: trimmedName, class: trimmedClass.toUpperCase() });
  };
  
  const isButtonDisabled = isSubmitting || (!isGameEnabled && !isCheckingStatus);
  
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center min-h-[600px] blueprint-bg relative overflow-hidden">
       {/* Teacher Login / Avatar */}
       <button 
         onClick={onHostRequest} 
         className="absolute top-6 left-6 z-50 flex flex-col items-center group cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50 rounded-full transition-transform transform hover:scale-105"
         title="Teacher Login"
       >
         <img src="https://i.postimg.cc/132B8h0t/11zon-cropped-1.png" alt="Logo" className="w-20 h-20 rounded-full border-4 border-yellow-300 shadow-lg group-hover:border-yellow-400" />
         <p
           className="text-white font-bold text-sm pointer-events-none select-none -mt-2 group-hover:text-yellow-300"
           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
           aria-hidden="true"
         >
           {`{teachertuy}`}
         </p>
       </button>
      
      <div className="w-full max-md mt-20 space-y-4 z-10">
            {/* Title Section */}
            <div className="w-full h-24 mb-0 relative">
                 <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                    <path id="curve" d="M 50, 90 Q 250, 45 450, 90" stroke="transparent" fill="transparent"/>
                    <text width="500" className="fill-current text-yellow-400" style={{ filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.3))' }}>
                        <textPath href="#curve" startOffset="50%" textAnchor="middle" className="text-[1.6rem] sm:text-[2.2rem] font-black tracking-wider uppercase">
                            ENGLISH VOCABULARY 12
                        </textPath>
                    </text>
                </svg>
            </div>

            {/* Hint Emoji */}
            <div className="flex justify-center -mt-8 mb-4">
                 <div className="text-5xl pointing-finger-down filter drop-shadow-xl transform hover:scale-110 transition-transform cursor-default">
                    👇
                </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-4 w-full">
                 <div className="relative group">
                    <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        placeholder="Nhập họ và tên của bạn.." 
                        className={`w-full px-6 py-4 rounded-3xl text-center text-xl font-black bg-gradient-to-r from-teal-400 to-cyan-500 border-2 border-white focus:outline-none focus:border-yellow-300 focus:ring-4 focus:ring-cyan-300/40 placeholder-teal-100 text-white shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all transform group-hover:-translate-y-0.5 group-hover:shadow-[0_15px_25px_rgba(0,0,0,0.3)] ${shakeName ? 'animate-pulse border-red-500' : ''}`}
                    />
                 </div>
                 <div className="relative group flex justify-center">
                    <input 
                        type="text" 
                        value={playerClass} 
                        onChange={(e) => setPlayerClass(e.target.value)} 
                        placeholder="Lớp..." 
                        style={{
                            backgroundImage: 'radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 3px), radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 2px)',
                            backgroundSize: '30px 30px, 20px 20px',
                            backgroundPosition: '0 0, 10px 10px',
                            backgroundColor: '#050505'
                        }}
                        className={`w-32 sm:w-40 px-2 py-3 rounded-2xl text-center text-xl font-black border-2 border-white focus:outline-none focus:border-white focus:ring-4 focus:ring-yellow-200/50 placeholder-gray-600 text-yellow-300 shadow-lg transition-all transform group-hover:-translate-y-1 ${shakeClass ? 'animate-pulse border-red-600' : ''}`}
                    />
                 </div>
            </div>
            
            <div className="h-4">
                 {error && <p className="text-red-100 font-bold bg-red-600/90 px-4 py-1 rounded-full inline-block shadow-lg animate-bounce text-sm">{error}</p>}
                 {isCheckingStatus && !error && <p className="text-blue-200 font-bold animate-pulse text-xs">Đang kiểm tra kết nối phòng...</p>}
            </div>

            {/* Start Button */}
            <div className="flex justify-center pt-2 pb-8">
                <button 
                    onClick={handleStartClick} 
                    disabled={isButtonDisabled}
                    className="group relative w-24 h-24 rounded-full bg-yellow-400 text-red-600 font-black text-xl transition-all border-2 border-white flex items-center justify-center hover:scale-110 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                >
                    {isSubmitting ? (
                        <svg className="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <span style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>
                            {isCheckingStatus ? '...' : 'START'}
                        </span>
                    )}
                </button>
            </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
