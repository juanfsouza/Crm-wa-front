import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Loading } from './ui/Loading';
import { Skeleton } from './ui/Skeleton';
import { FaChevronDown } from 'react-icons/fa';

interface Contact {
  id: string;
  name: string;
  number: string;
  photo: string | null;
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
      console.log('hasMore após fetch:', response.data.hasMore);
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

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContacts(nextPage);
  };

  const handleImageError = (contactId: string) => {
    console.log(`Falha ao carregar imagem para o contato ${contactId}`);
    setFailedImages((prev) => {
      if (!prev.includes(contactId)) {
        return [...prev, contactId];
      }
      return prev;
    });
  };

  if (error && contacts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4"
      >
        <Alert type="error">{error}</Alert>
      </motion.div>
    );
  }

  if (contacts.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4"
      >
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
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center p-3 bg-white rounded-xl shadow-sm"
              >
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
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    className="flex items-center m-4 p-2 bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow duration-300"
                    onClick={() => onSelectContact(contact)}
                  >
                    {/* Foto ou Placeholder */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden mr-4 flex-shrink-0">
                      {contact.photo && !failedImages.includes(contact.id) ? (
                        <img
                          src={contact.photo}
                          alt={contact.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(contact.id)}
                          onLoad={() => console.log(`Imagem carregada para ${contact.id}`)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold bg-gradient-to-r from-purple-500 to-purple-700">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Informações do Contato */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-800 truncate">{contact.name || contact.number}</p>
                      <p className="text-sm text-gray-500 truncate">{contact.number}</p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* Botão "Ver mais" fora da lista */}
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
                      className={`px-6 py-2 rounded-full text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Skeleton removido para "Ver mais" - apenas para carregamento inicial */}
      <AnimatePresence>
        {loading && contacts.length === 0 && page === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 mt-3"
          >
            {[...Array(3)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center p-3 bg-white rounded-xl shadow-sm"
              >
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem quando não há mais contatos */}
      <AnimatePresence>
        {!hasMore && contacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="mt-6 text-center"
          >
            <Alert type="info" className="inline-block">
              Todos os contatos foram carregados.
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};