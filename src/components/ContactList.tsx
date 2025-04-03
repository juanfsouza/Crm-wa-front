import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Loading } from './ui/Loading';
import { Skeleton } from './ui/Skeleton';
import { FaChevronDown } from 'react-icons/fa';
import { useSocket } from '../hooks/useSocket';

interface Contact {
  id: string;
  name: string;
  number: string;
  photo: string | null;
  lastMessageTime?: number; // Adiciona a propriedade opcional
}

interface ContactListProps {
  onSelectContact: (contact: Contact) => void;
}

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const formatPhoneNumber = (number: string): string => {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length === 12) {
    const ddd = cleaned.slice(2, 4);
    const firstPart = cleaned.slice(4, 9);
    const secondPart = cleaned.slice(9, 12);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }
  return number;
};

export const ContactList = ({ onSelectContact }: ContactListProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const socket = useSocket();
  const limit = 50;

  const fetchContacts = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await api.get<ContactsResponse>('/whatsapp/contacts', {
        params: { page: pageNum, limit },
      });
      const newContacts = response.data.contacts.map((contact) => ({
        ...contact,
        number: formatPhoneNumber(contact.number),
        photo: contact.photo ? `http://localhost:3000${contact.photo}` : null,
      }));
      setContacts((prev) => (pageNum === 1 ? newContacts : [...prev, ...newContacts]));
      setHasMore(response.data.hasMore);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      setError('Erro ao carregar contatos. Verifique se o WhatsApp está conectado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(1);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (msg: any) => {
        console.log('Nova mensagem recebida:', msg);
        const messageContactId = msg.senderId === 'me' ? msg.to : msg.senderId;

        setContacts((prevContacts) => {
          const updatedContacts = prevContacts.map((contact) => {
            if (contact.id === messageContactId) {
              return {
                ...contact,
                lastMessageTime: new Date(msg.createdAt).getTime(),
              };
            }
            return contact;
          });
          // Reordena os contatos com base na última mensagem
          return [...updatedContacts].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        });
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContacts(nextPage);
  };

  const handleImageError = (contactId: string) => {
    setFailedImages((prev) => (!prev.includes(contactId) ? [...prev, contactId] : prev));
  };

  if (error && contacts.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
        <Alert type="error">{error}</Alert>
      </motion.div>
    );
  }

  if (contacts.length === 0 && !loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
        <Alert type="info">Nenhum contato encontrado.</Alert>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-gradient-to-b from-zinc-200 to-zinc-200 h-screen flex flex-col py-20">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl font-bold mb-6 text-purple-600"
      >
        Contatos
      </motion.h2>
      <div className="flex-1 overflow-y-auto">
        {loading && contacts.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 }}>
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              <AnimatePresence>
                {contacts.map((contact, index) => (
                  <motion.li
                    key={contact.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center m-4 p-2 bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer"
                    onClick={() => onSelectContact(contact)}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden mr-4 flex-shrink-0">
                      {contact.photo && !failedImages.includes(contact.id) ? (
                        <img
                          src={contact.photo}
                          alt={contact.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(contact.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold bg-gradient-to-r from-purple-500 to-purple-700">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-800 truncate">{contact.name || contact.number}</p>
                      <p className="text-sm text-gray-500 truncate">{contact.number}</p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <AnimatePresence>
              {hasMore && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 flex justify-center"
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleLoadMore}
                      disabled={loading}
                      variant="primary"
                      size="sm"
                      className={`px-6 py-2 rounded-full text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <Loading type="spinner" size="sm" className="mr-2" />
                          Carregando...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          Ver mais
                          <FaChevronDown className="ml-2" />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};