
import React from 'react';
import { Material, PipeDiameterDefinition } from '../types';
import { CloseIcon, PenToolIcon, WaypointIcon, PlusIcon } from './Icons';

interface DrawControlsProps {
    isOpen: boolean;
    materials: Material[];
    currentMatId: string;
    currentDn: number;
    onMaterialChange: (id: string) => void;
    onDiameterChange: (dn: number) => void;
    onClose: () => void;
    instruction: string;
    variant?: 'mobile' | 'desktop';
    placementMode: 'node' | 'vertex';
    setPlacementMode: (m: 'node' | 'vertex') => void;
}

export const DrawControls: React.FC<DrawControlsProps> = ({
    isOpen,
    materials,
    currentMatId,
    currentDn,
    onMaterialChange,
    onDiameterChange,
    onClose,
    instruction,
    variant = 'mobile',
    placementMode,
    setPlacementMode
}) => {
    if (!isOpen) return null;

    const selectedMat = materials.find(m => m.id === currentMatId) || materials[0];

    // --- DESKTOP LAYOUT (SIDEBAR INTEGRATION) ---
    if (variant === 'desktop') {
        return (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
                <div className="flex items-center gap-2 mb-3 text-blue-800 border-b border-blue-200 pb-2">
                    <PenToolIcon />
                    <span className="text-xs font-bold uppercase tracking-wide">Configuração de Desenho</span>
                </div>
                
                <div className="space-y-3">
                    {/* Mode Toggles */}
                    <div className="flex bg-white rounded-lg p-1 border border-blue-200 shadow-sm">
                        <button
                            onClick={() => setPlacementMode('node')}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${placementMode === 'node' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                            title="Criar Nó (Finaliza o tubo)"
                        >
                            <PlusIcon /> Nó
                        </button>
                        <button
                            onClick={() => setPlacementMode('vertex')}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${placementMode === 'vertex' ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                            title="Criar Vértice (Curva)"
                        >
                            <WaypointIcon /> Vértice
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-blue-700">Material</label>
                        <select 
                            value={currentMatId}
                            onChange={(e) => onMaterialChange(e.target.value)}
                            className="w-full text-xs bg-white border border-blue-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                        >
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name.split('(')[0].trim()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-blue-700">Diâmetro</label>
                        <select 
                            value={currentDn}
                            onChange={(e) => onDiameterChange(parseInt(e.target.value))}
                            className="w-full text-xs bg-white border border-blue-300 rounded p-2 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                        >
                            {selectedMat.availableDiameters.map((d: PipeDiameterDefinition) => (
                                <option key={d.dn} value={d.dn}>
                                    DN {d.dn} {d.label ? `(${d.label})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-3 text-[10px] text-blue-600 italic leading-tight">
                    {instruction}
                </div>
            </div>
        );
    }

    // --- MOBILE/TABLET LAYOUT (CENTERED FLOATING CARD) ---
    return (
        <div className="fixed top-14 md:top-16 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-sm animate-fade-in pointer-events-auto filter drop-shadow-lg pt-2">
            <div className="bg-white/95 backdrop-blur rounded-xl border border-blue-100 overflow-hidden ring-1 ring-black/5 flex flex-col">
                
                {/* Header Compacto */}
                <div className="bg-blue-600 px-3 py-2 flex items-center justify-between text-white shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                        <span className="text-[11px] font-bold uppercase tracking-wide truncate">Modo Desenho</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1 -mr-1 hover:bg-white/20 rounded-full text-white transition-colors flex items-center justify-center w-6 h-6"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Mode Switcher Mobile */}
                <div className="flex bg-slate-100 p-1 border-b border-slate-200">
                    <button
                        onClick={() => setPlacementMode('node')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${placementMode === 'node' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-slate-400'}`}
                    >
                        <PlusIcon /> Inserir Nó
                    </button>
                    <button
                        onClick={() => setPlacementMode('vertex')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${placementMode === 'vertex' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400'}`}
                    >
                        <WaypointIcon /> Inserir Vértice
                    </button>
                </div>

                {/* Single Row Controls */}
                <div className="p-2 flex gap-2 bg-gradient-to-b from-white to-slate-50">
                    <div className="flex-1 min-w-0">
                        <div className="relative">
                            <select 
                                value={currentMatId}
                                onChange={(e) => onMaterialChange(e.target.value)}
                                className="w-full text-[11px] font-semibold bg-white border border-slate-300 rounded-lg pl-2 pr-6 py-2 outline-none focus:border-blue-500 text-slate-700 shadow-sm appearance-none truncate"
                            >
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name.split('(')[0].trim()}</option>
                                ))}
                            </select>
                            {/* Custom Arrow */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                        </div>
                    </div>

                    <div className="w-28 shrink-0">
                        <div className="relative">
                            <select 
                                value={currentDn}
                                onChange={(e) => onDiameterChange(parseInt(e.target.value))}
                                className="w-full text-[11px] font-semibold bg-white border border-slate-300 rounded-lg pl-2 pr-6 py-2 outline-none focus:border-blue-500 text-slate-700 shadow-sm appearance-none"
                            >
                                {selectedMat.availableDiameters.map((d: PipeDiameterDefinition) => (
                                    <option key={d.dn} value={d.dn}>DN {d.dn}</option>
                                ))}
                            </select>
                             {/* Custom Arrow */}
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
