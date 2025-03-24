import { useState, useEffect } from 'react';
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
      <div className="p-4">
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  if (contacts.length === 0 && !loading) {
    return (
      <div className="p-4">
        <Alert type="info">Nenhum contato encontrado.</Alert>
      </div>
    );
  }

  return (
    <div className="w-2/3 p-4 bg-zinc-200 h-screen flex flex-col py-20">
      <h2 className="text-lg font-bold mb-4 text-orange-600">Contatos</h2>
      <div className="flex-1 overflow-y-auto">
        {loading && contacts.length === 0 ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center p-2">
                <Skeleton className="w-10 h-10 rounded-full mr-3" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul>
            {contacts.map((contact, index) => (
              <li
                key={contact.id}
                className="flex items-center p-2 hover:bg-gray-200 cursor-pointer rounded-lg transition"
                onClick={() => onSelectContact(contact)}
              >
                {/* Foto ou Placeholder */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden mr-3">
                  {contact.photo && !failedImages.includes(contact.id) ? (
                    <img
                      src={contact.photo}
                      alt={contact.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(contact.id)}
                      onLoad={() => console.log(`Imagem carregada com sucesso para o contato ${contact.id}`)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold bg-orange-500">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Informações do Contato */}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{contact.name || contact.number}</p>
                  <p className="text-xs text-gray-500">{contact.number}</p>
                </div>

                {/* Botão "Ver mais" com ícone de seta para baixo */}
                {hasMore && index === contacts.length - 1 && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadMore();
                    }}
                    disabled={loading}
                    variant="primary"
                    size="sm"
                    className={loading ? 'opacity-50 cursor-not-allowed ml-2' : 'ml-2'}
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
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Exibir skeleton adicional enquanto carrega mais contatos */}
      {loading && contacts.length > 0 && (
        <div className="space-y-2 mt-2">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center p-2">
              <Skeleton className="w-10 h-10 rounded-full mr-3" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mensagem quando não há mais contatos */}
      {!hasMore && contacts.length > 0 && (
        <div className="mt-4 text-center">
          <Alert type="info" className="inline-block">
            Todos os contatos foram carregados.
          </Alert>
        </div>
      )}
    </div>
  );
};