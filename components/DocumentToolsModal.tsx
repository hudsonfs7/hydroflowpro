import React, { useMemo, useState } from 'react';
import { ModalContainer } from './CommonUI';
import { CloseIcon, FilePdfIcon, FileSignatureIcon, CalculatorIcon } from './Icons';
import { generateMD } from '../services/mdService';
import { generateReport } from '../services/reportService';
import { ContractEditorModal } from './ContractEditorModal';
import { BudgetEditorModal } from './BudgetEditorModal';

interface DocumentToolsModalProps {
    onClose: () => void;
    projectData: any;
    userOrgName?: string;
}

export const DocumentToolsModal: React.FC<DocumentToolsModalProps> = ({ onClose, projectData, userOrgName }) => {
    const [status, setStatus] = useState<string | null>(null);
    const [showContractEditor, setShowContractEditor] = useState(false);
    const [showBudgetEditor, setShowBudgetEditor] = useState(false);

    const normalizedProjectData = useMemo(() => {
        const snapshot = projectData?.snapshot;
        const settings = projectData?.settings || {};
        const flowUnit = projectData?.flowUnit || settings?.flowUnit || 'l/s';
        const results = snapshot?.results || projectData?.results || [];
        const totalFlowSI = results.reduce((sum: number, result: any) => sum + Math.abs(result?.flowRate || 0), 0);

        const flowDisplay = flowUnit === 'm3/h'
            ? totalFlowSI * 3600
            : flowUnit === 'l/s'
                ? totalFlowSI * 1000
                : totalFlowSI / 0.0000630901964;

        return {
            ...projectData,
            metadata: projectData?.metadata || projectData?.projectMetadata || null,
            projectMetadata: projectData?.projectMetadata || projectData?.metadata || null,
            nodes: snapshot?.nodes || projectData?.nodes || [],
            pipes: snapshot?.pipes || projectData?.pipes || [],
            results,
            nodeResults: snapshot?.nodeResults || projectData?.nodeResults || [],
            materials: snapshot?.materials || projectData?.materials || [],
            flowUnit,
            unitSystem: projectData?.unitSystem || settings?.unitSystem,
            calcMethod: projectData?.calcMethod || settings?.calcMethod,
            globalC: projectData?.globalC ?? settings?.globalC,
            globalRoughness: projectData?.globalRoughness ?? settings?.globalRoughness,
            totals: projectData?.totals || {
                flowDisplay: Number.isFinite(flowDisplay) ? flowDisplay.toFixed(2) : '0.00'
            }
        };
    }, [projectData]);

    const handleContract = () => {
        if (!normalizedProjectData?.metadata) {
            alert("Dados do projeto incompletos para gerar contrato.");
            return;
        }
        setShowContractEditor(true);
    };

    const handleBudget = () => {
        if (!normalizedProjectData?.metadata) {
            alert("Dados do projeto incompletos para gerar orçamento.");
            return;
        }
        setShowBudgetEditor(true);
    };

    const handleMemorial = () => {
        const { results, nodes, pipes, nodeResults, metadata, mdConfig, settings } = normalizedProjectData;

        if (results.length === 0) {
            if (!confirm("Este projeto parece não ter resultados de cálculo salvos. O memorial pode ficar incompleto. Deseja continuar?")) {
                return;
            }
        }

        setStatus("Processando Memorial...");
        setTimeout(() => {
            const finalMdConfig = {
                ...(mdConfig || {}),
                title: metadata?.name || 'Projeto Hidráulico',
                client: metadata?.company || 'Cliente',
                location: metadata?.city || 'Local',
                company: metadata?.consultant || 'Consultoria'
            };

            generateMD(
                finalMdConfig,
                nodes,
                pipes,
                results,
                nodeResults,
                settings?.calcMethod || normalizedProjectData.calcMethod || 'Darcy-Weisbach',
                settings?.flowUnit || normalizedProjectData.flowUnit || 'l/s'
            );
            setStatus(null);
            onClose();
        }, 500);
    };

    const handleReport = () => {
        if (normalizedProjectData.results.length === 0) {
            if (!confirm("Este projeto parece não ter resultados de cálculo salvos. O relatório pode ficar incompleto. Deseja continuar?")) {
                return;
            }
        }

        setStatus("Processando Relatório...");
        setTimeout(() => {
            generateReport(normalizedProjectData);
            setStatus(null);
            onClose();
        }, 500);
    };

    if (showContractEditor && normalizedProjectData?.metadata) {
        return (
            <ContractEditorModal
                metadata={normalizedProjectData.metadata}
                fullProjectData={normalizedProjectData}
                userOrgName={userOrgName}
                onClose={() => setShowContractEditor(false)}
            />
        );
    }

    if (showBudgetEditor && normalizedProjectData?.metadata) {
        return (
            <BudgetEditorModal
                metadata={normalizedProjectData.metadata}
                userOrgName={userOrgName}
                onClose={() => setShowBudgetEditor(false)}
            />
        );
    }

    return (
        <ModalContainer onClose={onClose} zIndex="z-[7000]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                        Documentação do Projeto
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><CloseIcon /></button>
                </div>

                <div className="p-8 grid grid-cols-1 gap-4">
                    <button
                        onClick={handleBudget}
                        disabled={!!status}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                            <CalculatorIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Gerar Orçamento</h4>
                            <p className="text-xs text-slate-500 mt-1">Proposta comercial detalhada baseada nos lotes e itens do projeto.</p>
                        </div>
                    </button>

                    <button
                        onClick={handleContract}
                        disabled={!!status}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                            <FileSignatureIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Gerar Contrato</h4>
                            <p className="text-xs text-slate-500 mt-1">Minuta contratual automática baseada nos dados cadastrais do empreendimento.</p>
                        </div>
                    </button>

                    <button
                        onClick={handleMemorial}
                        disabled={!!status}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                            <FilePdfIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Gerar Memorial Descritivo</h4>
                            <p className="text-xs text-slate-500 mt-1">Relatório técnico completo (ABNT) com tabelas de cálculo e resultados da simulação.</p>
                        </div>
                    </button>

                    <button
                        onClick={handleReport}
                        disabled={!!status}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all group text-left shadow-sm"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm text-slate-600 group-hover:scale-110 transition-transform">
                            <FilePdfIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm uppercase">Relatório Técnico</h4>
                            <p className="text-xs text-slate-500 mt-1">Documento técnico da rede com tabelas de pressão, vazão e croqui ilustrativo.</p>
                        </div>
                    </button>
                </div>

                {status && (
                    <div className="p-4 bg-blue-50 text-blue-700 text-center text-xs font-bold animate-pulse border-t border-blue-100">
                        {status}
                    </div>
                )}
            </div>
        </ModalContainer>
    );
};
