
import React, { useState, useMemo, useRef } from 'react';
import { Node, FlowUnit } from '../types';
import { WellProfile } from './WellProfile';
import { SingularLossesTable } from './SingularLossesTable';
import { PumpCurveManager } from './PumpCurveManager';
import { SmartNumberInput, ModalContainer } from './CommonUI';
import { CloseIcon, MountainIcon, TrashIcon, CheckIcon, CalculatorIcon, SettingsIcon, SaveIcon, UploadIcon, FilePdfIcon } from './Icons';
import { convertFlowToSI, convertFlowFromSI } from '../services/calcService';
import { GRAVITY } from '../constants';

interface WellEditorModalProps {
    node: Node;
    updateNode: (id: string, data: Partial<Node>) => void;
    onClose: () => void;
    onDelete: () => void;
    flowUnit: FlowUnit;
    fetchElevation: (lat: number, lng: number) => Promise<number | null>;
}

const AlignedInputGroup = ({ label, children, subLabel }: { label: string; children?: React.ReactNode; subLabel?: string }) => (
    <div className="flex flex-col h-full w-full">
        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 h-4 flex items-end leading-none truncate tracking-wide" title={label}>{label}</label>
        <div className="flex-1 w-full">
            {children}
        </div>
        {subLabel && <p className="text-[9px] text-slate-400 mt-1 leading-tight">{subLabel}</p>}
    </div>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button 
        type="button"
        onClick={onClick}
        className={`relative pb-3 pt-3 px-3 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 select-none outline-none ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'}`}
    >
        <span className="text-base">{icon}</span> {label}
        {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
    </button>
);

export const WellEditorModal: React.FC<WellEditorModalProps> = ({ 
    node, updateNode, onClose, onDelete, flowUnit, fetchElevation 
}) => {
    const [activeTab, setActiveTab] = useState<'geometry' | 'test' | 'pump' | 'losses' | 'curve' | 'analysis'>('geometry');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const analysis = useMemo(() => {
        const D_mm = node.wellDiameter || 0;
        const D = D_mm / 1000; 
        const NE = node.staticLevel || 0; 
        const ND_teste = node.dynamicLevel || 0; 
        const qTesteSI = convertFlowToSI(node.testFlow || 0, flowUnit);
        const Q_teste = qTesteSI * 3600; 
        const R = node.recoveryRate || 0; 
        const T_op = node.maxOpTime || 24; 
        const PT = node.wellDepth || 0; 
        const HS = node.minSubmergence || 2; 
        const MS = node.safetyMargin || 10; 
        const qBombaSI = convertFlowToSI(node.pumpFlow || 0, flowUnit);
        const Q_bomba = qBombaSI * 3600; 
        const A = Math.PI * Math.pow(D / 2, 2); 
        const S_teste = Math.max(0, ND_teste - NE); 
        const V_arm = A * S_teste; 
        const T_exaust = Q_teste > 0 ? V_arm / Q_teste : 0; 
        const Q_poco = A * R; 
        const Sc = S_teste > 0 ? Q_teste / S_teste : 0;
        const S_oper = Sc > 0 ? Q_bomba / Sc : 0;
        const ND_oper = NE + S_oper;
        const NO = ND_oper + Math.max(HS, MS);

        const alerts: string[] = [];
        let status: 'ok' | 'warning' | 'danger' = 'ok';
        if (NO > PT - 2 && PT > 0) { alerts.push("Risco de sedimentação: Bomba < 2m do fundo."); status = 'danger'; }
        if (ND_oper > NO && Q_bomba > 0) { alerts.push("Cavitação: ND abaixo da bomba."); status = 'danger'; }
        if (Q_bomba > Q_poco && Q_bomba > 0) { alerts.push(`Superexploração: Q_bomba > Recarga (${Q_poco.toFixed(2)}).`); status = 'warning'; }
        if (T_exaust < T_op && T_exaust > 0 && Q_bomba > Q_poco) { alerts.push(`Operação Intermitente: Exaure em ${T_exaust.toFixed(1)}h.`); status = 'warning'; }

        const dailyVol = Q_bomba * T_op; 
        const hoseLength = node.pumpDepth || 0;
        let hoseHeadLoss = 0;
        if (hoseLength > 0 && (node.pumpDiameter || 0) > 0 && qBombaSI > 0) {
            const C = node.pumpRoughnessC || 120; 
            const D_m = (node.pumpDiameter || 0) / 1000;
            const J = 10.643 * Math.pow(qBombaSI, 1.852) * Math.pow(C, -1.852) * Math.pow(D_m, -4.87);
            hoseHeadLoss = J * hoseLength;
        }

        let singularHeadLoss = 0;
        if (node.wellFittings && node.wellFittings.length > 0 && (node.pumpDiameter || 0) > 0 && qBombaSI > 0) {
             const D_m = (node.pumpDiameter || 0) / 1000;
             const Area = Math.PI * Math.pow(D_m / 2, 2);
             const velocity = qBombaSI / Area;
             const kineticHead = (velocity * velocity) / (2 * GRAVITY);
             const sumK = node.wellFittings.reduce((acc, f) => acc + (f.k * f.count), 0);
             singularHeadLoss = sumK * kineticHead;
        }

        let powerCV = 0;
        const amt = node.pumpHead || 0;
        const eff = (node.pumpEfficiency || 0) / 100;
        if (amt > 0 && eff > 0 && qBombaSI > 0) powerCV = (1000 * qBombaSI * amt) / (75 * eff);

        return {
            A, S_teste, V_arm, T_exaust, Q_poco, ND_oper, NO, alerts, status, Q_bomba, Sc, D_mm, PT, NE, ND_teste, R, T_op, Q_teste,
            HS, MS, dailyVol, hoseLength, hoseHeadLoss, singularHeadLoss, totalDynamicLosses: hoseHeadLoss + singularHeadLoss, powerCV
        };
    }, [node, flowUnit]);

    const handleExportWell = () => {
        const { id, x, y, geoPosition, ...exportData } = node;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `well-config-${node.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <ModalContainer onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col md:flex-row overflow-hidden border border-slate-200">
                <div className="hidden md:flex w-72 bg-slate-50 border-r border-slate-200 p-4 flex-col relative shadow-inner">
                    <h3 className="font-bold text-slate-700 text-lg mb-2 flex items-center gap-2 absolute top-4 left-4 z-10">
                        <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg text-xs font-black tracking-wide">Pç</span>
                        {node.name}
                    </h3>
                    <div className="flex-1 w-full mt-8">
                        <WellProfile node={node} calculatedNO={analysis.NO} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0 bg-white z-20">
                        <div className="md:hidden flex items-center gap-2">
                             <span className="bg-indigo-100 text-indigo-700 p-1 rounded text-xs font-bold">Pç</span>
                             <h2 className="text-sm font-bold text-slate-800">{node.name}</h2>
                        </div>
                        <div className="hidden md:block">
                            <h2 className="text-lg font-bold text-slate-800">Editor de Poço</h2>
                            <p className="text-xs text-slate-500">Configuração técnica e dimensionamento operacional.</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handleExportWell} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><SaveIcon /></button>
                            <label className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
                                <UploadIcon /><input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if(file) { const r = new FileReader(); r.onload = (ev) => { const { id, x, y, geoPosition, type, ...safe } = JSON.parse(ev.target?.result as string); updateNode(node.id, safe); }; r.readAsText(file); } }} />
                            </label>
                            <div className="w-[1px] h-6 bg-slate-200 mx-2"></div>
                            <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><CloseIcon /></button>
                        </div>
                    </div>
                    
                    <div className="flex px-4 gap-1 border-b border-slate-100 bg-white shrink-0 overflow-x-auto z-10">
                        <TabButton active={activeTab === 'geometry'} onClick={() => setActiveTab('geometry')} label="Geometria" icon="📐" />
                        <TabButton active={activeTab === 'test'} onClick={() => setActiveTab('test')} label="Teste" icon="💧" />
                        <TabButton active={activeTab === 'pump'} onClick={() => setActiveTab('pump')} label="Motobomba" icon="⚙️" />
                        <TabButton active={activeTab === 'losses'} onClick={() => setActiveTab('losses')} label="Perdas Sing." icon="🔧" />
                        <TabButton active={activeTab === 'curve'} onClick={() => setActiveTab('curve')} label="Curva Bomba" icon="📈" />
                        <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} label="Diagnóstico" icon="📊" />
                    </div>

                    <div className="flex-1 relative w-full bg-white min-h-0">
                        {activeTab === 'geometry' && (
                            <div className="absolute inset-0 overflow-y-auto p-6 animate-fade-in custom-scrollbar">
                                <div className="space-y-6 max-w-3xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <AlignedInputGroup label="Nome do Poço">
                                            <input type="text" value={node.name} onChange={(e) => updateNode(node.id, { name: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 h-[38px] shadow-sm" />
                                        </AlignedInputGroup>
                                        <AlignedInputGroup label="Cota Terreno (CT) (m)">
                                            <div className="flex gap-2 h-[38px]">
                                                <SmartNumberInput value={node.elevation} onChange={(val: number) => updateNode(node.id, { elevation: val })} className="font-bold text-slate-700 h-full shadow-sm" />
                                                <button onClick={() => { if(node.geoPosition) fetchElevation(node.geoPosition.lat, node.geoPosition.lng).then((z) => { if(z !== null) updateNode(node.id, { elevation: z }); }); }} className="bg-indigo-50 text-indigo-600 px-3 rounded-lg hover:bg-indigo-100 h-full border border-indigo-100"><MountainIcon /></button>
                                            </div>
                                        </AlignedInputGroup>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-4 tracking-wide border-b border-slate-200 pb-2">Dimensões Físicas</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <AlignedInputGroup label="Profundidade Total (PT)" subLabel="m">
                                                <SmartNumberInput value={node.wellDepth} onChange={(val: number) => updateNode(node.id, { wellDepth: val })} className="h-[38px] shadow-sm" />
                                            </AlignedInputGroup>
                                            <AlignedInputGroup label="Diâmetro Interno (D)" subLabel="mm">
                                                <SmartNumberInput value={node.wellDiameter} onChange={(val: number) => updateNode(node.id, { wellDiameter: val })} className="h-[38px] shadow-sm" />
                                            </AlignedInputGroup>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'analysis' && (
                            <div className="absolute inset-0 overflow-y-auto p-6 animate-fade-in custom-scrollbar">
                                <div className="space-y-6 max-w-3xl mx-auto">
                                    <div className={`p-5 rounded-xl border-l-4 shadow-sm ${analysis.status === 'ok' ? 'bg-green-50 border-green-500 text-green-800' : analysis.status === 'warning' ? 'bg-orange-50 border-orange-500 text-orange-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                                        <h4 className="font-bold text-sm uppercase mb-2 flex items-center gap-2">{analysis.status === 'ok' ? <CheckIcon/> : '⚠️'} Status Operacional</h4>
                                        <ul className="list-disc list-inside text-xs space-y-1 ml-1">{analysis.alerts.map((alert, idx) => <li key={idx}>{alert}</li>)}</ul>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Nível Operacional (NO)</div>
                                            <div className="text-xl font-bold text-slate-800">{analysis.NO.toFixed(2)} m</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Recarga do Poço</div>
                                            <div className="text-xl font-bold text-blue-600">{analysis.Q_poco.toFixed(2)} m³/h</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 z-20">
                         <button onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-100 font-bold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 text-sm"><TrashIcon /> Excluir</button>
                        <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg transition-colors shadow-lg active:scale-[0.98] text-sm">Concluir Edição</button>
                    </div>
                </div>
            </div>
        </ModalContainer>
    );
};
