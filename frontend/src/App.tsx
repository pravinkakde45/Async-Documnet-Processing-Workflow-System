import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import DocumentDetailsPage from './pages/DocumentDetailsPage';
import ReviewPage from './pages/ReviewPage';
import ToastContainer from './components/common/Toast';
import type { ToastMessage } from './components/common/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import type { WebSocketMessage } from './hooks/useWebSocket';

function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global WebSocket listener to trigger user-facing push Toast notifications
  const handleGlobalWSMessage = useCallback((message: WebSocketMessage) => {
    if (message.status === 'COMPLETED') {
      addToast('A document task finished processing successfully!', 'success');
    } else if (message.status === 'FAILED') {
      addToast(`A document processing job failed: ${message.error_message || 'Unknown error'}`, 'error');
    }
  }, [addToast]);

  const { isConnected } = useWebSocket(handleGlobalWSMessage);

  return (
    <Router>
      <div className="min-h-screen bg-[#0c0d12] flex flex-col text-slate-200">
        <Navbar wsConnected={isConnected} />
        <main className="flex-1 container mx-auto px-4 md:px-8 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage addToast={addToast} />} />
            <Route path="/upload" element={<UploadPage addToast={addToast} />} />
            <Route path="/documents/:id" element={<DocumentDetailsPage addToast={addToast} />} />
            <Route path="/review/:id" element={<ReviewPage addToast={addToast} />} />
          </Routes>
        </main>
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </Router>
  );
}

export default App;
