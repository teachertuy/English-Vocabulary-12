import React, { useState, useEffect, useCallback } from 'react';
import { PlayerData, QuizQuestion } from '../types';
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

  useEffect(() => {
    setIsCheckingStatus(true);
    const unsubscribe = getGameStatus(classroomId, (isEnabled) => {
      setIsGameEnabled(isEnabled);
      if (!isEnabled) {
        setError("Giáo viên đã tạm ngắt kết nối, vui lòng chờ!");
      } else {
        setError('');
      }
      setIsCheckingStatus(false);
    });
    return () => unsubscribe();
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

    onLogin({ name: trimmedName, class: trimmedClass.toUpperCase() });
  };
  
  const isButtonDisabled = isCheckingStatus || isSubmitting || !isGameEnabled;
  
  return (
    <div className="flex flex-col items-center p-8 text-center min-h-[600px] blueprint-bg relative">
       <button 
         onClick={onHostRequest} 
         className="absolute top-4 left-4 z-50 flex flex-col items-center group cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50 rounded-full transition-transform transform hover:scale-105"
         title="Teacher Login"
       >
         <img src="https://i.postimg.cc/132B8h0t/11zon-cropped-1.png" alt="Logo" className="w-20 h-20 rounded-full border-2 border-yellow-300 shadow-md group-hover:border-yellow-400" />
         <p
           className="text-white font-bold text-xs pointer-events-none select-none -mt-1 group-hover:text-yellow-300"
           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
           aria-hidden="true"
         >
           {`{teachertuy}`}
         </p>
         <div className="absolute top-full mt-2 hidden group-hover:block bg-black/70 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            Đăng nhập Giáo viên
         </div>
       </button>
      
      <div className="flex flex-col items-center w-full flex-grow">
        <div className="flex-grow"></div>

        <div className="w-full max-w-md mb-6">
            <div className="text-center mb-8">
                <div className="w-full h-28 -mb-4">
                    <svg viewBox="0 0 500 100" className="w-full h-full">
                        <path id="curve" d="M 20, 95 Q 250, 55 480, 95" stroke="transparent" fill="transparent"/>
                        <text width="500" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}} className="text-yellow-300 fill-current">
                            <textPath href="#curve" startOffset="50%" text-anchor="middle" className="text-[2.2rem] sm:text-[3.0rem] font-black tracking-widest uppercase">
                                ENGLISH VOCABULARY 12
                            </textPath>
                        </text>
                    </svg>
                </div>
                <div className="text-5xl pointing-finger-down mt-0">
                    <span>👇</span>
                </div>
            </div>
            <div className="space-y-4">
            <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)} 
                placeholder="Nhập họ và tên của bạn..." 
                className={`w-full px-5 py-4 border-0 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-yellow-300 transition-shadow bg-white text-green-800 font-extrabold placeholder-gray-400 shadow-inner ring-4 ring-yellow-400 ${shakeName ? 'shake ring-red-500' : ''}`}
            />
            <input 
                type="text" 
                value={playerClass} 
                onChange={(e) => setPlayerClass(e.target.value)} 
                placeholder="Nhập lớp của bạn..." 
                className={`w-full px-5 py-4 border-0 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-red-400 transition-shadow bg-white text-red-600 font-extrabold placeholder-gray-400 shadow-inner ring-4 ring-red-500 ${shakeClass ? 'shake' : ''}`}
            />
            </div>
            <p className="text-red-300 font-semibold mt-2 h-6">{error}</p>
            <div className="mt-4 flex flex-col items-center">
            <button 
                onClick={handleStartClick} 
                disabled={isButtonDisabled}
                className="w-28 h-28 bg-yellow-400 rounded-full flex items-center justify-center text-red-600 font-extrabold text-2xl shadow-lg transform hover:scale-105 transition-transform duration-300 border-4 border-white disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isCheckingStatus ? (
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ) : isSubmitting ? '...' : 'START'}
            </button>
            </div>
        </div>

        <div className="flex-grow"></div>
      </div>
    </div>
  );
};

export default WelcomeScreen;