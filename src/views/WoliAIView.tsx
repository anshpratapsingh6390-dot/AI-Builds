import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  Bot,
  User,
  Zap,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { AIAssistantMessage } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { processWoliAIInput } from '../services/woliAIEngine';
import { formatTimeDisplay, getTodayDateString } from '../utils/dateUtils';

interface WoliAIViewProps {
  onNavigate?: (view: any) => void;
}

export const WoliAIView: React.FC<WoliAIViewProps> = ({ onNavigate }) => {
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
    const saved = localStorage.getItem('woli_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Hello! I am **WOLI AI**, your personal productivity operating assistant.\n\nI can schedule your day, manage tasks, track habits, check goal progress, and review your productivity through natural voice and text in English, Hindi, and Hinglish.\n\nTry saying or typing:\n• *"Tomorrow from 6 to 7 AM, schedule DSA"*\n• *"Kal subah 6 se 7 baje DSA karna hai"*\n• *"Schedule coding from 11 PM to 1 AM"*\n• *"How much productive time did I complete today?"*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Schedule DSA tomorrow from 6 to 7 AM',
          'Review my day',
          'How much productive time did I complete today?',
          'Schedule coding from 11 PM to 1 AM',
        ],
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-IN'); // en-IN / en-US
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    status: speechStatus,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition((finalText) => {
    if (finalText.trim()) {
      handleSendMessage(finalText.trim());
    }
  });

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('woli_ai_chat_history', JSON.stringify(messages.slice(-30)));
  }, [messages]);

  // When speech transcript updates, populate inputText
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, interimTranscript, speechStatus]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    if (isListening) {
      stopListening();
    }
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
      const errMessage: AIAssistantMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue processing that instruction: ${err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('woli_ai_chat_history');
    setMessages([
      {
        id: 'msg-fresh',
        role: 'assistant',
        content: `Conversation cleared. What would you like to plan or manage in WOLI OS?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Schedule DSA tomorrow from 6 to 7 AM',
          'Review my day',
          'Create a goal for JavaScript',
        ],
      },
    ]);
  };

  const handleUndoAction = async (action: any) => {
    if (action.type === 'create_schedule_block' && action.undoData?.blockId) {
      await deleteScheduleBlock(action.undoData.blockId);
      setMessages((prev) => [
        ...prev,
        {
          id: `undo-${Date.now()}`,
          role: 'assistant',
          content: `Reversed: The schedule block has been deleted.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-950">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-100">WOLI AI</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                Personal Assistant
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Voice & conversational productivity control • English, Hindi, Hinglish
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <select
            value={speechLang}
            onChange={(e) => setSpeechLang(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs focus:outline-none"
            title="Speech Recognition Language"
          >
            <option value="en-IN">Hinglish / English (IN)</option>
            <option value="en-US">English (US)</option>
            <option value="hi-IN">Hindi (हिन्दी)</option>
          </select>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 text-xs border border-neutral-700 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Speech Status Alert */}
      {speechError && (
        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                    : 'bg-indigo-600 text-white shadow-sm'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2">
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Actions Executed Summary Cards */}
                  {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-800 space-y-2">
                      <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Database Operations Executed:</span>
                      </div>
                      {msg.actionsExecuted.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300"
                        >
                          <span className="font-mono text-[11px] text-neutral-300">{act.description}</span>
                          {act.undoable && (
                            <button
                              onClick={() => handleUndoAction(act)}
                              className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-rose-400 text-[10px] border border-neutral-700 shrink-0 transition-colors"
                              title="Revert this database action"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 ${
                      isUser ? 'text-indigo-200 text-right' : 'text-neutral-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedActions.map((actionText, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(actionText)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-indigo-950 hover:border-indigo-500/40 hover:text-indigo-300 text-neutral-300 border border-neutral-700/60 transition-all cursor-pointer text-left"
                      >
                        {actionText}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Interim voice transcript live preview */}
        {isListening && interimTranscript && (
          <div className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/40 text-indigo-300 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs italic">
              {interimTranscript}...
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-neutral-400 ml-1">WOLI AI is executing your instruction...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Status Ribbon */}
      {speechStatus === 'requesting_permission' && (
        <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center gap-2 text-xs text-amber-300 animate-pulse shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold">Requesting microphone access... Please grant permission in your browser prompt.</span>
        </div>
      )}

      {speechStatus === 'listening' && (
        <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-between gap-3 text-xs text-indigo-300 animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold">Listening to voice command... Speak naturally in English, Hindi, or Hinglish</span>
            {interimTranscript && <span className="text-white italic">"{interimTranscript}"</span>}
          </div>
          <button
            onClick={stopListening}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs border border-neutral-700 cursor-pointer"
          >
            Done Speaking
          </button>
        </div>
      )}

      {speechStatus === 'processing_speech' && (
        <div className="p-2.5 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center gap-2 text-xs text-violet-300 shrink-0">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
          <span className="font-semibold">Transcribing speech and extracting productivity commands...</span>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-sm shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone toggle */}
          {isSpeechSupported ? (
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening(speechLang);
                }
              }}
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-950 animate-pulse'
                  : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice command'}
              aria-label="Microphone Voice Command"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-indigo-400" />}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="p-3 rounded-xl bg-neutral-850 text-neutral-600 border border-neutral-800 cursor-not-allowed"
              title="Voice commands not supported in this browser"
            >
              <MicOff className="w-5 h-5" />
            </button>
          )}

          {/* Text input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Listening... say something like "Tomorrow schedule DSA from 6 to 7 AM"'
                : 'Type or speak a command (e.g. "Tomorrow 6 to 7 AM DSA", "Review my day")...'
            }
            className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white shadow-sm transition-colors cursor-pointer"
            title="Send instruction"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
