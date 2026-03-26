
import React, { useState } from 'react';
import { PumpCurvePoint, FlowUnit } from '../types';
import { PlusIcon, TrashIcon, ChartIcon, SparklesIcon } from './Icons';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Area } from 'recharts';
import { SmartNumberInput } from './CommonUI';

interface PumpCurveManagerProps {
    curve: PumpCurvePoint[];
    onChange: (curve: PumpCurvePoint[]) => void;
    designFlow: number; // m3/h
    designHead: number; // m
    flowUnit: FlowUnit;
}

export const PumpCurveManager: React.FC<PumpCurveManagerProps> = ({ 
    curve, onChange, designFlow, designHead, flowUnit 
}) => {
    const [newQ, setNewQ] = useState(0);
    const [newH, setNewH] = useState(0);

    const handleAddPoint = () => {
        if (newQ >= 0 && newH >= 0) {
            const newCurve = [...curve, { flow: newQ, head: newH }];
            newCurve.sort((a, b) => a.flow - b.flow);
            onChange(newCurve);
            setNewQ(0);
            setNewH(0);
        }
    };

    const handleRemovePoint = (index: number) => {
        const newCurve = [...curve];
        newCurve.splice(index, 1);
        onChange(newCurve);
    };

    const handleGenerateStandardCurve = () => {
        if (designFlow <= 0 || designHead <= 0) return;
        const h0 = 1.33 * designHead;
        const a = (h0 - designHead) / Math.pow(designFlow, 2);
        const factors = [0, 0.5, 1.0, 1.5, 2.0];
        const generatedPoints: PumpCurvePoint[] = factors.map(factor => {
            const q = factor * designFlow;
            const h = h0 - a * Math.pow(q, 2);
            return {
                flow: parseFloat(q.toFixed(2)),
                head: parseFloat(Math.max(0, h).toFixed(2))
            };
        }).filter(p => p.head >= 0);
        onChange(generatedPoints);
    };

    // Chart Data Preparation
    const chartData = curve.map(p => ({ x: p.flow, y: p.head }));
    
    // Operating Point (Design/Simulation Point)
    // If designFlow/Head comes from Simulation, it represents the intersection
    const opPoint = { x: designFlow, y: designHead };

    // System Curve Visualization (Approximation: H = Hstatic + kQ^2)
    // If we have an Operating Point (Q, H) and we assume Hstatic ~ 0 (or some value), we can draw a curve passing through it.
    // For simplicity, let's just plot the point.
    // Ideally, "Combate de Curvas" implies drawing the system resistance curve. 
    // Resistance R = H_op / Q_op^2.
    // Let's generate a synthetic system curve if we have an operating point to show the "Intersection".
    const systemCurveData: { x: number; sysY: number }[] = [];
    if (designFlow > 0 && designHead > 0) {
        const k_sys = designHead / Math.pow(designFlow, 2);
        for(let i=0; i<=designFlow*1.5; i+= (designFlow/10)) {
            systemCurveData.push({ x: i, sysY: k_sys * Math.pow(i, 2) });
        }
    }

    // Merge for chart
    // We need a unified X axis.
    // This is complex with simple Recharts without custom shapes.
    // Simpler approach: Just ReferenceDot for OpPoint.

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Top: Chart */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2 shadow-sm min-h-[250px] relative">
                <h4 className="absolute top-2 left-4 text-xs font-bold text-slate-400 uppercase tracking-wider z-10 flex items-center gap-2">
                    <ChartIcon /> Curva do Sistema
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="x" 
                            type="number" 
                            label={{ value: `Vazão (${flowUnit})`, position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} 
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            allowDataOverflow={false}
                        />
                        <YAxis 
                            dataKey="y" 
                            type="number" 
                            label={{ value: 'Altura (m)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} 
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                        />
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            formatter={(val: number | string) => typeof val === 'number' ? val.toFixed(2) : val}
                            labelFormatter={() => ''}
                        />
                        
                        {/* Pump Curve */}
                        <Line data={chartData} dataKey="y" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} type="monotone" name="Bomba" isAnimationActive={false} />
                        
                        {/* System Curve (Approximation passing through OP Point) */}
                        {systemCurveData.length > 0 && (
                             <Line data={systemCurveData} dataKey="sysY" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Sistema (Est.)" isAnimationActive={false} />
                        )}

                        {/* Design/Operating Point */}
                        {designFlow > 0 && designHead > 0 && (
                            <ReferenceDot x={opPoint.x} y={opPoint.y} r={6} fill="#dc2626" stroke="white" strokeWidth={2} label={{ position: 'top', value: 'Ponto Operação', fontSize: 10, fill: '#dc2626' }}>
                            </ReferenceDot>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
                
                {designFlow > 0 && (
                    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-1 rounded border border-red-100 text-[10px] text-red-600 font-bold shadow-sm">
                        Q={designFlow.toFixed(2)} | H={designHead.toFixed(2)}
                    </div>
                )}
            </div>

            {/* Bottom: Data Entry */}
            <div className="h-48 bg-slate-50 border border-slate-200 rounded-lg flex flex-col overflow-hidden">
                <div className="p-2 border-b border-slate-200 bg-white flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Vazão ({flowUnit})</label>
                        <SmartNumberInput value={newQ} onChange={setNewQ} placeholder="0.00" className="text-xs h-8" />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Altura (m)</label>
                        <SmartNumberInput value={newH} onChange={setNewH} placeholder="0.00" className="text-xs h-8" />
                    </div>
                    <button 
                        onClick={handleAddPoint} 
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center transition-colors"
                        disabled={newQ <= 0 || newH <= 0}
                        title="Adicionar Ponto"
                    >
                        <PlusIcon />
                    </button>
                </div>
                
                {/* Auto Generate Button */}
                {designFlow > 0 && designHead > 0 && (
                    <div className="px-2 py-1 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                        <span className="text-[10px] text-indigo-700 font-medium">Tem apenas o ponto de projeto?</span>
                        <button 
                            onClick={handleGenerateStandardCurve}
                            className="text-[10px] bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1 font-bold shadow-sm transition-all"
                        >
                            <SparklesIcon /> Gerar Curva Estimada
                        </button>
                    </div>
                )}
                
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-500 font-semibold sticky top-0">
                            <tr>
                                <th className="p-2 pl-4">Vazão ({flowUnit})</th>
                                <th className="p-2">Altura (m)</th>
                                <th className="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {curve.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-slate-400 italic">Adicione pontos manualmente ou use o gerador automático.</td>
                                </tr>
                            ) : (
                                curve.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 group">
                                        <td className="p-2 pl-4 font-mono text-slate-700">{p.flow.toFixed(2)}</td>
                                        <td className="p-2 font-mono text-blue-600 font-bold">{p.head.toFixed(2)}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleRemovePoint(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
