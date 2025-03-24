import { useState, useEffect } from 'react';
import { QRCodeDisplay } from './QRCodeDisplay';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface NavbarProps {
  activeView: 'kanban' | 'contacts';
  setActiveView: (view: 'kanban' | 'contacts') => void;
}

export const Navbar = ({ activeView, setActiveView }: NavbarProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) {
      console.log('Socket não inicializado ainda');
      return;
    }

    console.log('Configurando listeners do Socket.IO');
    socket.on('connect', () => {
      console.log('Socket.IO conectado');
    });

    socket.on('qrCode', (qr: string) => {
      console.log('QR Code recebido no Navbar:', qr);
      setQrCode(qr);
      setIsModalOpen(true);
      setIsConnected(false);
      setIsChecking(false); // Finaliza o estado "Analisando" quando o QR Code é recebido
    });

    socket.on('whatsappReady', () => {
      console.log('WhatsApp conectado, fechando modal');
      setIsModalOpen(false);
      setQrCode(null);
      setIsConnected(true);
      setIsChecking(false); // Finaliza o estado "Analisando"
    });

    socket.on('whatsappDisconnected', () => {
      console.log('WhatsApp desconectado');
      setIsConnected(false);
      setIsChecking(false); // Finaliza o estado "Analisando"
    });

    socket.on('connect_error', (err) => {
      console.error('Erro de conexão Socket.IO:', err.message);
      setIsChecking(false); // Finaliza o estado "Analisando" em caso de erro
    });

    return () => {
      socket.off('qrCode');
      socket.off('whatsappReady');
      socket.off('whatsappDisconnected');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [socket]);

  // Verificar o estado de conexão ao carregar a página
  useEffect(() => {
    const checkConnectionStatus = async () => {
      setIsChecking(true); // Inicia o estado "Analisando"
      try {
        const response = await api.get('/whatsapp/status');
        console.log('Estado de conexão:', response.data);
        setIsConnected(response.data.isConnected);
      } catch (error) {
        console.error('Erro ao verificar estado de conexão:', error);
        setIsConnected(false);
      } finally {
        setIsChecking(false); // Finaliza o estado "Analisando"
      }
    };

    checkConnectionStatus();
  }, []);

  const handleGenerateQrCode = async () => {
    setIsChecking(true); // Inicia o estado "Analisando"
    try {
      console.log('Clicou em Gerar QR Code, enviando requisição...');
      setQrCode(null);
      setIsModalOpen(false);
      const response = await api.post('/whatsapp/regenerate-qr');
      console.log('Resposta do backend:', response.data);
      // O estado "Analisando" será finalizado pelos eventos do Socket.IO
    } catch (error) {
      console.error('Erro ao solicitar QR Code:', error);
      setIsChecking(false); // Finaliza o estado "Analisando" em caso de erro
    }
  };

  const handleDisconnect = async () => {
    setIsChecking(true); // Inicia o estado "Analisando"
    try {
      console.log('Clicou em Desconectar, enviando requisição...');
      const response = await api.post('/whatsapp/disconnect');
      console.log('Resposta do backend:', response.data);
      setIsConnected(false);
      setIsChecking(false); // Finaliza o estado "Analisando"
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      setIsChecking(false); // Finaliza o estado "Analisando" em caso de erro
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setQrCode(null);
  };

  return (
    <>
      <nav className="bg-zinc-800 text-white p-4 flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveView('kanban')}
            className={`px-4 py-2 rounded ${
              activeView === 'kanban' ? 'bg-orange-500' : 'bg-gray-600'
            } hover:bg-orange-600 transition`}
          >
            Kanban
          </button>
          <button
            onClick={() => setActiveView('contacts')}
            className={`px-4 py-2 rounded ${
              activeView === 'contacts' ? 'bg-orange-500' : 'bg-gray-600'
            } hover:bg-orange-600 transition`}
          >
            Contatos
          </button>
        </div>
        <div className="flex space-x-4 items-center">
          <button
            onClick={isConnected ? handleDisconnect : handleGenerateQrCode}
            disabled={isChecking}
            className={`px-4 py-2 rounded transition ${
              isChecking
                ? 'bg-yellow-500 cursor-not-allowed'
                : isConnected
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isChecking
              ? 'Analisando...'
              : isConnected
              ? 'Desconectar'
              : 'Conectar'}
          </button>
        </div>
      </nav>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-4">Conectar WhatsApp</h2>
            <QRCodeDisplay qrCodeData={qrCode} onReady={handleCloseModal} />
            <button
              onClick={handleCloseModal}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};