import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketIo = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketIo.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO');
    });

    socketIo.on('connect_error', (err) => {
      console.error('Erro de conexão Socket.IO:', err.message);
    });

    socketIo.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  return socket;
};