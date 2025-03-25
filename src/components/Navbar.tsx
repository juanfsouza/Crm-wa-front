import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showAlert, setShowAlert] = useState(false);
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
      setIsChecking(false);
      setShowAlert(false);
    });

    socket.on('whatsappReady', () => {
      console.log('WhatsApp conectado, fechando modal');
      setIsModalOpen(false);
      setQrCode(null);
      setIsConnected(true);
      setIsChecking(false);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    });

    socket.on('whatsappDisconnected', () => {
      console.log('WhatsApp desconectado');
      setIsConnected(false);
      setIsChecking(false);
      setShowAlert(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Erro de conexão Socket.IO:', err.message);
      setIsChecking(false);
    });

    return () => {
      socket.off('qrCode');
      socket.off('whatsappReady');
      socket.off('whatsappDisconnected');
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [socket]);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      setIsChecking(true);
      try {
        const response = await api.get('/whatsapp/status');
        console.log('Estado de conexão:', response.data);
        setIsConnected(response.data.isConnected);
        if (response.data.isConnected) {
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 3000);
        }
      } catch (error) {
        console.error('Erro ao verificar estado de conexão:', error);
        setIsConnected(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkConnectionStatus();
  }, []);

  const handleGenerateQrCode = async () => {
    setIsChecking(true);
    try {
      console.log('Clicou em Gerar QR Code, enviando requisição...');
      setQrCode(null);
      setIsModalOpen(false);
      const response = await api.post('/whatsapp/regenerate-qr');
      console.log('Resposta do backend:', response.data);
    } catch (error) {
      console.error('Erro ao solicitar QR Code:', error);
      setIsChecking(false);
    }
  };

  const handleDisconnect = async () => {
    setIsChecking(true);
    try {
      console.log('Clicou em Desconectar, enviando requisição...');
      const response = await api.post('/whatsapp/disconnect');
      console.log('Resposta do backend:', response.data);
      setIsConnected(false);
      setIsChecking(false);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      setIsChecking(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setQrCode(null);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50"
      >
        <div className="flex space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView('kanban')}
            className={`btn px-5 py-2 rounded-full font-medium text-sm uppercase tracking-wide transition-colors duration-300 ${
              activeView === 'kanban'
                ? 'btn btn-gradient btn-primary text-white shadow-md'
                : 'btn btn-gradient text-gray-300 hover:bg-zinc-600'
            }`}
          >
            Kanban
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView('contacts')}
            className={`btn px-5 py-2 rounded-full font-medium text-sm uppercase tracking-wide transition-colors duration-300 ${
              activeView === 'contacts'
                ? 'btn btn-gradient btn-primary text-white shadow-md'
                : 'btn btn-gradient text-gray-300 hover:bg-zinc-600'
            }`}
          >
            Contatos
          </motion.button>
        </div>
        <div className="flex space-x-4 items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isConnected ? handleDisconnect : handleGenerateQrCode}
            disabled={isChecking}
            className={`btn px-5 py-2 rounded-full font-medium text-sm uppercase tracking-wide text-white shadow-md transition-all duration-300 ${
              isChecking
                ? 'btn btn-gradient btn-warning cursor-not-allowed opacity-60 animate-pulse'
                : isConnected
                ? 'btn btn-gradient btn-error hover:from-red-700 hover:to-red-600'
                : 'btn btn-gradient btn-success hover:from-green-700 hover:to-green-600'
            }`}
          >
            {isChecking ? 'Analisando...' : isConnected ? 'Desconectar' : 'Conectar'}
          </motion.button>
        </div>
      </motion.nav>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Conectar WhatsApp</h2>
              <QRCodeDisplay qrCodeData={qrCode} onReady={handleCloseModal} />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCloseModal}
                className="mt-4 btn bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-5 py-2 rounded-full font-medium uppercase tracking-wide shadow-md transition-all duration-300"
              >
                Fechar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-3 rounded-lg shadow-lg flex items-center space-x-2">
              <span className="text-sm font-medium">WhatsApp conectado com sucesso!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};