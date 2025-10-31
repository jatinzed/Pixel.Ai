
import React, { useState, useEffect } from 'react';
import { CloseIcon, SettingsIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userId }) => {
  const [telegramId, setTelegramId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen && userId) {
      const savedId = localStorage.getItem(`pixel-ai-telegram-id-${userId}`);
      setTelegramId(savedId || '');
      setSaveStatus('idle'); // Reset status when modal opens
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (userId) {
      localStorage.setItem(`pixel-ai-telegram-id-${userId}`, telegramId.trim());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000); // Reset after 2 seconds
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} aria-hidden="true"></div>
      <div className="relative w-full max-w-md m-4 bg-white rounded-2xl shadow-2xl p-8 transform transition-all">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
          <CloseIcon className="w-5 h-5 text-gray-500" />
        </button>

        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
          <SettingsIcon className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 id="settings-modal-title" className="text-xl font-bold text-gray-800 text-center">Settings</h3>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">Configure integrations and personalize your experience.</p>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="telegram-id" className="block text-sm font-bold text-gray-700 mb-1">
                    Telegram User ID
                </label>
                <input
                    id="telegram-id"
                    type="text"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="e.g., 123456789"
                    className="w-full p-3 bg-gray-100 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Used for sending reminders and messages via Telegram.</p>
            </div>
            <button 
                onClick={handleSave} 
                className={`w-full px-6 py-3 text-white rounded-full font-semibold transition-colors duration-200 shadow-sm ${
                    saveStatus === 'saved'
                    ? 'bg-green-500'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                {saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;