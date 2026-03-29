import React, { useState } from 'react';
import { ModalContainer, InputGroup } from './CommonUI';
import { SearchIcon, CloseIcon, CheckIcon, FolderIcon, CalculatorIcon, LayoutIcon, ChartIcon } from './Icons';
import { getProjectByProtocol, acknowledgeObservation } from '../services/firebaseService';

interface ProtocolConsultModalProps {
    onClose: () => void;
    initialCode?: string;
}

export const ProtocolConsultModal: React.FC<ProtocolConsultModalProps> = ({ onClose, initialCode }) => {
    const [protocol, setProtocol] = useState(initialCode || "");
    const [loading, setLoading] = useState(false);
    const [project, setProject] = useState<any | null>(null);
    const [activeDoc, setActiveDoc] = useState<'budget' | 'contract' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const performSearch = React.useCallback(async (code: string) => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        setProject(null);

        try {
            const data = await getProjectByProtocol(code);
            if (data) {
                setProject(data);
            } else {
                setError("Protocolo não encontrado ou inválido.");
            }
        } catch (err) {
            setError("Erro ao consultar protocolo.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (initialCode) {
            performSearch(initialCode);
        }
    }, [initialCode, performSearch]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(protocol);
    };

    const handleAcknowledge = async (obsId: string) => {
        if (!project) return;
        try {
            await acknowledgeObservation(project.id, obsId);
            // Atualizar localmente
            setProject((prev: any) => ({
                ...prev,
                observations: prev.observations.map((o: any) => 
                    o.id === obsId ? { ...o, acknowledged: true, acknowledgedAt: new Date().toISOString() } : o
                )
            }));
        } catch (e) {
            alert("Erro ao confirmar ciência.");
        }
    };

    return (
        <ModalContainer onClose={onClose} zIndex="z-[9000]">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 p-6 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg"><SearchIcon /></div>
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-tight leading-none">Consulta de Protocolo</h3>
                            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-1 opacity-70">Acompanhamento para Empreendedores</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg"><CloseIcon/></button>
                </div>

                {/* Form Search */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="flex-1 relative">
                            <input 
                                type="text"
                                placeholder="Digite seu protocolo (Ex: ELD-001/2026)"
                                className="w-full bg-white border border-slate-300 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 uppercase"
                                value={protocol}
                                onChange={(e) => setProtocol(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading || !protocol.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-8 rounded-2xl font-black uppercase text-xs transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            {loading ? 'Buscando...' : <><SearchIcon /> Consultar</>}
                        </button>
                    </form>
                    {error && <div className="mt-3 text-red-500 text-[10px] font-black uppercase text-center">{error}</div>}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    {!project && !loading && !error && (
                        <div className="py-20 flex flex-col items-center text-center opacity-30">
                            <div className="w-20 h-20 border-4 border-slate-200 border-dashed rounded-full flex items-center justify-center mb-4"><FolderIcon /></div>
                            <p className="font-bold text-slate-400 uppercase text-xs">Insira o protocolo acima para visualizar os dados</p>
                        </div>
                    )}

                    {project && (
                        <div className="animate-fade-in space-y-8">
                            {/* Project Identification */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Empreendimento Identificado</span>
                                    <h4 className="text-xl font-black text-slate-900 uppercase leading-none">{project.name}</h4>
                                    <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase flex items-center gap-2">
                                        <span>{project.company}</span>
                                        <span className="opacity-30">•</span>
                                        <span>{project.city}</span>
                                    </div>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Cód. Protocolo</span>
                                    <span className="text-sm font-black text-blue-600 tracking-tighter">{project.projectCode}</span>
                                </div>
                            </div>

                            {/* Project Development Progress */}
                            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
                                <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span>Desenvolvimento Global do Projeto</span>
                                    <span className="text-blue-600">{project.progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                                        style={{ width: `${project.progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Project Documents (Orçamento / Contrato) */}
                            <div className="grid grid-cols-2 gap-4">
                                {project.visibility.budget && (
                                    <button 
                                        onClick={() => setActiveDoc('budget')}
                                        className="p-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-3 hover:border-blue-200 transition-all group"
                                    >
                                        <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600"><FolderIcon /></div>
                                        <div className="text-left">
                                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Acessar</span>
                                            <span className="text-xs font-black text-slate-700 uppercase">Orçamento</span>
                                        </div>
                                    </button>
                                )}
                                {project.visibility.contract && (
                                    <button 
                                        onClick={() => setActiveDoc('contract')}
                                        className="p-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-3 hover:border-blue-200 transition-all group"
                                    >
                                        <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600"><CheckIcon /></div>
                                        <div className="text-left">
                                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Acessar</span>
                                            <span className="text-xs font-black text-slate-700 uppercase">Contrato</span>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* Project Status (Fases) */}
                            <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> 
                                    Fases do Projeto
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {project.visibility.evte && <StatusCard label="Viabilidade (EVTE)" status={project.status.evte} icon={<ChartIcon />} />}
                                    {project.visibility.water && <StatusCard label="Projeto de Água" status={project.status.water} icon={<CalculatorIcon />} />}
                                    {project.visibility.sewage && <StatusCard label="Projeto de Esgoto" status={project.status.sewage} icon={<LayoutIcon />} />}
                                </div>
                                {!project.visibility.evte && !project.visibility.water && !project.visibility.sewage && (
                                    <div className="p-10 border-2 border-slate-50 border-dashed rounded-3xl text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                        Nenhuma fase técnica iniciada ou exibida.
                                    </div>
                                )}
                            </div>

                            {/* Observations */}
                            <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div> 
                                    Atualizações e Observações
                                </h5>
                                <div className="space-y-3">
                                    {project.observations.length === 0 ? (
                                        <div className="p-8 border-2 border-slate-50 border-dashed rounded-3xl text-center text-[10px] font-bold text-slate-300 uppercase">
                                            Nenhuma observação registrada até o momento.
                                        </div>
                                    ) : (
                                        project.observations.map((obs: any) => (
                                            <div key={obs.id} className="bg-white border-2 border-slate-100 rounded-2xl p-5 hover:border-blue-100 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(obs.date).toLocaleDateString('pt-BR')}</span>
                                                    {!obs.acknowledged ? (
                                                        <button 
                                                            onClick={() => handleAcknowledge(obs.id)}
                                                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all active:scale-95 shadow-sm"
                                                        >
                                                            Dar Ciente
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-emerald-600">
                                                            <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center"><CheckIcon /></div>
                                                            <span className="text-[9px] font-black uppercase">Ciente em {new Date(obs.acknowledgedAt).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 leading-relaxed">{obs.text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub-modais de Documentos */}
                {activeDoc && (
                    <div className="absolute inset-0 z-[10000] bg-white animate-fade-in flex flex-col p-8 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-2xl font-black text-slate-900 uppercase">
                                {activeDoc === 'budget' ? 'Visualização de Orçamento' : 'Visualização de Contrato'}
                            </h4>
                            <button onClick={() => setActiveDoc(null)} className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"><CloseIcon /></button>
                        </div>
                        
                        {activeDoc === 'budget' && project.budget && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                    <div>
                                        <span className="block text-[10px] font-black text-blue-400 uppercase">Investimento Total</span>
                                        <span className="text-2xl font-black text-blue-700">R$ {project.budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-black text-blue-400 uppercase">Status</span>
                                        <span className="text-xs font-black text-blue-600 uppercase">{project.budget.status}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escopo do Serviço</h5>
                                    {project.budget.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                                            <span className="text-xs font-bold text-slate-700 uppercase">{item.desc}</span>
                                            <span className="text-[10px] font-black text-slate-400">{item.qty} {item.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeDoc === 'contract' && project.contract && (
                            <div className="space-y-6">
                                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black">HF</div>
                                        <div>
                                            <h5 className="font-black text-slate-900 uppercase leading-none">Contrato de Prestação de Serviço</h5>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Firmado em {new Date(project.contract.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-xs font-bold text-slate-600 leading-relaxed text-justify">
                                        <p>Contratada: {project.contract.company}</p>
                                        <p>Contratante: {project.company}</p>
                                        <p className="opacity-50 mt-10">O contrato completo pode ser solicitado formalmente, esta é uma visualização resumida de autenticação do serviço.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Este portal é de uso informativo. Contate o engenheiro responsável para dúvidas técnicas.</p>
                </div>
            </div>
        </ModalContainer>
    );
};

const StatusCard = ({ label, status, icon }: { label: string, status: string, icon: any }) => {
    const isDone = status === 'Emitida' || status === 'Concluído';
    return (
        <div className={`p-4 rounded-2xl border-2 transition-all group ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-colors ${isDone ? 'bg-emerald-200 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                {icon}
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1 group-hover:text-slate-600">{label}</div>
            <div className={`text-xs font-black uppercase ${isDone ? 'text-emerald-700' : 'text-orange-500'}`}>{status}</div>
        </div>
    );
};
