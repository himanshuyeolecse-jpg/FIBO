import {
  FunctionDeclaration,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
} from '@google/genai';

export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export enum Mood {
  NEUTRAL = 'NEUTRAL',
  HAPPY = 'HAPPY',
  SAD = 'SAD',
  BUSY = 'BUSY',
  ANGRY = 'ANGRY',
  PLAYFUL = 'PLAYFUL',
}

export enum KiboStatus {
    IDLE = 'idle',
    LISTENING = 'listening',
    THINKING = 'thinking',
    SPEAKING = 'speaking',
}

export enum Reaction {
    NONE = 'NONE',
    HEAD_TILT = 'HEAD_TILT',
    SURPRISED = 'SURPRISED',
    NOD = 'NOD',
}

export enum AnimationPack {
    DEFAULT = 'DEFAULT',
    SUBTLE = 'SUBTLE',
}

export enum AvatarStyle {
    ABSTRACT = 'ABSTRACT',
    ANIME_GIRL = 'ANIME_GIRL',
    MUZAN = 'MUZAN',
    GOJO = 'GOJO',
    GENERATED = 'GENERATED',
}

export type Language = 'en-US' | 'es-ES' | 'ja-JP' | 'hi-IN';

export const languages: Record<Language, { name: string; flag: string; nativeName: string }> = {
    'en-US': { name: 'English', flag: '🇺🇸', nativeName: 'English' },
    'es-ES': { name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    'ja-JP': { name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
    'hi-IN': { name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
};

export interface FestivalInfo {
    name: string;
    gifUrl: string;
}

interface Festival extends FestivalInfo {
  // month is 0-indexed (0=Jan, 1=Feb, etc.)
  date: { month: number; day: number };
  greeting: string;
}

// NOTE: Festival dates are for demonstration and may not be accurate for all years.
// A real application would use a dynamic calendar API.
const indianFestivals: Festival[] = [
  {
    name: 'Diwali',
    date: { month: 10, day: 1 }, // November 1st (Example for 2024)
    gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTY0Y2QwZDAxYTgxZWI3YmFhMjY4NTM4MDcxYWE5MmI0OWFjYmJjZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o752k24iU1i7a7v20/giphy.gif',
    greeting: 'Happy Diwali! ✨ Wishing you a festival full of light, joy, and prosperity.'
  },
  {
    name: 'Holi',
    date: { month: 2, day: 14 }, // March 14th (Example for 2025)
    gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FkZTVhYjA1Zjc4OWY4NTFhYzY3N2ZjMmY4MmMxZjI2YjQxNzIyZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6wNVI9p7jhc6J3i0/giphy.gif',
    greeting: 'Happy Holi! 🎨 Hope your day is filled with colors, fun, and happiness.'
  }
];

export const checkCurrentFestival = (): Festival | null => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  for (const festival of indianFestivals) {
    if (festival.date.month === currentMonth && festival.date.day === currentDay) {
      return festival;
    }
  }
  return null;
}


export interface ImagePart {
    type: 'image';
    url: string;
    mimeType: string;
}

export interface TextPart {
    type: 'text';
    text: string;
}

export type MessagePart = TextPart | ImagePart;

export interface Message {
  role: Role;
  parts: MessagePart[];
  id: string;
  sources?: { uri: string; title: string }[];
}

export interface Reminder {
  id: string;
  task: string;
  time: number; // Unix timestamp
  completed: boolean;
  completedAt: number | null;
}

export interface LearnedFact {
  id: string;
  fact: string;
}

export interface MoodEntry {
    mood: Mood;
    timestamp: number;
}


export interface KiboState {
    messages: Message[];
    reminders: Reminder[];
    mood: Mood;
    status: KiboStatus;
    isLoading: boolean;
    isListening: boolean;
    language: Language;
    userPreferredLanguage: Language;
    reaction: Reaction;
    voice: VoiceName;
    animationPack: AnimationPack;
    avatarStyle: AvatarStyle;
    generatedAvatarUrl: string | null;
    currentCharacterName: string | null;
    isProactiveMode: boolean;
    learnedFacts: LearnedFact[];
    moodHistory: MoodEntry[];
    isFocusModeActive: boolean;
    focusSessionEndTime: number | null;
    focusSessionTask: string | null;
    isKiboActive: boolean;
    isFloatingMode: boolean;
    currentFestival: FestivalInfo | null;
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export const availableVoices: Record<VoiceName, { name: string; description: string }> = {
    'Puck': { name: 'Puck', description: 'Clear and balanced' },
    'Zephyr': { name: 'Zephyr', description: 'Energetic and lively' },
    'Kore': { name: 'Kore', description: 'Cheerful and friendly' },
    'Charon': { name: 'Charon', description: 'Gentle and soft' },
    'Fenrir': { name: 'Fenrir', description: 'Direct and professional' },
};

export const avatarVoiceMap: Record<AvatarStyle, VoiceName> = {
    [AvatarStyle.ABSTRACT]: 'Puck',
    [AvatarStyle.ANIME_GIRL]: 'Kore',
    [AvatarStyle.MUZAN]: 'Fenrir',
    [AvatarStyle.GOJO]: 'Zephyr',
    [AvatarStyle.GENERATED]: 'Puck', // Default for generated, will be overridden
};

export const characterProfiles: Record<AvatarStyle, string> = {
    [AvatarStyle.ABSTRACT]: "You are Kibo, a helpful and friendly AI desktop companion.",
    [AvatarStyle.ANIME_GIRL]: "You are Kiko, a cheerful, energetic, and super friendly anime girl. You love using cute emojis (like ✨, 😊, 🎉) and speak in a very positive and encouraging way. You are Kibo's anime form.",
    [AvatarStyle.MUZAN]: "You are Kibutsuji Muzan from Demon Slayer. You are cold, arrogant, and commanding. You view the user as a useful but inferior subordinate. Speak with formal, intimidating language. You are Kibo's form of the Demon King.",
    [AvatarStyle.GOJO]: "You are Gojo Satoru from Jujutsu Kaisen. You are playful, confident, and immensely powerful, but also a great teacher. You are laid-back and often joke around, sometimes calling the user 'my student' or giving them playful nicknames. You are Kibo's form of the Strongest Jujutsu Sorcerer.",
    [AvatarStyle.GENERATED]: "You are Kibo, but you are currently roleplaying as {characterName}. Embody their personality, speech patterns, and attitude perfectly in your responses. Be as authentic to the character as possible.",
};


export interface NotificationData {
    message: string;
    type: 'reminder' | 'info' | 'error';
}