import React, { useMemo, useState, useRef } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart 
} from 'recharts';
import { ModalContainer } from './CommonUI';
import { ChartIcon, CloseIcon, FilePdfIcon, TableIcon, SaveIcon, CheckIcon, MaximizeIcon } from './Icons';
import html2canvas from 'html2canvas';
import { GlobalUnitSettings } from '../types';

interface LongitudinalProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: any[];
    pipes: any[];
    nodeResults: any;
    results: any[];
    projectMetadata?: any;
    unitSettings: GlobalUnitSettings;
}

export const LongitudinalProfileModal: React.FC<LongitudinalProfileModalProps> = ({
    isOpen, onClose, nodes, pipes, nodeResults, results, projectMetadata, unitSettings
}) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        const s = unitSettings[type];
        return val.toFixed(s.decimals);
    };

    const graphData = useMemo(() => {
        if (!results || results.length === 0 || nodes.length === 0 || !nodeResults) return [];
        
        let headMap: Map<string, any>;
        if (nodeResults instanceof Map) headMap = nodeResults;
        else if (Array.isArray(nodeResults)) {
            headMap = new Map();
            nodeResults.forEach((nr: any) => headMap.set(nr.nodeId, { head: nr.head, p: nr.pressure }));
        } else return [];

        const startNode = nodes.find((n:any) => n.type === 'source' || n.type === 'well');
        if(!startNode) return [];

        const path: any[] = [];
        let currentId = startNode.id;
        let cumulativeDist = 0;
        
        const firstRes = headMap.get(currentId);
        const firstHGL = firstRes ? firstRes.head : startNode.elevation;
        path.push({ 
            id: startNode.name || startNode.id,
            dist: 0, 
            elevation: startNode.elevation, 
            hgl: firstHGL,
            pressure: firstRes ? firstRes.p : 0,
            headLoss: 0
        });

        const usedPipes = new Set();
        let safety = 0;
        
        while(currentId && safety < 1000) {
            const nextPipe = pipes.find((p:any) => !usedPipes.has(p.id) && (p.startNodeId === currentId || p.endNodeId === currentId));
            if(!nextPipe) break;
            
            usedPipes.add(nextPipe.id);
            const nextNodeId = nextPipe.startNodeId === currentId ? nextPipe.endNodeId : nextPipe.startNodeId;
            const endNode = nodes.find((n:any) => n.id === nextNodeId);
            const endRes = headMap.get(nextNodeId);
            const currentRes = headMap.get(currentId);
            const segmentResult = results.find(r => r.segmentId === nextPipe.id);
            
            if(endNode && endRes && currentRes) {
                const loss = segmentResult ? segmentResult.totalHeadLoss : 0;
                const suctionHgl = currentRes.head - loss;
                cumulativeDist = parseFloat((cumulativeDist + nextPipe.length).toFixed(2));
                
                // If it's a pump, we need the "jump"
                if (endNode.type === 'pump') {
                    path.push({
                        id: (endNode.name || endNode.id) + " (Sucção)",
                        dist: cumulativeDist,
                        elevation: endNode.elevation,
                        hgl: suctionHgl,
                        pressure: suctionHgl - endNode.elevation,
                        headLoss: loss,
                        velocity: segmentResult ? segmentResult.velocity : 0
                    });
                }

                path.push({ 
                    id: endNode.name || endNode.id,
                    dist: cumulativeDist, 
                    elevation: endNode.elevation, 
                    hgl: endRes.head,
                    pressure: endRes.p,
                    headLoss: segmentResult ? segmentResult.totalHeadLoss : 0,
                    velocity: segmentResult ? segmentResult.velocity : 0
                });
                currentId = nextNodeId;
            } else break;
            safety++;
        }
        return path;
    }, [results, pipes, nodes, nodeResults]);

    const chartConfig = useMemo(() => {
        if (graphData.length <= 1) return null;
        const maxDist = graphData[graphData.length - 1].dist;
        const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (p * maxDist) / 100);
        return { maxDist, ticks };
    }, [graphData]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(`
                    <html>
                        <head>
                            <title>Perfil Longitudinal - ${projectMetadata?.name || 'Project'}</title>
                            <style>
                                body { margin: 0; display: flex; flex-direction: column; align-items: center; background: #525659; }
                                img { max-width: 100%; height: auto; margin: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.5); background: white; }
                                @media print {
                                    body { background: white; }
                                    img { margin: 0; box-shadow: none; }
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${imgData}" />
                            <script>
                                setTimeout(() => { window.print(); }, 500);
                            </script>
                        </body>
                    </html>
                `);
                printWin.document.close();
            }
        } catch (e) {
            alert("Erro ao gerar PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalContainer onClose={onClose}>
            <div className="max-w-[1200px] w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Cabeçalho */}
                <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                            <ChartIcon />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-black uppercase tracking-[0.2em]">Perfil Longitudinal Completo</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{projectMetadata?.name || 'Projeto'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <FilePdfIcon /> {isExporting ? 'Processando...' : 'Exportar PDF'}
                        </button>
                        <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><CloseIcon /></button>
                    </div>
                </div>

                {/* Área de Relatório (o que será exportado) */}
                <div ref={reportRef} className="flex-1 overflow-y-auto bg-white p-8 space-y-10 selection:bg-blue-100">
                    {/* Gráfico */}
                    <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 relative">
                        <div className="absolute top-8 left-10 flex gap-6 z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Cota Piezométrica (HGL)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Cota do Terreno</span>
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={graphData} margin={{ top: 40, right: 30, left: 10, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="dist" 
                                        type="number" 
                                        ticks={chartConfig?.ticks}
                                        tickFormatter={(val) => Math.round(val).toString()}
                                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 700, angle: -90, textAnchor: 'end'}} 
                                        stroke="#cbd5e1" 
                                        domain={[0, chartConfig?.maxDist || 'auto']}
                                        label={{ value: 'Extensão (m)', position: 'insideBottom', offset: -50, fontSize: 11, fill: '#94a3b8', fontWeight: 800 }}
                                    />
                                    <YAxis 
                                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} 
                                        stroke="#cbd5e1" 
                                        domain={['auto', 'auto']}
                                        label={{ value: 'Altitude (m)', angle: -90, position: 'insideLeft', offset: 20, fontSize: 11, fill: '#94a3b8', fontWeight: 800 }}
                                    />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white border border-slate-200 p-4 shadow-2xl rounded-2xl min-w-[200px]">
                                                        <p className="text-[11px] font-black text-blue-600 mb-1 uppercase tracking-widest border-b border-slate-100 pb-2">NÓ: {data.id}</p>
                                                        <p className="text-[10px] font-black text-slate-400 mb-2 underline tracking-wider uppercase">Extensão: {format(Number(data.dist), 'meters')} m</p>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center gap-4">
                                                                <span className="text-[10px] font-bold text-blue-600 uppercase">Piezométrica</span>
                                                                <span className="text-[12px] font-black text-blue-700">{format(Number(data.hgl), 'meters')} m</span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-4">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Terreno</span>
                                                                <span className="text-[12px] font-black text-slate-600">{format(Number(data.elevation), 'meters')} m</span>
                                                            </div>
                                                            {data.pressure !== undefined && (
                                                                <div className="flex justify-between items-center gap-4 pt-2 border-t border-slate-50">
                                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase">Pressão</span>
                                                                    <span className="text-[12px] font-black text-indigo-700">{format(Number(data.pressure), 'pressure')} mca</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="elevation" stroke="#94a3b8" strokeWidth={1} fill="#f1f5f9" fillOpacity={1} name="Terreno" isAnimationActive={false} />
                                    <Area type="monotone" dataKey="hgl" stroke="#3b82f6" strokeWidth={4} fill="rgba(59, 130, 246, 0.05)" name="Linha Piezométrica" isAnimationActive={false} />
                                    <Line type="monotone" dataKey="hgl" stroke="none" dot={{ r: 5, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }} isAnimationActive={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Tabela de Dados Hidráulicos */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-800">Dados Hidráulicos Detalhados</h3>
                            <div className="h-[2px] flex-1 bg-slate-100"></div>
                        </div>

                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nó / Estaca</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dist. (m)</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cota Terreno</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cota Piez.</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pressão (mca)</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Perda (m)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {graphData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === graphData.length - 1 ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                                                    <span className="text-[11px] font-black text-slate-700">{row.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 font-mono">{format(row.dist, 'meters')}</td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 font-mono">{format(row.elevation, 'meters')}</td>
                                            <td className="px-6 py-4 text-[11px] font-black text-slate-800 font-mono">{format(row.hgl, 'meters')}</td>
                                            <td className={`px-6 py-4 text-[12px] font-black font-mono ${row.pressure < 1 ? 'text-red-500' : 'text-blue-600'}`}>{format(row.pressure, 'pressure')}</td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-orange-600 font-mono">{row.headLoss > 0 ? format(row.headLoss, 'meters') : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Rodapé técnico do relatório */}
                    <div className="pt-10 border-t border-slate-100 flex justify-between items-end pb-4">
                        <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento Técnico Gerado por:</p>
                            <p className="text-[11px] font-black text-slate-800 uppercase">HydroFlow Pro Business Intelligence Platform</p>
                        </div>
                        <div className="text-right space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Emissão</p>
                            <p className="text-[11px] font-black text-slate-800">{new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </ModalContainer>
    );
};
