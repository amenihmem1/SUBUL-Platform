'use client';

import { useState } from 'react';
import { X, FileText, Award, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentationUrl: string;
  certificateUrl?: string;
  hasCertificate?: boolean;
}

export default function DocumentationModal({
  isOpen,
  onClose,
  title,
  documentationUrl,
  certificateUrl,
  hasCertificate = false,
}: DocumentationModalProps) {
  const [activeTab, setActiveTab] = useState<'documentation' | 'certificate'>('documentation');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('documentation')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
              activeTab === 'documentation'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentation
          </button>
          {hasCertificate && (
            <button
              onClick={() => setActiveTab('certificate')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
                activeTab === 'certificate'
                  ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Award className="w-4 h-4" />
              Certificate
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {activeTab === 'documentation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <FileText className="w-6 h-6" />
                <h3 className="text-lg font-medium">Lab Documentation</h3>
              </div>
              <p className="text-slate-600">
                Access the complete documentation for this lab, including step-by-step instructions, 
                prerequisites, and best practices.
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-3">Documentation URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-slate-200 text-sm">
                    {documentationUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(documentationUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'certificate' && hasCertificate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-yellow-600">
                <Award className="w-6 h-6" />
                <h3 className="text-lg font-medium">Certificate of Completion</h3>
              </div>
              <p className="text-slate-600">
                Download your certificate after successfully completing this lab.
              </p>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-3">Certificate URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-slate-200 text-sm">
                    {certificateUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(certificateUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => window.open(activeTab === 'documentation' ? documentationUrl : certificateUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open {activeTab === 'documentation' ? 'Documentation' : 'Certificate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
