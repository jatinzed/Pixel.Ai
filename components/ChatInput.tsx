
import React, { useState } from 'react';
import { SendIcon } from './icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isLiveSessionActive: boolean;
  onToggleLiveSession: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading,
  isLiveSessionActive,
  onToggleLiveSession
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading && !isLiveSessionActive) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div className="relative">
        <form onSubmit={handleSubmit} className="flex items-center bg-white rounded-full shadow-lg p-2">
            <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
                }
            }}
            placeholder="Ask Pixel Ai"
            className="flex-1 px-4 py-2 bg-transparent border-none focus:ring-0 focus:outline-none resize-none h-10 max-h-40 overflow-y-auto"
            rows={1}
            disabled={isLoading || isLiveSessionActive}
            />
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={onToggleLiveSession}
                    className={`p-2 rounded-full transition-colors duration-200 ${
                        isLiveSessionActive 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    disabled={isLoading}
                    aria-label={isLiveSessionActive ? "Stop live session" : "Start live session"}
                >
                    <img src="https://iili.io/K4tpjWP.png" alt="Live Session Icon" className="w-8 h-8" />
                </button>
                <button
                    type="submit"
                    className="ml-2 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                    disabled={isLoading || isLiveSessionActive || !text.trim()}
                    aria-label="Send message"
                >
                    <SendIcon className="w-6 h-6" />
                </button>
            </div>
        </form>
    </div>
  );
};
