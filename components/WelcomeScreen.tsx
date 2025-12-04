
import React, { useState, useEffect } from 'react';
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
    <div className="flex flex-col items-center justify-center p-4 text-center min-h-[600px] blueprint-bg relative overflow-hidden">
       {/* Teacher Login / Avatar */}
       <button 
         onClick={onHostRequest} 
         className="absolute top-6 left-6 z-50 flex flex-col items-center group cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50 rounded-full transition-transform transform hover:scale-105"
         title="Teacher Login"
       >
         <img src="https://i.postimg.cc/132B8h0t/11zon-cropped-1.png" alt="Logo" className="w-20 h-20 rounded-full border-4 border-yellow-300 shadow-lg group-hover:border-yellow-400" />
         <p
           className="text-white font-bold text-xs pointer-events-none select-none mt-1 group-hover:text-yellow-300"
           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
           aria-hidden="true"
         >
           {`{teachertuy}`}
         </p>
       </button>
      
      <div className="w-full max-w-md mt-20 space-y-4 z-10">
            {/* Curved Title - Smaller and moved down closer to emoji */}
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

            {/* Pointing Finger - Adjusted position relative to title */}
            <div className="flex justify-center -mt-8 mb-4">
                 <div className="text-5xl pointing-finger-down filter drop-shadow-xl transform hover:scale-110 transition-transform cursor-default">
                    👇
                </div>
            </div>

            {/* Input Fields - Thinner borders, specific text colors */}
            <div className="space-y-4 px-8">
                 <div className="relative group">
                    <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        placeholder="Nhập họ và tên của bạn.." 
                        className={`w-full px-6 py-3 rounded-2xl text-center text-xl font-black bg-white border-[3px] border-yellow-400 focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200 placeholder-gray-400 text-teal-700 shadow-lg transition-all transform group-hover:scale-[1.02] ${shakeName ? 'animate-pulse border-red-500' : ''}`}
                    />
                 </div>
                 <div className="relative group">
                    <input 
                        type="text" 
                        value={playerClass} 
                        onChange={(e) => setPlayerClass(e.target.value)} 
                        placeholder="Nhập lớp của bạn..." 
                        className={`w-full px-6 py-3 rounded-2xl text-center text-xl font-black bg-white border-[3px] border-red-500 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-200 placeholder-gray-400 text-red-600 shadow-lg transition-all transform group-hover:scale-[1.02] ${shakeClass ? 'animate-pulse border-red-500' : ''}`}
                    />
                 </div>
            </div>
            
            <div className="h-4">
                 {error && <p className="text-red-100 font-bold bg-red-600/90 px-4 py-1 rounded-full inline-block shadow-lg animate-bounce text-sm">{error}</p>}
            </div>

            {/* Start Button - Compact with thin white border, removed brown shadow */}
            <div className="flex justify-center pt-2 pb-8">
                <button 
                    onClick={handleStartClick} 
                    disabled={isButtonDisabled}
                    className="group relative w-24 h-24 rounded-full bg-yellow-400 text-red-600 font-black text-xl transition-all border-2 border-white flex items-center justify-center hover:scale-110 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                >
                    {isCheckingStatus ? (
                        <svg className="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : isSubmitting ? (
                        <span className="animate-pulse">...</span>
                    ) : (
                        <span style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>START</span>
                    )}
                </button>
            </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
