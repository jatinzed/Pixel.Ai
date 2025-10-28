
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  isRoom: boolean;
  currentUserId: string | null;
}

export const Message: React.FC<MessageProps> = ({ message, isRoom, currentUserId }) => {
  const isModel = message.role === 'model';
  const isCurrentUser = message.role === 'user' && (!isRoom || message.userId === currentUserId);
  const isOtherUser = isRoom && message.role === 'user' && message.userId && message.userId !== currentUserId;

  if (isModel && !message.text) {
    return (
      <div className="flex gap-5 justify-start">
        <img
          src="https://iili.io/K4QGIa9.png"
          alt="AI Avatar"
          className="w-10 h-10 rounded-full self-start flex-shrink-0"
        />
        <div className="max-w-2xl w-full">
          <div className="prose prose-slate max-w-none p-4 rounded-3xl bg-gray-50">
            <div className="animate-pulse flex flex-col space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {(isModel || isOtherUser) && (
        <img
          src={isModel ? "https://iili.io/K4QGIa9.png" : "https://iili.io/K6NVP8x.png"}
          alt={isModel ? "AI Avatar" : "User Avatar"}
          className="w-10 h-10 rounded-full self-start flex-shrink-0"
        />
      )}
      <div className={`max-w-2xl w-full ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`prose prose-slate max-w-none p-4 rounded-3xl ${
            isModel 
            ? 'bg-gray-50 text-gray-800'
            : isOtherUser
            ? 'bg-gray-200 text-gray-800' 
            : 'bg-indigo-600 text-white prose-invert'
        }`}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {message.text}
          </ReactMarkdown>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Sources:</h4>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 transition-colors"
                >
                  {source.title || new URL(source.uri).hostname}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      {isCurrentUser && (
        <img
          src="https://iili.io/K4ZYyKX.png"
          alt="User Avatar"
          className="w-10 h-10 rounded-full self-start flex-shrink-0"
        />
      )}
    </div>
  );
};
