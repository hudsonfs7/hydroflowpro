
import React from 'react';
import { MapAnnotation, LabelMode } from '../types';
import { InputGroup } from './CommonUI';
import { TrashIcon, LayoutIcon, CheckIcon, PenToolIcon } from './Icons';

interface AnnotationEditorProps {
    annotation: MapAnnotation;
    onUpdate: (id: string, updates: Partial<MapAnnotation>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ 
    annotation, onUpdate, onDelete, onClose 
}) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#475569', '#000000'];

    return (
        <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-tight">
                    <PenToolIcon /> Propriedades CAD
                </div>
            </div>

            <InputGroup label="Legenda do Elemento">
                <input 
                    type="text" 
                    value={annotation.content}
                    onChange={(e) => onUpdate(annotation.id, { content: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none focus:border-accent shadow-sm"
                    placeholder="Sem legenda (vazio)"
                />
            </InputGroup>

            {/* Controle de Opacidade Individual */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Transparência (Layer)</label>
                    <span className="text-[10px] font-mono font-bold text-slate-600">{((annotation.opacity ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <input 
                    type="range" min="0.1" max="1" step="0.05"
                    value={annotation.opacity ?? 1}
                    onChange={(e) => onUpdate(annotation.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            {(annotation.type === 'line' || annotation.type === 'polyline') && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Alinhamento do Texto</label>
                    <div className="flex bg-white p-1 rounded border border-slate-200 gap-1">
                        <button 
                            onClick={() => onUpdate(annotation.id, { labelMode: 'fixed' })}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${(!annotation.labelMode || annotation.labelMode === 'fixed') ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Fixo / Livre
                        </button>
                        <button 
                            onClick={() => onUpdate(annotation.id, { labelMode: 'aligned' })}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${annotation.labelMode === 'aligned' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Alinhado à Linha
                        </button>
                    </div>
                </div>
            )}

            <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Cor Técnica</label>
                <div className="grid grid-cols-4 gap-2">
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => onUpdate(annotation.id, { color: c })}
                            className={`h-8 rounded-md border-2 transition-all hover:scale-105 flex items-center justify-center ${annotation.color === c ? 'border-slate-800 ring-2 ring-slate-100' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        >
                            {annotation.color === c && <CheckIcon />}
                        </button>
                    ))}
                </div>
            </div>

            {annotation.type === 'area' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 uppercase">Hachura Diagonal</span>
                        <button 
                            onClick={() => onUpdate(annotation.id, { hatch: !annotation.hatch })}
                            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${annotation.hatch ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${annotation.hatch ? 'translate-x-5' : ''}`}></div>
                        </button>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button 
                    onClick={() => onDelete(annotation.id)}
                    className="flex-1 py-2 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <TrashIcon /> Excluir
                </button>
                <button 
                    onClick={onClose}
                    className="flex-1 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <CheckIcon /> OK
                </button>
            </div>
            
            <p className="text-[9px] text-slate-400 italic text-center">
                Clique e arraste a bolinha azul no mapa para reposicionar a legenda.
            </p>
        </div>
    );
};
