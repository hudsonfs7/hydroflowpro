
import React, { useState, useMemo } from 'react';
import { Material, FlowUnit, CalcMethod, UnitSystem } from '../types';
import { DEFAULT_MATERIALS } from '../constants';
import { convertFlowToSI, convertFlowFromSI } from '../services/calcService';
import { SmartNumberInput, InputGroup, ModalContainer } from './CommonUI';
import { CloseIcon, CalculatorIcon, CheckIcon } from './Icons';
import { GRAVITY, getViscosity } from '../constants';

interface QuickCalcModalProps {
  onClose: () => void;
  flowUnit: FlowUnit;
  unitSystem: UnitSystem;
}

export const QuickCalcModal: React.FC<QuickCalcModalProps> = ({ onClose, flowUnit, unitSystem }) => {
  const [flow, setFlow] = useState(10);
  const [length, setLength] = useState(100);
  const [matId, setMatId] = useState(DEFAULT_MATERIALS[0].id);
  const [dn, setDn] = useState(DEFAULT_MATERIALS[0].availableDiameters[0].dn);
  const [isParallel, setIsParallel] = useState(false);
  const [dn2, setDn2] = useState(DEFAULT_MATERIALS[0].availableDiameters[0].dn);
  const [method, setMethod] = useState<CalcMethod>(CalcMethod.DARCY_WEISBACH);
  const [customRoughness, setCustomRoughness] = useState<string>('');
  const [customC, setCustomC] = useState<string>('');

  const selectedMat = useMemo(() => DEFAULT_MATERIALS.find(m => m.id === matId) || DEFAULT_MATERIALS[0], [matId]);
  const selectedDia = useMemo(() => selectedMat.availableDiameters.find(d => d.dn === dn) || selectedMat.availableDiameters[0], [selectedMat, dn]);
  const selectedDia2 = useMemo(() => selectedMat.availableDiameters.find(d => d.dn === dn2) || selectedMat.availableDiameters[0], [selectedMat, dn2]);

  const results = useMemo(() => {
    const qSI = convertFlowToSI(flow, flowUnit);
    const dM1 = selectedDia.di / 1000;
    const lM = length;
    const viscosity = getViscosity(20);

    const calcPipe = (q: number, d: number) => {
      const area = Math.PI * Math.pow(d / 2, 2);
      const velocity = q / area;
      const re = (velocity * d) / viscosity;
      let hf = 0;
      let factor = 0;

      if (method === CalcMethod.HAZEN_WILLIAMS) {
        const C = customC !== '' ? parseFloat(customC) : selectedMat.hwCoefficient;
        hf = 10.643 * Math.pow(q, 1.852) * Math.pow(C, -1.852) * Math.pow(d, -4.87) * lM;
      } else {
        const eM = (customRoughness !== '' ? parseFloat(customRoughness) : selectedMat.roughness) / 1000;
        if (re < 2300) factor = 64 / re;
        else factor = 0.25 / Math.pow(Math.log10(eM / (3.7 * d) + 5.74 / Math.pow(re, 0.9)), 2);
        hf = (factor * lM * Math.pow(velocity, 2)) / (d * 2 * GRAVITY);
      }
      return { hf, velocity, re };
    };

    if (!isParallel) {
      const res = calcPipe(qSI, dM1);
      return {
        velocity: res.velocity,
        re: res.re,
        hfTotal: res.hf,
        hfUnit: res.hf / (lM / 1000),
        regime: res.re < 2300 ? 'Laminar' : res.re < 4000 ? 'Transição' : 'Turbulento',
        equivalentDi: dM1 * 1000,
        q1: qSI,
        q2: 0,
        v1: res.velocity,
        v2: 0
      };
    } else {
      const dM2 = selectedDia2.di / 1000;
      let q1Min = 0;
      let q1Max = qSI;
      let q1 = qSI / 2;
      let res1 = calcPipe(q1, dM1);
      let res2 = calcPipe(qSI - q1, dM2);
      
      for (let i = 0; i < 50; i++) {
        q1 = (q1Min + q1Max) / 2;
        let q2 = qSI - q1;
        res1 = calcPipe(q1, dM1);
        res2 = calcPipe(q2, dM2);
        if (res1.hf > res2.hf) {
          q1Max = q1;
        } else {
          q1Min = q1;
        }
      }
      
      let q2 = qSI - q1;
      const exp = method === CalcMethod.HAZEN_WILLIAMS ? 2.63 : 2.5;
      const dEqM = Math.pow(Math.pow(dM1, exp) + Math.pow(dM2, exp), 1 / exp);

      return {
        velocity: qSI / (Math.PI * Math.pow(dEqM / 2, 2)),
        re: Math.max(res1.re, res2.re),
        hfTotal: res1.hf,
        hfUnit: res1.hf / (lM / 1000),
        regime: Math.max(res1.re, res2.re) < 2300 ? 'Laminar' : Math.max(res1.re, res2.re) < 4000 ? 'Transição' : 'Turbulento',
        equivalentDi: dEqM * 1000,
        q1: q1,
        q2: q2,
        v1: res1.velocity,
        v2: res2.velocity
      };
    }
  }, [flow, length, selectedMat, selectedDia, selectedDia2, isParallel, method, flowUnit, customRoughness, customC]);

  return (
    <ModalContainer onClose={onClose} zIndex="z-[6000]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><CalculatorIcon /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Calculadora de Trecho Único</h2>
              <p className="text-xs text-slate-500">Dimensionamento rápido sem necessidade de rede</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><CloseIcon /></button>
        </div>

        <div className="flex flex-col md:flex-row min-h-[400px]">
          <div className="flex-1 p-6 space-y-6 border-r border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label={`Vazão (${flowUnit})`}>
                <SmartNumberInput value={flow} onChange={setFlow} className="font-bold text-blue-700" />
              </InputGroup>
              <InputGroup label={`Comprimento (m)`}>
                <SmartNumberInput value={length} onChange={setLength} />
              </InputGroup>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="isParallel" checked={isParallel} onChange={e => setIsParallel(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
              <label htmlFor="isParallel" className="text-sm font-medium text-slate-700 cursor-pointer">Adutoras Paralelas (2 tubos)</label>
            </div>

            <InputGroup label="Material">
              <select value={matId} onChange={(e) => setMatId(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none focus:border-blue-500">
                {DEFAULT_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </InputGroup>

            <div className="grid grid-cols-2 gap-4">
              <InputGroup label={isParallel ? "Diâmetro Tubo 1 (DN)" : "Diâmetro (DN)"}>
                <select value={dn} onChange={(e) => setDn(parseInt(e.target.value))} className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none">
                  {selectedMat.availableDiameters.map(d => <option key={d.dn} value={d.dn}>{d.dn} mm</option>)}
                </select>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">DI: {selectedDia.di.toFixed(1)} mm</div>
              </InputGroup>

              {isParallel ? (
                <InputGroup label="Diâmetro Tubo 2 (DN)">
                  <select value={dn2} onChange={(e) => setDn2(parseInt(e.target.value))} className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none">
                    {selectedMat.availableDiameters.map(d => <option key={d.dn} value={d.dn}>{d.dn} mm</option>)}
                  </select>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">DI: {selectedDia2.di.toFixed(1)} mm</div>
                </InputGroup>
              ) : (
                <InputGroup label="Método">
                  <select value={method} onChange={(e) => setMethod(e.target.value as CalcMethod)} className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none mb-1">
                    <option value={CalcMethod.DARCY_WEISBACH}>Darcy-Weisbach</option>
                    <option value={CalcMethod.HAZEN_WILLIAMS}>Hazen-Williams</option>
                  </select>
                  {method === CalcMethod.DARCY_WEISBACH ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">Rugosidade (mm):</span>
                      <input 
                        type="number" 
                        value={customRoughness} 
                        onChange={(e) => setCustomRoughness(e.target.value)} 
                        placeholder={selectedMat.roughness.toString()}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">Coeficiente C:</span>
                      <input 
                        type="number" 
                        value={customC} 
                        onChange={(e) => setCustomC(e.target.value)} 
                        placeholder={selectedMat.hwCoefficient.toString()}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </InputGroup>
              )}
            </div>

            {isParallel && (
              <InputGroup label="Método">
                <select value={method} onChange={(e) => setMethod(e.target.value as CalcMethod)} className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none mb-1">
                  <option value={CalcMethod.DARCY_WEISBACH}>Darcy-Weisbach</option>
                  <option value={CalcMethod.HAZEN_WILLIAMS}>Hazen-Williams</option>
                </select>
                {method === CalcMethod.DARCY_WEISBACH ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">Rugosidade (mm):</span>
                    <input 
                      type="number" 
                      value={customRoughness} 
                      onChange={(e) => setCustomRoughness(e.target.value)} 
                      placeholder={selectedMat.roughness.toString()}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">Coeficiente C:</span>
                    <input 
                      type="number" 
                      value={customC} 
                      onChange={(e) => setCustomC(e.target.value)} 
                      placeholder={selectedMat.hwCoefficient.toString()}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </InputGroup>
            )}
          </div>

          <div className="w-full md:w-72 bg-slate-50 p-6 flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resultados do Trecho</h3>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Perda de Carga Total</div>
                <div className="text-2xl font-black text-blue-600">{results.hfTotal.toFixed(3)}<small className="text-xs font-normal ml-1">m</small></div>
            </div>
            <div className="space-y-3">
                {isParallel && (
                    <>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">DI Equivalente:</span>
                            <span className="font-bold font-mono text-slate-700">{results.equivalentDi.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Vazão Tubo 1:</span>
                            <span className="font-bold font-mono text-slate-700">{convertFlowFromSI(results.q1, flowUnit).toFixed(2)} {flowUnit}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Vazão Tubo 2:</span>
                            <span className="font-bold font-mono text-slate-700">{convertFlowFromSI(results.q2, flowUnit).toFixed(2)} {flowUnit}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Velocidade 1:</span>
                            <span className={`font-bold font-mono ${results.v1 > 2.5 ? 'text-red-600' : 'text-slate-700'}`}>{results.v1.toFixed(2)} m/s</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Velocidade 2:</span>
                            <span className={`font-bold font-mono ${results.v2 > 2.5 ? 'text-red-600' : 'text-slate-700'}`}>{results.v2.toFixed(2)} m/s</span>
                        </div>
                    </>
                )}
                {!isParallel && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Velocidade:</span>
                        <span className={`font-bold font-mono ${results.velocity > 2.5 ? 'text-red-600' : 'text-slate-700'}`}>{results.velocity.toFixed(2)} m/s</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Perda Unitária:</span>
                    <span className="font-bold font-mono text-slate-700">{results.hfUnit.toFixed(2)} m/km</span>
                </div>
                {!isParallel && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Reynolds:</span>
                        <span className="font-bold font-mono text-slate-700">{results.re.toFixed(0)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-medium">Regime:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${results.regime === 'Turbulento' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {results.regime}
                    </span>
                </div>
            </div>
            <div className="mt-auto p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed italic">
                Cálculo baseado em água a 20°C. Verifique se a velocidade está entre 0.6 m/s e 2.5 m/s para evitar sedimentação ou erosão.
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-8 rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-200">
                Fechar Calculadora
            </button>
        </div>
      </div>
    </ModalContainer>
  );
};
