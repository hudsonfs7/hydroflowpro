
import React, { Component, useState, useEffect, ReactNode, ErrorInfo, useRef } from 'react';

export const InputGroup = ({ label, children }: { label: string; children?: ReactNode }) => (
  <div className="flex flex-col gap-1 mb-2">
    <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
    {children}
  </div>
);

/**
 * Container Global para Modais e Popups.
 * Garante fechamento consistente via ESC e clique fora em todo o app.
 */
// Fix: children made optional to resolve TypeScript "missing required property" errors in consumers when using strict JSX checking
export const ModalContainer = ({ 
  onClose, 
  children, 
  zIndex = "z-[5000]", 
  backdropClass = "bg-slate-900/40 backdrop-blur-sm",
  closeOnBackdropClick = true // New Prop: Default is true (close on click)
}: { 
  onClose: () => void; 
  children?: ReactNode; 
  zIndex?: string;
  backdropClass?: string;
  closeOnBackdropClick?: boolean;
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    // Impede o scroll do body quando um modal está aberto
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div 
      className={`fixed inset-0 ${zIndex} ${backdropClass} flex items-center justify-center p-4 animate-fade-in pointer-events-auto`}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="contents"
      >
        {children}
      </div>
    </div>
  );
};

export const SmartNumberInput = ({ 
  value, 
  onChange, 
  className = "", 
  placeholder, 
  disabled = false,
  min
}: any) => {
  const [localStr, setLocalStr] = useState<string>(
    value !== undefined && value !== null && !isNaN(value) ? value.toString() : ''
  );

  useEffect(() => {
    if (value === undefined || value === null || isNaN(value)) {
        if (localStr !== '') setLocalStr('');
        return;
    }
    const currentParsed = localStr === '' ? 0 : parseFloat(localStr.replace(',', '.'));
    if (Math.abs(value - currentParsed) > 0.000001) {
        setLocalStr(value.toString());
    }
  }, [value]); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalStr(val); 
    if (val === '') {
        onChange(0);
    } else {
        const normalized = val.replace(',', '.');
        if (normalized === '.' || normalized === '-') return; 
        const num = parseFloat(normalized);
        if (!isNaN(num)) {
            onChange(num);
        }
    }
  };

  return (
    <input 
      type="text" 
      inputMode="decimal"
      value={localStr}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      className={`bg-white text-slate-900 border border-slate-300 rounded p-2 outline-none focus:border-accent focus:ring-1 focus:ring-accent w-full ${className} ${disabled ? 'bg-slate-100 text-slate-500' : ''}`}
    />
  );
};

export function useClickOutside(callback: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [callback]);

  return ref;
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-50 text-slate-600 p-6 text-center">
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm border border-slate-100">
               <div className="mb-4 text-red-500 bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                 </svg>
               </div>
               <h2 className="text-xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
               <p className="text-sm text-slate-500 mb-4">Ocorreu um erro inesperado na aplicação.</p>
               <button onClick={() => window.location.reload()} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition">
                   Recarregar Página
               </button>
           </div>
        </div>
      );
    }
    return this.props.children;
  }
}
