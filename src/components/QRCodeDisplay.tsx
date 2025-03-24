import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeDisplayProps {
  qrCodeData?: string | null;
  onReady?: () => void;
}

export const QRCodeDisplay = ({ qrCodeData, onReady }: QRCodeDisplayProps = {}) => {
  const [qrCode, setQrCode] = useState<string | null>(qrCodeData || null);
  const [isReady, setIsReady] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('qrCode', (qr: string) => {
        console.log('QR Code recebido no frontend:', qr);
        setQrCode(qr);
        setIsReady(false);
      });
      socket.on('whatsappReady', () => {
        console.log('WhatsApp conectado!');
        setIsReady(true);
        setQrCode(null);
        if (onReady) onReady();
      });
    }

    return () => {
      if (socket) {
        socket.off('qrCode');
        socket.off('whatsappReady');
      }
    };
  }, [socket, onReady]);

  if (isReady) {
    return <p className="text-green-500">WhatsApp conectado!</p>;
  }

  if (!qrCode) {
    return <p>Aguardando QR Code...</p>;
  }

  return (
    <div className="p-4">
      <p>Escaneie o QR Code abaixo:</p>
      <QRCodeCanvas value={qrCode} size={256} />
    </div>
  );
};