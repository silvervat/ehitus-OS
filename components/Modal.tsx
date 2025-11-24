import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type ModalType = 'center' | 'slideover' | 'fullscreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: ModalType;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, type = 'center', footer }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const overlayClasses = "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity";
  
  // Container Classes based on type
  const containerClasses = {
    center: "fixed inset-0 z-50 flex items-center justify-center p-4",
    slideover: "fixed inset-0 z-50 flex justify-end overflow-hidden",
    fullscreen: "fixed inset-0 z-50 bg-white"
  };

  // Content Panel Classes based on type
  const panelClasses = {
    center: "bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200",
    slideover: "w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300",
    fullscreen: "w-full h-full flex flex-col animate-in fade-in duration-200"
  };

  return (
    <>
      {/* Overlay (not for fullscreen) */}
      {type !== 'fullscreen' && (
        <div className={overlayClasses} onClick={onClose} aria-hidden="true" />
      )}

      <div className={containerClasses[type]}>
        <div className={panelClasses[type]} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white rounded-t-xl">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};