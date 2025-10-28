
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { Notepad } from './components/Notepad';
import type { Conversation, Message, GroundingSource } from './types';
import { streamChat } from './services/geminiService';
import * as liveService from './services/live';
import { CloseIcon, UsersIcon } from './components/icons';
import PermissionModal from './components/PermissionModal';
import { createRoom, roomExists, listenForMessages, sendMessage } from './services/firebase';
import { LiveView } from './components/LiveView';

// --- Room Modal Component ---
interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => Promise<string>;
  onJoinRoom: (code: string) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, onCreateRoom, onJoinRoom }) => {
    const [view, setView] = useState<'initial' | 'create'>('initial');
    const [newRoomCode, setNewRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setView('initial');
            setNewRoomCode('');
            setJoinCode('');
            setIsCreating(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateClick = async () => {
        setIsCreating(true);
        try {
            const code = await onCreateRoom();
            setNewRoomCode(code);
            setView('create');
        } catch (error) {
            console.error("Failed to create room:", error);
            alert("Could not create a room. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.trim()) {
            onJoinRoom(joinCode.trim());
        }
    };

    const renderInitialView = () => (
        <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                <UsersIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center">Chat Rooms</h3>
            <p className="text-sm text-gray-500 text-center mt-2 mb-6">Create a private room to chat with friends or join an existing one.</p>
            <div className="flex flex-col gap-4">
                <button 
                    onClick={handleCreateClick} 
                    className="w-full px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-sm text-center disabled:bg-indigo-300"
                    disabled={isCreating}
                >
                    {isCreating ? 'Creating...' : 'Create New Room'}
                </button>
                <form onSubmit={handleJoinSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Enter room code"
                        maxLength={5}
                        className="flex-grow p-3 bg-gray-100 rounded-full font-mono text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center"
                    />
                    <button type="submit" className="px-6 py-3 bg-gray-100 text-gray-800 rounded-full font-semibold hover:bg-gray-200 transition-colors duration-200 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!joinCode.trim()}>
                        Join
                    </button>
                </form>
            </div>
        </>
    );
    
    const renderCreateView = () => (
        <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                <UsersIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center">Room Created!</h3>
            <p className="text-sm text-gray-500 text-center mt-2 mb-4">Share this code with your friends to let them join.</p>
            <div className="p-4 bg-gray-100 rounded-lg font-mono text-2xl tracking-widest text-gray-700 text-center mb-4">
                {newRoomCode}
            </div>
            <button onClick={onClose} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-sm">
                Done
            </button>
        </>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} aria-hidden="true"></div>
            <div className="relative w-full max-w-sm m-4 bg-white rounded-2xl shadow-2xl p-8 transform transition-all">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
                    <CloseIcon className="w-5 h-5 text-gray-500" />
                </button>
                {view === 'initial' && renderInitialView()}
                {view === 'create' && renderCreateView()}
            </div>
        </div>
    );
}


// --- Main App Component ---
const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notepadContent, setNotepadContent] = useState('');
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'denied' | 'granted'>('prompt');
  
  // --- Helper Functions ---
  const isRoom = (id: string | null): boolean => id ? id.length === 5 && /^[A-Z0-9]+$/.test(id) : false;

  // Effect to manage user ID
  useEffect(() => {
    let currentUserId = localStorage.getItem('pixel-ai-userId');
    if (!currentUserId) {
      currentUserId = crypto.randomUUID();
      localStorage.setItem('pixel-ai-userId', currentUserId);
    }
    setUserId(currentUserId);
  }, []);

  // Effect to load data from localStorage
  useEffect(() => {
    if (userId) {
      // Load conversations
      const savedConversationsJSON = localStorage.getItem(`pixel-ai-conversations-${userId}`);
      let loadedConversations: Conversation[] = [];
      if (savedConversationsJSON) {
        try {
          const parsed = JSON.parse(savedConversationsJSON);
          // Filter out any room conversations, which will be synced from Firestore
          if (Array.isArray(parsed)) {
            loadedConversations = parsed.filter(c => !isRoom(c.id));
          }
        } catch (e) {
          console.error("Failed to parse conversations from localStorage", e);
        }
      }
      
      if (loadedConversations.length > 0) {
        setConversations(loadedConversations);
        setActiveConversationId(loadedConversations[0].id); // Activate the most recent one
      } else {
        // Create a default new chat if nothing is loaded
        const newConversation: Conversation = { id: Date.now().toString(), title: 'New Chat', messages: [] };
        setConversations([newConversation]);
        setActiveConversationId(newConversation.id);
      }

      // Load notepad content
      const savedNotepadContent = localStorage.getItem(`pixel-ai-notepad-${userId}`);
      if (savedNotepadContent) {
        setNotepadContent(savedNotepadContent);
      }
    }
  }, [userId]);

  // Effect to save conversations (only local ones)
  useEffect(() => {
    if (userId) {
      const localConversations = conversations.filter(c => !isRoom(c.id));
      // This ensures that if all local conversations are deleted, localStorage is updated with an empty array.
      localStorage.setItem(`pixel-ai-conversations-${userId}`, JSON.stringify(localConversations));
    }
  }, [conversations, userId]);
  
  // Effect to save notepad content
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`pixel-ai-notepad-${userId}`, notepadContent);
    }
  }, [notepadContent, userId]);

  // Effect for listening to real-time room messages
  useEffect(() => {
    if (activeConversationId && isRoom(activeConversationId)) {
        const unsubscribe = listenForMessages(activeConversationId, (messages) => {
            setConversations(prev => prev.map(conv =>
                conv.id === activeConversationId
                    ? { ...conv, messages: messages }
                    : conv
            ));
        });
        return () => unsubscribe();
    }
  }, [activeConversationId]);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );
  
  useEffect(() => {
    return () => {
      if (isLiveSessionActive) {
        liveService.stopLiveSession();
      }
    };
  }, [isLiveSessionActive]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!activeConversationId || !userId) return;

    // Room Chat Logic
    if (isRoom(activeConversationId)) {
        setIsLoading(true);
        const userMessage: Omit<Message, 'id'> = {
            role: 'user',
            text: messageText,
            userId: userId,
        };

        try {
            await sendMessage(activeConversationId, userMessage);
            const currentHistory = conversations.find(c => c.id === activeConversationId)?.messages || [];
            
            const stream = streamChat(currentHistory, messageText);
            let modelText = '';
            let modelSources: GroundingSource[] | undefined;

            for await (const chunk of stream) {
                modelText += chunk.text;
                if (chunk.sources) {
                    modelSources = [...(modelSources || []), ...chunk.sources];
                }
            }

            const modelMessage: Omit<Message, 'id'> = {
                role: 'model',
                text: modelText,
                sources: modelSources,
            };
            await sendMessage(activeConversationId, modelMessage);
        } catch (error) {
            console.error("Error sending message to room:", error);
            // Optionally, you could send an error message to the room
        } finally {
            setIsLoading(false);
        }
    } else {
        // Local Chat Logic
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: messageText,
        };

        const updatedConversations = conversations.map(conv =>
            conv.id === activeConversationId
                ? { ...conv, messages: [...conv.messages, userMessage] }
                : conv
        );
        setConversations(updatedConversations);
        setIsLoading(true);
        
        const modelMessageId = (Date.now() + 1).toString();
        
        setConversations(prev => prev.map(conv =>
            conv.id === activeConversationId
                ? { ...conv, messages: [...conv.messages, { id: modelMessageId, role: 'model', text: '' }] }
                : conv
        ));

        try {
            const stream = streamChat(activeConversation?.messages || [], messageText);
            for await (const chunk of stream) {
                setConversations(prev => prev.map(conv => {
                    if (conv.id === activeConversationId) {
                        const lastMessage = conv.messages[conv.messages.length - 1];
                        if (lastMessage && lastMessage.id === modelMessageId) {
                            const updatedMessage = {
                                ...lastMessage,
                                text: lastMessage.text + chunk.text,
                                sources: chunk.sources ? [...(lastMessage.sources || []), ...chunk.sources] : lastMessage.sources
                            };
                            return { ...conv, messages: [...conv.messages.slice(0, -1), updatedMessage] };
                        }
                    }
                    return conv;
                }));
            }
        } catch (error) {
            console.error("Error streaming chat:", error);
            setConversations(prev => prev.map(conv => {
                if (conv.id === activeConversationId) {
                    const lastMessage = conv.messages[conv.messages.length - 1];
                    if (lastMessage && lastMessage.id === modelMessageId) {
                        const errorMessage = { ...lastMessage, text: "Sorry, I encountered an error. Please try again." };
                        return { ...conv, messages: [...conv.messages.slice(0, -1), errorMessage] };
                    }
                }
                return conv;
            }));
        } finally {
            setIsLoading(false);
        }
    }
  }, [activeConversation, conversations, activeConversationId, userId]);
  
  const startLiveSessionFlow = async () => {
    setIsLiveSessionActive(true);
    
    try {
        await liveService.startLiveSession({
            onAudioLevel: setAudioLevel,
            onSessionEnd: () => {
                setIsLiveSessionActive(false);
                setAudioLevel(0);
            },
            onError: (error) => {
                console.error('Live session error:', error);
                setIsLiveSessionActive(false);
                setAudioLevel(0);
                
                let shouldShowModal = false;

                if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
                    setPermissionStatus('denied');
                    shouldShowModal = true;
                }

                if (shouldShowModal) {
                    setIsPermissionModalOpen(true);
                } else {
                  alert("Live session failed. Please check permissions and try again.");
                }
            }
        });
    } catch (error) {
         console.error('Failed to start live session:', error);
         setIsLiveSessionActive(false);
         setAudioLevel(0);
         alert("An unexpected error occurred while starting the live session.");
    }
  }

  const handleToggleLiveSession = async () => {
    if (isLiveSessionActive) {
        liveService.stopLiveSession();
        setIsLiveSessionActive(false);
        setAudioLevel(0);
    } else {
        if (!navigator.permissions?.query) {
            console.warn("Permissions API not supported, proceeding to request access directly.");
            startLiveSessionFlow();
            return;
        }

        try {
            const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setPermissionStatus(status.state);
            
            status.onchange = () => {
                setPermissionStatus(status.state);
            };

            if (status.state === 'granted') {
                startLiveSessionFlow();
            } else {
                setIsPermissionModalOpen(true);
            }
        } catch (e) {
            console.error("Error checking microphone permission:", e);
            startLiveSessionFlow();
        }
    }
  };

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
    };
    setConversations([newConversation, ...conversations]);
    setActiveConversationId(newConversation.id);
  };
  
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    // Prevent deleting rooms from the UI
    if (isRoom(id)) return;

    // First, calculate the next state for the conversation list.
    const nextConversationsList = conversations.filter(c => c.id !== id);

    // Then, determine what the next active conversation and final list should be.
    let finalConversations = nextConversationsList;
    let nextActiveId = activeConversationId;

    // Check if the deleted conversation was the active one.
    if (activeConversationId === id) {
        const remainingLocalChats = nextConversationsList.filter(c => !isRoom(c.id));
        
        if (remainingLocalChats.length === 0) {
            // This was the last local chat. We must create a new one.
            const newConversation = { id: Date.now().toString(), title: 'New Chat', messages: [] };
            const remainingRooms = nextConversationsList.filter(isRoom);
            finalConversations = [...remainingRooms, newConversation];
            nextActiveId = newConversation.id;
        } else {
            // Other chats remain. Activate the first one in the list.
            nextActiveId = nextConversationsList[0].id;
        }
    }
    
    // Finally, apply the new state.
    setConversations(finalConversations);
    setActiveConversationId(nextActiveId);
  };

  const handleCreateRoom = async () => {
    const roomCode = await createRoom();
    const newRoomConversation: Conversation = {
        id: roomCode,
        title: `Room: ${roomCode}`,
        messages: [],
    };
    setConversations(prev => [newRoomConversation, ...prev]);
    setActiveConversationId(roomCode);
    return roomCode;
  };

  const handleJoinRoom = async (roomCode: string) => {
    const code = roomCode.toUpperCase();
    if (!isRoom(code)) {
        alert("Invalid room code format. Must be 5 alphanumeric characters.");
        return;
    }

    const exists = await roomExists(code);
    if (!exists) {
        alert("Room not found!");
        return;
    }

    if (!conversations.some(c => c.id === code)) {
        const newRoomConversation: Conversation = {
            id: code,
            title: `Room: ${code}`,
            messages: [],
        };
        setConversations(prev => [newRoomConversation, ...prev]);
    }
    setActiveConversationId(code);
    setIsRoomModalOpen(false);
  };

  return (
    <div className="relative h-screen overflow-hidden font-sans font-medium text-gray-800 bg-slate-50 md:flex md:p-4 md:gap-4">
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 z-10 bg-black bg-opacity-30 md:hidden"
          aria-hidden="true"
        />
      )}
      <Sidebar 
        conversations={conversations}
        activeConversationId={activeConversationId || ''}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onNotepadOpen={() => setIsNotepadOpen(true)}
        onRoomModalOpen={() => setIsRoomModalOpen(true)}
      />
      {activeConversation && (
        <ChatView
          conversation={activeConversation}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onToggleLiveSession={handleToggleLiveSession}
        />
      )}
      <Notepad 
        isOpen={isNotepadOpen}
        onClose={() => setIsNotepadOpen(false)}
        content={notepadContent}
        onContentChange={setNotepadContent}
      />
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onGrant={startLiveSessionFlow}
        status={permissionStatus === 'denied' ? 'denied' : 'prompt'}
      />
      <LiveView 
        isOpen={isLiveSessionActive} 
        onClose={handleToggleLiveSession} 
        audioLevel={audioLevel}
      />
    </div>
  );
};

export default App;
