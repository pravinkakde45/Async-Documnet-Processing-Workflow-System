import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCw, Edit, Eye, Download, SlidersHorizontal, AlertCircle, FileSpreadsheet, FileJson, RefreshCw, FileText } from 'lucide-react';
import { api } from '../services/api';
import type { DocumentDetails, Job } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WebSocketMessage } from '../hooks/useWebSocket';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import { TableSkeleton } from '../components/common/Skeleton';
import type { ToastMessage } from '../components/common/Toast';

interface DashboardPageProps {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

type SortField = 'created_at' | 'filename' | 'file_size';
type SortOrder = 'asc' | 'desc';

export const DashboardPage: React.FC<DashboardPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to load documents catalog.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Live updates mapping from WS
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    setDocuments((prevDocs) => {
      // Find the document associated with this job
      return prevDocs.map((doc) => {
        if (doc.id === message.document_id || (doc.latest_job && doc.latest_job.id === message.job_id)) {
          // Update the job reference
          const updatedJob: Job = {
            id: message.job_id,
            document_id: message.document_id,
            status: message.status,
            current_stage: message.current_stage,
            progress: message.progress,
            error_message: message.error_message,
            created_at: doc.latest_job?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // If job completes, we might want to fetch full details silently to load the parsed results
          if (message.status === 'COMPLETED' && doc.latest_job?.status !== 'COMPLETED') {
            // Trigger background reload to grab extracted title/category fields
            setTimeout(() => fetchDocuments(true), 1000);
          }

          return {
            ...doc,
            latest_job: updatedJob
          };
        }
        return doc;
      });
    });
  }, [fetchDocuments]);

  useWebSocket(handleWebSocketMessage);

  const handleRetry = async (jobId: string, docId: string) => {
    setRetryingIds((prev) => ({ ...prev, [jobId]: true }));
    addToast('Retrying document parsing job...', 'info');
    try {
      const newJob = await api.retryJob(jobId);
      
      // Update local state with the new active job reference
      setDocuments((prev) => 
        prev.map((doc) => {
          if (doc.id === docId) {
            return {
              ...doc,
              latest_job: newJob
            };
          }
          return doc;
        })
      );
      
      addToast('Job re-enqueued successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to retry job.', 'error');
    } finally {
      setRetryingIds((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  // Compute stat card parameters dynamically
  const stats = useMemo(() => {
    const counts = {
      TOTAL: documents.length,
      QUEUED: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      FINALIZED: 0
    };

    documents.forEach((doc) => {
      const status = doc.latest_job?.status || 'QUEUED';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [documents]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter and sort local items
  const processedDocs = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesSearch = doc.filename.toLowerCase().includes(search.toLowerCase()) || 
          doc.processed_result?.title?.toLowerCase().includes(search.toLowerCase());
        
        const jobStatus = doc.latest_job?.status || 'QUEUED';
        const matchesFilter = statusFilter === 'ALL' || jobStatus === statusFilter;
        
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy] || '';
        let valB: any = b[sortBy] || '';
        
        if (sortBy === 'created_at') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        } else if (sortBy === 'file_size') {
          valA = a.file_size;
          valB = b.file_size;
        } else if (sortBy === 'filename') {
          valA = a.filename.toLowerCase();
          valB = b.filename.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [documents, search, statusFilter, sortBy, sortOrder]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Upper Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Document Workspace</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor, review, and export extracted document fields.</p>
        </div>
        
        {/* Export Data buttons */}
        <div className="flex gap-3">
          <a 
            href={api.getExportJsonUrl()}
            download
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-black/10"
          >
            <FileJson size={16} className="text-cyan-400" />
            <span>Export JSON</span>
          </a>
          <a 
            href={api.getExportCsvUrl()}
            download
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-black/10"
          >
            <FileSpreadsheet size={16} className="text-emerald-400" />
            <span>Export CSV</span>
          </a>
          <button 
            onClick={() => fetchDocuments()}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl transition-all shadow-md shadow-black/10"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats Counter Rows */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'All Docs', value: stats.TOTAL, color: 'border-slate-800 text-slate-400' },
          { label: 'Queued', value: stats.QUEUED, color: 'border-slate-800 text-slate-500' },
          { label: 'Processing', value: stats.PROCESSING, color: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
          { label: 'Completed', value: stats.COMPLETED, color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
          { label: 'Failed', value: stats.FAILED, color: 'border-rose-500/20 text-rose-400 bg-rose-500/5' },
          { label: 'Finalized', value: stats.FINALIZED, color: 'border-violet-500/20 text-violet-400 bg-violet-500/5' },
        ].map((item, idx) => (
          <div key={idx} className={`border rounded-2xl p-4 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between ${item.color}`}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
            <span className="text-3xl font-extrabold mt-2 font-mono">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Search & Sort Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg shadow-black/10">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search by filename or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['ALL', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'FINALIZED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/10'
                  : 'bg-slate-950/60 text-slate-400 border-slate-850 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table grid contents */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-black/15">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : processedDocs.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <AlertCircle size={32} className="text-slate-600 mb-3" />
            <h3 className="text-slate-350 font-semibold text-lg">No records found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">No documents matching the specified criteria were discovered in your space.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none">
                  <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('filename')}>
                    Document Name {sortBy === 'filename' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('file_size')}>
                    Size {sortBy === 'file_size' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('created_at')}>
                    Uploaded At {sortBy === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-4 px-6">Stage & Status</th>
                  <th className="py-4 px-6">Extraction Progress</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {processedDocs.map((doc) => {
                  const job = doc.latest_job;
                  const res = doc.processed_result;
                  const status = job?.status || 'QUEUED';
                  const isCompleted = status === 'COMPLETED' || status === 'FINALIZED';
                  const isFailed = status === 'FAILED';
                  const isRetrying = retryingIds[job?.id || ''] || false;
                  
                  return (
                    <tr key={doc.id} className="hover:bg-slate-900/30 transition-colors">
                      {/* Document details column */}
                      <td className="py-4 px-6 font-medium text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <span 
                              onClick={() => navigate(`/documents/${doc.id}`)}
                              className="hover:text-blue-400 hover:underline cursor-pointer font-medium block truncate"
                            >
                              {doc.filename}
                            </span>
                            {res?.title && (
                              <span className="text-xs text-slate-500 truncate block mt-0.5 max-w-[240px]">
                                {res.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Size column */}
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        {formatSize(doc.file_size)}
                      </td>
                      
                      {/* Date column */}
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {new Date(doc.created_at).toLocaleString()}
                      </td>
                      
                      {/* Stage Badge column */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center">
                            <Badge status={status} />
                          </div>
                          {job && status === 'PROCESSING' && (
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                              {job.current_stage.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Progress Bar column */}
                      <td className="py-4 px-6 min-w-[140px]">
                        {job && (
                          <div className="w-32">
                            <ProgressBar progress={job.progress} status={status} />
                          </div>
                        )}
                      </td>
                      
                      {/* Actions Buttons column */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details page link */}
                          <button
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            title="View document log details"
                            className="p-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors shadow-sm"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {/* Review and editing details link */}
                          {isCompleted && (
                            <button
                              onClick={() => navigate(`/review/${doc.id}`)}
                              title={status === 'FINALIZED' ? "View finalized fields" : "Edit and finalize metadata"}
                              className={`p-2 border rounded-lg transition-colors shadow-sm ${
                                status === 'FINALIZED'
                                  ? 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350 hover:bg-slate-800'
                                  : 'bg-blue-500/10 border-blue-500/25 hover:bg-blue-500 text-blue-400 hover:text-white'
                              }`}
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          
                          {/* Retry button */}
                          {isFailed && job && (
                            <button
                              onClick={() => handleRetry(job.id, doc.id)}
                              disabled={isRetrying}
                              title="Retry parsing process"
                              className="p-2 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RotateCw size={14} className={isRetrying ? 'animate-spin' : ''} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default DashboardPage;
