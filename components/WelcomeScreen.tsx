
import React, { useState, useEffect, useMemo } from 'react';
import { PlayerData, WelcomeScreenConfig } from '../types';
import { getGameStatus, listenToWelcomeConfig } from '../services/firebaseService';

interface WelcomeScreenProps {
  onLogin: (player: PlayerData) => void;
  onHostRequest: () => void;
  classroomId: string;
}

const DEFAULT_CONFIG: WelcomeScreenConfig = {
    titleText: 'ENGLISH VOCABULARY\n12',
    titleFontSize: 1.8,
    titleFontSizeLine2: 1.6,
    titleColor: '#facc15',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ffffff',
    inputNamePlaceholder: 'Nhập họ và tên của bạn..',
    inputNameBorderColor: '#ffffff',
    inputNameBorderWidth: 2,
    inputClassWidth: 30,
    inputClassFontSize: 1.25,
    inputClassColor: '#facc15',
    inputClassPlaceholder: 'Lớp...',
    inputClassBorderColor: '#ffffff',
    inputClassBorderWidth: 2,
    startButtonText: 'START',
    startButtonSize: 4,
    startButtonBgColor: '#facc15',
    startButtonTextColor: '#dc2626',
    startButtonRingColor: '#ffffff',
    startButtonRingWidth: 2
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
            setConfig({ ...DEFAULT_CONFIG, ...newConfig });
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
    if (text.length > 25 && config.titleFontSize > 2.5) {
        const mid = Math.floor(text.length / 2);
        const splitIndex = text.lastIndexOf(' ', mid + 5);
        if (splitIndex !== -1) {
            return [text.substring(0, splitIndex), text.substring(splitIndex + 1)];
        }
    }
    return [text];
  }, [config.titleText, config.titleFontSize]);

  const line2LetterSpacing = useMemo(() => {
    if (titleLines.length > 1) {
        const line2 = titleLines[1].trim();
        if (line2 === '12') return '-0.08em';
        if (line2.includes('12')) return '0.05em';
    }
    return '0.35em';
  }, [titleLines]);
  
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center min-h-[500px] blueprint-bg relative overflow-hidden">
       <button 
         onClick={onHostRequest} 
         className="absolute top-6 left-6 z-50 flex flex-col items-center group cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50 rounded-full transition-transform transform hover:scale-105"
         title="Teacher Login"
       >
         <img src="https://i.postimg.cc/132B8h0t/11zon-cropped-1.png" alt="Logo" className="w-16 h-16 rounded-full border-4 border-yellow-300 shadow-lg group-hover:border-yellow-400" />
         <p
           className="text-white font-bold text-[10px] pointer-events-none select-none -mt-1.5 group-hover:text-yellow-300"
           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
           aria-hidden="true"
         >
           {`{teachertuy}`}
         </p>
       </button>
      
      <div className="w-full max-w-[350px] mt-0 space-y-0 z-10 flex flex-col items-center">
            <div className={`w-full transition-all duration-500 ${titleLines.length > 1 ? 'h-40' : 'h-20'} relative mt-12`}>
                 <svg viewBox={titleLines.length > 1 ? "0 0 500 170" : "0 0 500 90"} className="w-full h-full overflow-visible">
                    <path id="curve1" d={titleLines.length > 1 ? "M 50, 60 Q 250, 15 450, 60" : "M 20, 75 Q 250, 30 480, 75"} stroke="transparent" fill="transparent"/>
                    <text width="500" style={{ fill: config.titleColor, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))', fontSize: `${config.titleFontSize}rem` }} className="font-black tracking-wider uppercase">
                        <textPath href="#curve1" startOffset="50%" textAnchor="middle">
                            {titleLines[0]}
                        </textPath>
                    </text>
                    
                    {titleLines.length > 1 && (
                        <>
                            <path id="curve2" d="M 10, 150 Q 250, 100 490, 150" stroke="transparent" fill="transparent"/>
                            <text width="500" style={{ fill: config.titleColor, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))', fontSize: `${config.titleFontSizeLine2 || (config.titleFontSize * 0.85)}rem`, letterSpacing: line2LetterSpacing }} className="font-black uppercase opacity-95">
                                <textPath href="#curve2" startOffset="50%" textAnchor="middle">
                                    {titleLines[1]}
                                </textPath>
                            </text>
                        </>
                    )}
                 </svg>
            </div>

            <div className="flex justify-center -mt-8 mb-2 relative z-20">
                 <div className="text-4xl pointing-finger-down filter drop-shadow-xl transform hover:scale-110 transition-transform cursor-default">
                    👇
                </div>
            </div>

            <div className="mt-2 space-y-3 w-full flex flex-col items-center">
                 <div className="relative group w-full flex justify-center" style={{ width: `${config.inputNameWidth}%` }}>
                    <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        placeholder={config.inputNamePlaceholder || "Nhập họ và tên của bạn.."} 
                        style={{ 
                            fontSize: `${config.inputNameFontSize}rem`, 
                            color: config.inputNameColor,
                            borderColor: config.inputNameBorderColor,
                            borderWidth: `${config.inputNameBorderWidth}px`
                        }}
                        className={`w-full px-5 py-3.5 rounded-3xl text-center font-black bg-gradient-to-r from-teal-400 to-cyan-500 border-2 focus:outline-none focus:border-yellow-300 focus:ring-4 focus:ring-cyan-300/40 placeholder-teal-100 shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all transform group-hover:-translate-y-0.5 group-hover:shadow-[0_15px_25px_rgba(0,0,0,0.3)] ${shakeName ? 'animate-pulse border-red-500' : ''}`}
                    />
                 </div>
                 <div className="relative group w-full flex justify-center" style={{ width: `${config.inputClassWidth}%` }}>
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
                            width: '100%',
                            fontSize: `${config.inputClassFontSize}rem`, 
                            color: config.inputClassColor,
                            borderColor: config.inputClassBorderColor,
                            borderWidth: `${config.inputClassBorderWidth}px`
                        }}
                        className={`px-2 py-2.5 rounded-2xl text-center font-black border-2 focus:outline-none focus:border-white focus:ring-4 focus:ring-yellow-200/50 placeholder-gray-600 shadow-lg transition-all transform group-hover:-translate-y-1 ${shakeClass ? 'animate-pulse border-red-600' : ''}`}
                    />
                 </div>
            </div>
            
            <div className="h-1 mt-1">
                 {error && <p className="text-red-100 font-bold bg-red-600/90 px-4 py-0.5 rounded-full inline-block shadow-lg animate-bounce text-[10px]">{error}</p>}
            </div>

            <div className="flex justify-center pt-6 pb-2">
                <button 
                    onClick={handleStartClick} 
                    disabled={isButtonDisabled}
                    style={{ 
                        width: isNaN(config.startButtonSize) ? '4rem' : `${config.startButtonSize}px`, 
                        height: isNaN(config.startButtonSize) ? '4rem' : `${config.startButtonSize}px`,
                        fontSize: isNaN(config.startButtonSize) ? '1rem' : `${config.startButtonSize * 0.2}px`,
                        backgroundColor: config.startButtonBgColor,
                        color: config.startButtonTextColor,
                        borderColor: config.startButtonRingColor,
                        borderWidth: `${config.startButtonRingWidth}px`
                    }}
                    className="group relative rounded-full font-black transition-all border-2 flex items-center justify-center hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                >
                    {isCheckingStatus ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : isSubmitting ? (
                        <span className="animate-pulse">...</span>
                    ) : (
                        <span className="uppercase" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}>{config.startButtonText}</span>
                    )}
                </button>
            </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
