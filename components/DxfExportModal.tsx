import React, { useState } from 'react';
import { ModalContainer, InputGroup } from './CommonUI';
import { CloseIcon, FileCadIcon, CheckIcon, MapIcon, InfoIcon } from './Icons';
import { generateDXF } from '../services/dxfService';
import { Node, PipeSegment, Material, CalculationResult, MapAnnotation, FlowUnit } from '../types';

interface DxfExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    pipes: PipeSegment[];
    materials: Material[];
    results: CalculationResult[];
    nodeResults: any;
    annotations: MapAnnotation[];
    isMapMode: boolean;
    projectMetadata: any;
    flowUnit: FlowUnit;
}

export const DxfExportModal: React.FC<DxfExportModalProps> = ({
    isOpen, onClose, nodes, pipes, materials, results, nodeResults, annotations, isMapMode, projectMetadata, flowUnit
}) => {
    const [textHeight, setTextHeight] = useState(1.5);
    const [includeAnnotations, setIncludeAnnotations] = useState(true);

    if (!isOpen) return null;

    const handleDownload = () => {
        const resList = Array.isArray(nodeResults) ? nodeResults : ((nodeResults as any) instanceof Map ? Array.from((nodeResults as any).values()) : []);
        const dxfString = generateDXF(
            nodes, pipes, materials, results, resList, 
            includeAnnotations ? annotations : [], 
            isMapMode, textHeight, flowUnit
        );
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectMetadata?.name || 'Projeto'}_CAD_Export.dxf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
    };

    return (
        <ModalContainer onClose={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-200">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <FileCadIcon />
                        </div>
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-tighter leading-none">Exportação CAD</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">DXF Profissional (R12)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {/* Preview / Instructions */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
                        <div className="text-blue-500 mt-1"><InfoIcon /></div>
                        <div className="text-[11px] text-blue-800 font-medium leading-relaxed">
                            O arquivo será exportado com camadas técnicas e legendas automáticas:
                            <ul className="mt-2 space-y-1 list-disc list-inside opacity-80">
                                <li>Pipes com Diâmetro e Vazão ({flowUnit})</li>
                                <li>Nós com CP, P e CT</li>
                                <li>Cores técnicas por diâmetro</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <InputGroup label="Altura do Texto (Metros CAD)" labelColor="text-slate-400">
                                <div className="relative">
                                    <input 
                                        type="number" step="0.1" min="0.1"
                                        value={textHeight}
                                        onChange={(e) => setTextHeight(parseFloat(e.target.value) || 0.1)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-black outline-none focus:border-blue-500 focus:bg-white transition-all tabular-nums"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Metros</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 italic leading-tight">Sugestão: 1.5 para 1:1000, 0.7 para 1:500</p>
                            </InputGroup>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                             onClick={() => setIncludeAnnotations(!includeAnnotations)}>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${includeAnnotations ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-200'}`}>
                                {includeAnnotations && <CheckIcon />}
                            </div>
                            <div>
                                <span className="block text-[11px] font-black text-slate-700 uppercase leading-none">Anotações do Mapa</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Inclui áreas e linhas auxiliares</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col gap-3 pt-4">
                        <button 
                            onClick={handleDownload}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            <FileCadIcon /> Gerar e Baixar DXF
                        </button>
                        <p className="text-center text-[9px] text-slate-300 font-medium px-4">
                            O cálculo será validado antes da exportação para garantir precisão nos resultados.
                        </p>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
            `}} />
        </ModalContainer>
    );
};
