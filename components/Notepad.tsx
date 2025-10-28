
import React from 'react';
import { CloseIcon } from './icons';

interface NotepadProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onContentChange: (newContent: string) => void;
}

export const Notepad: React.FC<NotepadProps> = ({ isOpen, onClose, content, onContentChange }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="notepad-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Notepad Panel */}
      <div className="relative flex flex-col w-full max-w-2xl h-full max-h-[80vh] m-4 bg-white rounded-2xl shadow-2xl transform transition-all">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="notepad-title" className="text-lg font-semibold text-gray-800">Notepad</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close notepad"
          >
            <CloseIcon className="w-6 h-6 text-gray-600" />
          </button>
        </header>
        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Start writing your notes here..."
            className="w-full h-full p-2 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  );
};
