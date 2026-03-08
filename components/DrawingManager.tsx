import React, { useState } from 'react';
import { MapAnnotation, AnnotationType, AnnotationGroup } from '../types';
import { 
    LayersIcon, TrashIcon, LayoutIcon, SparklesIcon, PlusIcon, 
    LineIcon, PolylineIcon, UploadIcon, LockIcon, UnlockIcon, 
    EyeIcon, ChevronDownIcon, ChevronUpIcon 
} from './Icons';

interface DrawingManagerProps {
    annotations: MapAnnotation[];
    groups: AnnotationGroup[];
    onAdd: (type: AnnotationType, groupId: string) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<MapAnnotation>) => void;
    onDeleteGroup: (id: string) => void;
    onUpdateGroup: (id: string, updates: Partial<AnnotationGroup>) => void;
    onImportDxf: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DrawingManager: React.FC<DrawingManagerProps> = ({ 
    annotations, groups, onAdd, onDelete, onUpdate, onDeleteGroup, onUpdateGroup, onImportDxf
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groups.map(g => g.id)));

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="flex flex-col gap-4 animate-fade-in">
            {/* Ferramentas Rápidas */}
            <div className="grid grid-cols-3 gap-1">
                <button 
                    onClick={() => onAdd('line', 'default')}
                    className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded text-[10px] text-slate-700 font-bold transition-colors shadow-sm"
                >
                    <LineIcon />
                    <span>Linha</span>
                </button>
                <button 
                    onClick={() => onAdd('polyline', 'default')}
                    className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded text-[10px] text-slate-700 font-bold transition-colors shadow-sm"
                >
                    <PolylineIcon />
                    <span>Poli.</span>
                </button>
                <button 
                    onClick={() => onAdd('area', 'default')}
                    className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded text-[10px] text-slate-700 font-bold transition-colors shadow-sm"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12l5-9 10 2 5 10-8 7z"/></svg>
                    <span>Área</span>
                </button>
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded text-[11px] font-bold cursor-pointer hover:bg-slate-700 transition-colors shadow-md">
                <UploadIcon /> Importar DXF como Camada
                <input type="file" accept=".dxf" className="hidden" onChange={onImportDxf} />
            </label>

            <div className="space-y-4 mt-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Camadas do Projeto</h4>
                
                {groups.map(group => {
                    const isExpanded = expandedGroups.has(group.id);
                    const groupAnns = annotations.filter(a => a.groupId === group.id);

                    return (
                        <div key={group.id} className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                            <div className="bg-slate-50 p-2 flex items-center gap-2 border-b border-slate-100">
                                <button onClick={() => toggleGroup(group.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <input 
                                        type="text" 
                                        value={group.name}
                                        onChange={(e) => onUpdateGroup(group.id, { name: e.target.value })}
                                        className="bg-transparent border-none text-[11px] font-bold text-slate-700 w-full focus:ring-0 p-0"
                                    />
                                    <div className="text-[9px] text-slate-400 font-medium uppercase">{groupAnns.length} elementos</div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => onUpdateGroup(group.id, { locked: !group.locked })}
                                        className={`p-1.5 rounded transition-colors ${group.locked ? 'text-orange-500 bg-orange-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                        title={group.locked ? "Desbloquear interação" : "Bloquear"}
                                    >
                                        {group.locked ? <LockIcon /> : <UnlockIcon />}
                                    </button>
                                    <button 
                                        onClick={() => onUpdateGroup(group.id, { visible: !group.visible })}
                                        className={`p-1.5 rounded transition-colors ${!group.visible ? 'text-slate-300' : 'text-blue-500 bg-blue-50'}`}
                                        title="Visibilidade"
                                    >
                                        <EyeIcon />
                                    </button>
                                    {group.id !== 'default' && (
                                        <button 
                                            onClick={() => { if(confirm(`Excluir pasta "${group.name}"?`)) onDeleteGroup(group.id); }}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-3 bg-white space-y-3">
                                    <div className="bg-slate-50/50 p-2 rounded border border-slate-100">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Transparência</span>
                                            <span className="text-[10px] font-mono font-bold text-slate-600">{(group.opacity * 100).toFixed(0)}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.05"
                                            value={group.opacity}
                                            onChange={(e) => onUpdateGroup(group.id, { opacity: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 accent-blue-600 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                        {groupAnns.length === 0 ? (
                                            <div className="text-center py-4 text-[10px] text-slate-400 italic">Vazio</div>
                                        ) : (
                                            groupAnns.map(ann => (
                                                <div key={ann.id} className="group flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-all">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ann.color }} />
                                                        <span className="text-[10px] text-slate-600 truncate uppercase font-mono">{ann.content || ann.type}</span>
                                                    </div>
                                                    {!group.locked && (
                                                        <button onClick={() => onDelete(ann.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity">
                                                            <TrashIcon />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <p className="text-[9px] text-orange-800 leading-relaxed">
                    <strong>Dica Técnica:</strong> Desenhos manuais não aparecem na lista até serem finalizados com <strong>ESC</strong>. Use a tecla para salvar o rascunho.
                </p>
            </div>
        </div>
    );
};
