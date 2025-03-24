import { useEffect, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import api from '../services/api';

interface CrmCard {
  id: number;
  title: string;
  status: 'TODO' | 'DOING' | 'DONE';
  contactId: string;
}

const ItemType = 'CARD';

const Card = ({ card }: { card: CrmCard }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: card.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`p-2 bg-white mb-2 shadow ${isDragging ? 'opacity-50' : ''}`}
    >
      {card.title}
    </div>
  );
};

const Column = ({
  status,
  cards,
  moveCard,
}: {
  status: string;
  cards: CrmCard[];
  moveCard: (id: number, status: string) => void;
}) => {
  const [, drop] = useDrop({
    accept: ItemType,
    drop: (item: { id: number }) => moveCard(item.id, status),
  });

  return (
    <div ref={drop} className="w-1/3 p-4 bg-gray-200">
      <h3 className="text-lg font-bold mb-2">{status}</h3>
      {cards.map((card) => (
        <Card key={card.id} card={card} />
      ))}
    </div>
  );
};

export const CrmBoard = () => {
  const [cards, setCards] = useState<CrmCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await api.get('/crm/cards');
        setCards(response.data);
      } catch (err: any) {
        console.error('Erro ao buscar cards:', err);
        setError('Falha ao carregar os cards. Verifique sua autenticação.');
      }
    };
    fetchCards();
  }, []);

  const moveCard = async (id: number, status: string) => {
    try {
      await api.put(`/crm/cards/${id}`, { status });
      setCards((prev) =>
        prev.map((card) =>
          card.id === id ? { ...card, status: status as 'TODO' | 'DOING' | 'DONE' } : card
        )
      );
    } catch (err) {
      console.error('Erro ao mover card:', err);
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const todoCards = cards.filter((card) => card.status === 'TODO');
  const doingCards = cards.filter((card) => card.status === 'DOING');
  const doneCards = cards.filter((card) => card.status === 'DONE');

  return (
    <div className="flex w-full p-4">
      <Column status="TODO" cards={todoCards} moveCard={moveCard} />
      <Column status="DOING" cards={doingCards} moveCard={moveCard} />
      <Column status="DONE" cards={doneCards} moveCard={moveCard} />
    </div>
  );
};