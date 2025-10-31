
import React from 'react';
import type { Conversation } from '../types';
import { PlusIcon, ChatBubbleIcon, TrashIcon, SettingsIcon } from './icons';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onNotepadOpen: () => void;
  onRoomModalOpen: () => void;
  onSettingsModalOpen: () => void;
}

const ConversationItem: React.FC<{
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ conversation, isActive, onSelect, onDelete }) => {
  const isRoom = conversation.id.length === 5 && /^[A-Z0-9]+$/.test(conversation.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop the click from selecting the conversation
    const message = isRoom
        ? "Are you sure you want to leave this room? You will no longer receive messages."
        : "Are you sure you want to delete this chat session? This action cannot be undone.";
    if (window.confirm(message)) {
      onDelete(conversation.id);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={() => onSelect(conversation.id)}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-colors duration-200 pr-10 ${
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <ChatBubbleIcon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate flex-1">{conversation.title}</span>
        {isActive && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
      </button>
      <button
        onClick={handleDelete}
        aria-label={isRoom ? "Leave room" : "Delete chat session"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 hover:text-red-500 focus:opacity-100"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  setIsOpen,
  onNotepadOpen,
  onRoomModalOpen,
  onSettingsModalOpen,
}) => {
  return (
    <aside className={`
        absolute z-20 h-full w-80 bg-white shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:transform-none md:shadow-sm md:rounded-2xl
        md:transition-all
        md:${isOpen ? 'w-80 p-4' : 'w-0 p-0'}
        overflow-hidden
    `}>
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src="https://iili.io/K4QGIa9.png" alt="Pixel AI Logo" className="w-8 h-8 rounded-full" />
                    <h1 className="text-xl font-bold tracking-wider text-gray-800">PIXEL <span className="text-indigo-600">AI</span></h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={onNewChat} className="flex-grow flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-sm">
                        <PlusIcon className="w-5 h-5" />
                        New chat
                    </button>
                    <button 
                        onClick={onNotepadOpen}
                        className="flex-shrink-0 p-3 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors duration-200"
                        aria-label="Open Notepad"
                    >
                        <img src="https://iili.io/K4tuzkQ.png" alt="Notepad Icon" className="w-5 h-5" />
                    </button>
                     <button
                        onClick={onRoomModalOpen}
                        className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors duration-200"
                        aria-label="Chat Rooms"
                    >
                        <span className="text-indigo-700 font-bold text-xl leading-none">॥</span>
                    </button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-1">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Your conversations</h2>
                {conversations.map((conv) => (
                <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={onSelectConversation}
                    onDelete={onDeleteConversation}
                />
                ))}
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-gray-50 flex-grow">
                        <span className="text-gray-600 text-3xl leading-none">●</span>
                        <span className="text-sm font-semibold text-gray-800">Pixel Squad</span>
                    </div>
                    <button 
                        onClick={onSettingsModalOpen}
                        className="flex-shrink-0 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors duration-200"
                        aria-label="Open Settings"
                    >
                        <SettingsIcon className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>
    </aside>
  );
};