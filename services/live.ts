
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from "@google/genai";
import { systemInstruction } from "../constants";
import { sendMessageToTelegram } from "./telegramService";
import { sendMessageToTelegramTool, setReminderTool } from "./geminiService";
import { scheduleReminder } from "./reminderService";

// For better security, especially in production, it's recommended to use environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Encoding/Decoding Utilities ---

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

// --- Live Session Management ---

interface LiveCallbacks {
    onUserTranscription?: (text: string) => void;
    onModelTranscription?: (text: string) => void;
    onAudioLevel?: (level: number) => void;
    onSessionEnd: () => void;
    onError: (error: any) => void;
}

class LiveSessionManager {
    private sessionPromise: Promise<LiveSession> | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();
    private sessionActive = false;
    private callbacks: LiveCallbacks | null = null;
    private appUserId: string | null = null;

    public async start(callbacks: LiveCallbacks, appUserId: string | null) {
        if (this.sessionActive) {
            console.log("Session already active.");
            return;
        }

        this.sessionActive = true;
        this.callbacks = callbacks;
        this.appUserId = appUserId;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (!this.sessionActive) {
                this.stream.getTracks().forEach(track => track.stop());
                return;
            }

            this.inputAudioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            this.outputAudioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            this.sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: systemInstruction,
                    tools: [
                        { googleSearch: {} },
                        { functionDeclarations: [sendMessageToTelegramTool, setReminderTool] }
                    ],
                },
                callbacks: {
                    onopen: () => {
                        if (!this.sessionActive || !this.inputAudioContext || !this.stream) return;
                        
                        const source = this.inputAudioContext.createMediaStreamSource(this.stream);
                        this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            if (!this.sessionActive) return;
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            
                            const rms = Math.sqrt(inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length);
                            this.callbacks?.onAudioLevel?.(rms);

                            const pcmBlob = createBlob(inputData);
                            this.sessionPromise?.then((session) => {
                                if (this.sessionActive) {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                }
                            });
                        };
                        source.connect(this.scriptProcessor);
                        this.scriptProcessor.connect(this.inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (!this.sessionActive) return;

                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'sendMessageToTelegram') {
                                    const { message: textMessage } = fc.args;
                                    let { userId: targetUserId } = fc.args;
                                    let resultMessage: string;

                                    if (!targetUserId && this.appUserId) {
                                        targetUserId = localStorage.getItem(`pixel-ai-telegram-id-${this.appUserId}`);
                                    }

                                    if (targetUserId) {
                                        const result = await sendMessageToTelegram(targetUserId, textMessage);
                                        resultMessage = result.message;
                                    } else {
                                        resultMessage = "Failed: Telegram User ID not configured.";
                                    }
                                    
                                    this.sessionPromise?.then((session) => {
                                        if (this.sessionActive) {
                                            session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: resultMessage } } });
                                        }
                                    });

                                } else if (fc.name === 'setReminder') {
                                    let resultMessage: string;
                                    if (this.appUserId) {
                                        const { message, delayInSeconds } = fc.args;
                                        if (typeof message === 'string' && typeof delayInSeconds === 'number' && delayInSeconds > 0) {
                                            await scheduleReminder(this.appUserId, message, delayInSeconds);
                                            resultMessage = `Reminder set for ${message}`;
                                        } else {
                                            resultMessage = 'Could not set reminder due to invalid parameters.';
                                        }
                                    } else {
                                        resultMessage = 'Could not set reminder due to missing user context.';
                                    }
                                    this.sessionPromise?.then((session) => {
                                        if (this.sessionActive) {
                                            session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: resultMessage } } });
                                        }
                                    });
                                }
                            }
                        }

                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                            this.callbacks?.onUserTranscription?.(currentInputTranscription);
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                            this.callbacks?.onModelTranscription?.(currentOutputTranscription);
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && this.outputAudioContext) {
                            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
                            const sourceNode = this.outputAudioContext.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(this.outputAudioContext.destination);
                            sourceNode.addEventListener('ended', () => this.sources.delete(sourceNode));
                            sourceNode.start(this.nextStartTime);
                            this.nextStartTime += audioBuffer.duration;
                            this.sources.add(sourceNode);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            for (const source of this.sources.values()) source.stop();
                            this.sources.clear();
                            this.nextStartTime = 0;
                        }
                    },
                    onclose: () => {
                        this.callbacks?.onSessionEnd();
                        this.stop();
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        this.callbacks?.onError(e);
                        this.stop();
                    },
                },
            });

        } catch (error) {
            console.error("Failed to get user media:", error);
            this.callbacks?.onError(error);
            this.stop();
        }
    }

    public stop() {
        if (!this.sessionActive) return;
        this.sessionActive = false;
        
        this.sessionPromise?.then(session => session.close()).catch(e => console.error("Error closing session:", e));
        this.sessionPromise = null;

        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;

        this.scriptProcessor?.disconnect();
        this.scriptProcessor = null;

        this.inputAudioContext?.close().catch(e => console.error("Error closing input context:", e));
        this.inputAudioContext = null;
        
        this.outputAudioContext?.close().catch(e => console.error("Error closing output context:", e));
        this.outputAudioContext = null;

        for (const source of this.sources.values()) source.stop();
        this.sources.clear();
        this.nextStartTime = 0;

        this.callbacks?.onSessionEnd();
        this.callbacks = null;
    }
}

let currentSession: LiveSessionManager | null = null;

export function startLiveSession(callbacks: LiveCallbacks, appUserId: string | null) {
    if (currentSession) {
        console.warn("startLiveSession called while a session is already active.");
        return;
    }
    currentSession = new LiveSessionManager();
    currentSession.start(callbacks, appUserId);
}

export function stopLiveSession() {
    currentSession?.stop();
    currentSession = null;
}
