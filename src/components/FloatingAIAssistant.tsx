import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { AIAssistantMessage } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { processWoliAIInput } from '../services/woliAIEngine';
import { getTodayDateString } from '../utils/dateUtils';

interface FloatingAIAssistantProps {
  onOpenFullView?: () => void;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ onOpenFullView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    scheduleBlocks,
    tasks,
    goals,
    habits,
    occurrences,
    timeSessions,
    selectedDate,
    addScheduleBlock,
    updateScheduleBlock,
    deleteScheduleBlock,
    addTask,
    updateTask,
    toggleTaskStatus,
    addGoal,
    recordHabitOccurrence,
  } = useLifeOS();

  const [messages, setMessages] = useState<AIAssistantMessage[]>(() => {
    return [
      {
        id: 'msg-float-welcome',
        role: 'assistant',
        content: `Hi! I'm **WOLI AI**. Speak or type any command to schedule activities, create tasks, or review your day.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Tomorrow 6 to 7 AM DSA',
          'Review my day',
          'Schedule coding 11 PM to 1 AM',
        ],
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    status: speechStatus,
    transcript,
    interimTranscript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition((finalText) => {
    if (finalText.trim()) {
      handleSendMessage(finalText.trim());
    }
  });

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isProcessing, interimTranscript, speechStatus]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    if (isListening) stopListening();
    resetTranscript();
    setInputText('');

    const userMessage: AIAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    const context = {
      todayDate: getTodayDateString(),
      selectedDate,
      scheduleBlocks,
      tasks,
      goals,
      habits,
      occurrences,
      timeSessions,
    };

    const lifeOSActions = {
      addScheduleBlock,
      updateScheduleBlock,
      deleteScheduleBlock,
      addTask,
      updateTask,
      toggleTaskStatus,
      addGoal,
      recordHabitOccurrence,
    };

    try {
      const result = await processWoliAIInput(text, messages, context, lifeOSActions);

      const aiMessage: AIAssistantMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionsExecuted: result.actionsExecuted,
        suggestedActions: result.suggestedActions,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${err.message || 'Could not process command'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-xl shadow-indigo-950/80 border border-indigo-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Open WOLI AI Voice & Task Assistant"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          <span>WOLI AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Floating Assistant Drawer / Card */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[550px] max-h-[85vh] rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-neutral-950/90 border-b border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-neutral-100">WOLI AI</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Voice Active
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400">Personal Productivity Assistant</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenFullView && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullView();
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  title="Open full WOLI AI view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: 'msg-fresh',
                      role: 'assistant',
                      content: 'Chat cleared. How can I help you?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (isListening) stopListening();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                title="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-neutral-900/80 text-xs">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id} className={`flex gap-2.5 ${isUser ? 'ml-auto flex-row-reverse max-w-[88%]' : 'mr-auto max-w-[92%]'}`}>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isUser ? 'bg-neutral-800 text-neutral-300' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div className="space-y-1.5">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-tl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Executed actions */}
                      {m.actionsExecuted && m.actionsExecuted.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-neutral-800 space-y-1">
                          {m.actionsExecuted.map((a) => (
                            <div key={a.id} className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>{a.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chips */}
                    {m.suggestedActions && m.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.suggestedActions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(s)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700/60"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isListening && interimTranscript && (
              <div className="flex gap-2.5 ml-auto flex-row-reverse max-w-[88%]">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/40 text-indigo-300 flex items-center justify-center">
                  <Mic className="w-3 h-3 animate-pulse" />
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 italic">
                  {interimTranscript}...
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex gap-2 text-neutral-400 items-center pl-2">
                <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-[11px]">Executing instruction...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice active bar */}
          {speechStatus === 'requesting_permission' && (
            <div className="px-3 py-1.5 bg-amber-950 border-t border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Requesting mic permission...
            </div>
          )}

          {speechStatus === 'listening' && (
            <div className="px-3 py-1.5 bg-indigo-950 border-t border-indigo-500/30 text-[11px] text-indigo-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Listening... speak in English, Hindi, or Hinglish
              </span>
              <button onClick={stopListening} className="underline text-[10px] text-neutral-300 hover:text-white cursor-pointer">
                Done
              </button>
            </div>
          )}

          {speechStatus === 'processing_speech' && (
            <div className="px-3 py-1.5 bg-violet-950 border-t border-violet-500/30 text-[11px] text-violet-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
              Transcribing voice command...
            </div>
          )}

          {/* Footer Input */}
          <div className="p-2.5 bg-neutral-950/95 border-t border-neutral-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              {isSpeechSupported ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening('en-IN');
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start speaking'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-400" />}
                </button>
              ) : null}

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or speak a command..."
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
