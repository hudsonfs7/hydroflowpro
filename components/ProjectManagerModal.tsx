
import React, { useState, useEffect, useMemo } from 'react';
import { ProjectMetadata, User } from '../types';
import { getCloudProjects, deleteProjectFromCloud } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { DocumentToolsModal } from './DocumentToolsModal';
import { BudgetEditorModal } from './BudgetEditorModal';
import { ContractEditorModal } from './ContractEditorModal';
import { 
    PlusIcon, FolderIcon, EyeIcon, SettingsIcon, 
    CloseIcon, SearchIcon, CheckIcon,
    FileTextIcon, TrashIcon, UsersIcon, CalculatorIcon,
    DropIcon, WaypointIcon, BuildingIcon, FileSignatureIcon, WalletIcon, MapIcon
} from './Icons';

interface ProjectManagerModalProps {
    onClose: () => void;
    onOpenProject: (data: any) => void;
    onCreateNew: () => void;
    onEditMetadata: (selected: any) => void;
    onOpenAdmin?: () => void;
    onOpenFinance?: () => void; 
    currentUser: User | null;
    refreshKey?: number;
    userOrgName?: string;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ 
    onClose, onOpenProject, onCreateNew, onEditMetadata, onOpenAdmin, onOpenFinance, currentUser, refreshKey = 0, userOrgName 
}) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
    const [localRefresh, setLocalRefresh] = useState(0);
    const [deleteStep, setDeleteStep] = useState<'idle' | 'confirming' | 'deleting'>('idle');
    const [showDocsId, setShowDocsId] = useState<string | null>(null);
    const [showBudgetEditorId, setShowBudgetEditorId] = useState<string | null>(null);
    const [showContractEditorId, setShowContractEditorId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const orgFilter = currentUser?.role === 'master' ? 'MASTER_ACCESS' : currentUser?.organizationId;
            const list = await getCloudProjects(orgFilter);
            setProjects(list);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [refreshKey, localRefresh, currentUser]);

    useEffect(() => {
        if (deleteStep === 'confirming') setDeleteStep('idle');
    }, [selectedId]);

    const selectedProject = projects.find(p => p.id === selectedId);
    
    const filteredProjects = projects.filter(p => {
        const name = (p.name || "").toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const handleDeleteClick = async () => {
        if (!selectedId) return;
        if (deleteStep === 'idle') {
            setDeleteStep('confirming');
            setTimeout(() => { setDeleteStep(prev => prev === 'confirming' ? 'idle' : prev); }, 3000);
            return;
        }
        if (deleteStep === 'confirming') {
            setDeleteStep('deleting');
            try {
                await deleteProjectFromCloud(selectedId);
                setSelectedId(null);
                setDeleteStep('idle');
                setLocalRefresh(prev => prev + 1);
            } catch (e: any) {
                alert("Erro ao deletar: " + e.message);
                setDeleteStep('idle');
            }
        }
    };

    const renderDetails = () => {
        const p = projects.find(proj => proj.id === showDetailsId);
        if (!p) return null;
        let data: ProjectMetadata = {} as ProjectMetadata;
        try { data = JSON.parse(p.data).metadata || {}; } catch(e) {}

        const currentK = (data.useK1 ? 1.2 : 1.0) * (data.useK2 ? 1.5 : 1.0);
        const hours = data.supplyHours || 24;
        const seconds = hours * 3600;
        
        const popRes = (data.lotsHab || 0) * (data.habDomRate || 2.8);
        const qRes = seconds > 0 ? ((popRes * (data.perCapita || 120)) / seconds) * currentK : 0;
        const qCom = seconds > 0 ? (((data.lotsCom || 0) * (data.consumptionCom || 500)) / seconds) * currentK : 0;
        
        const popInst = popRes * ((data.attendanceRate || 100) / 100);
        const qInst = (data.lotsInst > 0 && seconds > 0) ? ((popInst * (data.consumptionInst || 500)) / seconds) * currentK : 0;
        
        const qTotal = qRes + qCom + qInst;

        const totalLotes = (data.lotsHab || 0) + (data.lotsCom || 0) + (data.lotsInst || 0);
        
        let evteStatus = 'pending';
        let vencimento = '---';
        if (data.evteDate) {
            const dtEmissao = new Date(data.evteDate);
            const dtVenc = new Date(dtEmissao);
            dtVenc.setFullYear(dtEmissao.getFullYear() + 1);
            vencimento = dtVenc.toLocaleDateString('pt-BR');
            if (dtVenc < new Date()) evteStatus = 'expired';
            else evteStatus = 'valid';
        }

        return (
            <ModalContainer onClose={() => setShowDetailsId(null)} zIndex="z-[6000]" closeOnBackdropClick={false}>
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[95vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <FolderIcon />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{p.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-bold">
                                    <span className="uppercase text-blue-600">{data.company || 'Empresa N/A'}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="uppercase">{data.city || 'Local N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setShowDetailsId(null)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-400 transition-all"><CloseIcon/></button>
                    </div>
                    
                    <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto shrink-0">
                        <button onClick={() => { setShowDetailsId(null); setShowBudgetEditorId(showDetailsId); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all uppercase tracking-tighter"><CalculatorIcon /> Orçamento</button>
                        <button onClick={() => { setShowDetailsId(null); setShowContractEditorId(showDetailsId); }} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 transition-all uppercase tracking-tighter"><FileSignatureIcon /> Contrato</button>
                        <button onClick={() => onOpenFinance && onOpenFinance()} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all uppercase tracking-tighter"><BuildingIcon /> Financeiro</button>
                        <div className="flex-1"></div>
                        <button onClick={() => { setShowDetailsId(null); onOpenProject(JSON.parse(p.data)); }} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition-all shadow-md uppercase">Abrir Projeto</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div> Resumo de Lotes
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Residencial</span><span className="text-sm font-black text-slate-800">{data.lotsHab}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Comercial</span><span className="text-sm font-black text-slate-800">{data.lotsCom}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Institucional</span><span className="text-sm font-black text-slate-800">{data.lotsInst}</span></div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center"><span className="text-xs font-black text-blue-600 uppercase">Total Lotes</span><span className="text-lg font-black text-blue-700">{totalLotes}</span></div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-600 rounded-full"></div> Demandas de Projeto
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Vazão Res.</span><span className="text-sm font-mono font-bold text-slate-700">{qRes.toFixed(3)} L/s</span></div>
                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Vazão Com.</span><span className="text-sm font-mono font-bold text-slate-700">{qCom.toFixed(3)} L/s</span></div>
                                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Vazão Inst.</span><span className="text-sm font-mono font-bold text-slate-700">{qInst.toFixed(3)} L/s</span></div>
                                    <div className="pt-2 border-t border-blue-100 flex justify-between items-center bg-blue-50/30 -mx-6 px-6 py-2">
                                        <span className="text-xs font-black text-blue-700 uppercase">Vazão Total (Q)</span>
                                        <span className="text-xl font-black text-blue-800 tracking-tighter">{qTotal.toFixed(3)} L/s</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-6 rounded-2xl border-l-8 shadow-sm ${evteStatus === 'valid' ? 'bg-white border-green-500' : evteStatus === 'expired' ? 'bg-white border-red-500' : 'bg-white border-slate-300'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Viabilidade (EVTE)</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${evteStatus === 'valid' ? 'bg-green-100 text-green-700' : evteStatus === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {evteStatus === 'valid' ? 'Vigente' : evteStatus === 'expired' ? 'Vencido' : 'Não Possui'}
                                    </span>
                                </div>
                                {data.hasEvte ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] text-slate-400 font-black uppercase">Documento nº</label>
                                            <div className="text-sm font-black text-slate-700 font-mono">{data.evteNumber}</div>
                                        </div>
                                        <div className="flex justify-between">
                                            <div>
                                                <label className="text-[9px] text-slate-400 font-black uppercase">Emissão</label>
                                                <div className="text-xs font-bold text-slate-600">{data.evteDate ? new Date(data.evteDate).toLocaleDateString() : '---'}</div>
                                            </div>
                                            <div className="text-right">
                                                <label className="text-[9px] text-slate-400 font-black uppercase">Vencimento</label>
                                                <div className={`text-xs font-bold ${evteStatus === 'expired' ? 'text-red-600' : 'text-slate-600'}`}>{vencimento}</div>
                                            </div>
                                        </div>
                                        {data.hasConstraints && (
                                            <div className="pt-3 border-t border-slate-100">
                                                <label className="text-[9px] text-orange-500 font-black uppercase block mb-1">Condicionantes</label>
                                                <div className="text-[10px] text-slate-500 leading-relaxed italic line-clamp-3">{data.constraintsText}</div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic py-8">Dados do EVTE não informados.</div>
                                )}
                            </div>
                        </div>

                        {data.hasConstraints && (
                            <div className="mt-6 bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                                <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">Texto das Condicionantes</h5>
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{data.constraintsText}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                        <button onClick={() => setShowDetailsId(null)} className="px-8 py-3 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">Fechar</button>
                    </div>
                </div>
            </ModalContainer>
        );
    };

    const getDeleteLabel = () => {
        if (deleteStep === 'deleting') return "Apagando...";
        if (deleteStep === 'confirming') return "Confirmar?";
        return "Deletar";
    };

    const getProjectData = (id: string) => {
        const p = projects.find(proj => proj.id === id);
        if (!p) return null;
        try {
            return JSON.parse(p.data);
        } catch (e) {
            return null;
        }
    };

    const getProjectMetadata = (id: string) => {
        const pData = getProjectData(id);
        return pData ? pData.metadata : null;
    };

    return (
        <ModalContainer onClose={onClose} zIndex="z-[5500]" closeOnBackdropClick={false}>
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-[95vw] h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-slide-up-center">
                <div className="h-16 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg z-10">
                    <div className="flex items-center gap-1">
                        <h2 className="text-white text-lg font-black hidden md:block mr-2 tracking-tight whitespace-nowrap">Projetos Cadastrados</h2>
                        <div className="w-[1px] h-8 bg-slate-700 mx-2 hidden md:block"></div>
                        <RibbonButton icon={<MapIcon/>} label="Abrir Mapa" disabled={!selectedId} onClick={() => selectedProject && onOpenProject(JSON.parse(selectedProject.data))} active={!!selectedId} />
                        <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                        <RibbonButton icon={<PlusIcon/>} label="Criar Projeto" onClick={onCreateNew} active={!selectedId} />
                        <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                        <RibbonButton icon={<EyeIcon/>} label="Ver Detalhes" disabled={!selectedId} onClick={() => setShowDetailsId(selectedId)} />
                        <RibbonButton icon={<SettingsIcon/>} label="Editar" disabled={!selectedId} onClick={() => onEditMetadata(selectedProject)} />
                        <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                        {/* Financeiro agora está sempre habilitado */}
                        <RibbonButton icon={<BuildingIcon/>} label="Financeiro" onClick={() => onOpenFinance && onOpenFinance()} />
                        <RibbonButton icon={<FileTextIcon/>} label="Documentos" disabled={!selectedId} onClick={() => setShowDocsId(selectedId)} />
                        <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                        <RibbonButton icon={<TrashIcon/>} label={getDeleteLabel()} disabled={!selectedId || deleteStep === 'deleting'} onClick={handleDeleteClick} variant={deleteStep === 'confirming' ? 'confirm-danger' : 'danger'} />
                        
                        {currentUser?.role === 'master' && (
                            <>
                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                                <RibbonButton icon={<UsersIcon/>} label="Admin" onClick={onOpenAdmin} variant="admin" />
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input type="text" placeholder="Filtrar..." className="bg-slate-700 text-white text-xs rounded-lg py-2 pl-8 pr-4 border-none focus:ring-2 focus:ring-blue-500 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
                            <div className="absolute left-2.5 top-2 text-slate-400"><SearchIcon/></div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><CloseIcon/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-[1000px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th rowSpan={2} className="px-3 py-2 border-b border-r border-slate-200 align-middle">Projeto</th>
                                        <th rowSpan={2} className="px-3 py-2 border-b border-r border-slate-200 align-middle">Empresa</th>
                                        <th rowSpan={2} className="px-3 py-2 border-b border-r border-slate-200 align-middle">Cidade</th>
                                        <th colSpan={3} className="px-3 py-1 border-b border-r border-slate-200 text-center bg-slate-200/20">Lotes</th>
                                        <th rowSpan={2} className="px-3 py-2 border-b border-slate-200 text-right align-middle">Data</th>
                                    </tr>
                                    <tr className="bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        <th className="px-2 py-1 border-b border-r border-slate-200 text-center w-16">Hab</th>
                                        <th className="px-2 py-1 border-b border-r border-slate-200 text-center w-16">Com</th>
                                        <th className="px-2 py-1 border-b border-r border-slate-200 text-center w-16">Inst</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={7} className="p-20 text-center text-slate-400">Carregando banco de dados...</td></tr>
                                    ) : error ? (
                                        <tr><td colSpan={7} className="p-20 text-center text-red-500">{error}</td></tr>
                                    ) : filteredProjects.length === 0 ? (
                                        <tr><td colSpan={7} className="p-20 text-center text-slate-400">Nenhum projeto encontrado.</td></tr>
                                    ) : (
                                        filteredProjects.map(p => {
                                            let meta: any = {};
                                            try { meta = JSON.parse(p.data).metadata || {}; } catch(e) {}
                                            const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '---';
                                            const isSelected = selectedId === p.id;
                                            return (
                                                <tr key={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedId(isSelected ? null : p.id); }} onDoubleClick={() => onOpenProject(JSON.parse(p.data))} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                                    <td className={`p-3 border-r border-slate-100 text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{p.name}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-slate-600">{meta.company || '---'}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-slate-600">{meta.city || '---'}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-center font-mono text-slate-500 bg-slate-50/20">{meta.lotsHab || 0}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-center font-mono text-slate-500 bg-slate-50/20">{meta.lotsCom || 0}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-center font-mono text-slate-500 bg-slate-50/20">{meta.lotsInst || 0}</td>
                                                    <td className="p-3 text-xs text-slate-400 text-right">{date}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase">
                        <span>Total: {filteredProjects.length}</span>
                        <span>•</span>
                        <span>Usuário: {currentUser?.username || 'Desconhecido'}</span>
                    </div>
                </div>
            </div>
            
            {renderDetails()}
            {showDocsId && <DocumentToolsModal onClose={() => setShowDocsId(null)} projectData={getProjectData(showDocsId)} userOrgName={userOrgName} />}
            {showBudgetEditorId && getProjectMetadata(showBudgetEditorId) && (
                <BudgetEditorModal 
                    metadata={getProjectMetadata(showBudgetEditorId)}
                    userOrgName={userOrgName}
                    onClose={() => setShowBudgetEditorId(null)}
                />
            )}
            {showContractEditorId && getProjectMetadata(showContractEditorId) && (
                <ContractEditorModal 
                    metadata={getProjectMetadata(showContractEditorId)}
                    fullProjectData={getProjectData(showContractEditorId)}
                    userOrgName={userOrgName}
                    onClose={() => setShowContractEditorId(null)}
                />
            )}
        </ModalContainer>
    );
};

const RibbonButton = ({ icon, label, onClick, disabled, active, variant = 'default' }: any) => {
    const baseClass = "flex flex-col items-center justify-center h-12 px-4 rounded-lg transition-all gap-1 outline-none relative overflow-hidden";
    let colorClass = "";
    if (disabled) colorClass = "opacity-30 grayscale cursor-not-allowed text-slate-300";
    else if (active) colorClass = "bg-blue-600 text-white hover:bg-blue-500";
    else if (variant === 'danger') colorClass = "text-red-400 hover:bg-red-900/30 hover:text-red-200";
    else if (variant === 'confirm-danger') colorClass = "bg-red-600 text-white animate-pulse shadow-inner font-black";
    else if (variant === 'admin') colorClass = "text-indigo-400 hover:bg-indigo-900/30 hover:text-indigo-200";
    else colorClass = "text-slate-300 hover:bg-slate-700 hover:text-white";

    return (
        <button type="button" disabled={disabled} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} className={`${baseClass} ${colorClass}`}>
            <span className="text-lg relative z-10">{icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight relative z-10">{label}</span>
        </button>
    );
};
