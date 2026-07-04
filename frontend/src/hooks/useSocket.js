import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Usa uma ref para os callbacks para evitar reconectar quando eles mudam de referência
export function useSocket(quizId, { onStatus, onReady, onError } = {}) {
  const cbRef = useRef({ onStatus, onReady, onError });

  useEffect(() => {
    cbRef.current = { onStatus, onReady, onError };
  });

  useEffect(() => {
    if (!quizId) return;

    const socket = io('http://localhost:3001');

    socket.emit('join:quiz', quizId);
    socket.on('quiz:status', (d) => cbRef.current.onStatus?.(d));
    socket.on('quiz:ready', (d) => cbRef.current.onReady?.(d));
    socket.on('quiz:error', (d) => cbRef.current.onError?.(d));

    return () => socket.disconnect();
  }, [quizId]);
}
