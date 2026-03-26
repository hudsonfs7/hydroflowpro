
import { Node, FlowUnit, PumpConfig } from '../types';
import { SmartNumberInput, ModalContainer } from './CommonUI';
import { CloseIcon, CheckIcon, SettingsIcon } from './Icons';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from 'recharts';
import React, { useState, useMemo } from 'react';

interface PumpEditorModalProps {
    node: Node;
    updateNode: (id: string, data: Partial<Node>) => void;
    onClose: () => void;
    onDelete: () => void;
    flowUnit: FlowUnit;
    actualFlow?: number;
    actualHead?: number;
}

const AlignedInputGroup = ({ label, children, subLabel }: { label: string; children?: React.ReactNode; subLabel?: string }) => (
    <div className="flex flex-col w-full">
        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-end leading-none truncate tracking-wide" title={label}>{label}</label>
        <div className="w-full">{children}</div>
        {subLabel && <p className="text-[9px] text-slate-400 mt-1 leading-tight">{subLabel}</p>}
    </div>
);

export const PumpEditorModal: React.FC<PumpEditorModalProps> = ({ 
    node, updateNode, onClose, onDelete, flowUnit, actualFlow, actualHead 
}) => {
    const [localConfig, setLocalConfig] = useState<PumpConfig>(() => node.cmbConfig || {
        curveType: '1-point', enabled: true, designFlow: 0, designHead: 0, shutoffHead: 0, maxFlow: 0, efficiency: 70, motorPower: 0, speed: 1750, poles: 4
    });
    const [activeTab, setActiveTab] = useState<'curve' | 'motor'>('curve');

    const getPumpHead = (q: number, cfg: PumpConfig) => {
        const Qd = cfg.designFlow || 0;
        const Hd = cfg.designHead || 0;
        if (Qd <= 0 || Hd <= 0) return 0;
        const H0 = cfg.curveType === '3-point' && cfg.shutoffHead ? cfg.shutoffHead : 1.33 * Hd;
        const A = (H0 - Hd) / Math.pow(Qd, 2);
        return Math.max(0, H0 - A * Math.pow(q, 2));
    };

    const calculatePowerCV = (q: number, h: number, unit: FlowUnit, eff: number) => {
        if (!q || !h || !eff) return 0;
        const qLs = unit === 'm3/h' ? q / 3.6 : q;
        return (qLs * h) / (75 * (eff / 100));
    };

    const sysReqFlow = actualFlow || localConfig.designFlow || 0;
    const sysReqHead = actualHead || localConfig.designHead || 0;

    // Derived parameters
    const { Qd, Hd, H0, A, Hstat, k_sys, opFlow, opHead } = useMemo(() => {
        const qd = localConfig.designFlow || 0;
        const hd = localConfig.designHead || 0;
        const h0 = localConfig.curveType === '3-point' && localConfig.shutoffHead ? localConfig.shutoffHead : 1.33 * hd;
        const a = qd > 0 ? (h0 - hd) / Math.pow(qd, 2) : 0;

        const hStat = sysReqHead * 0.4;
        const kSys = sysReqFlow > 0 ? (sysReqHead - hStat) / Math.pow(sysReqFlow, 2) : 0;

        let flow = 0;
        let head = 0;
        if (a + kSys > 0 && h0 > hStat) {
            flow = Math.sqrt((h0 - hStat) / (a + kSys));
            head = h0 - a * Math.pow(flow, 2);
        }

        return { Qd: qd, Hd: hd, H0: h0, A: a, Hstat: hStat, k_sys: kSys, opFlow: flow, opHead: head };
    }, [localConfig, sysReqHead, sysReqFlow]);

    const powerCV = calculatePowerCV(
        opFlow, 
        opHead, 
        flowUnit, 
        localConfig.efficiency || 70
    );

    const chartData = useMemo(() => {
        const pts: { flow: number; head: number; sysHead: number }[] = [];
        if (Qd <= 0 || Hd <= 0) return pts;
        
        const q_max = A > 0 ? Math.sqrt(H0 / A) : Qd * 1.5;
        const plotMax = Math.max(q_max, sysReqFlow * 1.3, opFlow * 1.2);
        
        for (let i = 0; i <= 50; i++) {
            const q = (plotMax * i) / 50;
            const pumpHead = Math.max(0, H0 - A * Math.pow(q, 2));
            const sysHead = Hstat + k_sys * Math.pow(q, 2);
            
            pts.push({ flow: q, head: pumpHead, sysHead: sysHead });
        }
        return pts;
    }, [Qd, Hd, H0, A, Hstat, k_sys, sysReqFlow, opFlow]);

    const handleSave = () => {
        if (!localConfig.designFlow || !localConfig.designHead) return alert("Vazão e AMT de projeto são obrigatórios.");
        const finalCurve = [0, 0.5, 1, 1.5].map(f => ({ flow: f * localConfig.designFlow!, head: getPumpHead(f * localConfig.designFlow!, localConfig) }));
        updateNode(node.id, { pumpCurve: finalCurve, cmbConfig: localConfig });
        onClose();
    };

    return (
        <ModalContainer onClose={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 text-purple-700 p-2 rounded-lg"><SettingsIcon /></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Conjunto Motobomba (CMB)</h2>
                            <p className="text-xs text-slate-500">Configuração Técnica e Ponto de Operação</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><CloseIcon /></button>
                </div>

                <div className="flex flex-1 min-h-0">
                    <div className="w-[320px] border-r border-slate-200 bg-white flex flex-col overflow-y-auto p-5 gap-4">
                        <div className="bg-slate-100 p-1 rounded-lg flex shrink-0 mb-2">
                            <button onClick={() => setActiveTab('curve')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'curve' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>Curva (QxH)</button>
                            <button onClick={() => setActiveTab('motor')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'motor' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>Motor</button>
                        </div>
                        {activeTab === 'curve' && (
                            <div className="flex flex-col gap-4">
                                <AlignedInputGroup label={`VAZÃO DE PROJETO (${flowUnit})`}><SmartNumberInput value={localConfig.designFlow} onChange={(v: number) => setLocalConfig({...localConfig, designFlow: v})} /></AlignedInputGroup>
                                <AlignedInputGroup label="ALTURA MANOMÉTRICA (MCA)"><SmartNumberInput value={localConfig.designHead} onChange={(v: number) => setLocalConfig({...localConfig, designHead: v})} /></AlignedInputGroup>
                                
                                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-inner text-[11px] font-bold">
                                    {actualFlow !== undefined && actualFlow > 0 ? (
                                        <>
                                            <div className="text-slate-600 mb-2 pb-2 border-b border-slate-200">
                                                <div>Vazão Requerida: {sysReqFlow.toFixed(2)} {flowUnit}</div>
                                                <div>AMT Requerida: {sysReqHead.toFixed(2)} mca</div>
                                            </div>
                                            <div className="text-purple-700">Vazão de Operação: {opFlow.toFixed(2)} {flowUnit}</div>
                                            <div className="text-blue-700">AMT de Operação: {opHead.toFixed(2)} mca</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-purple-700">Vazão Projeto: {(localConfig.designFlow || 0).toFixed(2)} {flowUnit}</div>
                                            <div className="text-blue-700">AMT Projeto: {(localConfig.designHead || 0).toFixed(2)} mca</div>
                                        </>
                                    )}
                                    <div className="text-emerald-600 mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                                        <span>Consumo Estimado:</span>
                                        <span className="text-sm">{powerCV.toFixed(2)} CV</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'motor' && (
                            <div className="flex flex-col gap-4">
                                <AlignedInputGroup label="Rendimento (%)"><SmartNumberInput value={localConfig.efficiency || 70} onChange={(v: number) => setLocalConfig({...localConfig, efficiency: v})} /></AlignedInputGroup>
                                <AlignedInputGroup label="Polos"><SmartNumberInput value={localConfig.poles || 4} onChange={(v: number) => setLocalConfig({...localConfig, poles: v})} /></AlignedInputGroup>
                                <AlignedInputGroup label="Rotação (RPM)"><SmartNumberInput value={localConfig.speed || 1750} onChange={(v: number) => setLocalConfig({...localConfig, speed: v})} /></AlignedInputGroup>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-slate-50 p-6 flex flex-col relative overflow-hidden">
                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="flow" type="number" domain={[0, 'dataMax']} tick={{fontSize: 10}} tickFormatter={(val) => val.toFixed(2)} label={{ value: `Vazão (${flowUnit})`, position: 'insideBottomRight', offset: -10, fontSize: 10, fill: '#64748b' }} />
                                    <YAxis type="number" domain={[0, 'auto']} tick={{fontSize: 10}} tickFormatter={(val) => val.toFixed(2)} label={{ value: 'AMT (mca)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{fontSize: '11px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} formatter={(value: number) => value.toFixed(2)} labelFormatter={(label: number) => `Vazão: ${label.toFixed(2)} ${flowUnit}`} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Line dataKey="head" stroke="#7c3aed" strokeWidth={3} dot={false} type="monotone" name="Curva da Bomba" isAnimationActive={false} />
                                    {actualFlow !== undefined && actualFlow > 0 && (
                                        <>
                                            <Line dataKey="sysHead" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" dot={false} type="monotone" name="Curva do Sistema" isAnimationActive={false} />
                                            <ReferenceDot x={opFlow} y={opHead} r={7} fill="#dc2626" stroke="white" strokeWidth={3} />
                                        </>
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex justify-between">
                    <button onClick={onDelete} className="text-red-500 font-bold py-2 px-4 text-xs uppercase hover:bg-red-50 rounded">Remover CMB</button>
                    <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg active:scale-95 flex items-center gap-2"><CheckIcon /> Salvar e Validar</button>
                </div>
            </div>
        </ModalContainer>
    );
};
