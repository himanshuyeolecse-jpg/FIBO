import React, { useRef, useEffect, useState } from 'react';
import { KiboState, Message, Reminder, Role, TextPart, ImagePart, Language, languages, VoiceName, AnimationPack, availableVoices, LearnedFact, Mood, MoodEntry, AvatarStyle } from '../types';
import { MicIcon, SendIcon, PaperclipIcon, BellIcon, CloseIcon, MagicWandIcon, GlobeIcon, SettingsIcon, MinimizeIcon, MaximizeIcon, RestoreIcon, SparklesIcon, BrainCircuitIcon, ChatBubbleIcon, LinkIcon, TargetIcon, CheckCircleIcon, FileTextIcon, PlayIcon, ClipboardIcon, WrenchIcon, PowerIcon, EyeIcon, UserCircleIcon } from './icons';

interface ChatWindowProps {
  isVisible: boolean;
  kiboState: KiboState;
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSend: (message?: string, file?: File) => void;
  onMicClick: () => void;
  onAnalyzeScreenClick: () => void;
  onAnalyzeClipboardClick: () => void;
  onLanguageChange: (lang: Language) => void;
  onVoiceChange: (voice: VoiceName) => void;
  onAnimationChange: (pack: AnimationPack) => void;
  size: { width: number, height: number };
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onToggleProactiveMode: () => void;
  onGenerateLearningReport: () => void;
  onToggleReminderComplete: (id: string) => void;
  onPrioritizeTasks: () => void;
  onSummarizeChat: () => void;
  onStartFocusSession: (task: string, duration: number) => void;
  onSuggestImprovement: () => void;
  onToggleKiboActive: () => void;
  onToggleFloatingMode: () => void;
  onCharacterChange: (name: string) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => (
    <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
        <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
    </button>
);

const FocusTimer: React.FC<{ endTime: number; task: string }> = ({ endTime, task }) => {
    const [timeLeft, setTimeLeft] = useState(endTime - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                clearInterval(timer);
                setTimeLeft(0);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [endTime]);

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');

    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
            <TargetIcon className="w-4 h-4 animate-pulse" />
            <span className="truncate max-w-[100px]">{task}</span>
            <span>{minutes}:{seconds}</span>
        </div>
    );
};


type ActiveTab = 'chat' | 'reminders' | 'insights' | 'productivity' | 'avatar';

const presets = [
    { style: AvatarStyle.ABSTRACT, name: 'Kibo', color: 'bg-slate-400' },
    { style: AvatarStyle.ANIME_GIRL, name: 'Kiko (Anime Girl)', color: 'bg-pink-300' },
    { style: AvatarStyle.MUZAN, name: 'Muzan', color: 'bg-gray-800' },
    { style: AvatarStyle.GOJO, name: 'Gojo', color: 'bg-blue-300' },
];


const ChatWindow: React.FC<ChatWindowProps> = ({
  isVisible,
  kiboState,
  inputValue,
  onInputChange,
  onSend,
  onMicClick,
  onAnalyzeScreenClick,
  onAnalyzeClipboardClick,
  onLanguageChange,
  onVoiceChange,
  onAnimationChange,
  size,
  isMinimized,
  onToggleMinimize,
  isMaximized,
  onToggleMaximize,
  onResizeMouseDown,
  onToggleProactiveMode,
  onGenerateLearningReport,
  onToggleReminderComplete,
  onPrioritizeTasks,
  onSummarizeChat,
  onStartFocusSession,
  onSuggestImprovement,
  onToggleKiboActive,
  onToggleFloatingMode,
  onCharacterChange,
}) => {
  const { messages, reminders, isListening, isLoading, currentCharacterName, language, voice, animationPack, isProactiveMode, learnedFacts, moodHistory, isFocusModeActive, focusSessionEndTime, focusSessionTask, isFloatingMode } = kiboState;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [focusTask, setFocusTask] = useState('');
  const [focusDuration, setFocusDuration] = useState(25);
  const [optimizerGoal, setOptimizerGoal] = useState('');
  const [customCharacter, setCustomCharacter] = useState('');


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, activeTab]);
  
  useEffect(() => {
    if (!isVisible) {
      setFile(null);
      setPreview(null);
      setShowLangDropdown(false);
      setShowSettingsDropdown(false);
      if(!isMinimized) onToggleMinimize();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleSendClick = () => {
    if (inputValue.trim() || file) {
      onSend(inputValue, file || undefined);
      setFile(null);
      setPreview(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            // For text files, show a generic preview
            setPreview('text_file');
        }
    }
  };

  const handleFileIconClick = () => {
      fileInputRef.current?.click();
  };

  const handleGenerateReportClick = () => {
    onGenerateLearningReport();
    setActiveTab('chat');
  };
  
  const handleSuggestImprovementClick = () => {
    onSuggestImprovement();
    setActiveTab('chat');
  };

  const handleOptimizePromptClick = () => {
    if(optimizerGoal.trim()) {
      onSend(`OPTIMIZE_PROMPT::${optimizerGoal}`);
      setOptimizerGoal('');
      setActiveTab('chat');
    }
  };

  const handleStartFocusClick = () => {
      if (focusTask.trim() && focusDuration > 0) {
          onStartFocusSession(focusTask, focusDuration);
          setFocusTask('');
          setFocusDuration(25);
          setActiveTab('chat');
      }
  };

  const handleTransformClick = () => {
    if (customCharacter.trim()) {
        onCharacterChange(customCharacter);
        setCustomCharacter('');
        setActiveTab('chat');
    }
  };

  const moodSummary = moodHistory.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<Mood, number>);

  const completedTasksByDay = reminders
    .filter(r => r.completed && r.completedAt)
    .reduce((acc, r) => {
        // Fix: Use Number() for safer type conversion from 'unknown' from reminder data.
        const day = new Date(r.completedAt as number).toLocaleDateString('en-US', { weekday: 'short' });
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxCompleted = Math.max(1, ...Object.values(completedTasksByDay));


  if (!isVisible) return null;

  const TabButton: React.FC<{tab: ActiveTab, icon: React.ReactNode, label: string, count?: number}> = ({tab, icon, label, count}) => (
      <button 
        onClick={() => setActiveTab(tab)}
        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'border-blue-500 text-blue-600' : `border-transparent ${isFloatingMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'}`}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {count !== undefined && <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{count}</span>}
    </button>
  )

  const containerClasses = isFloatingMode
    ? 'bg-transparent'
    : 'bg-white/80 backdrop-blur-md rounded-lg shadow-2xl border border-white/30';

  const headerClasses = isFloatingMode
    ? 'bg-black/20'
    : 'bg-gray-100/80 border-b border-gray-300/80 rounded-t-lg';
    
  const tabsContainerClasses = isFloatingMode
    ? 'bg-black/20 border-b border-slate-600/50'
    : 'bg-slate-100/50 border-b border-slate-200/80';
    
  const windowButtonClasses = `p-2 transition-colors ${isFloatingMode ? 'text-slate-300 hover:bg-white/20' : 'text-slate-600 hover:bg-slate-300/50'}`;
  const windowCloseButtonClasses = `p-2 transition-colors ${isFloatingMode ? 'text-slate-300 hover:bg-red-500' : 'text-slate-600 hover:bg-red-500 hover:text-white'}`;


  return (
    <div 
        className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${containerClasses}`}
        style={{ width: `${size.width}px`, height: isMinimized ? 'auto' : `${size.height}px` }}
    >
      {/* Header */}
      <div className={`drag-handle p-1 flex justify-between items-center cursor-move ${headerClasses}`}>
        <div className="pl-3 flex-1">
            {isFocusModeActive && focusSessionEndTime && focusSessionTask ? (
                <FocusTimer endTime={focusSessionEndTime} task={focusSessionTask} />
            ) : (
                 <h2 className={`text-sm font-semibold truncate ${isFloatingMode ? 'text-white' : 'text-slate-800'}`}>{currentCharacterName || 'Kibo'}</h2>
            )}
        </div>
        <div className="flex items-center">
            <div className="relative">
                <button onClick={() => setShowLangDropdown(!showLangDropdown)} className={windowButtonClasses} title="Change Language">
                    <GlobeIcon className="w-4 h-4" />
                </button>
                {showLangDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-slate-200/80">
                        <ul className="py-1">
                            {Object.entries(languages).map(([code, { flag, nativeName }]) => (
                                <li key={code}>
                                    <button
                                        onClick={() => {
                                            onLanguageChange(code as Language);
                                            setShowLangDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 ${language === code ? 'font-bold' : ''}`}
                                    >
                                        <span>{flag}</span>
                                        <span>{nativeName}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div className="relative">
                <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={windowButtonClasses} title="Settings">
                    <SettingsIcon className="w-4 h-4" />
                </button>
                {showSettingsDropdown && (
                     <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-slate-200/80 p-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600 block">Voice</label>
                             <select value={voice} onChange={(e) => onVoiceChange(e.target.value as VoiceName)} className="w-full p-2 border border-slate-300 rounded-md text-sm">
                                {Object.entries(availableVoices).map(([code, { name, description }]) => (
                                    <option key={code} value={code}>{name} - {description}</option>
                                ))}
                            </select>
                        </div>
                         <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600 block">Animation Style</label>
                            <select value={animationPack} onChange={(e) => onAnimationChange(e.target.value as AnimationPack)} className="w-full p-2 border border-slate-300 rounded-md text-sm">
                                <option value={AnimationPack.DEFAULT}>Default</option>
                                <option value={AnimationPack.SUBTLE}>Subtle</option>
                            </select>
                        </div>
                        <div className="border-t border-slate-200 pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <EyeIcon className="w-5 h-5 text-slate-500" />
                                    <div className="space-y-0">
                                        <label className="text-sm font-medium text-slate-600 block">Floating Mode</label>
                                        <p className="text-xs text-slate-400">Removes window background.</p>
                                    </div>
                                </div>
                               <ToggleSwitch checked={isFloatingMode} onChange={onToggleFloatingMode} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-slate-500" />
                                    <div className="space-y-0">
                                        <label className="text-sm font-medium text-slate-600 block">Proactive Assistance</label>
                                        <p className="text-xs text-slate-400">Offers help based on screen.</p>
                                    </div>
                                </div>
                               <ToggleSwitch checked={isProactiveMode} onChange={onToggleProactiveMode} />
                            </div>
                        </div>
                     </div>
                )}
            </div>
            <button onClick={onToggleMinimize} className={windowButtonClasses} title={isMinimized ? "Expand" : "Minimize"}>
                <MinimizeIcon className="w-4 h-4" />
            </button>
            <button onClick={onToggleMaximize} className={windowButtonClasses} title={isMaximized ? "Restore" : "Maximize"}>
                {isMaximized ? <RestoreIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
            </button>
            <button onClick={onToggleKiboActive} className={windowCloseButtonClasses} title="Power Off Kibo">
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
            <div className={`flex ${tabsContainerClasses}`}>
                <TabButton tab="chat" icon={<ChatBubbleIcon className="w-5 h-5" />} label="Chat" />
                <TabButton tab="reminders" icon={<BellIcon className="w-5 h-5" />} label="Reminders" count={reminders.filter(r => !r.completed).length} />
                <TabButton tab="insights" icon={<BrainCircuitIcon className="w-5 h-5" />} label="Insights" />
                <TabButton tab="productivity" icon={<TargetIcon className="w-5 h-5" />} label="Productivity" />
                <TabButton tab="avatar" icon={<UserCircleIcon className="w-5 h-5" />} label="Avatar" />
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' && (
                    <div className="p-4 overflow-y-auto custom-scrollbar h-full">
                        <div className="flex flex-col space-y-4">
                        {messages.map((msg) => {
                            const userBubbleClass = 'bg-blue-500 text-white rounded-br-none';
                            const modelBubbleClass = isFloatingMode
                                ? 'bg-slate-800/80 text-white rounded-bl-none'
                                : 'bg-slate-200 text-slate-800 rounded-bl-none';

                            return (
                                <div
                                key={msg.id}
                                className={`flex items-end gap-2 ${
                                    msg.role === Role.USER ? 'justify-end' : 'justify-start'
                                }`}
                                >
                                <div
                                    className={`max-w-xs md:max-w-sm rounded-2xl px-4 py-2 text-base ${
                                    msg.role === Role.USER ? userBubbleClass : modelBubbleClass
                                    }`}
                                >
                                    {msg.parts.map((part, index) => {
                                        if(part.type === 'text') return <p key={index} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: part.text.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-white p-2 rounded-md my-2 text-sm overflow-x-auto"><code>$1</code></pre>') }}></p>
                                        if(part.type === 'image') return <img key={index} src={(part as ImagePart).url} alt="user upload" className="mt-2 rounded-lg max-h-48" />
                                        return null;
                                    })}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className={`mt-3 pt-2 border-t ${isFloatingMode ? 'border-slate-500/50' : 'border-slate-300/50'}`}>
                                            <h4 className={`text-xs font-bold mb-1 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Sources:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {msg.sources.map((source, index) => (
                                                    <a 
                                                        key={index}
                                                        href={source.uri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title={source.title}
                                                        className="flex items-center gap-1.5 bg-slate-300/70 text-slate-700 text-xs px-2 py-1 rounded-md hover:bg-slate-400/70 hover:text-slate-800 transition-colors"
                                                    >
                                                        <LinkIcon className="w-3 h-3" />
                                                        <span className="truncate max-w-[150px]">{source.title}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className={`max-w-xs md:max-w-sm rounded-2xl px-4 py-2 rounded-bl-none ${isFloatingMode ? 'bg-slate-800/80' : 'bg-slate-200'}`}>
                                    <div className="flex items-center space-x-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}
                {activeTab === 'reminders' && (
                     <div className="p-4 overflow-y-auto custom-scrollbar h-full">
                        <h3 className={`text-base font-bold mb-4 ${isFloatingMode ? 'text-slate-200' : 'text-slate-700'}`}>Task List</h3>
                        {reminders.length > 0 ? (
                            <ul className="space-y-2">
                                {reminders.map(r => (
                                    <li key={r.id} className={`flex items-center gap-3 p-3 rounded-lg ${isFloatingMode ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                                        <button onClick={() => onToggleReminderComplete(r.id)} className="flex-shrink-0">
                                            {r.completed ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <div className="w-6 h-6 border-2 border-slate-300 rounded-full"></div>}
                                        </button>
                                        <div className="flex-1">
                                            <p className={`font-medium ${isFloatingMode ? 'text-slate-100' : 'text-slate-800'} ${r.completed ? 'line-through text-slate-500' : ''}`}>{r.task}</p>
                                            <p className="text-sm text-slate-500">{new Date(r.time).toLocaleString()}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 text-center py-8">No tasks yet. Add one in the chat!</p>
                        )}
                    </div>
                )}
                {activeTab === 'insights' && (
                     <div className="p-4 overflow-y-auto custom-scrollbar h-full">
                        <h3 className={`text-base font-bold mb-4 ${isFloatingMode ? 'text-slate-200' : 'text-slate-700'}`}>Cognitive Insights</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Learned Facts About You</h4>
                                {learnedFacts.length > 0 ? (
                                    <ul className={`space-y-1 list-disc list-inside ${isFloatingMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {learnedFacts.map(fact => <li key={fact.id}>{fact.fact}</li>)}
                                    </ul>
                                ) : (
                                    <p className="text-slate-500 text-sm">I'm still getting to know you! Chat with me to teach me new things.</p>
                                )}
                            </div>
                            <div>
                                <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Recent Mood Patterns</h4>
                                {Object.keys(moodSummary).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(moodSummary).map(([mood, count]) => (
                                            <div key={mood} className="bg-slate-200/50 text-slate-600 text-xs font-medium capitalize px-2.5 py-1 rounded-full">
                                                {mood.toLowerCase()} ({count})
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                <p className="text-slate-500 text-sm">Not enough data to show patterns yet.</p>
                                )}
                            </div>
                            <div className={`pt-4 ${isFloatingMode ? 'border-t border-slate-600/50' : 'border-t border-slate-200/80'}`}>
                                <button 
                                    onClick={handleGenerateReportClick} 
                                    className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-slate-300"
                                    disabled={isLoading}
                                >
                                    Generate Learning Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'productivity' && (
                     <div className="p-4 overflow-y-auto custom-scrollbar h-full space-y-6">
                        <div>
                            <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Start Focus Session</h4>
                            <div className={`p-3 rounded-lg space-y-2 ${isFloatingMode ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                                <input type="text" value={focusTask} onChange={e => setFocusTask(e.target.value)} placeholder="What are you focusing on?" className="w-full p-2 border rounded-md" />
                                <div className="flex items-center gap-2">
                                    <input type="number" value={focusDuration} onChange={e => setFocusDuration(Number(e.target.value) || 0)} className="w-20 p-2 border rounded-md" />
                                    <span className={isFloatingMode ? 'text-slate-300' : ''}>minutes</span>
                                    <button onClick={handleStartFocusClick} disabled={isLoading || isFocusModeActive} className="ml-auto bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-slate-300 flex items-center gap-2">
                                       <PlayIcon className="w-4 h-4" /> Start
                                    </button>
                                </div>
                            </div>
                        </div>
                         <div>
                            <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Workflow Tools</h4>
                            <div className="flex gap-2">
                                <button onClick={onPrioritizeTasks} disabled={isLoading} className="flex-1 text-center bg-blue-100 text-blue-800 font-semibold py-2 px-3 rounded-lg hover:bg-blue-200 disabled:opacity-50">Prioritize Tasks</button>
                                <button onClick={onSummarizeChat} disabled={isLoading} className="flex-1 text-center bg-green-100 text-green-800 font-semibold py-2 px-3 rounded-lg hover:bg-green-200 disabled:opacity-50">Summarize Chat</button>
                            </div>
                        </div>
                        <div>
                            <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Weekly Progress</h4>
                             <div className={`p-3 rounded-lg flex justify-between items-end h-32 ${isFloatingMode ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                                {weekDays.map(day => (
                                    <div key={day} className="flex-1 flex flex-col items-center justify-end gap-1">
                                        <div className="w-4/5 bg-blue-200 rounded-t-sm" style={{ height: `${(completedTasksByDay[day] || 0) / maxCompleted * 100}%` }}></div>
                                        <span className="text-xs text-slate-500">{day}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'avatar' && (
                    <div className="p-4 overflow-y-auto custom-scrollbar h-full space-y-6">
                        <div>
                            <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Preset Characters</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {presets.map(p => (
                                    <button 
                                        key={p.style}
                                        onClick={() => onCharacterChange(p.name)}
                                        disabled={isLoading}
                                        className={`p-3 rounded-lg text-center font-semibold text-white transition-transform hover:scale-105 disabled:opacity-50 ${p.color}`}
                                    >
                                        {p.name.split('(')[0].trim()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Custom Transformation</h4>
                            <div className={`p-3 rounded-lg space-y-2 ${isFloatingMode ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                                <input 
                                    type="text" 
                                    value={customCharacter}
                                    onChange={(e) => setCustomCharacter(e.target.value)}
                                    placeholder="e.g., 'a wise old dragon'" 
                                    className="w-full p-2 border rounded-md text-sm" 
                                />
                                <button 
                                    onClick={handleTransformClick} 
                                    disabled={isLoading || !customCharacter.trim()} 
                                    className="w-full bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-slate-300 flex items-center justify-center gap-2"
                                >
                                   <SparklesIcon className="w-5 h-5" /> Transform
                                </button>
                            </div>
                        </div>
                        <div>
                             <h4 className={`font-semibold mb-2 ${isFloatingMode ? 'text-slate-300' : 'text-slate-600'}`}>Core Prompt Optimizer</h4>
                            <div className={`p-3 rounded-lg space-y-2 ${isFloatingMode ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                               <h5 className={`flex items-center gap-2 font-semibold text-sm mb-2 ${isFloatingMode ? 'text-slate-400' : 'text-slate-500'}`}><WrenchIcon className="w-4 h-4" /> Fine-Tune Persona</h5>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={optimizerGoal}
                                        onChange={(e) => setOptimizerGoal(e.target.value)}
                                        placeholder="e.g., 'Be more formal'" 
                                        className="flex-1 p-2 border rounded-md text-sm" 
                                    />
                                    <button onClick={handleOptimizePromptClick} disabled={isLoading} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 disabled:bg-slate-300">
                                        Evolve
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          
          {activeTab === 'chat' && (
            <div className={`relative p-3 ${isFloatingMode ? 'bg-black/20' : 'bg-slate-100/50 border-t border-slate-200/80'}`}>
                {preview && (
                    <div className="relative mb-2">
                        {preview === 'text_file' ? (
                            <div className="flex items-center gap-2 p-2 bg-slate-200 rounded-lg">
                                <FileTextIcon className="w-6 h-6 text-slate-500" />
                                <span className="text-sm text-slate-700 font-medium">Text file ready to send</span>
                            </div>
                        ) : (
                            <img src={preview} alt="preview" className="max-h-24 rounded-lg" />
                        )}
                        <button onClick={() => {setFile(null); setPreview(null);}} className="absolute -top-1 -right-1 bg-black/50 text-white rounded-full p-0.5">
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <div className={`flex items-center rounded-full p-1 shadow-inner ${isFloatingMode ? 'bg-slate-800/80' : 'bg-white'}`}>
                <button onClick={handleFileIconClick} className="p-2 text-slate-500 hover:text-blue-500 transition-colors" title="Attach File">
                    <PaperclipIcon className="w-5 h-5" />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,text/plain,text/markdown,.txt,.md" />
                </button>
                 <button onClick={onAnalyzeClipboardClick} className="p-2 text-slate-500 hover:text-indigo-500 transition-colors" title="Analyze Clipboard">
                    <ClipboardIcon className="w-5 h-5" />
                </button>
                <button onClick={onAnalyzeScreenClick} className="p-2 text-slate-500 hover:text-purple-500 transition-colors" title="Analyze Screen">
                    <MagicWandIcon className="w-5 h-5" />
                </button>
                <input
                    type="text"
                    value={inputValue}
                    onChange={onInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Talk to Kibo..."
                    className={`flex-1 bg-transparent px-3 focus:outline-none ${isFloatingMode ? 'text-white' : 'text-slate-700'}`}
                    disabled={isLoading}
                />
                <button onClick={onMicClick} className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-blue-500'}`}>
                    <MicIcon className="w-5 h-5" />
                </button>
                <button onClick={handleSendClick} disabled={(!inputValue.trim() && !file) || isLoading} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-slate-300 transition-colors">
                    <SendIcon className="w-5 h-5" />
                </button>
                </div>
            </div>
          )}
           <div 
                onMouseDown={onResizeMouseDown}
                className={`absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity ${isMaximized || isFloatingMode ? 'hidden' : ''}`}
            >
                <svg width="16" height="16" viewBox="0 0 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0V16H0L16 0Z" fill="#a0aec0"/>
                </svg>
            </div>
        </>
      )}
    </div>
  );
};

export default ChatWindow;