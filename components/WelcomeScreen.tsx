
import React, { useState, useEffect, useMemo } from 'react';
import { PlayerData, WelcomeScreenConfig } from '../types';
import { getGameStatus, listenToWelcomeConfig } from '../services/firebaseService';

interface WelcomeScreenProps {
  onLogin: (player: PlayerData) => void;
  onHostRequest: () => void;
  classroomId: string;
}

const DEFAULT_CONFIG: WelcomeScreenConfig = {
    titleText: 'ENGLISH VOCABULARY 12',
    titleFontSize: 2.2,
    titleColor: '#facc15',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ffffff',
    inputNamePlaceholder: 'Nhập họ và tên của bạn..',
    inputClassWidth: 10,
    inputClassFontSize: 1.25,
    inputClassColor: '#facc15',
    inputClassPlaceholder: 'Lớp...',
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onHostRequest, classroomId }) => {
  const [playerName, setPlayerName] = useState('');
  const [playerClass, setPlayerClass] = useState('');
  const [error, setError] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const [shakeClass, setShakeClass] = useState(false);
  const [isGameEnabled, setIsGameEnabled] = useState(true);
  const [config, setConfig] = useState<WelcomeScreenConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setIsCheckingStatus(true);
    const unsubscribeStatus = getGameStatus(classroomId, (isEnabled) => {
      setIsGameEnabled(isEnabled);
      if (!isEnabled) {
        setError("Giáo viên đã tạm ngắt kết nối, vui lòng chờ!");
      } else {
        setError('');
      }
      setIsCheckingStatus(false);
    });

    const unsubscribeConfig = listenToWelcomeConfig(classroomId, (newConfig) => {
        if (newConfig) {
            setConfig(newConfig);
        }
    });

    return () => {
        unsubscribeStatus();
        unsubscribeConfig();
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

    onLogin({ name: trimmedName, class: trimmedClass.toUpperCase() });
  };
  
  const isButtonDisabled = isCheckingStatus || isSubmitting || !isGameEnabled;

  const titleLines = useMemo(() => {
    const manualLines = config.titleText.split('\n').filter(l => l.trim() !== '');
    if (manualLines.length > 1) return manualLines.slice(0, 2);

    const text = config.titleText.trim();
    if (text.length > 12 && config.titleFontSize > 2.8) {
        const mid = Math.floor(text.length / 2);
        const splitIndex = text.lastIndexOf(' ', mid + 5);
        if (splitIndex !== -1) {
            return [text.substring(0, splitIndex), text.substring(splitIndex + 1)];
        }
    }
    return [text];
  }, [config.titleText, config.titleFontSize]);
  
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center min-h-[500px] blueprint-bg relative overflow-hidden">
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
      
      {/* Main Content Wrapper */}
      <div className="w-full max-w-md mt-0 space-y-0 z-10 flex flex-col items-center">
            {/* Curved Title - Moved DOWN significantly with mt-24 */}
            <div className={`w-full transition-all duration-500 ${titleLines.length > 1 ? 'h-28' : 'h-20'} relative mt-24`}>
                 <svg viewBox={titleLines.length > 1 ? "0 0 500 130" : "0 0 500 80"} className="w-full h-full overflow-visible">
                    {/* Hàng 1 */}
                    <path id="curve1" d={titleLines.length > 1 ? "M 50, 60 Q 250, 15 450, 60" : "M 50, 70 Q 250, 25 450, 70"} stroke="transparent" fill="transparent"/>
                    <text width="500" style={{ fill: config.titleColor, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))', fontSize: `${config.titleFontSize}rem` }} className="font-black tracking-wider uppercase">
                        <textPath href="#curve1" startOffset="50%" textAnchor="middle">
                            {titleLines[0]}
                        </textPath>
                    </text>
                    
                    {/* Hàng 2 (Chỗ của số 12) */}
                    {titleLines.length > 1 && (
                        <>
                            <path id="curve2" d="M 50, 105 Q 250, 60 450, 105" stroke="transparent" fill="transparent"/>
                            <text width="500" style={{ fill: config.titleColor, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))', fontSize: `${config.titleFontSize * 0.85}rem` }} className="font-black tracking-wider uppercase opacity-90">
                                <textPath href="#curve2" startOffset="50%" textAnchor="middle">
                                    {titleLines[1]}
                                </textPath>
                            </text>
                        </>
                    )}
                 </svg>
            </div>

            {/* Pointing Finger - Adjusted position to be close to the title */}
            <div className="flex justify-center -mt-10 mb-2 relative z-20">
                 <div className="text-5xl pointing-finger-down filter drop-shadow-xl transform hover:scale-110 transition-transform cursor-default">
                    👇
                </div>
            </div>

            {/* Input Fields - Positioned neatly after the finger */}
            <div className="mt-2 space-y-3 w-full flex flex-col items-center">
                 <div className="relative group w-full flex justify-center" style={{ width: `${config.inputNameWidth}%` }}>
                    <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        placeholder={config.inputNamePlaceholder || "Nhập họ và tên của bạn.."} 
                        style={{ fontSize: `${config.inputNameFontSize}rem`, color: config.inputNameColor }}
                        className={`w-full px-6 py-4 rounded-3xl text-center font-black bg-gradient-to-r from-teal-400 to-cyan-500 border-2 border-white focus:outline-none focus:border-yellow-300 focus:ring-4 focus:ring-cyan-300/40 placeholder-teal-100 shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all transform group-hover:-translate-y-0.5 group-hover:shadow-[0_15px_25px_rgba(0,0,0,0.3)] ${shakeName ? 'animate-pulse border-red-500' : ''}`}
                    />
                 </div>
                 {/* Class Input */}
                 <div className="relative group flex justify-center">
                    <input 
                        type="text" 
                        value={playerClass} 
                        onChange={(e) => setPlayerClass(e.target.value)} 
                        placeholder={config.inputClassPlaceholder || "Lớp..."} 
                        style={{
                            backgroundImage: 'radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 3px), radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 2px)',
                            backgroundSize: '30px 30px, 20px 20px',
                            backgroundPosition: '0 0, 10px 10px',
                            backgroundColor: '#050505',
                            width: `${config.inputClassWidth}rem`,
                            fontSize: `${config.inputClassFontSize}rem`,
                            color: config.inputClassColor
                        }}
                        className={`px-2 py-3 rounded-2xl text-center font-black border-2 border-white focus:outline-none focus:border-white focus:ring-4 focus:ring-yellow-200/50 placeholder-gray-600 shadow-lg transition-all transform group-hover:-translate-y-1 ${shakeClass ? 'animate-pulse border-red-600' : ''}`}
                    />
                 </div>
            </div>
            
            <div className="h-1 mt-1">
                 {error && <p className="text-red-100 font-bold bg-red-600/90 px-4 py-0.5 rounded-full inline-block shadow-lg animate-bounce text-[10px]">{error}</p>}
            </div>

            {/* Start Button */}
            <div className="flex justify-center pt-8 pb-0">
                <button 
                    onClick={handleStartClick} 
                    disabled={isButtonDisabled}
                    className="group relative w-20 h-20 rounded-full bg-yellow-400 text-red-600 font-black text-lg transition-all border-2 border-white flex items-center justify-center hover:scale-110 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                >
                    {isCheckingStatus ? (
                        <svg className="animate-spin h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
