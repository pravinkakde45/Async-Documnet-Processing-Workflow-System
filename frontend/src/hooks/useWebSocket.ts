import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '../services/api';

export interface WebSocketMessage {
  job_id: string;
  document_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'FINALIZED';
  current_stage: string;
  progress: number;
  error_message: string | null;
}

export const useWebSocket = (onMessage?: (data: WebSocketMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    // Avoid double instantiation
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const socket = new WebSocket(`${WS_BASE_URL}/jobs`);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.info('Successfully connected to WebSocket job updates stream.');
    };

    socket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket incoming JSON frame:', err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
      console.warn('WebSocket connection dropped. Scheduling auto-reconnect in 3s...');
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket connection error encountered:', error);
      socket.close();
    };
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { isConnected };
};
