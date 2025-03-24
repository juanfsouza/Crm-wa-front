import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
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
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });
    }
  }, [socket]);

  const sendMessage = () => {
    if (socket && input) {
      socket.emit('sendMessage', { to: contact.number, content: input });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: input,
          senderId: 'me',
          createdAt: new Date().toISOString(),
        },
      ]);
      setInput('');
    }
  };

  return (
    <div className="w-2/4 p-4 flex flex-col h-screen">
      {/* Cabeçalho do Chat */}
      <div className="flex items-center p-4 bg-gray-200 rounded-t-lg">
        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden mr-3">
          {contact.photo && !imageFailed ? (
            <img
              src={contact.photo}
              alt={contact.name}
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold bg-blue-500">
              {contact.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold">{contact.name || contact.number}</h2>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-2 p-2 rounded-lg ${
              msg.senderId === 'me' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
            } max-w-xs`}
          >
            <span>{msg.content}</span>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      {/* Input de Mensagem */}
      <div className="mt-4 flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 border rounded-l-lg"
          placeholder="Digite sua mensagem..."
        />
        <button
          onClick={sendMessage}
          className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};