import React, { useState, useEffect, useRef } from 'react';
import { Mood, KiboStatus, Reaction } from '../types';

interface AnimeAvatarProps {
  status: KiboStatus;
  mood: Mood;
  onClick: () => void;
  reaction: Reaction;
}

const AnimeAvatar: React.FC<AnimeAvatarProps> = ({ status, mood, onClick, reaction }) => {
    const [reactionClass, setReactionClass] = useState('');
    const [mouthPath, setMouthPath] = useState("M 40 75 Q 50 72 60 75");
    const [eyePath, setEyePath] = useState("M 20 45 Q 50 40 80 45 Q 50 55 20 45");
    const [pupilTransform, setPupilTransform] = useState("");
    const [idleAnim, setIdleAnim] = useState({ pupils: '', rightEyelid: '' });
    const idleTimerRef = useRef<number | null>(null);

    // One-shot reactions
    useEffect(() => {
        let newClass = '';
        let duration = 0;
        if (reaction !== Reaction.NONE) {
            switch (reaction) {
                case Reaction.HEAD_TILT: newClass = 'reaction-head-tilt'; duration = 1000; break;
                case Reaction.SURPRISED: newClass = 'reaction-surprised'; duration = 500; break;
                case Reaction.NOD: newClass = 'reaction-nod'; duration = 600; break;
            }
            setReactionClass(newClass);
            const timer = setTimeout(() => setReactionClass(''), duration);
            return () => clearTimeout(timer);
        }
    }, [reaction]);
    
    // Randomized idle animations
    useEffect(() => {
        const scheduleIdleAnimation = () => {
            idleTimerRef.current = window.setTimeout(() => {
                const idleActions = ['look', 'none', 'none'];
                if (mood === Mood.HAPPY || mood === Mood.PLAYFUL) {
                    idleActions.push('wink');
                }

                const action = idleActions[Math.floor(Math.random() * idleActions.length)];
                let duration = 0;

                if (action === 'look') {
                    setIdleAnim(prev => ({ ...prev, pupils: 'idle-look-around-animation' }));
                    duration = 2500;
                } else if (action === 'wink') {
                    setIdleAnim(prev => ({ ...prev, rightEyelid: 'idle-wink-animation' }));
                    duration = 300;
                }

                if (action !== 'none') {
                    setTimeout(() => setIdleAnim({ pupils: '', rightEyelid: '' }), duration);
                }
                
                scheduleIdleAnimation(); // Reschedule
            }, Math.random() * 4000 + 4000); // every 4-8 seconds
        };

        if (status === KiboStatus.IDLE) {
            scheduleIdleAnimation();
        }

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [status, mood]);

    // Set expressions based on mood and status
    useEffect(() => {
        switch (mood) {
            case Mood.HAPPY:
            case Mood.PLAYFUL:
                setMouthPath("M 40 75 Q 50 85 60 75");
                setEyePath("M 20 45 Q 50 60 80 45 Q 50 70 20 45");
                break;
            case Mood.SAD:
                setMouthPath("M 40 75 Q 50 65 60 75");
                setEyePath("M 20 45 Q 50 30 80 45 Q 50 40 20 45");
                break;
            default:
                setMouthPath("M 40 75 Q 50 72 60 75");
                setEyePath("M 20 45 Q 50 40 80 45 Q 50 55 20 45");
                break;
        }

        switch (status) {
            case KiboStatus.THINKING: setPupilTransform("translate(10, 0)"); break;
            case KiboStatus.LISTENING: setPupilTransform("scale(1.1)"); break;
            default: setPupilTransform(""); break;
        }
    }, [mood, status]);


  return (
    <div
      className={`relative w-28 h-28 cursor-pointer group transition-transform duration-300 hover:scale-110 ${reactionClass} anime-breathing-animation`}
      onClick={onClick}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        
        <path d="M 50 98 A 40 10 0 0 0 50 98 Z" fill="rgba(0,0,0,0.2)" transform="translate(0, -5)" className="blur-sm"/>

        <circle cx="50" cy="50" r="45" fill="#ffddc7" stroke="#333" strokeWidth="2" />
        <path d="M 10 50 A 45 45 0 0 1 90 50 A 50 60 0 0 1 10 50" fill="#8d5524" />
        <path d="M 25 20 Q 50 5 75 20 L 85 50 L 60 30 L 50 40 L 40 30 L 15 50 Z" fill="#8d5524" />

        <g fill="#fff" stroke="#333" strokeWidth="1.5">
          <path d={eyePath} transform="translate(-15, 0)" />
          <path d={eyePath} transform="translate(15, 0)" />
        </g>
        
        <g fill="#3d2a1d" style={{ transition: 'transform 0.3s' }} transform={pupilTransform} className={idleAnim.pupils}>
            <circle cx="35" cy="47" r="5" /><circle cx="65" cy="47" r="5" />
            <circle cx="37" cy="45" r="1.5" fill="#fff" /><circle cx="67" cy="45" r="1.5" fill="#fff" />
        </g>
        
        {/* Eyelids for blinking */}
        <g fill="#ffddc7">
            <path d={eyePath} transform="translate(-15, 0)" className={status === KiboStatus.IDLE ? 'anime-blinking-animation' : ''} />
            <path d={eyePath} transform="translate(15, 0)" className={status === KiboStatus.IDLE ? idleAnim.rightEyelid : ''} />
        </g>
        
        {status === KiboStatus.THINKING && (
            <path d="M 80 30 L 82 25 L 84 30 L 89 32 L 84 34 L 82 39 L 80 34 L 75 32 Z" fill="#ffeb3b" className="anime-thinking-animation" filter="url(#glow)"/>
        )}

        <path d={mouthPath} fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" className={status === KiboStatus.SPEAKING ? 'anime-speaking-animation' : ''} style={{ transition: 'd 0.3s' }} />

        {(mood === Mood.HAPPY || mood === Mood.PLAYFUL) && (
            <g fill="#ff9999" opacity="0.6"><circle cx="25" cy="60" r="7" className="blur-[2px]" /><circle cx="75" cy="60" r="7" className="blur-[2px]" /></g>
        )}
      </svg>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity capitalize">
        {status}
      </div>
    </div>
  );
};

export default AnimeAvatar;