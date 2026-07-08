import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, Clock, Play, AlertCircle, Edit3, Settings } from 'lucide-react';
import { api } from '../services/api';
import type { DocumentDetails } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WebSocketMessage } from '../hooks/useWebSocket';
import Badge from '../components/common/Badge';
import { CardSkeleton } from '../components/common/Skeleton';
import type { ToastMessage } from '../components/common/Toast';

interface DocumentDetailsPageProps {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

const STAGES = [
  { id: 'JOB_QUEUED', label: 'Job Queued', description: 'Processing job added to Celery queue.' },
  { id: 'DOCUMENT_RECEIVED', label: 'Document Received', description: 'Worker loaded document and read attributes.' },
  { id: 'PARSING_STARTED', label: 'Parsing Started', description: 'Mock structural parser began reading contents.' },
  { id: 'PARSING_COMPLETED', label: 'Parsing Completed', description: 'Text parsing process successfully finished.' },
  { id: 'FIELD_EXTRACTION_STARTED', label: 'Field Extraction Started', description: 'NLP processes analyzing text semantics.' },
  { id: 'FIELD_EXTRACTION_COMPLETED', label: 'Field Extraction Completed', description: 'Generated metadata, categories, and tags.' },
  { id: 'STORE_FINAL_RESULT', label: 'Store Final Result', description: 'Saving extraction logs in database schemas.' },
  { id: 'JOB_COMPLETED', label: 'Job Completed', description: 'Document processing pipeline finished.' }
];

export const DocumentDetailsPage: React.FC<DocumentDetailsPageProps> = ({ addToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.getDocument(id);
      setDoc(data);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to retrieve document metadata details.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Live WebSocket update listener
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (doc && doc.latest_job && doc.latest_job.id === message.job_id) {
      setDoc((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          latest_job: {
            ...prev.latest_job!,
            status: message.status,
            current_stage: message.current_stage,
            progress: message.progress,
            error_message: message.error_message,
            updated_at: new Date().toISOString()
          }
        };
      });

      // Reload document metadata if completed to load the extracted details fields
      if (message.status === 'COMPLETED') {
        setTimeout(() => fetchDetails(true), 1200);
      }
    }
  }, [doc, fetchDetails]);

  useWebSocket(handleWebSocketMessage);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-6 w-24 bg-slate-800 animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <div className="md:col-span-2">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800">
        <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white">Document Not Found</h2>
        <p className="text-slate-400 text-sm mt-2">The document with the specified ID could not be loaded.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const job = doc.latest_job;
  const result = doc.processed_result;

  // Resolve stages timeline parameters
  const currentStageId = job?.current_stage || 'JOB_QUEUED';
  const jobStatus = job?.status || 'QUEUED';
  const isFailed = jobStatus === 'FAILED';
  
  // Find current stage index
  const currentStageIndex = STAGES.findIndex(s => s.id === currentStageId);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Back link */}
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Workspace</span>
      </button>

      {/* Header card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white truncate max-w-md">{doc.filename}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-mono">ID: {doc.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-xs text-slate-400 font-medium">{formatSize(doc.file_size)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {job && <Badge status={jobStatus} />}
          {isFailed && (
            <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
              <AlertCircle size={14} />
              <span>Failed</span>
            </span>
          )}
          {jobStatus === 'COMPLETED' && (
            <button 
              onClick={() => navigate(`/review/${doc.id}`)}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-600/15"
            >
              <Edit3 size={14} />
              <span>Review Data</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* File information panel (Left) */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5">
              File Properties
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Content Mime-Type</span>
                <span className="font-semibold text-slate-350 block mt-0.5">{doc.content_type}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Server Disk Path</span>
                <span className="font-mono text-xs text-slate-400 block mt-0.5 break-all bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                  {doc.file_path}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Upload Timestamp</span>
                <span className="font-semibold text-slate-350 block mt-0.5">
                  {new Date(doc.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Last Update Timestamp</span>
                <span className="font-semibold text-slate-350 block mt-0.5">
                  {new Date(doc.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick results preview */}
          {result && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5">
                Extracted Preview
              </h3>
              <div className="space-y-3.5 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Mock Title</span>
                  <span className="font-medium text-slate-300 block mt-0.5">{result.title}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Category</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700/40 inline-block mt-1">
                    {result.category}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Timeline (Right 2 cols) */}
        <div className="md:col-span-2">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Workflow Progress Timeline
              </h3>
              {job && (
                <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2.5 py-0.5 rounded">
                  {job.progress}%
                </span>
              )}
            </div>

            {/* Vertical timeline stages list */}
            <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6 py-2">
              {STAGES.map((stage, idx) => {
                const isStageCompleted = idx < currentStageIndex || (idx === currentStageIndex && jobStatus === 'COMPLETED') || jobStatus === 'FINALIZED';
                const isStageActive = idx === currentStageIndex && jobStatus === 'PROCESSING';
                const isStageFailed = idx === currentStageIndex && isFailed;
                
                let dotClass = 'border-slate-800 bg-slate-950 text-slate-600';
                let textClass = 'text-slate-500';
                
                if (isStageCompleted) {
                  dotClass = 'border-emerald-500/50 bg-emerald-950 text-emerald-400';
                  textClass = 'text-slate-300';
                } else if (isStageActive) {
                  dotClass = 'border-blue-500/60 bg-blue-950 text-blue-400 glow-blue animate-pulse';
                  textClass = 'text-white font-semibold';
                } else if (isStageFailed) {
                  dotClass = 'border-rose-500/50 bg-rose-950 text-rose-400 glow-red';
                  textClass = 'text-rose-400 font-semibold';
                }

                return (
                  <div key={stage.id} className="relative flex items-start gap-4 transition-all duration-300">
                    {/* Circle Indicator on line */}
                    <div className={`absolute -left-10 top-0.5 w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-colors shrink-0 z-10 ${dotClass}`}>
                      {isStageCompleted ? (
                        <CheckCircle2 size={16} />
                      ) : isStageActive ? (
                        <Clock size={16} className="animate-spin" />
                      ) : isStageFailed ? (
                        <AlertCircle size={16} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className={`text-sm ${textClass}`}>{stage.label}</p>
                      <p className="text-xs text-slate-500">{stage.description}</p>
                      
                      {/* Show error logs for failed stage */}
                      {isStageFailed && job?.error_message && (
                        <div className="mt-2.5 p-3 rounded-lg bg-rose-950/20 border border-rose-500/25 text-xs text-rose-400 max-w-md font-mono whitespace-pre-wrap leading-relaxed">
                          Error Details: {job.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DocumentDetailsPage;
