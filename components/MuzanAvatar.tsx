import React, { useState, useEffect, useRef } from 'react';
import { Mood, KiboStatus, Reaction } from '../types';

interface MuzanAvatarProps {
  status: KiboStatus;
  mood: Mood;
  onClick: () => void;
  reaction: Reaction;
}

const MuzanAvatar: React.FC<MuzanAvatarProps> = ({ status, mood, onClick, reaction }) => {
    const [reactionClass, setReactionClass] = useState('');
    const [idleAnim, setIdleAnim] = useState({ head: '', eyes: '' });
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
                const idleActions = ['glance', 'tilt', 'none', 'none'];
                const action = idleActions[Math.floor(Math.random() * idleActions.length)];
                
                let duration = 0;

                if (action === 'glance') {
                    setIdleAnim(prev => ({ ...prev, eyes: 'idle-glance-animation' }));
                    duration = 1500;
                } else if (action === 'tilt') {
                    setIdleAnim(prev => ({ ...prev, head: 'idle-tilt-animation' }));
                    duration = 2000;
                }
                
                if (action !== 'none') {
                    setTimeout(() => setIdleAnim({ head: '', eyes: '' }), duration);
                }
                
                scheduleIdleAnimation(); // Reschedule
            }, Math.random() * 5000 + 4000); // every 4-9 seconds
        };

        if (status === KiboStatus.IDLE) {
            scheduleIdleAnimation();
        }

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [status]);


    let mouthTransform = '';
    let eyeTransform = '';

    switch (status) {
        case KiboStatus.SPEAKING: mouthTransform = 'muzan-speaking-animation'; break;
        case KiboStatus.THINKING: eyeTransform = 'scale(1, 0.8)'; break;
        case KiboStatus.LISTENING: eyeTransform = 'scale(1.05)'; break;
        default: break;
    }
    
    const isAngry = mood === Mood.ANGRY;
    const isPleased = mood === Mood.HAPPY || mood === Mood.PLAYFUL;

  return (
    <div
      className={`relative w-28 h-28 cursor-pointer group transition-transform duration-300 hover:scale-110 ${reactionClass}`}
      onClick={onClick}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
             <filter id="muzan-red-glow"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
        </defs>
        
        <ellipse cx="50" cy="95" rx="35" ry="5" fill="rgba(0,0,0,0.2)" className="blur-sm"/>
        
        <g className={idleAnim.head}>
            <path d="M 20 90 L 25 60 C 25 40, 75 40, 75 60 L 80 90 Z" fill="#333"/>
            <path d="M 30 90 L 35 60 C 35 50, 65 50, 65 60 L 70 90 Z" fill="#fff"/>


            <circle cx="50" cy="45" r="30" fill="#f1dac4" stroke="#1a1a1a" strokeWidth="1.5" />
            
            <path d="M 25 5 Q 50 -10 75 5 L 80 45 A 30 30 0 0 1 20 45 Z" fill="#1a1a1a" />
            <path d="M 30 15 C 20 30, 35 35, 35 20 Z" fill="#1a1a1a" />
            <path d="M 70 15 C 80 30, 65 35, 65 20 Z" fill="#1a1a1a" />


            <g transform={eyeTransform} style={{ transition: 'transform 0.3s' }} className={idleAnim.eyes}>
                <path d="M 28 42 C 35 38, 45 38, 52 42 C 45 48, 35 48, 28 42 Z" fill="#fff" stroke="#1a1a1a" strokeWidth="0.5"/>
                <path d="M 72 42 C 65 38, 55 38, 48 42 C 55 48, 65 48, 72 42 Z" fill="#fff" stroke="#1a1a1a" strokeWidth="0.5"/>
                <path d="M 32 44 C 37 40, 43 40, 48 44 C 43 47, 37 47, 32 44 Z" className={isAngry ? 'muzan-angry-glow' : ''} fill="#9c2144" />
                <path d="M 68 44 C 63 40, 57 40, 52 44 C 57 47, 63 47, 68 44 Z" className={isAngry ? 'muzan-angry-glow' : ''} fill="#9c2144" />
                <path d="M 39 40 V 48" stroke="#1a1a1a" strokeWidth="1.5"/>
                <path d="M 61 40 V 48" stroke="#1a1a1a" strokeWidth="1.5"/>
            </g>

            <g fill="#f1dac4" className={status === KiboStatus.IDLE ? 'muzan-blinking-animation' : ''}>
               <path d="M 28 42 C 35 38, 45 38, 52 42 C 45 48, 35 48, 28 42 Z" />
               <path d="M 72 42 C 65 38, 55 38, 48 42 C 55 48, 65 48, 72 42 Z" />
            </g>

            <g transform={mouthTransform}>
                <path d={isPleased ? "M 40 60 Q 50 63 60 60" : "M 42 60 H 58"} stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" />
            </g>
            
            <ellipse cx="50" cy="15" rx="35" ry="7" fill="#fff" stroke="#1a1a1a" strokeWidth="1.5"/>
            <path d="M 30 15 C 30 0, 70 0, 70 15 Z" fill="#fff" stroke="#1a1a1a" strokeWidth="1.5"/>
            <ellipse cx="50" cy="15" rx="35" ry="7" fill="none" stroke="#d13c5b" strokeWidth="2" strokeDasharray="100" strokeDashoffset="75" />
        </g>
      </svg>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity capitalize">
        Muzan
      </div>
    </div>
  );
};

export default MuzanAvatar;