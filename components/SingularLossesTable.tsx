
import React, { useMemo } from 'react';
import { Fitting } from '../types';
import { COMMON_FITTINGS, GRAVITY } from '../constants';
import { TrashIcon, PlusIcon } from './Icons';

interface SingularLossesTableProps {
    fittings: Fitting[];
    onChange: (fittings: Fitting[]) => void;
    flowRateSI: number; // m3/s
    diameterMM: number; // mm
}

export const SingularLossesTable: React.FC<SingularLossesTableProps> = ({ 
    fittings, 
    onChange, 
    flowRateSI, 
    diameterMM 
}) => {
    
    // Physics Calc
    const { v, v2_2g, totalK, totalHf } = useMemo(() => {
        if (diameterMM <= 0) return { v: 0, v2_2g: 0, totalK: 0, totalHf: 0 };
        
        const D_m = diameterMM / 1000;
        const Area = Math.PI * Math.pow(D_m / 2, 2);
        const velocity = flowRateSI > 0 ? flowRateSI / Area : 0;
        const kineticHead = (velocity * velocity) / (2 * GRAVITY);
        
        const kSum = fittings.reduce((acc: number, f: Fitting) => acc + (f.k * f.count), 0);
        const hfSum = kSum * kineticHead;

        return { 
            v: velocity, 
            v2_2g: kineticHead, 
            totalK: kSum, 
            totalHf: hfSum 
        };
    }, [flowRateSI, diameterMM, fittings]);

    const handleAddFitting = () => {
        const newFitting: Fitting = { ...COMMON_FITTINGS[0], count: 1 };
        onChange([...fittings, newFitting]);
    };

    const handleRemoveFitting = (index: number) => {
        const newFittings = [...fittings];
        newFittings.splice(index, 1);
        onChange(newFittings);
    };

    const handleUpdateFitting = (index: number, field: keyof Fitting, value: string | number) => {
        const newFittings = [...fittings];
        if (field === 'id') {
            const ref = COMMON_FITTINGS.find(f => f.id === value);
            if (ref) {
                newFittings[index] = { ...newFittings[index], id: ref.id, name: ref.name, k: ref.k };
            }
        } else {
            newFittings[index] = { ...newFittings[index], [field]: value };
        }
        onChange(newFittings);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex justify-between items-center p-3 bg-slate-50 border-b border-slate-200">
                <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase">Perda de Carga Localizada</h4>
                    <p className="text-[10px] text-slate-500">Baseado na vazão operacional e diâmetro da edutora</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Energia Cinética (V²/2g)</div>
                        <div className="text-xs font-mono font-bold text-blue-600">{v2_2g.toFixed(4)} m</div>
                    </div>
                    <button 
                        onClick={handleAddFitting}
                        className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-2 py-1 rounded text-xs font-bold transition-colors"
                    >
                        <PlusIcon /> Adicionar Peça
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="p-2 border-b border-r border-slate-200 w-1/2">Peça / Conexão</th>
                            <th className="p-2 border-b border-r border-slate-200 w-16 text-center">Qtd</th>
                            <th className="p-2 border-b border-r border-slate-200 w-16 text-center">K (Unit)</th>
                            <th className="p-2 border-b border-r border-slate-200 w-20 text-center">Di (mm)</th>
                            <th className="p-2 border-b border-r border-slate-200 w-20 text-center bg-slate-200/50">V²/2g</th>
                            <th className="p-2 border-b border-slate-200 w-24 text-right bg-blue-50/50">Hf (m)</th>
                            <th className="p-2 border-b border-slate-200 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                        {fittings.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 italic bg-slate-50/30">
                                    Nenhuma peça adicionada ao barrilete.
                                </td>
                            </tr>
                        ) : (
                            fittings.map((fit, idx) => {
                                const rowHf = (fit.count * fit.k) * v2_2g;
                                return (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-1 border-r border-slate-100">
                                            <select 
                                                className="w-full bg-transparent p-1 outline-none truncate"
                                                value={fit.id}
                                                onChange={(e) => handleUpdateFitting(idx, 'id', e.target.value)}
                                            >
                                                {COMMON_FITTINGS.map(cf => (
                                                    <option key={cf.id} value={cf.id}>{cf.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-1 border-r border-slate-100 text-center">
                                            <input 
                                                type="number" min="1" 
                                                className="w-full text-center bg-transparent outline-none p-1 font-bold"
                                                value={fit.count}
                                                onChange={(e) => handleUpdateFitting(idx, 'count', parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="p-1 border-r border-slate-100 text-center font-mono text-slate-500">
                                            {fit.k.toFixed(2)}
                                        </td>
                                        <td className="p-1 border-r border-slate-100 text-center font-mono text-slate-500 bg-slate-50">
                                            {diameterMM.toFixed(1)}
                                        </td>
                                        <td className="p-1 border-r border-slate-100 text-center font-mono text-slate-400 bg-slate-50">
                                            {v2_2g.toFixed(4)}
                                        </td>
                                        <td className="p-2 border-r border-slate-100 text-right font-mono font-bold text-slate-800 bg-blue-50/20">
                                            {rowHf.toFixed(4)}
                                        </td>
                                        <td className="p-1 text-center">
                                            <button 
                                                onClick={() => handleRemoveFitting(idx)}
                                                className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold text-xs">
                        <tr>
                            <td className="p-2 text-right text-slate-600 uppercase">Totais:</td>
                            <td className="p-2 text-center text-slate-800">{fittings.reduce((acc: number, f: Fitting) => acc + f.count, 0)}</td>
                            <td className="p-2 text-center text-slate-800 font-mono">K={totalK.toFixed(2)}</td>
                            <td colSpan={2}></td>
                            <td className="p-2 text-right text-blue-700 font-mono text-sm bg-blue-100 border-l border-blue-200">
                                ΣHf = {totalHf.toFixed(4)} m
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
