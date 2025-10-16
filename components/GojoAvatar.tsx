import React, { useState, useEffect, useRef } from 'react';
import { Mood, KiboStatus, Reaction } from '../types';

interface GojoAvatarProps {
  status: KiboStatus;
  mood: Mood;
  onClick: () => void;
  reaction: Reaction;
}

const GojoAvatar: React.FC<GojoAvatarProps> = ({ status, mood, onClick, reaction }) => {
    const [reactionClass, setReactionClass] = useState('');
    const [idleAnim, setIdleAnim] = useState({ head: '' });
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
                setIdleAnim({ head: 'gojo-idle-glance-animation' });
                const duration = 2500;
                
                setTimeout(() => setIdleAnim({ head: '' }), duration);
                
                scheduleIdleAnimation(); // Reschedule
            }, Math.random() * 5000 + 5000); // every 5-10 seconds
        };

        if (status === KiboStatus.IDLE) {
            scheduleIdleAnimation();
        }

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [status]);

    const isPleased = mood === Mood.HAPPY || mood === Mood.PLAYFUL;
    const isSerious = mood === Mood.ANGRY || mood === Mood.BUSY;

  return (
    <div
      className={`relative w-28 h-28 cursor-pointer group transition-transform duration-300 hover:scale-110 ${reactionClass}`}
      onClick={onClick}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="95" rx="35" ry="5" fill="rgba(0,0,0,0.2)" className="blur-sm" />
        
        <g className={`${status === KiboStatus.IDLE ? 'gojo-breathing-animation' : ''} ${status === KiboStatus.THINKING ? 'gojo-thinking-glow' : ''} ${idleAnim.head}`}>
            {/* Neck and Collar */}
            <path d="M 40 85 C 40 70, 60 70, 60 85 L 70 95 H 30 Z" fill="#1E2A4D"/>
            <path d="M 42 85 C 42 75, 58 75, 58 85" fill="#3B5998" />
            <circle cx="50" cy="88" r="3" fill="#FFD700" />
            
            {/* Head */}
            <circle cx="50" cy="55" r="30" fill="#f0e2d5" stroke="#333" strokeWidth="1.5" />
            
            {/* Hair */}
            <g fill="#FFFFFF" stroke="#AAAAAA" strokeWidth="0.5">
                <path d="M 50 25 C 20 20, 20 55, 30 55" />
                <path d="M 50 25 C 80 20, 80 55, 70 55" />
                <path d="M 50 25 L 40 15 L 50 10 L 60 15 Z" />
                <path d="M 30 30 L 20 20 L 25 35 Z" />
                <path d="M 70 30 L 80 20 L 75 35 Z" />
                 <path d="M 50 20 Q 30 10 25 30 T 40 50" />
                <path d="M 50 20 Q 70 10 75 30 T 60 50" />
            </g>

            {/* Blindfold */}
            <rect x="25" y="48" width="50" height="15" fill="#1a1a1a" />

            {/* Mouth */}
            <path d={isPleased ? "M 45 68 Q 50 74 55 68" : "M 45 68 Q 50 70 55 68"} stroke="#333" strokeWidth="1.5" strokeLinecap="round" className={status === KiboStatus.SPEAKING ? 'gojo-speaking-animation' : ''} style={{ transition: 'd 0.3s' }}/>

             {/* Ears */}
            <path d="M 20 55 C 15 50, 15 65, 20 60" fill="#f0e2d5" stroke="#333" strokeWidth="1.5" />
            <path d="M 80 55 C 85 50, 85 65, 80 60" fill="#f0e2d5" stroke="#333" strokeWidth="1.5" />
        </g>
      </svg>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity capitalize">
        Gojo
      </div>
    </div>
  );
};

export default GojoAvatar;