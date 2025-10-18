import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useKibo } from '../hooks/useKibo';
import KiboAvatar from './KiboAvatar';
import ChatWindow from './ChatWindow';
import Notification from './Notification';
import { KiboStatus } from '../types';

interface KiboInterfaceProps {
  kiboHook: ReturnType<typeof useKibo>;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

const KiboInterface: React.FC<KiboInterfaceProps> = ({ kiboHook }) => {
  const {
    kiboState,
    chatInput,
    setChatInput,
    handleSendMessage,
    handleAnalyzeScreen,
    handleAnalyzeClipboard,
    toggleListening,
    notification,
    clearNotification,
    handleLanguageChange,
    handleVoiceChange,
    handleAnimationChange,
    handleToggleProactiveMode,
    lastProactiveMessageTimestamp,
    handleGenerateLearningReport,
    handleToggleReminderComplete,
    handlePrioritizeTasks,
    handleSummarizeChat,
    handleStartFocusSession,
    handleSuggestImprovement,
    handleToggleKiboActive,
    handleToggleFloatingMode,
    handleCharacterChange,
  } = kiboHook;

  const [isChatVisible, setChatVisible] = useState(false);
  
  const [size, setSize] = useState(() => {
    try {
        const saved = localStorage.getItem('kibo-size');
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                width: Math.max(MIN_WIDTH, parsed.width || 384),
                height: Math.max(MIN_HEIGHT, parsed.height || 512),
            };
        }
    } catch (e) { console.error("Failed to load Kibo size:", e); }
    return { width: 384, height: 512 };
  });
  
  const [position, setPosition] = useState(() => {
    try {
        const saved = localStorage.getItem('kibo-position');
        if (saved) {
            const parsed = JSON.parse(saved);
            return { x: parsed.x ?? 0, y: parsed.y ?? 0 };
        }
    } catch (e) { console.error("Failed to load Kibo position:", e); }
    return { x: window.innerWidth - 450, y: window.innerHeight - 150 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [patrolDirection, setPatrolDirection] = useState<'left' | 'right'>('left');

  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartInfo = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const preMaximizedState = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const patrolFrameId = useRef<number | null>(null);

  // Save position and size to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('kibo-position', JSON.stringify(position));
    } catch (e) {
      console.error("Failed to save Kibo position:", e);
    }
  }, [position]);

  useEffect(() => {
    try {
      localStorage.setItem('kibo-size', JSON.stringify(size));
    } catch (e) {
      console.error("Failed to save Kibo size:", e);
    }
  }, [size]);
  
  // Validate initial position on mount to ensure it's on screen
  useEffect(() => {
    if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setPosition(currentPos => ({
            x: Math.max(0, Math.min(currentPos.x, window.innerWidth - offsetWidth)),
            y: Math.max(0, Math.min(currentPos.y, window.innerHeight - offsetHeight)),
        }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastProactiveMessageTimestamp > 0) {
      setChatVisible(true);
    }
  }, [lastProactiveMessageTimestamp]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (patrolFrameId.current) {
      cancelAnimationFrame(patrolFrameId.current);
      patrolFrameId.current = null;
    }
    if ((e.target as HTMLElement).closest('.drag-handle')) {
        setIsDragging(true);
        dragStartPos.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      if (isMaximized) setIsMaximized(false);

      let newX = e.clientX - dragStartPos.current.x;
      let newY = e.clientY - dragStartPos.current.y;

      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - containerWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - containerHeight));

      setPosition({ x: newX, y: newY });
    }
  }, [isDragging, isMaximized]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
     if (patrolFrameId.current) {
      cancelAnimationFrame(patrolFrameId.current);
      patrolFrameId.current = null;
    }
    setIsResizing(true);
    resizeStartInfo.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    if (isMaximized) setIsMaximized(false);
  };

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartInfo.current.x;
    const dy = e.clientY - resizeStartInfo.current.y;
    setSize({
      width: Math.max(MIN_WIDTH, resizeStartInfo.current.width + dx),
      height: Math.max(MIN_HEIGHT, resizeStartInfo.current.height + dy),
    });
  }, [isResizing]);

  const handleToggleMaximize = () => {
    if (isMaximized) {
      setPosition({ x: preMaximizedState.current.x, y: preMaximizedState.current.y });
      setSize({ width: preMaximizedState.current.width, height: preMaximizedState.current.height });
    } else {
      preMaximizedState.current = { ...position, ...size };
      const newWidth = Math.min(600, window.innerWidth - 40);
      const newHeight = Math.min(800, window.innerHeight - 40);
      setSize({ width: newWidth, height: newHeight });
      setPosition({
        x: (window.innerWidth - newWidth) / 2,
        y: (window.innerHeight - newHeight) / 2,
      });
    }
    setIsMaximized(!isMaximized);
  };

  useEffect(() => {
    const active = isDragging || isResizing;
    if (active) {
      window.addEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleResizeMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!kiboState.isKiboActive) return;
    const patrol = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const speed = 0.5;

      setPosition(currentPos => {
        let newX = currentPos.x;
        if (patrolDirection === 'left') {
          newX -= speed;
          if (newX <= 0) {
            setPatrolDirection('right');
            newX = 0;
          }
        } else {
          newX += speed;
          if (newX >= window.innerWidth - containerWidth) {
            setPatrolDirection('left');
            newX = window.innerWidth - containerWidth;
          }
        }
        return { ...currentPos, x: newX };
      });

      patrolFrameId.current = requestAnimationFrame(patrol);
    };

    if (kiboState.status === KiboStatus.IDLE && !isDragging && !isResizing && !isChatVisible) {
      patrolFrameId.current = requestAnimationFrame(patrol);
    }

    return () => {
      if (patrolFrameId.current) {
        cancelAnimationFrame(patrolFrameId.current);
      }
    };
  }, [kiboState.status, isDragging, isResizing, patrolDirection, isChatVisible, kiboState.isKiboActive]);

  return (
    <>
      <div
        ref={containerRef}
        className="fixed font-sans transition-all duration-300"
        style={{ left: `${position.x}px`, top: `${position.y}px`, zIndex: 1000 }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-end space-x-4">
            <ChatWindow
                isVisible={isChatVisible}
                kiboState={kiboState}
                inputValue={chatInput}
                onInputChange={(e) => setChatInput(e.target.value)}
                onSend={handleSendMessage}
                onMicClick={toggleListening}
                onAnalyzeScreenClick={handleAnalyzeScreen}
                onAnalyzeClipboardClick={handleAnalyzeClipboard}
                onLanguageChange={handleLanguageChange}
                onVoiceChange={handleVoiceChange}
                onAnimationChange={handleAnimationChange}
                size={size}
                isMinimized={isMinimized}
                onToggleMinimize={() => setIsMinimized(!isMinimized)}
                isMaximized={isMaximized}
                onToggleMaximize={handleToggleMaximize}
                onResizeMouseDown={handleResizeMouseDown}
                onToggleProactiveMode={handleToggleProactiveMode}
                onGenerateLearningReport={handleGenerateLearningReport}
                onToggleReminderComplete={handleToggleReminderComplete}
                onPrioritizeTasks={handlePrioritizeTasks}
                onSummarizeChat={handleSummarizeChat}
                onStartFocusSession={handleStartFocusSession}
                onSuggestImprovement={handleSuggestImprovement}
                onToggleKiboActive={handleToggleKiboActive}
                onToggleFloatingMode={handleToggleFloatingMode}
                onCharacterChange={handleCharacterChange}
            />
            <div className="drag-handle cursor-move">
                <KiboAvatar
                    status={kiboState.status}
                    mood={kiboState.mood}
                    onClick={() => setChatVisible(!isChatVisible)}
                    reaction={kiboState.reaction}
                    animationPack={kiboState.animationPack}
                    avatarStyle={kiboState.avatarStyle}
                    generatedAvatarUrl={kiboState.generatedAvatarUrl}
                    currentCharacterName={kiboState.currentCharacterName}
                    currentFestival={kiboState.currentFestival}
                />
            </div>
        </div>
      </div>
       {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
        />
      )}
    </>
  );
};

export default KiboInterface;