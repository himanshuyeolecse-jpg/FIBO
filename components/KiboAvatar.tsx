import React, { useState, useEffect, useRef } from 'react';
import { Mood, KiboStatus, Reaction, AnimationPack, AvatarStyle } from '../types';
import AbstractAvatar from './AbstractAvatar';
import AnimeAvatar from './AnimeAvatar';
import MuzanAvatar from './MuzanAvatar';
import GojoAvatar from './GojoAvatar';

interface KiboAvatarProps {
  status: KiboStatus;
  mood: Mood;
  onClick: () => void;
  reaction: Reaction;
  animationPack: AnimationPack;
  avatarStyle: AvatarStyle;
  generatedAvatarUrl: string | null;
  currentCharacterName: string | null;
}

const GeneratedAvatar: React.FC<KiboAvatarProps> = (props) => {
    const { generatedAvatarUrl, onClick, status, currentCharacterName, reaction, mood } = props;
    const [reactionClass, setReactionClass] = useState('');
    const [idleAnimClass, setIdleAnimClass] = useState('');
    const idleTimerRef = useRef<number | null>(null);

    // Handle one-shot reactions
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

    // Handle randomized idle animations
    useEffect(() => {
        const scheduleIdleAnimation = () => {
            idleTimerRef.current = window.setTimeout(() => {
                const idleActions = ['hop', 'tilt', 'none', 'none'];
                const action = idleActions[Math.floor(Math.random() * idleActions.length)];
                
                let newAnimClass = '';
                let duration = 0;

                if (action === 'hop') {
                    newAnimClass = 'idle-hop-animation';
                    duration = 500;
                } else if (action === 'tilt') {
                    newAnimClass = 'idle-tilt-animation';
                    duration = 2000;
                }
                
                if (action !== 'none') {
                    setIdleAnimClass(newAnimClass);
                    setTimeout(() => setIdleAnimClass(''), duration);
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
    }, [status]);

    let statusAnimationClass = '';
    switch (status) {
        case KiboStatus.IDLE:
            statusAnimationClass = 'breathing-animation';
            break;
        case KiboStatus.SPEAKING:
            statusAnimationClass = 'generated-speaking-animation';
            break;
        case KiboStatus.THINKING:
            statusAnimationClass = 'generated-thinking-animation';
            break;
        case KiboStatus.LISTENING:
            statusAnimationClass = 'generated-listening-animation';
            break;
    }

    return (
        <div
            className={`relative w-28 h-28 cursor-pointer group transition-transform duration-300 hover:scale-110 ${reactionClass} ${idleAnimClass}`}
            onClick={onClick}
        >
             <div className="relative w-full h-full">
                <div className={`absolute inset-0 bg-purple-300 rounded-full blur-lg opacity-50`}></div>
                <div className={`relative w-full h-full rounded-full flex items-center justify-center overflow-hidden border-4 border-white/50 shadow-lg bg-gray-200`}>
                    {generatedAvatarUrl ? (
                        <img 
                            src={`data:image/png;base64,${generatedAvatarUrl}`} 
                            alt={currentCharacterName || 'Generated Avatar'} 
                            className={`w-full h-full object-cover rounded-full ${statusAnimationClass}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                        </div>
                    )}
                </div>
             </div>
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity capitalize">
                {currentCharacterName || status}
            </div>
        </div>
    );
};


const KiboAvatar: React.FC<KiboAvatarProps> = (props) => {
    if (props.avatarStyle === AvatarStyle.GENERATED) {
        return <GeneratedAvatar {...props} />;
    }

    if (props.avatarStyle === AvatarStyle.ANIME_GIRL) {
        return <AnimeAvatar {...props} />;
    }

    if (props.avatarStyle === AvatarStyle.MUZAN) {
        return <MuzanAvatar {...props} />;
    }

    if (props.avatarStyle === AvatarStyle.GOJO) {
        return <GojoAvatar {...props} />;
    }
  
    return <AbstractAvatar {...props} />;
};

export default KiboAvatar;