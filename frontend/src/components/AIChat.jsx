import React, { useState, useRef, useEffect } from 'react';
import { useMobility } from '../context/MobilityContext';
import { Send, Sparkles, MessageSquare, Bot, HelpCircle, Navigation } from 'lucide-react';

export default function AIChat({ isOpen, onClose }) {
  const {
    chatMessages,
    chatLoading,
    sendChatMessage
  } = useMobility();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendChatMessage(input);
    setInput("");
  };

  const handleQuickPrompt = (promptText) => {
    sendChatMessage(promptText);
  };

  if (!isOpen) return null;

  const quickPrompts = [
    "Find the safest route to Airport",
    "How can I reduce travel costs?",
    "Which route has the lowest carbon emissions?",
    "Route from home to office"
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 glass-panel-heavy shadow-2xl border-l border-brand-teal/20 flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-darkBg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-brand-teal/20 p-2 rounded-lg border border-brand-teal/30">
            <Bot className="w-5 h-5 text-brand-neonCyan" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1">
              UrbanFlow AI Assistant
              <Sparkles className="w-3.5 h-3.5 text-brand-neonCyan animate-pulse" />
            </h3>
            <span className="text-[10px] text-brand-teal font-semibold">Online Commute Dispatcher</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-darkBg-border px-2.5 py-1 rounded-lg cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "user" ? "self-end items-end" : "self-start items-start"
            }`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-brand-teal text-darkBg-deep font-bold rounded-tr-none"
                  : "bg-darkBg-card border border-darkBg-border text-slate-200 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              {msg.sender === "user" ? "You" : "AI Agent"}
            </span>
          </div>
        ))}
        {chatLoading && (
          <div className="self-start flex items-center gap-2 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-ping" />
            AI is checking city routes...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions & Input */}
      <div className="p-4 border-t border-darkBg-border flex flex-col gap-3">
        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleQuickPrompt(p)}
              className="text-[10px] bg-slate-800/50 hover:bg-brand-teal/20 text-slate-300 hover:text-brand-neonCyan border border-darkBg-border hover:border-brand-teal/40 px-2 py-1 rounded-lg text-left transition-all duration-200"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="text"
            className="flex-1 glass-input text-xs px-3 py-2.5 rounded-xl text-slate-200"
            placeholder="Plan safest trip, reduce cost..."
          />
          <button
            type="submit"
            className="bg-brand-teal text-darkBg-deep p-2.5 rounded-xl cursor-pointer hover:bg-brand-teal/80 transition-all duration-200 border-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
