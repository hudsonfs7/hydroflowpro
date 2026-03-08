
import React, { useState, useEffect } from 'react';
import { ProjectMetadata, ContractData, ContractClause } from '../types';
import { getDefaultContractData, generateContractHtml } from '../services/contractService';
import { ModalContainer } from './CommonUI';
import { CloseIcon, FileSignatureIcon, PlusIcon, TrashIcon, CheckIcon, EyeIcon, PenToolIcon, SaveIcon } from './Icons';

interface ContractEditorModalProps {
    metadata: ProjectMetadata;
    userOrgName?: string;
    onClose: () => void;
}

export const ContractEditorModal: React.FC<ContractEditorModalProps> = ({ metadata, userOrgName, onClose }) => {
    const [data, setData] = useState<ContractData | null>(null);
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');

    useEffect(() => {
        setData(getDefaultContractData(metadata, userOrgName));
    }, [metadata, userOrgName]);

    const handleUpdateClause = (id: string, field: 'title' | 'text', value: string) => {
        if (!data) return;
        const newClauses = data.clauses.map(c => c.id === id ? { ...c, [field]: value } : c);
        setData({ ...data, clauses: newClauses });
    };

    const handleAddClause = () => {
        if (!data) return;
        const newClause: ContractClause = {
            id: `c-${Date.now()}`,
            title: 'NOVA CLÁUSULA',
            text: 'Texto da nova cláusula...'
        };
        setData({ ...data, clauses: [...data.clauses, newClause] });
    };

    const handleRemoveClause = (id: string) => {
        if (!data) return;
        if (confirm("Remover esta cláusula?")) {
            setData({ ...data, clauses: data.clauses.filter(c => c.id !== id) });
        }
    };

    const handlePrint = () => {
        if (!data) return;
        const html = generateContractHtml(data);
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    };

    if (!data) return null;

    const ordinal = (n: number) => {
        const s = ["PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA", "SÉTIMA", "OITAVA", "NONA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA SEGUNDA"];
        return s[n] || `${n + 1}ª`;
    };

    return (
        <ModalContainer onClose={onClose} zIndex="z-[8000]" backdropClass="bg-slate-900/50 backdrop-blur-sm" closeOnBackdropClick={false}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-slate-200">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                            <FileSignatureIcon />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Gerador de Contrato</h2>
                            <p className="text-xs text-slate-500">Edite as cláusulas antes de gerar o documento final.</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-200 p-1 rounded-lg">
                        <button 
                            onClick={() => setMode('edit')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${mode === 'edit' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <PenToolIcon /> Editor
                        </button>
                        <button 
                            onClick={() => setMode('preview')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${mode === 'preview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <EyeIcon /> Visualizar
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-slate-100 relative">
                    
                    {/* MODE: EDIT */}
                    {mode === 'edit' && (
                        <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-3xl mx-auto space-y-6">
                                {/* Introdução */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cabeçalho / Partes</h4>
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 leading-relaxed font-semibold">
                                        {data.title}
                                    </div>
                                    <textarea 
                                        className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 min-h-[100px]"
                                        value={data.header}
                                        onChange={(e) => setData({ ...data, header: e.target.value })}
                                    />
                                </div>

                                {/* Cláusulas */}
                                {data.clauses.map((clause, index) => (
                                    <div key={clause.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group transition-all hover:border-blue-300">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap">
                                                    Cláusula {ordinal(index)}
                                                </span>
                                                <input 
                                                    type="text" 
                                                    className="font-bold text-slate-800 text-sm border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full bg-transparent uppercase"
                                                    value={clause.title}
                                                    onChange={(e) => handleUpdateClause(clause.id, 'title', e.target.value)}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveClause(clause.id)}
                                                className="text-slate-300 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remover Cláusula"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <textarea 
                                            className="w-full text-sm text-slate-600 leading-relaxed border border-slate-100 rounded-lg p-3 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors min-h-[120px]"
                                            value={clause.text}
                                            onChange={(e) => handleUpdateClause(clause.id, 'text', e.target.value)}
                                        />
                                    </div>
                                ))}

                                <button 
                                    onClick={handleAddClause}
                                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <PlusIcon /> Adicionar Cláusula
                                </button>

                                {/* Footer */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Encerramento</h4>
                                    <textarea 
                                        className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 min-h-[60px]"
                                        value={data.footer}
                                        onChange={(e) => setData({ ...data, footer: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODE: PREVIEW */}
                    {mode === 'preview' && (
                        <div className="h-full overflow-y-auto p-8 custom-scrollbar flex justify-center bg-slate-200">
                            <div className="bg-white shadow-2xl w-[21cm] min-h-[29.7cm] p-[2.5cm] text-justify text-black font-serif text-[11pt] leading-relaxed relative">
                                {/* Header */}
                                <div className="text-center font-bold mb-[1cm] text-[12pt] uppercase px-4 leading-normal">{data.title}</div>
                                
                                {/* Intro */}
                                <p className="mb-4 indent-[1.5cm]" dangerouslySetInnerHTML={{ __html: data.header }} />

                                {/* Clauses */}
                                {data.clauses.map((clause, index) => (
                                    <div key={clause.id}>
                                        <h2 className="mt-5 mb-2 font-bold uppercase text-[11pt]">
                                            CLÁUSULA {ordinal(index)} - {clause.title}
                                        </h2>
                                        <p className="mb-4 indent-[1.5cm]" dangerouslySetInnerHTML={{ __html: clause.text.replace(/\n/g, '<br/>') }} />
                                    </div>
                                ))}

                                {/* Footer */}
                                <p className="mb-4 indent-[1.5cm]">{data.footer}</p>

                                <br/><br/>
                                <p className="text-center">{data.city}, {data.date}.</p>

                                <div className="flex justify-between mt-[3cm] gap-8">
                                    <div className="w-[45%] border-t border-black text-center pt-2 text-[10pt]">
                                        <strong>{data.companyName}</strong><br/>CONTRATADA
                                    </div>
                                    <div className="w-[45%] border-t border-black text-center pt-2 text-[10pt]">
                                        <strong>{data.clientName}</strong><br/>CONTRATANTE
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-all flex items-center gap-2 text-sm"
                    >
                        <SaveIcon /> Imprimir / Salvar PDF
                    </button>
                </div>
            </div>
        </ModalContainer>
    );
};
