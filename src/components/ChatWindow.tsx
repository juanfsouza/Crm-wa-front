import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

interface Message {
  to: any;
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  status?: 'delivered' | 'seen';
  isAudio?: boolean;
  mediaUrl?: string;
}

interface Contact {
  id: string;
  name: string;
  number: string;
  photo: string | null;
}

export const ChatWindow = ({ contact }: { contact: Contact }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Função para determinar se a mensagem é do usuário
  const isMyMessage = (senderId: string) => {
    return senderId === 'me' || senderId.startsWith('5512');
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log('Iniciando busca de mensagens para contactId:', contact.id);
        const response = await api.get(`/whatsapp/messages/${contact.id}`, {
          params: { limit: 50 },
        });
        console.log('Resposta completa da API:', response.data);
        const messagesArray = Array.isArray(response.data.messages)
          ? response.data.messages
          : response.data.messages?.messages || [];
        const messagesWithStatus = messagesArray.map((msg: Message) => ({
          ...msg,
          senderId: msg.senderId === contact.number ? contact.id : msg.senderId,
          status: 'seen' as const,
        }));
        console.log('Mensagens processadas:', messagesWithStatus);
        setMessages(messagesWithStatus);
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [contact.id]);

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (msg: Message) => {
        console.log('Nova mensagem recebida via WebSocket:', msg);
        const messageContactId = msg.senderId === 'me' ? msg.to : msg.senderId;

        if (messageContactId === contact.id || messageContactId === contact.number) {
          setMessages((prev: Message[]) => {
            if (prev.some((m) => m.id === msg.id)) {
              console.log('Mensagem duplicada ignorada:', msg.id);
              return prev;
            }
            const newMessage: Message = {
              ...msg,
              senderId: msg.senderId === 'me' ? 'me' : contact.id,
              status: msg.senderId === 'me' ? 'delivered' : 'seen',
            };
            console.log('Adicionando nova mensagem:', newMessage);
            return [...prev, newMessage];
          });
        }
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket, contact.id, contact.number]);

  useEffect(() => {
    console.log('Estado atual de messages:', messages);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (socket && input.trim()) {
      if (editingMessage) {
        socket.emit('editMessage', {
          messageId: editingMessage.id,
          to: contact.number,
          newContent: input,
        });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessage.id
              ? { ...msg, content: input, createdAt: new Date().toISOString() }
              : msg,
          ),
        );
        api.put(`/whatsapp/messages/${editingMessage.id}`, {
          to: contact.number,
          newContent: input,
        }).catch((error) => console.error('Erro ao editar mensagem:', error));
        setEditingMessage(null);
      } else {
        const message = { to: contact.number, content: input };
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          content: input,
          senderId: 'me',
          createdAt: new Date().toISOString(),
          status: 'delivered',
          to: undefined,
        };
        setMessages((prev) => [...prev, tempMessage]);
        socket.emit('sendMessage', message);
      }
      setInput('');
    }
  };

  const deleteMessage = (messageId: string) => {
    if (socket) {
      socket.emit('deleteMessage', { messageId, to: contact.number });
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      api.delete(`/whatsapp/messages/${messageId}`, {
        params: { to: contact.number },
      }).catch((error) => console.error('Erro ao deletar mensagem:', error));
    }
  };

  const editMessage = (msg: Message) => {
    if (isMyMessage(msg.senderId)) {
      setInput(msg.content);
      setEditingMessage(msg);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleDropdown = (messageId: string) => {
    setOpenDropdown((prev) => (prev === messageId ? null : messageId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
      className="w-full md:w-2/3 flex flex-col h-screen bg-gray-900"
    >
      <div className="flex items-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md sticky top-0 z-10">
        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden mr-4 flex-shrink-0">
          {contact.photo && !imageFailed ? (
            <img
              src={contact.photo}
              alt={contact.name}
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold bg-purple-700">
              {contact.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-lg font-semibold truncate">{contact.name || contact.number}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        <AnimatePresence>
          {messages.length > 0 ? (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex mb-4 ${isMyMessage(msg.senderId) ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-start max-w-[70%]">
                  {!isMyMessage(msg.senderId) && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 mr-2">
                      {contact.photo && !imageFailed ? (
                        <img
                          src={contact.photo}
                          alt={contact.name}
                          className="w-full h-full object-cover rounded-full"
                          onError={() => setImageFailed(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold bg-purple-700 rounded-full">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-lg ${
                      isMyMessage(msg.senderId)
                        ? 'bg-purple-500 text-white rounded-bl-xl'
                        : 'bg-gray-700 text-white rounded-br-xl'
                    }`}
                  >
                    {msg.isAudio && msg.mediaUrl ? (
                      <audio controls src={msg.mediaUrl} className="max-w-full">
                        Seu navegador não suporta áudio.
                      </audio>
                    ) : (
                      <span className="text-sm">{msg.content}</span>
                    )}
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-300">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMyMessage(msg.senderId) && msg.status && (
                        <span className="ml-2">
                          {msg.status === 'delivered' ? 'Delivered' : 'Seen'}
                          {msg.status === 'seen' && (
                            <svg
                              className="h-3 w-3 text-green-500 inline ml-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                    {isMyMessage(msg.senderId) && (
                      <div className="relative">
                        <button
                          onClick={() => toggleDropdown(msg.id)}
                          className="p-1 text-gray-300 hover:text-white absolute -top-2 -right-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            {openDropdown === msg.id ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )}
                          </svg>
                        </button>
                        {openDropdown === msg.id && (
                          <div className="absolute right-0 mt-2 z-10">
                            <ul className="bg-purple-700 shadow-lg rounded-lg">
                              <li>
                                <button
                                  onClick={() => {
                                    editMessage(msg);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 text-gray-200 hover:bg-purple-600 px-5 py-2 rounded-t-md"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
                                    />
                                  </svg>
                                  <span>Editar</span>
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => {
                                    deleteMessage(msg.id);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 text-gray-200 hover:bg-red-600 px-4 py-2 rounded-b-md"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  <span>Excluir</span>
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isMyMessage(msg.senderId) && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 ml-2">
                      {contact.photo && !imageFailed ? (
                        <img
                          src={contact.photo}
                          alt="Me"
                          className="w-full h-full object-cover rounded-full"
                          onError={() => setImageFailed(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold bg-purple-700 rounded-full">
                          M
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-gray-400 text-center">Nenhuma mensagem carregada ainda.</div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700 flex items-center shadow-lg">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 p-2 border border-purple-500 rounded-l-lg resize-none h-12 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder={editingMessage ? 'Editando mensagem...' : 'Digite sua mensagem...'}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendMessage}
          className="p-3 bg-purple-500 text-white rounded-r-lg hover:bg-purple-600 ml-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};