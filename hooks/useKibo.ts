import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { KiboState, Message, Reminder, Role, Mood, KiboStatus, TextPart, ImagePart, NotificationData, Language, languages, Reaction, VoiceName, AnimationPack, AvatarStyle, avatarVoiceMap, LearnedFact, MoodEntry } from '../types';
import * as geminiService from '../services/geminiService';
import { playAudio, fileToBase64, captureScreenAsBase64, readFileAsText } from '../utils/audio';

// Fix: Add type declarations for the non-standard SpeechRecognition API to avoid TypeScript errors.
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Hook for speech recognition
const useSpeechRecognition = (onResult: (transcript: string) => void, language: Language) => {
    // Fix: Change the type of the ref to `any` to match the declared types for SpeechRecognition.
    const recognitionRef = useRef<any | null>(null);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        
        recognition.onend = () => {
            setIsListening(false);
        }

        recognitionRef.current = recognition;
    }, [onResult, language]);
    
    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    return { isListening, toggleListening };
};

export const useKibo = () => {
    const [kiboState, setKiboState] = useState<KiboState>(() => {
        const savedReminders = JSON.parse(localStorage.getItem('kibo-reminders') || '[]');
        const savedVoice = localStorage.getItem('kibo-voice') as VoiceName || 'Puck';
        const savedAnimationPack = localStorage.getItem('kibo-animationPack') as AnimationPack || AnimationPack.DEFAULT;
        const savedAvatarStyle = localStorage.getItem('kibo-avatarStyle') as AvatarStyle || AvatarStyle.ABSTRACT;
        const savedProactiveMode = JSON.parse(localStorage.getItem('kibo-proactiveMode') || 'false');
        const savedLearnedFacts = JSON.parse(localStorage.getItem('kibo-learnedFacts') || '[]');
        const savedMoodHistory = JSON.parse(localStorage.getItem('kibo-moodHistory') || '[]');
        const savedIsKiboActive = JSON.parse(localStorage.getItem('kibo-isActive') || 'true');
        const savedIsFloatingMode = JSON.parse(localStorage.getItem('kibo-isFloating') || 'false');


        return {
            messages: [],
            reminders: savedReminders,
            mood: Mood.NEUTRAL,
            status: KiboStatus.IDLE,
            isLoading: false,
            isListening: false,
            language: 'en-US',
            userPreferredLanguage: 'en-US',
            reaction: Reaction.NONE,
            voice: savedVoice,
            animationPack: savedAnimationPack,
            avatarStyle: savedAvatarStyle,
            generatedAvatarUrl: null,
            currentCharacterName: null,
            isProactiveMode: savedProactiveMode,
            learnedFacts: savedLearnedFacts,
            moodHistory: savedMoodHistory,
            isFocusModeActive: false,
            focusSessionEndTime: null,
            focusSessionTask: null,
            isKiboActive: savedIsKiboActive,
            isFloatingMode: savedIsFloatingMode,
        };
    });

    const [chatInput, setChatInput] = useState('');
    const [notification, setNotification] = useState<NotificationData | null>(null);
    const [lastProactiveMessageTimestamp, setLastProactiveMessageTimestamp] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const idleTimerRef = useRef<number | null>(null);
    const focusTimerRef = useRef<number | null>(null);
    
    const { isListening, toggleListening } = useSpeechRecognition((transcript) => {
        setChatInput(transcript);
        handleSendMessage(transcript);
    }, kiboState.language);

    useEffect(() => {
        if (!kiboState.isKiboActive) return;
        setKiboState(prev => ({ ...prev, isListening: isListening, status: isListening ? KiboStatus.LISTENING : KiboStatus.IDLE }));
    }, [isListening, kiboState.isKiboActive]);

    const triggerReaction = (reaction: Reaction, duration: number) => {
        if (!kiboState.isKiboActive) return;
        setKiboState(prev => ({ ...prev, reaction }));
        setTimeout(() => {
            setKiboState(prev => ({ ...prev, reaction: Reaction.NONE }));
        }, duration);
    };

    const speak = useCallback(async (text: string, mood: Mood) => {
        if (!kiboState.isKiboActive) return;
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        try {
            // Set mood and status before speaking to sync avatar expression
            setKiboState(prev => ({ ...prev, status: KiboStatus.SPEAKING, mood }));
            const audioData = await geminiService.textToSpeech(text, mood, kiboState.voice);
            await playAudio(audioData, audioContextRef.current);
        } catch (error) {
            console.error("Error with text-to-speech:", error);
            setNotification({ message: 'Sorry, I am unable to speak right now.', type: 'error' });
        } finally {
            // Revert status to idle but keep the mood
            setKiboState(prev => ({ ...prev, status: KiboStatus.IDLE }));
        }
    }, [kiboState.voice, kiboState.isKiboActive]);

    const addMessage = (role: Role, text: string, imageUrl?: string, sources?: { uri: string; title: string }[]) => {
        const parts: (TextPart | ImagePart)[] = [];
        if (text) parts.push({ type: 'text', text });
        if (imageUrl) parts.push({ type: 'image', url: imageUrl, mimeType: 'image/jpeg' /* assumption */ });

        const newMessage: Message = { role, parts, id: uuidv4(), sources };
        setKiboState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
        return newMessage;
    };

    const addReminder = useCallback((task: string, time: number) => {
        const newReminder: Reminder = { id: uuidv4(), task, time, completed: false, completedAt: null };
        setKiboState(prev => ({ ...prev, reminders: [...prev.reminders, newReminder] }));
        setNotification({ message: `Ok, I'll remind you to "${task}".`, type: 'info' });
        speak(`Reminder set for, ${task}`, Mood.HAPPY);
    }, [speak]);

    // Welcome message
    useEffect(() => {
        if (!kiboState.isKiboActive || kiboState.messages.length > 0) return;
        const welcomeMessage = "Hello! I'm Kibo, your friendly desktop companion. How can I help you today?";
        addMessage(Role.MODEL, welcomeMessage);
        speak(welcomeMessage, Mood.HAPPY);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kiboState.isKiboActive]);

    // Reminder checker
    useEffect(() => {
        if (!kiboState.isKiboActive) return;
        const interval = setInterval(() => {
            const now = Date.now();
            kiboState.reminders.forEach(r => {
                if (!r.completed && now >= r.time) {
                    setNotification({ message: `Reminder: ${r.task}`, type: 'reminder' });
                    speak(`Hey, just a reminder: ${r.task}`, Mood.BUSY);
                    // We don't remove it, just notify. User can mark as complete.
                }
            });
        }, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [kiboState.reminders, speak, kiboState.isKiboActive]);
    
    // Persist reminders and settings
    useEffect(() => {
        localStorage.setItem('kibo-reminders', JSON.stringify(kiboState.reminders));
        localStorage.setItem('kibo-voice', kiboState.voice);
        localStorage.setItem('kibo-animationPack', kiboState.animationPack);
        localStorage.setItem('kibo-avatarStyle', kiboState.avatarStyle);
        localStorage.setItem('kibo-proactiveMode', JSON.stringify(kiboState.isProactiveMode));
        localStorage.setItem('kibo-learnedFacts', JSON.stringify(kiboState.learnedFacts));
        localStorage.setItem('kibo-moodHistory', JSON.stringify(kiboState.moodHistory));
        localStorage.setItem('kibo-isActive', JSON.stringify(kiboState.isKiboActive));
        localStorage.setItem('kibo-isFloating', JSON.stringify(kiboState.isFloatingMode));
    }, [kiboState]);
    
    // Idle actions
    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (!kiboState.isKiboActive) return;
        idleTimerRef.current = window.setTimeout(async () => {
            if(kiboState.status === KiboStatus.IDLE && !isListening) {
                 const response = await geminiService.generateFunFactOrJoke(kiboState.mood, kiboState.language);
                 addMessage(Role.MODEL, response);
                 speak(response, Mood.PLAYFUL);
            }
        }, 180000); // 3 minutes
    }, [kiboState.mood, kiboState.status, isListening, speak, kiboState.language, kiboState.isKiboActive]);

    useEffect(() => {
        resetIdleTimer();
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        }
    }, [kiboState.messages, resetIdleTimer]);
    
    // Proactive Mode
    useEffect(() => {
        let intervalId: number | null = null;
        if (!kiboState.isKiboActive) return;

        const handleProactiveCheck = async () => {
            if (kiboState.isLoading || kiboState.status !== KiboStatus.IDLE) {
                return; // Don't interrupt if Kibo is busy
            }
            try {
                const { base64, mimeType } = await captureScreenAsBase64();
                const suggestion = await geminiService.getProactiveSuggestion(base64, mimeType, kiboState.language);

                if (suggestion) {
                    addMessage(Role.MODEL, suggestion);
                    speak(suggestion, Mood.NEUTRAL);
                    setLastProactiveMessageTimestamp(Date.now());
                }
            } catch (error) {
                // Silently fail, likely due to permissions not granted yet.
                console.log("Proactive check failed, likely permissions.", error);
                // Turn off proactive mode to avoid repeated errors if it's a permission issue.
                setKiboState(prev => ({...prev, isProactiveMode: false}));
                setNotification({ message: "Proactive assistance disabled. Please grant screen permissions to use this feature.", type: 'info' });
            }
        };

        if (kiboState.isProactiveMode) {
            intervalId = window.setInterval(handleProactiveCheck, 90000); // Check every 90 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [kiboState.isProactiveMode, kiboState.isLoading, kiboState.status, kiboState.language, speak, kiboState.isKiboActive]);
    
    const handleCharacterChange = useCallback(async (characterName: string) => {
        setKiboState(prev => ({ ...prev, status: KiboStatus.THINKING, isLoading: true }));
        const transformationMsg = `Alright, attempting to transform into ${characterName}. This might take a moment...`;
        addMessage(Role.MODEL, transformationMsg);
        speak(transformationMsg, Mood.BUSY);

        try {
            let newStyle: AvatarStyle;
            let newVoice: VoiceName;
            let newAvatarUrl: string | null = null;
            let newCharName: string | null = null;

            const presetMap: Record<string, AvatarStyle> = {
                'KIBO': AvatarStyle.ABSTRACT,
                'KIKO': AvatarStyle.ANIME_GIRL,
                'ANIME_GIRL': AvatarStyle.ANIME_GIRL,
                'MUZAN': AvatarStyle.MUZAN,
                'GOJO': AvatarStyle.GOJO,
                'ABSTRACT': AvatarStyle.ABSTRACT,
            };
            const upperCaseName = characterName.toUpperCase().replace(/\(.*\)/g, '').replace(/ /g, '_').trim();
            const foundPresetStyle = presetMap[upperCaseName];
            
            if (foundPresetStyle) {
                newStyle = foundPresetStyle;
                newVoice = avatarVoiceMap[newStyle];
                const presetNameMap: Record<AvatarStyle, string> = {
                    [AvatarStyle.ABSTRACT]: "Kibo",
                    [AvatarStyle.ANIME_GIRL]: "Kiko",
                    [AvatarStyle.MUZAN]: "Muzan",
                    [AvatarStyle.GOJO]: "Gojo",
                    [AvatarStyle.GENERATED]: "Kibo",
                };
                newCharName = presetNameMap[newStyle];
            } else {
                const [avatarBase64, voice] = await Promise.all([
                    geminiService.generateCharacterAvatar(characterName),
                    geminiService.getVoiceForCharacter(characterName)
                ]);
                newStyle = AvatarStyle.GENERATED;
                newVoice = voice;
                newAvatarUrl = avatarBase64;
                newCharName = characterName;
            }

            const isAnimeCharacter = [AvatarStyle.ANIME_GIRL, AvatarStyle.MUZAN, AvatarStyle.GOJO].includes(newStyle) || !foundPresetStyle;
            const newLang = isAnimeCharacter ? 'ja-JP' : kiboState.userPreferredLanguage;

            const prompt = "Confirm your transformation into your new character form in a very brief, in-character message.";
            const { text: confirmationText } = await geminiService.getConversationalResponse([], prompt, Mood.HAPPY, newLang, newStyle, newCharName);
            
            setKiboState(prev => ({
                ...prev,
                avatarStyle: newStyle,
                voice: newVoice,
                generatedAvatarUrl: newAvatarUrl,
                currentCharacterName: newCharName,
                language: newLang,
                isLoading: false,
                status: KiboStatus.IDLE,
            }));
            
            addMessage(Role.MODEL, confirmationText);
            speak(confirmationText, Mood.HAPPY);

        } catch (error) {
            console.error("Failed to transform character:", error);
            const errorMsg = `I tried my best, but I couldn't transform into ${characterName}. Maybe try a different character?`;
            addMessage(Role.MODEL, errorMsg);
            speak(errorMsg, Mood.SAD);
            setKiboState(prev => ({ ...prev, status: KiboStatus.IDLE, isLoading: false }));
        }
    }, [speak, kiboState.userPreferredLanguage]);


    const handleStartFocusSession = (task: string, durationMinutes: number) => {
        const endTime = Date.now() + durationMinutes * 60 * 1000;
        setKiboState(prev => ({
            ...prev,
            isFocusModeActive: true,
            focusSessionEndTime: endTime,
            focusSessionTask: task,
            mood: Mood.BUSY,
            status: KiboStatus.IDLE,
        }));
        const confirmation = `Okay, starting a ${durationMinutes}-minute focus session on: ${task}. Let's do this!`;
        addMessage(Role.MODEL, confirmation);
        speak(confirmation, Mood.BUSY);

        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        focusTimerRef.current = window.setTimeout(() => {
            setKiboState(prev => ({
                ...prev,
                isFocusModeActive: false,
                focusSessionEndTime: null,
                focusSessionTask: null,
            }));
            const completionMsg = `Great work! Your focus session on "${task}" is complete. Time for a short break?`;
            setNotification({ message: completionMsg, type: 'info' });
            speak(completionMsg, Mood.HAPPY);
        }, durationMinutes * 60 * 1000);
    };


    const handleSendMessage = async (text?: string, file?: File) => {
        const messageText = text || chatInput;
        if (!messageText.trim() && !file) return;
        
        resetIdleTimer();
        triggerReaction(Reaction.HEAD_TILT, 1000);
        setKiboState(prev => ({ ...prev, isLoading: true, status: KiboStatus.THINKING }));
        
        let imageUrl: string | undefined;
        let imageBase64: string | undefined;
        let imageMimeType: string | undefined;
        let textFileContent: string | undefined;

        if (file) {
            if (file.type.startsWith('image/')) {
                imageUrl = URL.createObjectURL(file);
                const {base64, mimeType} = await fileToBase64(file);
                imageBase64 = base64;
                imageMimeType = mimeType;
            } else if (file.type.startsWith('text/')) {
                textFileContent = await readFileAsText(file);
            }
        }
        
        if (!messageText.startsWith('OPTIMIZE_PROMPT::')) {
            const userMessage = file ? `${messageText} (attached file: ${file.name})` : messageText;
            addMessage(Role.USER, userMessage, imageUrl);
        }
        setChatInput('');

        try {
            const conversationHistory = kiboState.messages.slice(-5); // Keep context short
            const detectedMood = await geminiService.detectMood(messageText, kiboState.language);
            setKiboState(prev => ({
                ...prev,
                mood: detectedMood,
                moodHistory: [...prev.moodHistory, { mood: detectedMood, timestamp: Date.now() }],
            }));

            // Handle special system commands
            if (messageText.startsWith('OPTIMIZE_PROMPT::')) {
                const goal = messageText.split('::')[1];
                const newPrompt = await geminiService.optimizePrompt(kiboState.avatarStyle, kiboState.currentCharacterName, goal, kiboState.language);
                const intro = `Okay, I've analyzed your request. If I were to update my core programming to be "${goal}", here is what my new system prompt would look like:`;
                addMessage(Role.MODEL, intro);
                speak(intro, Mood.NEUTRAL);
                addMessage(Role.MODEL, `\`\`\`\n${newPrompt}\n\`\`\``); // Add new prompt as a code block
                return; // End execution here
            }


            if (imageBase64 && imageMimeType) {
                const responseText = await geminiService.getTextFromImage(imageBase64, imageMimeType, messageText, kiboState.language);
                addMessage(Role.MODEL, responseText);
                speak(responseText, detectedMood);
            } else if (textFileContent) {
                const prompt = messageText || `Please summarize this document for me.`;
                const responseText = await geminiService.summarizeTextContent(textFileContent, prompt, kiboState.language);
                addMessage(Role.MODEL, responseText);
                speak(responseText, detectedMood);
            } else {
                const urlRegex = /^(https?:\/\/[^\s]+)/;
                const webKeywords = ['who is', 'what is', 'what are', 'search for', 'look up', 'tell me about', 'summarize'];
                const isWebQuery = urlRegex.test(messageText) || webKeywords.some(kw => messageText.toLowerCase().startsWith(kw));

                if (isWebQuery) {
                    let prompt = messageText;
                    if (urlRegex.test(messageText)) {
                        prompt = `Please summarize this webpage for me: ${messageText}`;
                    }
                    const { text, sources } = await geminiService.getWebKnowledgeResponse(prompt, kiboState.language);
                    addMessage(Role.MODEL, text, undefined, sources);
                    speak(text, detectedMood);
                } else {
                    // It's a conversational query with potential tool calls
                    const { text, functionCalls } = await geminiService.getConversationalResponse(
                        conversationHistory, 
                        messageText, 
                        detectedMood, 
                        kiboState.language,
                        kiboState.avatarStyle,
                        kiboState.currentCharacterName
                    );
                    
                    if (functionCalls && functionCalls.length > 0) {
                        for (const call of functionCalls) {
                           if (call.name === 'changeCharacter' && call.args.characterName) {
                               await handleCharacterChange(call.args.characterName as string);
                           }
                           else if (call.name === 'extractFact' && call.args.fact) {
                               const newFact: LearnedFact = { id: uuidv4(), fact: call.args.fact as string };
                               setKiboState(prev => ({
                                   ...prev,
                                   learnedFacts: [...prev.learnedFacts, newFact]
                               }));
                               triggerReaction(Reaction.NOD, 600);
                           }
                           // FIX: Use Number() for safer type conversion from 'unknown' from function call args.
                           else if (call.name === 'setReminder' && call.args.task && call.args.delaySeconds) {
                               // Fix: Explicitly convert delaySeconds from the function call arguments to a number.
                               addReminder(call.args.task as string, Date.now() + Number(call.args.delaySeconds) * 1000);
                               triggerReaction(Reaction.NOD, 600);
                           }
                           // FIX: Use Number() for safer type conversion from 'unknown' from function call args.
                           else if (call.name === 'startFocusSession' && call.args.task && call.args.durationMinutes) {
                               // Fix: Explicitly convert durationMinutes from the function call arguments to a number. This resolves the type error where an 'unknown' type from the API response was passed to a function expecting a 'number'.
                               handleStartFocusSession(call.args.task as string, Number(call.args.durationMinutes));
                           }
                           else if (call.name === 'launchApplication' && call.args.appName) {
                               setNotification({ message: `Launching ${call.args.appName}...`, type: 'info' });
                               triggerReaction(Reaction.NOD, 600);
                           }
                        }
                    }
                    
                    if (text) { // Only add message if there's text to show
                        addMessage(Role.MODEL, text);
                        speak(text, detectedMood);
                    }
                }
            }

        } catch (error) {
            console.error("Error getting response from Gemini:", error);
            const errMsg = "Oops, something went wrong. Please try again.";
            addMessage(Role.MODEL, errMsg);
            speak(errMsg, Mood.SAD);
            setNotification({ message: 'Failed to connect to AI service.', type: 'error' });
            triggerReaction(Reaction.SURPRISED, 500);
        } finally {
            setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };

    const handleAnalyzeScreen = async () => {
        resetIdleTimer();
        triggerReaction(Reaction.HEAD_TILT, 1000);
        setKiboState(prev => ({ ...prev, isLoading: true, status: KiboStatus.THINKING }));

        try {
            const { base64, mimeType } = await captureScreenAsBase64();
            
            const prompt = "You are Kibo, my AI desktop assistant. I'm showing you a screenshot of my current screen. Briefly describe what I'm doing and offer a helpful suggestion. If there is text, you can summarize it. If it's code, you can explain a snippet. If it's a design, you can give feedback.";
            
            const responseText = await geminiService.getTextFromImage(base64, mimeType, prompt, kiboState.language);
            
            addMessage(Role.MODEL, responseText);
            speak(responseText, Mood.NEUTRAL);

        } catch (error) {
            console.error("Error analyzing screen:", error);
            const errMsg = "I couldn't analyze the screen. Please make sure to grant permission.";
            addMessage(Role.MODEL, errMsg);
            speak(errMsg, Mood.SAD);
            setNotification({ message: 'Screen analysis failed.', type: 'error' });
            triggerReaction(Reaction.SURPRISED, 500);
        } finally {
            setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };
    
    const handleAnalyzeClipboard = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText.trim()) {
                const prompt = `Analyze and briefly summarize the following text from my clipboard:\n\n---\n\n${clipboardText}`;
                setChatInput(prompt); // Pre-fill for user context, they can edit before sending
                await handleSendMessage(prompt);
            } else {
                setNotification({ message: "Your clipboard is empty.", type: 'info' });
            }
        } catch (error) {
            console.error("Error reading from clipboard:", error);
            setNotification({ message: "Could not read from clipboard. Please grant permission.", type: 'error' });
        }
    };

    const handleLanguageChange = async (lang: Language) => {
        setKiboState(prev => ({ ...prev, language: lang, userPreferredLanguage: lang }));
        const langName = languages[lang].nativeName;
        const prompt = `Please say "Okay, I will speak ${langName} from now on." in ${langName}.`;

        setKiboState(prev => ({ ...prev, isLoading: true, status: KiboStatus.THINKING }));
        try {
            const { text: responseText } = await geminiService.getConversationalResponse([], prompt, Mood.NEUTRAL, lang, kiboState.avatarStyle, kiboState.currentCharacterName);
            addMessage(Role.MODEL, responseText);
            speak(responseText, Mood.HAPPY);
        } catch (error) {
            console.error("Error confirming language change:", error);
            const fallback = `Language set to ${languages[lang].name}.`;
            addMessage(Role.MODEL, fallback);
            speak(fallback, Mood.NEUTRAL);
        } finally {
            setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };
    
    const handleVoiceChange = (voice: VoiceName) => {
        setKiboState(prev => ({ ...prev, voice }));
    };

    const handleAnimationChange = (pack: AnimationPack) => {
        setKiboState(prev => ({ ...prev, animationPack: pack }));
    };
    
    const handleToggleProactiveMode = () => {
        setKiboState(prev => ({ ...prev, isProactiveMode: !prev.isProactiveMode }));
    };

    const handleGenerateLearningReport = async () => {
        setKiboState(prev => ({...prev, isLoading: true, status: KiboStatus.THINKING}));
        try {
            const report = await geminiService.generateLearningReport(kiboState.learnedFacts, kiboState.moodHistory, kiboState.language);
            addMessage(Role.MODEL, report);
            speak(report, Mood.NEUTRAL);
        } catch (error) {
            console.error("Error generating learning report:", error);
            const errMsg = "I had trouble compiling my thoughts. Let's try that again later.";
            addMessage(Role.MODEL, errMsg);
            speak(errMsg, Mood.SAD);
        } finally {
            setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };
    
    const handleSuggestImprovement = async () => {
        setKiboState(prev => ({...prev, isLoading: true, status: KiboStatus.THINKING}));
        try {
            const suggestion = await geminiService.suggestSelfImprovement(kiboState.language);
            addMessage(Role.MODEL, suggestion);
            speak(suggestion, Mood.NEUTRAL);
        } catch (error) {
            console.error("Error suggesting improvement:", error);
            const errMsg = "I was trying to think of how to improve, but I got a bit stuck. Let's talk about something else for now.";
            addMessage(Role.MODEL, errMsg);
            speak(errMsg, Mood.SAD);
        } finally {
             setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };

    const handleToggleReminderComplete = (id: string) => {
        setKiboState(prev => ({
            ...prev,
            reminders: prev.reminders.map(r => 
                r.id === id ? { ...r, completed: !r.completed, completedAt: !r.completed ? Date.now() : null } : r
            )
        }));
    };

    const handlePrioritizeTasks = async () => {
        const activeReminders = kiboState.reminders.filter(r => !r.completed);
        if (activeReminders.length < 2) {
            setNotification({ message: "Not enough tasks to prioritize.", type: 'info' });
            return;
        }
        setKiboState(prev => ({ ...prev, isLoading: true, status: KiboStatus.THINKING }));
        try {
            const orderedIds = await geminiService.prioritizeTasks(activeReminders, kiboState.language);
            const reminderMap = new Map(kiboState.reminders.map(r => [r.id, r]));
            const orderedReminders = orderedIds.map(id => reminderMap.get(id)).filter(Boolean) as Reminder[];
            const completedReminders = kiboState.reminders.filter(r => r.completed);
            
            setKiboState(prev => ({
                ...prev,
                reminders: [...orderedReminders, ...completedReminders]
            }));

            const infoMsg = "I've reprioritized your tasks for you.";
            addMessage(Role.MODEL, infoMsg);
            speak(infoMsg, Mood.NEUTRAL);

        } catch (error) {
            console.error("Error prioritizing tasks:", error);
            setNotification({ message: "Couldn't prioritize tasks right now.", type: 'error' });
        } finally {
            setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };

    const handleSummarizeChat = async () => {
        if (kiboState.messages.length < 3) { // Need at least a few messages
             setNotification({ message: "There's not enough conversation to summarize yet.", type: 'info' });
            return;
        }
         setKiboState(prev => ({ ...prev, isLoading: true, status: KiboStatus.THINKING }));
        try {
            const summary = await geminiService.summarizeConversation(kiboState.messages, kiboState.language);
            addMessage(Role.MODEL, `**Here's a summary of our chat:**\n\n${summary}`);
            speak("Here is a summary of our conversation.", Mood.NEUTRAL);
        } catch (error) {
            console.error("Error summarizing chat:", error);
            setNotification({ message: "Couldn't summarize the chat right now.", type: 'error' });
        } finally {
             setKiboState(prev => ({ ...prev, isLoading: false, status: KiboStatus.IDLE }));
        }
    };

    const handleToggleKiboActive = () => {
        setKiboState(prev => {
            const isActive = !prev.isKiboActive;
            if (!isActive) {
                // Clean up timers when turning off
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
            }
            return { ...prev, isKiboActive: isActive, isFocusModeActive: false };
        });
    };

    const handleToggleFloatingMode = () => {
        setKiboState(prev => ({ ...prev, isFloatingMode: !prev.isFloatingMode }));
    };


    return {
        kiboState,
        chatInput,
        setChatInput,
        handleSendMessage,
        handleAnalyzeScreen,
        handleAnalyzeClipboard,
        toggleListening,
        notification,
        clearNotification: () => setNotification(null),
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
    };
};