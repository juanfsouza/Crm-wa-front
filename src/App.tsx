import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ContactList } from './components/ContactList';
import { ChatWindow } from './components/ChatWindow';
import { CrmBoard } from './components/CrmBoard';
import { Navbar } from './components/Navbar';
import { useState } from 'react';

interface Contact {
  id: string;
  name: string;
  number: string;
  photo: string | null;
}

export default function App() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeView, setActiveView] = useState<'kanban' | 'contacts'>('kanban');

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen">
        {/* Usando o componente Navbar */}
        <Navbar activeView={activeView} setActiveView={setActiveView} />

        {/* Conteúdo Principal */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === 'kanban' && (
            <div className="w-full">
              <CrmBoard />
            </div>
          )}
          {activeView === 'contacts' && (
            <>
              <div className="w-1/3 flex-shrink-0">
                <ContactList onSelectContact={setSelectedContact} />
              </div>
              {selectedContact ? (
                <div className="w-2/3 flex-shrink-0">
                  <ChatWindow contact={selectedContact} />
                </div>
              ) : (
                <div className="w-2/3 flex items-center justify-center bg-gray-100">
                  <p className="text-gray-500">Selecione um contato para iniciar o chat</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DndProvider>
  );
}