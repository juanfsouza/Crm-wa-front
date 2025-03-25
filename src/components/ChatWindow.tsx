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
}

interface Contact {
  id: string;
  name: string;
  number: string;
  photo: string | null;
}

export const ChatWindow = ({ contact }: { contact: Contact }) => {
  const [messagesByContact, setMessagesByContact] = useState<{ [contactId: string]: Message[] }>({});
  const [input, setInput] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtém as mensagens do contato atual
  const messages = messagesByContact[contact.id] || [];

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get(`/whatsapp/messages/${contact.id}`, {
          params: { limit: 50 },
        });
        const messagesWithStatus = (response.data.messages || []).map((msg: Message) => ({
          ...msg,
          senderId: msg.senderId === contact.number ? contact.id : msg.senderId,
          status: 'seen',
        }));
        console.log('Mensagens carregadas para o contato', contact.id, ':', messagesWithStatus);
        setMessagesByContact((prev) => ({
          ...prev,
          [contact.id]: messagesWithStatus,
        }));
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        setMessagesByContact((prev) => ({
          ...prev,
          [contact.id]: [],
        }));
      }
    };

    // Carrega as mensagens apenas se ainda não foram carregadas para este contato
    if (!messagesByContact[contact.id]) {
      fetchMessages();
    }

    if (socket) {
      socket.on('newMessage', (msg: Message) => {
        console.log('Nova mensagem recebida:', msg);

        // Determina o contato da mensagem
        const messageContactId = msg.senderId === 'me' ? msg.to : msg.senderId;

        // Verifica se a mensagem pertence ao contato atual
        if (messageContactId === contact.id || messageContactId === contact.number) {
          setMessagesByContact((prev) => {
            const currentMessages = prev[contact.id] || [];
            // Verifica se a mensagem já existe no estado (evita duplicatas)
            if (currentMessages.some((m) => m.id === msg.id)) {
              return prev;
            }

            // Verifica se existe uma mensagem temporária com o mesmo conteúdo e senderId
            const tempMessageIndex = currentMessages.findIndex(
              (m) => m.id.startsWith('temp-') && m.content === msg.content && m.senderId === 'me',
            );
            if (tempMessageIndex !== -1) {
              // Substitui a mensagem temporária pela mensagem real
              const updatedMessages = [...currentMessages];
              updatedMessages[tempMessageIndex] = {
                ...msg,
                senderId: msg.senderId === 'me' ? 'me' : contact.id,
                status: msg.senderId === 'me' ? 'delivered' : 'seen',
              };
              return {
                ...prev,
                [contact.id]: updatedMessages,
              };
            }

            // Adiciona a nova mensagem
            return {
              ...prev,
              [contact.id]: [
                ...currentMessages,
                {
                  ...msg,
                  senderId: msg.senderId === 'me' ? 'me' : contact.id,
                  status: msg.senderId === 'me' ? 'delivered' : 'seen',
                },
              ],
            };
          });
        }
      });

      socket.on('messageDeleted', (data: { messageId: string; to: string }) => {
        if (data.to === contact.number) {
          setMessagesByContact((prev) => ({
            ...prev,
            [contact.id]: (prev[contact.id] || []).filter((msg) => msg.id !== data.messageId),
          }));
        }
      });

      socket.on('messageEdited', (data: { messageId: string; to: string; content: string; createdAt: string }) => {
        console.log('Mensagem editada recebida:', data);
        if (data.to === contact.number) {
          setMessagesByContact((prev) => ({
            ...prev,
            [contact.id]: (prev[contact.id] || []).map((msg) =>
              msg.id === data.messageId ? { ...msg, content: data.content, createdAt: data.createdAt } : msg,
            ),
          }));
        }
      });

      return () => {
        socket.off('newMessage');
        socket.off('messageDeleted');
        socket.off('messageEdited');
      };
    }
  }, [socket, contact.id, contact.number]);

  useEffect(() => {
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

        // Atualiza localmente enquanto o backend processa
        setMessagesByContact((prev) => ({
          ...prev,
          [contact.id]: (prev[contact.id] || []).map((msg) =>
            msg.id === editingMessage.id
              ? { ...msg, content: input, createdAt: new Date().toISOString() }
              : msg,
          ),
        }));

        api.put(`/whatsapp/messages/${editingMessage.id}`, {
          to: contact.number,
          newContent: input,
        }).catch((error) => console.error('Erro ao editar mensagem:', error));

        setEditingMessage(null);
      } else {
        const message = {
          to: contact.number,
          content: input,
        };
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          content: input,
          senderId: 'me',
          createdAt: new Date().toISOString(),
          status: 'delivered',
          to: undefined
        };
        setMessagesByContact((prev) => {
          const currentMessages = prev[contact.id] || [];
          // Verifica se a mensagem temporária já existe (evita duplicatas)
          if (currentMessages.some((m) => m.id === tempMessage.id)) {
            return prev;
          }
          return {
            ...prev,
            [contact.id]: [...currentMessages, tempMessage],
          };
        });
        socket.emit('sendMessage', message);
      }
      setInput('');
    }
  };

  const deleteMessage = (messageId: string) => {
    if (socket) {
      socket.emit('deleteMessage', { messageId, to: contact.number });
      api.delete(`/whatsapp/messages/${messageId}`, {
        params: { to: contact.number },
      }).catch((error) => console.error('Erro ao deletar mensagem:', error));
    }
  };

  const editMessage = (msg: Message) => {
    if (msg.senderId === 'me') {
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
      {/* Cabeçalho do Chat */}
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

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto pt-20 p-4 bg-gray-900">
        <AnimatePresence>
          {messages.map((msg) => {
            console.log('Renderizando mensagem:', msg);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start mb-6 self-right ${
                  msg.senderId === 'me' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Avatar à esquerda para mensagens do contato */}
                {msg.senderId !== 'me' && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0">
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

                {/* Container da mensagem e dropdown */}
                <div className="flex bg-purple-600 rounded-xl max-w-[70%] mt-5 ml-2 pt-2 m-2">
                  {/* Mensagem */}
                  <div
                    className={`fly-chat-bubble px-3 pb-2 ${
                      msg.senderId === 'me'
                        ? 'fly-chat-bubble-right fly-chat-bubble-primary rounded-tl-xl'
                        : 'fly-chat-bubble-left fly-chat-bubble-secondary rounded-tr-xl'
                    } rounded-b-xl rounded-tl-xl max-w-[70%]`}
                  >
                    {/* Dropdown (apenas para mensagens enviadas por "me") */}
                    {msg.senderId === 'me' && (
                      <div className="relative flex items-end ml-20">
                        <button
                          onClick={() => toggleDropdown(msg.id)}
                          className={`p-1 text-gray-300 hover:text-white transition-colors duration-200 ${
                            openDropdown === msg.id ? 'fly-dropdown-open' : ''
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            {openDropdown === msg.id ? (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                              />
                            ) : (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            )}
                          </svg>
                        </button>
                        {openDropdown === msg.id && (
                          <div className="fly-dropdown fly-dropdown-bottom fly-dropdown-end absolute right-0 top-2 z-10">
                            <ul className="fly-menu bg-purple-700 shadow-lg rounded-lg">
                              <li>
                                <button
                                  onClick={() => {
                                    editMessage(msg);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center space-x-2 text-gray-200 hover:bg-purple-600 transition-colors duration-200 px-5 py-2 rounded-t-md"
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
                                  className="flex items-center space-x-2 text-gray-200 hover:bg-red-600 transition-colors duration-200 px-4 py-2 rounded-b-md"
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

                    <div className="fly-chat-bubble-content flex items-center justify-between mb-2">
                      <span className="text-sm text-white">{msg.content}</span>
                    </div>
                    <div className="fly-chat-bubble-meta flex items-center gap-1">
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.senderId === 'me' && msg.status && (
                        <span className="text-xs text-gray-400 flex items-center">
                          {msg.status === 'delivered' ? 'Delivered' : 'Seen'}
                          {msg.status === 'seen' && (
                            <svg
                              className="h-3 w-3 text-green-500 ml-1"
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
                  </div>
                </div>

                {/* Avatar à direita para mensagens enviadas por "me" */}
                {msg.senderId === 'me' && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0">
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
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div className="pb-10 p-10 pt-5 bg-gray-800 border-t border-gray-700 flex items-center shadow-lg">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 p-2 border border-purple-500 rounded-l-lg resize-none h-12 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
          placeholder={editingMessage ? 'Editando mensagem...' : 'Digite sua mensagem...'}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendMessage}
          className="p-3 bg-purple-500 text-white rounded-r-lg hover:bg-purple-600 transition-all duration-200 ml-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};