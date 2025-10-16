import React, { useState, useEffect, useRef } from 'react';
import { Mood, KiboStatus, Reaction, AnimationPack } from '../types';

interface AbstractAvatarProps {
  status: KiboStatus;
  mood: Mood;
  onClick: () => void;
  reaction: Reaction;
  animationPack: AnimationPack;
}

const moodColors: Record<Mood, { bg: string, accent: string }> = {
    [Mood.NEUTRAL]: { bg: 'bg-slate-500', accent: 'bg-slate-300' },
    [Mood.HAPPY]: { bg: 'bg-yellow-400', accent: 'bg-yellow-200' },
    [Mood.PLAYFUL]: { bg: 'bg-pink-400', accent: 'bg-pink-200' },
    [Mood.SAD]: { bg: 'bg-blue-500', accent: 'bg-blue-300' },
    [Mood.BUSY]: { bg: 'bg-purple-500', accent: 'bg-purple-300' },
    [Mood.ANGRY]: { bg: 'bg-red-500', accent: 'bg-red-300' },
};

const AbstractAvatar: React.FC<AbstractAvatarProps> = ({ status, mood, onClick, reaction, animationPack }) => {
  const [reactionClass, setReactionClass] = useState('');
  const [idleAnim, setIdleAnim] = useState({ body: '', pupil: '' });
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
                idleActions.push('hop');
            }

            const action = idleActions[Math.floor(Math.random() * idleActions.length)];
            
            let newBodyAnim = '';
            let newPupilAnim = '';
            let duration = 0;

            if (action === 'look') {
                newPupilAnim = 'idle-look-around-animation';
                duration = 2500;
            } else if (action === 'hop') {
                newBodyAnim = 'idle-hop-animation';
                duration = 500;
            }
            
            if (action !== 'none') {
                setIdleAnim({ body: newBodyAnim, pupil: newPupilAnim });
                setTimeout(() => setIdleAnim({ body: '', pupil: '' }), duration);
            }
            
            scheduleIdleAnimation(); // Reschedule
        }, Math.random() * 4000 + 3000); // every 3-7 seconds
    };

    if (status === KiboStatus.IDLE) {
        scheduleIdleAnimation();
    }

    return () => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
    };
  }, [status, mood]);

  const color = moodColors[mood] || moodColors.NEUTRAL;
  const isThinking = status === KiboStatus.THINKING;
  
  let bodyAnimationClass = '';
  let eyeContainerStyle: React.CSSProperties = {};
  let pupilAnimationClass = '';
  let bodyStyle: React.CSSProperties = {};

  const isSubtle = animationPack === AnimationPack.SUBTLE;

  // Mood-based expressions
  switch (mood) {
    case Mood.HAPPY: case Mood.PLAYFUL: eyeContainerStyle = { borderRadius: '0 0 30px 30px' }; break;
    case Mood.SAD: eyeContainerStyle = { borderRadius: '30px 30px 0 0' }; break;
    case Mood.ANGRY: eyeContainerStyle = { transform: 'scaleY(0.6)' }; break;
    default: break;
  }

  // Status-based primary animations
  switch (status) {
    case KiboStatus.LISTENING:
      bodyAnimationClass = 'animate-pulse';
      pupilAnimationClass = 'scale-125';
      break;
    case KiboStatus.SPEAKING:
      bodyAnimationClass = isSubtle ? 'subtle-nodding-animation' : 'nodding-animation';
      eyeContainerStyle = { ...eyeContainerStyle, height: '1.5rem', transform: `scaleY(1)` };
      break;
    case KiboStatus.THINKING:
      bodyAnimationClass = isSubtle ? 'subtle-thinking-glow-animation' : 'thinking-glow-animation';
      const glowRgb = {
          [Mood.NEUTRAL]: '100, 116, 139', [Mood.HAPPY]: '250, 204, 21', [Mood.PLAYFUL]: '244, 114, 182',
          [Mood.SAD]: '59, 130, 246', [Mood.BUSY]: '139, 92, 246', [Mood.ANGRY]: '239, 68, 68',
      }[mood] || '100, 116, 139';
      bodyStyle = { '--glow-color': `rgba(${glowRgb}, 0.7)` } as React.CSSProperties;
      pupilAnimationClass = 'eye-scan-animation';
      break;
    case KiboStatus.IDLE:
    default:
      bodyAnimationClass = isSubtle ? 'subtle-breathing-animation' : 'breathing-animation';
      if (!isSubtle) {
         if (mood === Mood.HAPPY || mood === Mood.PLAYFUL) bodyAnimationClass += ' breathing-happy';
         else if (mood === Mood.SAD) bodyAnimationClass += ' breathing-sad';
      }
      pupilAnimationClass = 'blinking-animation';
      break;
  }

  return (
    <div
      className={`relative w-24 h-24 rounded-full cursor-pointer group transition-transform duration-300 hover:scale-110 ${reactionClass}`}
      onClick={onClick}
    >
      <div className={`absolute inset-0 ${color.bg} rounded-full blur-lg opacity-50 ${isThinking ? 'hidden' : ''}`}></div>
      
      <div 
        className={`relative w-full h-full rounded-full ${color.bg} ${bodyAnimationClass} ${idleAnim.body} flex items-center justify-center overflow-hidden border-4 border-white/50 shadow-lg`}
        style={bodyStyle}
      >
        <div className={`w-12 h-12 rounded-full ${color.accent} flex items-center justify-center transition-all duration-300`} style={eyeContainerStyle}>
            <div className={`w-4 h-4 rounded-full bg-slate-800 transition-all duration-300 ${pupilAnimationClass} ${idleAnim.pupil}`}></div>
        </div>
      </div>
       <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity capitalize">
        {status}
      </div>
    </div>
  );
};

export default AbstractAvatar;