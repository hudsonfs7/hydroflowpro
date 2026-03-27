import React from 'react';
import { ModalContainer } from './CommonUI';
import { CloseIcon, FileTextIcon, BuildingIcon, SettingsIcon } from './Icons';

interface OpenProjectToolsModalProps {
    projectName?: string;
    onClose: () => void;
    onOpenDocuments: () => void;
    onOpenFinance: () => void;
    onEditMetadata: () => void;
}

export const OpenProjectToolsModal: React.FC<OpenProjectToolsModalProps> = ({
    projectName,
    onClose,
    onOpenDocuments,
    onOpenFinance,
    onEditMetadata
}) => {
    return (
        <ModalContainer onClose={onClose} zIndex="z-[7600]" closeOnBackdropClick={false}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-700 text-lg">Projeto Aberto</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{projectName || 'Sem projeto carregado'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 gap-4">
                    <button
                        onClick={onOpenDocuments}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-slate-700 group-hover:scale-110 transition-transform">
                            <FileTextIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Documentos do Projeto Aberto</h4>
                            <p className="text-xs text-slate-500 mt-1">Acesso às rotinas de geração de documentos do projeto carregado no mapa.</p>
                        </div>
                    </button>

                    <button
                        onClick={onOpenFinance}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-indigo-700 group-hover:scale-110 transition-transform">
                            <BuildingIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Financeiro do Projeto Aberto</h4>
                            <p className="text-xs text-slate-500 mt-1">Gerencie orçamento e dados financeiros apenas para o empreendimento ativo.</p>
                        </div>
                    </button>

                    <button
                        onClick={onEditMetadata}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-blue-700 group-hover:scale-110 transition-transform">
                            <SettingsIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Editar Informações do Projeto Aberto</h4>
                            <p className="text-xs text-slate-500 mt-1">Atualize os dados cadastrais somente do projeto que está carregado no sistema.</p>
                        </div>
                    </button>
                </div>
            </div>
        </ModalContainer>
    );
};
