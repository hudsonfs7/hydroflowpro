import React, { useState } from 'react';
import { 
    PenToolIcon, PlusIcon, ChevronUpIcon, WellIcon, WaypointIcon, PipeIcon, ChartIcon, ReservoirIcon, SettingsIcon, PumpIcon
} from './Icons';
import { useClickOutside } from './CommonUI';

interface BottomBarProps {
    onToggleDraw: () => void;
    onAddNode: (type: 'demand' | 'well' | 'source' | 'pump') => void;
    onAddPipe: () => void;
    onToggleResults: () => void;
    onToggleConfig: () => void;
    isDrawMode: boolean;
    isResultsOpen: boolean;
    isConfigOpen: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({
    onToggleDraw,
    onAddNode,
    onAddPipe,
    onToggleResults,
    onToggleConfig,
    isDrawMode,
    isResultsOpen,
    isConfigOpen
}) => {
    const [showNodeMenu, setShowNodeMenu] = useState(false);
    
    // Fecha o menu ao clicar fora dele
    const menuRef = useClickOutside(() => setShowNodeMenu(false));

    // Handler universal que garante o fechamento de popups antes de trocar de ferramenta
    const handleAction = (action: () => void) => {
        setShowNodeMenu(false);
        action();
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe">
            <div className="h-16 flex items-center justify-around relative overflow-visible">
                
                {/* 1. DESENHAR */}
                <button 
                    onClick={() => handleAction(onToggleDraw)}
                    className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 h-full ${isDrawMode ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}
                >
                    <PenToolIcon />
                    <span className="text-[10px] font-bold tracking-tight">Desenhar</span>
                </button>

                {/* 2. MENU INSERIR (Nó, Poço, Reservatório, Bomba) */}
                <div ref={menuRef as React.RefObject<HTMLDivElement>} className="relative flex-1 h-full border-x border-slate-50">
                    {showNodeMenu && (
                        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 bg-white shadow-2xl rounded-xl border border-slate-200 py-1 flex flex-col z-[110] animate-slide-up-center origin-bottom overflow-hidden ring-1 ring-black/5">
                            <button 
                                onClick={() => handleAction(() => onAddNode('demand'))}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-50 transition-colors"
                            >
                                <div className="text-slate-400"><WaypointIcon /></div>
                                <span>Nó</span>
                            </button>
                            <button 
                                onClick={() => handleAction(() => onAddNode('well'))}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-50 transition-colors"
                            >
                                <div className="text-slate-400"><WellIcon /></div>
                                <span>Poço</span>
                            </button>
                            <button 
                                onClick={() => handleAction(() => onAddNode('source'))}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-50 transition-colors"
                            >
                                <div className="text-blue-400"><ReservoirIcon /></div>
                                <span>Reservatório</span>
                            </button>
                            <button 
                                onClick={() => handleAction(() => onAddNode('pump'))}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                            >
                                <div className="text-purple-500"><PumpIcon /></div>
                                <span>Bomba (CMB)</span>
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => setShowNodeMenu(!showNodeMenu)}
                        className={`flex flex-col items-center justify-center gap-1 transition-all w-full h-full relative ${showNodeMenu ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}
                    >
                        <div className="flex items-center gap-0.5">
                            <PlusIcon />
                            <div className={`mb-1 transition-transform duration-200 ${showNodeMenu ? 'rotate-180 opacity-100' : 'opacity-60'}`}>
                                <ChevronUpIcon />
                            </div>
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Inserir</span>
                    </button>
                </div>

                {/* 3. RESULTADOS */}
                <button 
                    onClick={() => handleAction(onToggleResults)}
                    className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 h-full ${isResultsOpen ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}
                >
                    <ChartIcon />
                    <span className="text-[10px] font-bold tracking-tight">Resultados</span>
                </button>

                {/* 4. CONFIG */}
                <button 
                    onClick={() => handleAction(onToggleConfig)}
                    className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 h-full ${isConfigOpen ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}
                >
                    <SettingsIcon />
                    <span className="text-[10px] font-bold tracking-tight">Config</span>
                </button>
            </div>
        </div>
    );
};
