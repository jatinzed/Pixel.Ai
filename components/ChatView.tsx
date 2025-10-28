
import React, { useRef, useEffect } from 'react';
import type { Conversation } from '../types';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { MenuIcon } from './icons';

interface ChatViewProps {
  conversation: Conversation;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onToggleLiveSession: () => void;
  isRoom: boolean;
  currentUserId: string | null;
  isApiEnabled: boolean;
  setIsApiEnabled: (enabled: boolean) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  isLoading,
  onSendMessage,
  isSidebarOpen,
  setIsSidebarOpen,
  onToggleLiveSession,
  isRoom,
  currentUserId,
  isApiEnabled,
  setIsApiEnabled
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // Initial smooth scroll when new messages are added.
    scrollToBottom('smooth');

    const messageListElement = messageListRef.current;
    if (!messageListElement) return;

    // A ResizeObserver is more robust for handling layout shifts from
    // complex content like LaTeX rendering. It triggers whenever the
    // size of the observed element changes.
    const resizeObserver = new ResizeObserver(() => {
      // Use 'auto' for instant scrolling during resizing to prevent jank.
      scrollToBottom('auto');
    });

    resizeObserver.observe(messageListElement);

    // Clean up the observer when the component unmounts or dependencies change.
    return () => resizeObserver.disconnect();
  }, [conversation.messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white md:rounded-2xl shadow-sm">
      <header className="flex items-center p-4 border-b border-gray-200">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 mr-4 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <MenuIcon className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-gray-800 truncate">{conversation.title}</h2>
        {isRoom && (
            <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Pixel Ai</span>
                <button
                    onClick={() => setIsApiEnabled(!isApiEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        isApiEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                    aria-pressed={isApiEnabled}
                >
                    <span className="sr-only">Toggle Pixel Ai</span>
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isApiEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <img 
              src="https://iili.io/K4QGIa9.png" 
              alt="Pixel AI Logo" 
              className="w-24 h-24 rounded-full mb-6"
            />
            <h2 className="text-3xl font-bold text-gray-800">Hi, I'm Pixel AI</h2>
            <p className="mt-2 text-lg">How can I assist you today?</p>
          </div>
        ) : (
          <div ref={messageListRef} className="space-y-8">
            {conversation.messages.map((msg) => (
              <Message key={msg.id} message={msg} isRoom={isRoom} currentUserId={currentUserId} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="p-6 bg-white rounded-b-2xl flex-shrink-0">
        <ChatInput 
          onSendMessage={onSendMessage} 
          isLoading={isLoading} 
          onToggleLiveSession={onToggleLiveSession}
        />
      </div>
    </div>
  );
};
