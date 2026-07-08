import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ShieldAlert, FileText, Check, Lock, Plus, X, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { api } from '../services/api';
import type { DocumentDetails, DocumentUpdatePayload } from '../services/api';
import { FormSkeleton } from '../components/common/Skeleton';
import Badge from '../components/common/Badge';
import type { ToastMessage } from '../components/common/Toast';

interface ReviewPageProps {
  addToast: (text: string, type: ToastMessage['type']) => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ addToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [doc, setDoc] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [summary, setSummary] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [metaJsonStr, setMetaJsonStr] = useState('{}');

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getDocument(id);
      setDoc(data);
      
      const result = data.processed_result;
      if (result) {
        setTitle(result.title || '');
        setCategory(result.category || 'General');
        setSummary(result.summary || '');
        setKeywords(result.keywords || []);
        setMetaJsonStr(JSON.stringify(result.metadata_json || {}, null, 2));
      }
    } catch (err: any) {
      console.error(err);
      addToast('Failed to load document fields for review.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!keywords.includes(newTag)) {
        setKeywords([...keywords, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setKeywords(keywords.filter((t) => t !== tagToRemove));
  };

  const buildPayload = (): DocumentUpdatePayload => {
    let parsedMeta = {};
    try {
      parsedMeta = JSON.parse(metaJsonStr);
    } catch (e) {
      addToast('Invalid JSON in extracted parameters. Saving metadata as raw object.', 'warning');
    }
    
    return {
      title,
      category,
      summary,
      keywords,
      metadata_json: parsedMeta
    };
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      const updatedDoc = await api.updateDocument(id, payload);
      setDoc(updatedDoc);
      addToast('Draft modifications saved successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to update fields draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!id) return;
    setFinalizing(true);
    addToast('Finalizing extraction results... This will lock details.', 'info');
    try {
      // Step 1: Save draft details first
      const payload = buildPayload();
      await api.updateDocument(id, payload);
      
      // Step 2: Finalize document locks editing
      const finalizedDoc = await api.finalizeDocument(id);
      setDoc(finalizedDoc);
      addToast('Document finalized successfully! Fields locked.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to lock final values.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-6 w-24 bg-slate-800 animate-pulse rounded-md" />
        <div className="glass-panel p-8 rounded-2xl border border-slate-800">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  if (!doc || !doc.processed_result) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800">
        <ShieldAlert className="mx-auto text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white">No Extracted Data</h2>
        <p className="text-slate-400 text-sm mt-2">The document extraction result could not be found or has not finished parsing.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  const isFinalized = doc.processed_result.is_finalized;

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Upper Navigation Back link */}
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Workspace</span>
      </button>

      {/* Review Header Banner info */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Review & Edit Metadata</h1>
            <p className="text-slate-500 text-xs mt-1">Review the document parser output and finalize it.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isFinalized ? (
            <Badge status="FINALIZED" />
          ) : (
            <Badge status="COMPLETED" />
          )}
        </div>
      </div>

      {/* Finalized Banner Lock warning */}
      {isFinalized && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-950/20 border border-violet-500/25 text-violet-400">
          <Lock size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Document Finalized & Locked</p>
            <p className="text-xs text-violet-400/80 mt-0.5">
              This data record is marked as validated and is read-only. Use the export options below to save files.
            </p>
          </div>
        </div>
      )}

      {/* Review and editing layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800 pb-3">Extracted Values Form</h2>
            
            <div className="space-y-6">
              {/* Document Mock Title input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Document Title</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isFinalized}
                  placeholder="Enter custom title..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Document Category input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Document Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isFinalized}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                >
                  <option value="Financial">Financial</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Legal">Legal</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Summary Textarea input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mock Extraction Summary</label>
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={isFinalized}
                  rows={5}
                  placeholder="Describe parsed document content..."
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 resize-y"
                />
              </div>

              {/* Keywords Tag input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Extracted Keywords</label>
                {!isFinalized && (
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type keyword and press Enter or Comma..."
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-650"
                  />
                )}
                
                {/* Keywords list badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {keywords.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">No keywords added yet.</span>
                  ) : (
                    keywords.map((tag) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300 font-medium"
                      >
                        <span>{tag}</span>
                        {!isFinalized && (
                          <button 
                            onClick={() => handleRemoveTag(tag)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded-full hover:bg-slate-800"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer Form Action Buttons */}
            {!isFinalized && (
              <div className="flex gap-4 pt-6 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || finalizing}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={saving || finalizing}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-blue-600/15"
                >
                  <Lock size={16} />
                  <span>{finalizing ? 'Finalizing...' : 'Finalize & Lock'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Side panels (Parameters JSON Editor & Download options) */}
        <div className="space-y-6">
          {/* Metadata JSON Parameters Textarea */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5">
              Extracted Parameters (JSON)
            </h3>
            <textarea 
              value={metaJsonStr}
              onChange={(e) => setMetaJsonStr(e.target.value)}
              disabled={isFinalized}
              rows={10}
              className="w-full p-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-55 resize-none leading-relaxed"
              placeholder="{}"
            />
            {!isFinalized && (
              <p className="text-[10px] text-slate-500 mt-1">
                You can write custom key-values. Ensure to input properly formatted JSON schema.
              </p>
            )}
          </div>

          {/* Export Action Card (only for Finalized) */}
          {isFinalized && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5">
                Export Outputs
              </h3>
              <p className="text-xs text-slate-450 leading-relaxed">
                Save finalized database records onto physical files for spreadsheets or APIs.
              </p>
              
              <div className="flex flex-col gap-2 pt-2">
                <a 
                  href={api.getExportJsonUrl()}
                  download
                  className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <FileJson size={16} className="text-cyan-400" />
                  <span>Download JSON</span>
                </a>
                <a 
                  href={api.getExportCsvUrl()}
                  download
                  className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <FileSpreadsheet size={16} className="text-emerald-400" />
                  <span>Download CSV</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ReviewPage;
