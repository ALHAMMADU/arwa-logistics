'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ChatIcon, SendIcon, BotIcon, SparkleIcon, XIcon, TrashIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

// Welcome message is now created dynamically using i18n inside the component

export default function AIChatWidget() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAppStore();

  // Create welcome message dynamically with i18n
  const welcomeContent = t('aiChat.welcome');
  useEffect(() => {
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
    };
    setMessages(prev => {
      const hasWelcome = prev.some(m => m.id === 'welcome');
      if (!hasWelcome) return [welcomeMsg];
      return prev.map(m => m.id === 'welcome' ? welcomeMsg : m);
    });
  }, [welcomeContent]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Load chat history when widget opens for the first time
  useEffect(() => {
    if (isOpen && isAuthenticated && !historyLoaded) {
      loadHistory();
    }
  }, [isOpen, isAuthenticated, historyLoaded]);

  const loadHistory = async () => {
    try {
      const res = await apiFetch('/ai/history?limit=50');
      if (res.success && res.data && res.data.length > 0) {
        const historyMessages: Message[] = res.data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        }));
        setMessages([{ id: 'welcome', role: 'assistant', content: welcomeContent }, ...historyMessages]);
      }
      setHistoryLoaded(true);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build message history for the API (exclude the welcome message)
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: 'user', content: trimmed });

      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (res.success && res.data) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.data.content,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        toast.error(res.error || t('aiChat.failedResponse'));
        // Remove the user message if the API failed
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } catch (error) {
      toast.error(t('aiChat.failedSend'));
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await apiFetch('/ai/history', { method: 'DELETE' });
      if (res.success) {
        setMessages([{ id: 'welcome', role: 'assistant', content: welcomeContent }]);
        toast.success(t('aiChat.historyCleared'));
      } else {
        toast.error(res.error || t('aiChat.failedClearHistory'));
      }
    } catch (error) {
      toast.error(t('aiChat.failedClearHistory'));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all duration-300 hover:bg-emerald-700 hover:shadow-xl hover:scale-105 active:scale-95 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          aria-label={t('aiChat.openAssistant')}
        >
          <ChatIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[calc(100vw-3rem)] sm:w-[400px] h-[500px] max-h-[80vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50 transition-all duration-300 overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 dark:bg-emerald-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                <BotIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">{t('aiChat.title')}</h3>
                <p className="text-[10px] text-emerald-100 leading-tight flex items-center gap-1">
                  <SparkleIcon className="w-3 h-3" />
                  {t('aiChat.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearHistory}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                aria-label={t('aiChat.clearHistory')}
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                aria-label={t('aiChat.closeChat')}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 rounded-br-md'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100 rounded-bl-md'
                    }`}
                  >
                    {message.role === 'assistant' && message.id === 'welcome' && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600 dark:text-emerald-400">
                        <SparkleIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{t('aiChat.brand')}</span>
                      </div>
                    )}
                    {message.content}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{t('aiChat.thinking')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('aiChat.placeholder')}
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shrink-0"
                size="icon"
                aria-label={t('aiChat.sendMessage')}
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center">
              {t('aiChat.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
