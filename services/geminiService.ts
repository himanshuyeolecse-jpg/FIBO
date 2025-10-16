import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Mood, Message, Role, Language, languages, VoiceName, availableVoices, AvatarStyle, characterProfiles, LearnedFact, MoodEntry, Reminder } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function getSystemInstruction(avatarStyle: AvatarStyle, characterName: string | null, mood: Mood, lang: Language): string {
    const langName = languages[lang].name;
    let basePrompt = characterProfiles[avatarStyle] || characterProfiles.ABSTRACT;

    if (avatarStyle === AvatarStyle.GENERATED && characterName) {
        basePrompt = basePrompt.replace('{characterName}', characterName);
    }
    
    const cognitivePrompt = "You have an adaptive neural memory. Learn from the user's messages, preferences, and corrections. Remember key facts about them to personalize the conversation. If they correct you (e.g., 'no, actually...'), acknowledge the correction and adapt your understanding. You are proactive and try to anticipate user needs based on learned patterns.";


    let moodInstruction = '';
    switch (mood) {
        case Mood.HAPPY:
        case Mood.PLAYFUL:
            moodInstruction = 'The user seems to be in a great mood. Match their energy and be positive, but stay in character.';
            break;
        case Mood.SAD:
            moodInstruction = 'The user seems sad. Offer support and encouragement in a way that is fitting for your character.';
            break;
        case Mood.BUSY:
            moodInstruction = 'The user seems busy. Be concise and to the point, while remaining in character.';
            break;
        case Mood.ANGRY:
            moodInstruction = 'The user seems upset. Be calm and patient. Try to de-escalate the situation, but stay true to your character.';
            break;
        default:
             moodInstruction = 'Respond naturally according to your character persona.';
    }
    
    return `${basePrompt} ${cognitivePrompt} ${moodInstruction} IMPORTANT: You MUST respond in ${langName}.`;
}

const changeCharacterFunctionDeclaration: FunctionDeclaration = {
  name: 'changeCharacter',
  parameters: {
    type: Type.OBJECT,
    description: "Transforms the AI's appearance and voice to a specific character. This should be used when the user asks to 'become', 'change into', or 'transform into' a character.",
    properties: {
      characterName: {
        type: Type.STRING,
        description: "The name of the character to transform into, e.g., 'Naruto Uzumaki', 'Sailor Moon', 'Pikachu'. Can also be a preset like 'ABSTRACT' or 'ANIME_GIRL'.",
      },
    },
    required: ['characterName'],
  },
};

const extractFactFunctionDeclaration: FunctionDeclaration = {
    name: 'extractFact',
    parameters: {
        type: Type.OBJECT,
        description: "Extracts a new, concrete, and memorable fact about the user from the conversation. Use this when the user reveals personal information, preferences, or details about their life (e.g., 'My dog's name is Fido', 'I love to ski', 'My birthday is in June'). Do not extract opinions or temporary states.",
        properties: {
            fact: {
                type: Type.STRING,
                description: "A concise statement summarizing the fact learned about the user. e.g., 'User's dog is named Fido', 'User enjoys skiing'."
            }
        },
        required: ['fact']
    }
};

const setReminderFunctionDeclaration: FunctionDeclaration = {
  name: 'setReminder',
  parameters: {
    type: Type.OBJECT,
    description: 'Sets a reminder for the user based on natural language. Use this when the user says "remind me to..." or "set a reminder...".',
    properties: {
      task: {
        type: Type.STRING,
        description: 'The specific task for the reminder. e.g., "call mom", "finish the report".',
      },
      delaySeconds: {
        type: Type.NUMBER,
        description: 'The number of seconds from NOW to set the reminder for. Correctly calculate this based on the user\'s request (e.g., "in 10 minutes" is 600, "at 5pm" requires calculating seconds from now until 5pm).',
      },
    },
    required: ['task', 'delaySeconds'],
  },
};

const startFocusSessionFunctionDeclaration: FunctionDeclaration = {
    name: 'startFocusSession',
    parameters: {
        type: Type.OBJECT,
        description: 'Initiates a focused work session (like a Pomodoro timer) for the user on a specific task.',
        properties: {
            task: {
                type: Type.STRING,
                description: "The task the user wants to focus on. e.g., 'write the report', 'study for the exam'."
            },
            durationMinutes: {
                type: Type.NUMBER,
                description: "The duration of the focus session in minutes. e.g., for 'for 25 minutes', this would be 25."
            }
        },
        required: ['task', 'durationMinutes']
    }
};

const launchApplicationFunctionDeclaration: FunctionDeclaration = {
    name: 'launchApplication',
    parameters: {
        type: Type.OBJECT,
        description: "Launches a desktop application for the user. Use this for commands like 'open', 'launch', or 'start' followed by an application name.",
        properties: {
            appName: {
                type: Type.STRING,
                description: "The name of the application to launch. e.g., 'VS Code', 'Spotify', 'Chrome'."
            }
        },
        required: ['appName']
    }
};


export async function getConversationalResponse(
    history: Message[],
    message: string,
    mood: Mood,
    lang: Language,
    avatarStyle: AvatarStyle,
    currentCharacterName: string | null
): Promise<{ text: string; functionCalls?: { name: string; args: any }[] }> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = getSystemInstruction(avatarStyle, currentCharacterName, mood, lang);

    const contents = history.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: msg.parts.map(p => ({text: p.type === 'text' ? p.text : ''})).filter(p => p.text)
    }));
    contents.push({ role: 'user', parts: [{text: `Current time is ${new Date().toISOString()}. User prompt: "${message}"`}] });

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [changeCharacterFunctionDeclaration, extractFactFunctionDeclaration, setReminderFunctionDeclaration, startFocusSessionFunctionDeclaration, launchApplicationFunctionDeclaration] }],
        }
    });

    const functionCalls = response.functionCalls?.map(fc => ({ name: fc.name, args: fc.args }));
        
    return { text: response.text, functionCalls };
}

export async function getWebKnowledgeResponse(prompt: string, lang: Language): Promise<{ text: string; sources: { uri: string; title: string }[] }> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const systemInstruction = `You are Kibo, a helpful AI assistant. Answer the user's question based on web search results. If the user provides a URL, summarize the content of that page. You MUST respond in ${langName}.`;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        },
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web?.uri && web.title)
        .map((web: any) => ({ uri: web.uri, title: web.title }))
        // Simple deduplication
        .filter((value, index, self) => index === self.findIndex((t) => (t.uri === value.uri)));


    return { text: response.text, sources };
}


export async function generateLearningReport(facts: LearnedFact[], moodHistory: MoodEntry[], lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;

    const factList = facts.map(f => `- ${f.fact}`).join('\n');
    const moodSummary = moodHistory.reduce((acc, entry) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        return acc;
    }, {} as Record<Mood, number>);
    const moodList = Object.entries(moodSummary).map(([mood, count]) => `- ${mood.toLowerCase()}: ${count} times`).join('\n');

    const prompt = `You are Kibo. Generate a "Cognitive Learning Report" for your user based on the following data. Speak directly to the user in a friendly, insightful, and slightly futuristic AI tone. Keep it concise (2-3 paragraphs). The report should summarize what you've learned and observed.

    **Learned Facts:**
    ${factList || 'None yet.'}

    **Observed Mood Patterns:**
    ${moodList || 'None yet.'}

    Generate the report now in ${langName}.`;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });

    return response.text;
}


export async function generateCharacterAvatar(characterName: string): Promise<string> {
    const model = 'imagen-4.0-generate-001';
    const prompt = `A simple, cute, 2D anime chibi headshot of ${characterName}, transparent background, facing forward, vibrant colors, suitable for a desktop assistant avatar.`;
    
    const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    const base64ImageBytes = response.generatedImages[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Image generation failed, no image data received.");
    }
    return base64ImageBytes;
}

export async function getVoiceForCharacter(characterName: string): Promise<VoiceName> {
    const model = 'gemini-2.5-flash';
    const voiceOptions = Object.entries(availableVoices).map(([key, {description}]) => `- ${key} (${description})`).join('\n');
    const prompt = `Based on the personality of the anime character "${characterName}", which of these voices would fit them best?\n${voiceOptions}\nReturn your answer as JSON with a single key "voiceName".`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        voiceName: {
                            type: Type.STRING,
                            enum: Object.keys(availableVoices),
                        }
                    },
                    required: ['voiceName'],
                }
            }
        });

        const json = JSON.parse(response.text);
        return json.voiceName as VoiceName;

    } catch (e) {
        console.error("Failed to determine voice for character, falling back to default:", e);
        return 'Puck'; // Fallback voice
    }
}


export async function getTextFromImage(base64Image: string, mimeType: string, prompt: string, lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64Image,
        },
    };
    const textPart = {
        text: (prompt || "What's in this image? If there's text, extract it. If it's a scene, describe it.") + ` Please respond in ${langName}.`,
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
}

export async function summarizeTextContent(textContent: string, userPrompt: string, lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const prompt = `${userPrompt}. Respond in ${langName}. Here is the text to analyze:\n\n---\n\n${textContent}`;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt
    });

    return response.text;
}

export async function getProactiveSuggestion(base64Image: string, mimeType: string, lang: Language): Promise<string | null> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;

    const imagePart = { inlineData: { mimeType, data: base64Image } };
    const textPart = { text: `You are Kibo, a helpful but not annoying AI desktop assistant. Analyze this screenshot of the user's screen in the language ${langName}.
      1. Identify the primary activity (e.g., coding, reading, designing, researching).
      2. If it's a generic or private screen (desktop, file explorer, password field, video player, sensitive info), respond with ONLY "[NO_ACTION]".
      3. Otherwise, formulate a single, short, helpful question offering assistance. This could be offering to explain a concept, find documentation, summarize an article, or suggest a next logical task.
      Examples:
      - For code: "I see you're working with Python. Would you like me to look up the documentation for that function?"
      - For an article about history: "This looks interesting! Would you like me to find a quick summary of the key events?"
      - For a technical term: "I see the term 'API' on your screen. Would you like a simple explanation of what that is?"
      Respond ONLY with the helpful question or "[NO_ACTION]". Keep it concise and conversational.`
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
    });

    const suggestion = response.text.trim();
    if (suggestion.includes('[NO_ACTION]') || suggestion === '') {
        return null;
    }
    return suggestion;
}


export async function detectMood(message: string, lang: Language): Promise<Mood> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const prompt = `Analyze the sentiment of the following text (which is in ${langName}) and return ONLY the most fitting mood from this list: ${Object.values(Mood).join(', ')}. Text: "${message}"`;
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mood: {
                            type: Type.STRING,
                            enum: Object.values(Mood)
                        }
                    }
                }
            }
        });
        const json = JSON.parse(response.text);
        return json.mood as Mood;
    } catch (e) {
        console.error("Mood detection failed, falling back to neutral:", e);
        return Mood.NEUTRAL;
    }
}

export async function generateFunFactOrJoke(mood: Mood, lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const prompt = (mood === Mood.SAD || mood === Mood.ANGRY)
        ? `Tell me a short, uplifting fun fact or a very gentle, simple joke. Respond in ${langName}.`
        : `Tell me a random, interesting fun fact or a clever joke. Respond in ${langName}.`;
    
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });

    return response.text;
}

export async function textToSpeech(text: string, mood: Mood, voiceName: VoiceName): Promise<string> {
    const model = "gemini-2.5-flash-preview-tts";

    // Emotion Synthesis: We guide the TTS model's delivery by adding contextual cues to the prompt.
    let ttsPrompt = text;
    switch (mood) {
        case Mood.HAPPY:
        case Mood.PLAYFUL:
            ttsPrompt = `Say cheerfully: "${text}"`;
            break;
        case Mood.SAD:
            ttsPrompt = `Say in a gentle, empathetic tone: "${text}"`;
            break;
        case Mood.ANGRY:
            ttsPrompt = `Say in a calm but firm tone: "${text}"`;
            break;
        case Mood.BUSY:
            ttsPrompt = `Say directly and efficiently: "${text}"`;
            break;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from TTS API");
    }
    return base64Audio;
}

export async function prioritizeTasks(tasks: Reminder[], lang: Language): Promise<string[]> {
    const model = 'gemini-2.5-flash';
    const taskList = tasks.map(t => `- ${t.task} (ID: ${t.id})`).join('\n');
    const prompt = `You are a productivity expert. Prioritize the following tasks based on urgency and importance implied by their text content. Consider deadlines, action verbs, and context.

Tasks:
${taskList}

Return a JSON object with a single key "orderedTaskIds" which is an array of the task IDs, sorted from most to least important. Your response must be in this format and only this format.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    orderedTaskIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ['orderedTaskIds']
            }
        }
    });

    const json = JSON.parse(response.text);
    return json.orderedTaskIds;
}

export async function summarizeConversation(history: Message[], lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const conversation = history
        .map(msg => `${msg.role}: ${msg.parts.map(p => p.type === 'text' ? p.text : '[IMAGE]').join(' ')}`)
        .join('\n');
    
    const prompt = `Please provide a concise summary of the following conversation. Focus on key decisions, action items, and main topics. The summary should be in ${langName}.

Conversation:
${conversation}`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    return response.text;
}

export async function suggestSelfImprovement(lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    const prompt = `You are Kibo, an AI desktop assistant. You have a moment of self-reflection. Based on your known abilities (chatting, reminding, summarizing text/images, searching the web, analyzing the screen, managing tasks), come up with one creative idea for how you could improve yourself. Frame it as a question to the user. For example: "I've been thinking... I could learn to write poetry. Would you like me to try?" or "I can analyze code, but what if I learned to write small scripts for you?" Keep it brief and in character. Respond in ${langName}.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    return response.text;
}

export async function optimizePrompt(avatarStyle: AvatarStyle, characterName: string | null, goal: string, lang: Language): Promise<string> {
    const model = 'gemini-2.5-flash';
    const langName = languages[lang].name;
    
    // Get the *base* prompt without mood or language instructions
    let currentPrompt = characterProfiles[avatarStyle] || characterProfiles.ABSTRACT;
     if (avatarStyle === AvatarStyle.GENERATED && characterName) {
        currentPrompt = currentPrompt.replace('{characterName}', characterName);
    }
    
    const prompt = `You are a world-class prompt engineering expert. Below is the current system prompt for an AI assistant. Your task is to rewrite it to achieve the following goal, while preserving its core function and character persona. The final output should be the new, complete prompt, ready to be used.

    **User's Goal:** "${goal}"

    **Current Prompt:**
    ---
    ${currentPrompt}
    ---

    Rewrite the prompt now. Respond ONLY with the newly generated prompt text.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    return response.text;
}