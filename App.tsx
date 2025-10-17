
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useKibo } from './hooks/useKibo';
import KiboAvatar from './components/KiboAvatar';
import ChatWindow from './components/ChatWindow';
import Notification from './components/Notification';
import { KiboStatus } from './types';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
        </div>
        <div className="ml-3 text-white font-medium">
            {label}
        </div>
    </label>
);

const App: React.FC = () => {
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
  } = useKibo();

  const [isChatVisible, setChatVisible] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 150 });
  const [size, setSize] = useState({ width: 384, height: 512 });
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

  useEffect(() => {
    if (lastProactiveMessageTimestamp > 0) {
      setChatVisible(true);
    }
  }, [lastProactiveMessageTimestamp]);

  useEffect(() => {
    if (!kiboState.isKiboActive) {
        setSize({ width: 320, height: 200 });
        setChatVisible(false);
        setIsMinimized(false);
        setIsMaximized(false);
    } else {
        setSize({ width: 384, height: 512 });
    }
  }, [kiboState.isKiboActive]);


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
      if (isMaximized) setIsMaximized(false); // Un-maximize on drag

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
        {kiboState.isKiboActive ? (
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
                    />
                </div>
            </div>
        ) : (
            <div 
                className="relative drag-handle cursor-move bg-slate-800/90 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-white text-center"
                style={{ width: `${size.width}px`, height: `${size.height}px` }}
            >
                <h3 className="text-2xl font-bold">Kibo is Sleeping</h3>
                <p className="text-slate-300 mt-2 mb-6">Toggle the switch to wake Kibo up.</p>
                <ToggleSwitch checked={kiboState.isKiboActive} onChange={handleToggleKiboActive} label="Wake Up" />
                <div 
                    onMouseDown={handleResizeMouseDown}
                    className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity"
                >
                    <svg width="16" height="16" viewBox="0 0 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 0V16H0L16 0Z" fill="#a0aec0"/>
                    </svg>
                </div>
            </div>
        )}
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

export default App;
