import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, File, Check, X, AlertCircle, Play } from 'lucide-react';
import { api } from '../services/api';
import type { DocumentDetails } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WebSocketMessage } from '../hooks/useWebSocket';
import ProgressBar from '../components/common/ProgressBar';
import Badge from '../components/common/Badge';
import type { ToastMessage } from '../components/common/Toast';

interface UploadPageProps {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [queuedDocs, setQueuedDocs] = useState<DocumentDetails[]>([]);

  // Update queued documents in real-time using WebSocket updates
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    setQueuedDocs((prev) => 
      prev.map((doc) => {
        if (doc.latest_job && doc.latest_job.id === message.job_id) {
          return {
            ...doc,
            latest_job: {
              ...doc.latest_job,
              status: message.status,
              current_stage: message.current_stage,
              progress: message.progress,
              error_message: message.error_message,
              updated_at: new Date().toISOString()
            }
          };
        }
        return doc;
      })
    );
  }, []);

  useWebSocket(handleWebSocketMessage);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    addToast(`Uploading ${selectedFiles.length} file(s)...`, 'info');

    try {
      const uploadedDocs = await api.uploadDocuments(selectedFiles);
      setQueuedDocs((prev) => [...uploadedDocs, ...prev]);
      setSelectedFiles([]);
      addToast('Upload complete! Document processing initialized.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to upload documents.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Upload Documents</h1>
        <p className="text-slate-400 text-sm mt-1">Upload one or multiple documents to extract structured metadata asynchronously.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Zone (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/30'
            }`}
          >
            <input 
              type="file" 
              id="file-input" 
              multiple 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 text-blue-400 border border-slate-700/50 shadow-md">
              <Upload size={24} />
            </div>
            <p className="text-slate-200 font-semibold text-center">Drag and drop files here</p>
            <p className="text-slate-400 text-xs text-center mt-1">Support documents up to 15MB each</p>
            <button 
              type="button" 
              className="mt-6 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/20"
              disabled={uploading}
            >
              Browse Files
            </button>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white">Files Selected ({selectedFiles.length})</span>
                <button 
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-rose-400 hover:underline hover:text-rose-300 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/40 pr-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <File size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Uploading files...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Process Selected Files</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Live Queue Widgets (Right 1 col) */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-full flex flex-col">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase border-b border-slate-800 pb-3 mb-4">
              Live Queue Status
            </h2>
            
            {queuedDocs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle size={24} className="text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 font-medium">No files currently in active processing queue.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {queuedDocs.map((doc) => {
                  const job = doc.latest_job;
                  const isCompleted = job?.status === 'COMPLETED' || job?.status === 'FINALIZED';
                  const isFailed = job?.status === 'FAILED';
                  
                  return (
                    <div key={doc.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{doc.filename}</p>
                          <p className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">{job?.current_stage.replace(/_/g, ' ')}</p>
                        </div>
                        {job && <Badge status={job.status} />}
                      </div>
                      
                      {job && (
                        <ProgressBar 
                          progress={job.progress} 
                          status={job.status}
                        />
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                        <span>{formatSize(doc.file_size)}</span>
                        {isCompleted && (
                          <button 
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                          >
                            <span>View Details</span>
                            <Check size={12} />
                          </button>
                        )}
                        {isFailed && (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <span>Failed</span>
                            <X size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default UploadPage;
