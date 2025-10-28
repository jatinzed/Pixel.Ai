import React from 'react';
import { CloseIcon, MicrophoneIcon } from './icons';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrant: () => void;
  status: 'prompt' | 'denied';
}

const PermissionModal: React.FC<PermissionModalProps> = ({ isOpen, onClose, onGrant, status }) => {
  if (!isOpen) return null;

  const handleGrant = () => {
    onGrant();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="permission-modal-title">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} aria-hidden="true"></div>
      <div className="relative w-full max-w-md m-4 bg-white rounded-2xl shadow-2xl p-8 transform transition-all text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
          <CloseIcon className="w-5 h-5 text-gray-500" />
        </button>
        
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
            <MicrophoneIcon className="h-8 w-8 text-indigo-600" />
        </div>

        <h3 id="permission-modal-title" className="text-xl font-bold text-gray-800 mb-2">Microphone Access</h3>
        
        {status === 'prompt' && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Pixel AI needs access to your microphone to start a voice conversation. Please grant permission when your browser asks.
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={handleGrant} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-sm">
                Grant Access
              </button>
              <button onClick={onClose} className="w-full px-6 py-3 bg-gray-100 text-gray-800 rounded-full font-semibold hover:bg-gray-200 transition-colors duration-200">
                Cancel
              </button>
            </div>
          </>
        )}

        {status === 'denied' && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Microphone access is currently blocked. To use voice chat, please go to your browser's site settings for this page and change the microphone permission to "Allow".
            </p>
             <div className="text-left bg-gray-50 p-3 rounded-lg text-xs text-gray-600 mb-6">
                <strong>Instructions for Chrome:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Click the padlock icon 🔒 next to the website address.</li>
                    <li>Find "Microphone" and switch it to "Allow".</li>
                    <li>Reload the page if prompted.</li>
                </ol>
            </div>
            <button onClick={onClose} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-sm">
              Got it
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PermissionModal;
