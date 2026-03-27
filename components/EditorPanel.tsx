

import React, { useState, useEffect } from 'react';
import { Node, PipeSegment, Material, Fitting, UnitSystem, LabelPosition, GeoPosition, CoordinateFormat } from '../types';
import { COMMON_FITTINGS } from '../constants';
import { toUTM, fromUTM } from '../services/geoUtils';
import {
  CloseIcon,
  WaypointIcon,
  PlusIcon,
  TrashIcon,
  MountainIcon
} from './Icons';
import { InputGroup, SmartNumberInput } from './CommonUI';
import { DirectionControl } from './ResultsPanel';

interface BufferedInputProps {
  value: number | string | undefined | null;
  onCommit: (val: number) => void;
  className?: string;
  placeholder?: string;
}

const BufferedInput = ({ value, onCommit, className, placeholder }: BufferedInputProps) => {
  const [localVal, setLocalVal] = useState(value !== undefined && value !== null ? value.toString() : '');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const newVal = value !== undefined && value !== null ? value.toString() : '';
    Promise.resolve().then(() => setLocalVal(newVal));
  }, [value]);

  const commit = () => {
    const str = localVal.replace(',', '.');
    if (str.trim() === '') return;
    const num = parseFloat(str);
    if (isNaN(num) || !isFinite(num)) {
      setIsError(true);
      setTimeout(() => {
        setIsError(false);
        setLocalVal(value !== undefined && value !== null ? value.toString() : '');
      }, 5000);
    } else {
      setIsError(false);
      onCommit(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      className={`bg-white border rounded p-2 outline-none w-full transition-colors duration-300 ${className} ${isError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent'}`}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
    />
  );
};

interface EditorPanelProps {
  selectedPipe?: PipeSegment;
  selectedNode?: Node;
  updatePipe?: (id: string, data: Partial<PipeSegment>) => void;
  updateNode?: (id: string, data: Partial<Node>) => void;
  pipes?: PipeSegment[];
  nodes?: Node[];
  materials?: Material[];
  addFitting?: (pipeId: string) => void;
  updateFitting?: (pipeId: string, index: number, count: number, fittingId: string) => void;
  handleMaterialChange?: (pipeId: string, matId: string) => void;
  handleDiameterChange?: (pipeId: string, dn: number) => void;
  handleDeletePipe?: (id: string) => void;
  handleDeleteNode?: (id: string) => void;
  closeEditor?: () => void;
  unitSystem?: UnitSystem;
  flowUnit?: string;
  fetchElevation?: (lat: number, lng: number) => Promise<number | null>;
  isMapMode?: boolean;
  addVertex?: (pipeId: string, pos?: GeoPosition) => void;
  resetVertices?: (pipeId: string) => void;
  coordFormat?: CoordinateFormat;
  calcMethod?: string;
}

export const EditorPanel = ({
  selectedPipe,
  selectedNode,
  updatePipe,
  updateNode,
  pipes,
  nodes,
  materials,
  addFitting,
  updateFitting,
  handleMaterialChange,
  handleDiameterChange,
  handleDeletePipe,
  handleDeleteNode,
  closeEditor,
  unitSystem,
  flowUnit,
  fetchElevation,
  isMapMode,
  addVertex,
  resetVertices,
  coordFormat,
  calcMethod
}: EditorPanelProps) => {
  if (!selectedPipe && !selectedNode) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center opacity-60">
      <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
      <p className="text-sm">Selecione um elemento para editar.</p>
    </div>
  );

  // Coordinate Editing Helper
  const handleCoordinateChange = (field: string, value: number) => {
    if (!selectedNode || !selectedNode.geoPosition) return;

    let newLat = selectedNode.geoPosition.lat;
    let newLng = selectedNode.geoPosition.lng;

    if (coordFormat === 'utm') {
      const currentUTM = toUTM(newLat, newLng);
      let e = currentUTM.x;
      let n = currentUTM.y;
      let z = currentUTM.zone;

      if (field === 'e') e = value;
      if (field === 'n') n = value;
      if (field === 'z') z = value;

      const res = fromUTM(e, n, z, newLat >= 0);
      newLat = res.lat;
      newLng = res.lng;
    } else {
      if (field === 'lat') newLat = value;
      if (field === 'lng') newLng = value;
    }

    updateNode?.(selectedNode.id, { geoPosition: { lat: newLat, lng: newLng } });
  };

  const renderCoordinates = (geo: any) => {
    if (!geo) return <span className="text-slate-400">Sem dados</span>;

    if (coordFormat === 'utm') {
      const utm = toUTM(geo.lat, geo.lng);
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-mono block">Leste (E)</label>
            <BufferedInput value={utm.x} onCommit={(v: number) => handleCoordinateChange('e', v)} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-mono block">Norte (N)</label>
            <BufferedInput value={utm.y} onCommit={(v: number) => handleCoordinateChange('n', v)} className="font-mono text-xs" />
          </div>
          <div className="col-span-2 flex gap-2 items-center">
            <div className="w-1/3">
              <label className="text-[10px] text-slate-400 font-mono block">Zona</label>
              <BufferedInput value={utm.zone} onCommit={(v: number) => handleCoordinateChange('z', v)} className="font-mono text-xs" />
            </div>
            <div className="text-xs text-slate-400 mt-4">Band: {utm.band}</div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-mono block">Latitude</label>
            <BufferedInput value={geo.lat} onCommit={(v: number) => handleCoordinateChange('lat', v)} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-mono block">Longitude</label>
            <BufferedInput value={geo.lng} onCommit={(v: number) => handleCoordinateChange('lng', v)} className="font-mono text-xs" />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <h3 className="font-bold text-slate-700">{selectedPipe ? 'Editar Tubulação' : 'Editar Nó'}</h3>
        <button onClick={closeEditor} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><CloseIcon /></button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {selectedPipe && (
          <>
            <InputGroup label="Identificação">
              <div className="flex gap-2">
                <div className="text-sm font-mono bg-slate-100 p-2 rounded text-slate-600 border border-slate-200 w-16 text-center">{selectedPipe.id}</div>
                <input type="text" value={selectedPipe.name || `T${selectedPipe.id.replace(/\D/g, '')}`} onChange={(e) => updatePipe?.(selectedPipe.id, { name: e.target.value })} className="flex-1 bg-white border border-slate-300 rounded p-2 text-sm outline-none focus:border-accent" placeholder="Nome do Trecho" />
              </div>
            </InputGroup>

            <InputGroup label="Material">
              <select
                className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none"
                value={selectedPipe.materialId}
                onChange={(e) => handleMaterialChange?.(selectedPipe.id, e.target.value)}
              >
                {(materials ?? []).map((m: Material) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </InputGroup>

            <InputGroup label="Diâmetro Nominal (DN)">
              <select
                className="w-full bg-white border border-slate-300 rounded p-2 text-sm outline-none"
                value={selectedPipe.nominalDiameter}
                onChange={(e) => handleDiameterChange?.(selectedPipe.id, parseInt(e.target.value))}
              >
                {materials?.find((m: Material) => m.id === selectedPipe.materialId)?.availableDiameters.map((d: any) => (
                  <option key={d.dn} value={d.dn}>{d.dn} mm {d.label ? `(${d.label})` : ''}</option>
                ))}
              </select>
              <div className="text-[10px] text-slate-400 mt-1 px-1">
                Diâmetro Interno real: <strong>{selectedPipe.diameter ? selectedPipe.diameter.toFixed(1) : '-'} mm</strong>
              </div>
            </InputGroup>

            <InputGroup label={`Comprimento (${unitSystem === UnitSystem.SI ? 'm' : 'ft'})`}>
              <div className="flex items-center gap-2 mb-1">
                <input type="checkbox" id="customLen" checked={selectedPipe.useCustomLength} onChange={(e) => updatePipe?.(selectedPipe.id, { useCustomLength: e.target.checked })} className="accent-accent" />
                <label htmlFor="customLen" className="text-xs text-slate-600 cursor-pointer">Definir Manualmente</label>
              </div>
              <SmartNumberInput
                value={selectedPipe.length}
                disabled={!selectedPipe.useCustomLength}
                onChange={(val: number) => updatePipe?.(selectedPipe.id, { length: val })}
              />
            </InputGroup>

            <InputGroup label={calcMethod === 'Hazen-Williams' ? "Coeficiente C (Hazen-Williams)" : "Rugosidade Absoluta (mm)"}>
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="customRoughness"
                  checked={calcMethod === 'Hazen-Williams' ? (selectedPipe.customC !== undefined) : (selectedPipe.customRoughness !== undefined)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (calcMethod === 'Hazen-Williams') updatePipe?.(selectedPipe.id, { customC: 130 });
                      else updatePipe?.(selectedPipe.id, { customRoughness: 0.0015 });
                    } else {
                      if (calcMethod === 'Hazen-Williams') updatePipe?.(selectedPipe.id, { customC: undefined });
                      else updatePipe?.(selectedPipe.id, { customRoughness: undefined });
                    }
                  }}
                  className="accent-accent"
                />
                <label htmlFor="customRoughness" className="text-xs text-slate-600 cursor-pointer">Definir Manualmente (Só p/ Calc)</label>
              </div>
              <SmartNumberInput
                value={calcMethod === 'Hazen-Williams' ? (selectedPipe.customC ?? 130) : (selectedPipe.customRoughness ?? 0.0015)}
                disabled={calcMethod === 'Hazen-Williams' ? (selectedPipe.customC === undefined) : (selectedPipe.customRoughness === undefined)}
                onChange={(val: number) => {
                  if (calcMethod === 'Hazen-Williams') updatePipe?.(selectedPipe.id, { customC: val });
                  else updatePipe?.(selectedPipe.id, { customRoughness: val });
                }}
              />
            </InputGroup>

            <InputGroup label="Geometria e Curvas">
              <div className="flex gap-2">
                <button onClick={() => addVertex?.(selectedPipe.id)} className="flex-1 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded hover:bg-blue-100 flex items-center justify-center gap-1"><WaypointIcon /> Add Vértice</button>
                <button onClick={() => resetVertices?.(selectedPipe.id)} className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-slate-100">Resetar</button>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Adicione vértices para curvar o tubo no mapa.</p>
            </InputGroup>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase">Peças / Conexões</span>
                <button onClick={() => addFitting?.(selectedPipe.id)} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1"><PlusIcon /> Add</button>
              </div>
              {selectedPipe.fittings.length === 0 ? <p className="text-xs text-slate-400 italic">Nenhuma peça adicionada.</p> : (
                <div className="space-y-2">
                  {selectedPipe.fittings.map((fit: Fitting, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded shadow-sm border border-slate-100">
                      <input type="number" min="1" className="w-12 p-1 border rounded text-center text-sm" value={fit.count} onChange={(e) => updateFitting?.(selectedPipe.id, idx, parseInt(e.target.value), fit.id)} />
                      <select className="flex-1 text-xs bg-transparent outline-none truncate" value={fit.id} onChange={(e) => updateFitting?.(selectedPipe.id, idx, fit.count, e.target.value)}>
                        {COMMON_FITTINGS.map(cf => <option key={cf.id} value={cf.id}>{cf.name} (K={cf.k})</option>)}
                      </select>
                      <button onClick={() => {
                        const newFits = [...selectedPipe.fittings];
                        newFits.splice(idx, 1);
                        updatePipe?.(selectedPipe.id, { fittings: newFits });
                      }} className="text-red-400 hover:text-red-600"><TrashIcon /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => handleDeletePipe?.(selectedPipe.id)} className="w-full py-2 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded text-sm font-medium flex items-center justify-center gap-2 mt-4"><TrashIcon /> Excluir Tubo</button>
          </>
        )}

        {selectedNode && (
          <>
            <InputGroup label="Identificação">
              <div className="flex gap-2">
                <div className="text-sm font-mono bg-slate-100 p-2 rounded text-slate-600 border border-slate-200 w-16 text-center">{selectedNode.id}</div>
                <input type="text" value={selectedNode.name} onChange={(e) => updateNode?.(selectedNode.id, { name: e.target.value })} className="flex-1 bg-white border border-slate-300 rounded p-2 text-sm outline-none focus:border-accent" placeholder="Nome do Nó" />
              </div>
            </InputGroup>

            <InputGroup label="Localização">
              {renderCoordinates(selectedNode.geoPosition)}
            </InputGroup>

            {/* TYPE SELECTOR: REMOVED WELL FROM HERE AS REQUESTED */}
            {(selectedNode.type !== 'well' && selectedNode.type !== 'pump') && (
              <InputGroup label="Tipo de Nó">
                <div className="flex bg-slate-100 p-1 rounded">
                  <button
                    className={`flex-1 py-1 text-xs font-medium rounded transition-all ${selectedNode.type === 'demand' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                    onClick={() => updateNode?.(selectedNode.id, { type: 'demand' })}
                  >
                    Demanda
                  </button>
                  <button
                    className={`flex-1 py-1 text-xs font-medium rounded transition-all ${selectedNode.type === 'source' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                    onClick={() => updateNode?.(selectedNode.id, { type: 'source' })}
                  >
                    Reservatório
                  </button>
                </div>
              </InputGroup>
            )}
            {/* Readonly badges */}
            {selectedNode.type === 'well' && (
              <div className="mb-4">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Poço (Pç)</span>
              </div>
            )}
            {selectedNode.type === 'pump' && (
              <div className="mb-4">
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Bomba (CMB)</span>
              </div>
            )}

            <InputGroup label={`Cota do Terreno (${unitSystem === UnitSystem.SI ? 'm' : 'ft'})`}>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => {
                    if (isMapMode && selectedNode.geoPosition) {
                      fetchElevation?.(selectedNode.geoPosition.lat, selectedNode.geoPosition.lng).then((z: number | null) => {
                        if (z !== null) updateNode?.(selectedNode.id, { elevation: z });
                      });
                    } else {
                      alert("Ative o modo mapa para buscar elevação automática.");
                    }
                  }}
                  className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100 flex items-center gap-1"
                  title="Buscar elevação online"
                >
                  <MountainIcon /> Auto
                </button>
              </div>
              <SmartNumberInput
                value={selectedNode.elevation}
                onChange={(val: number) => updateNode?.(selectedNode.id, { elevation: val })}
              />
            </InputGroup>

            {selectedNode.type === 'demand' && (
              <InputGroup label={`Demanda Base (${flowUnit})`}>
                <SmartNumberInput
                  value={selectedNode.baseDemand}
                  onChange={(val: number) => updateNode?.(selectedNode.id, { baseDemand: val })}
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showFlow"
                    checked={selectedNode.showFlowLabel || false}
                    onChange={(e) => updateNode?.(selectedNode.id, { showFlowLabel: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="showFlow" className="text-xs text-slate-600 select-none">Mostrar valor no desenho</label>
                </div>
              </InputGroup>
            )}

            {selectedNode.type === 'source' && (
              <InputGroup label="Nível do Reservatório (H) (m)">
                <SmartNumberInput
                  value={selectedNode.pressureHead}
                  onChange={(val: number) => updateNode?.(selectedNode.id, { pressureHead: val })}
                  className="border-blue-300 focus:ring-blue-200"
                />
                <p className="text-[10px] text-slate-400 mt-1">Nível da água acima da elevação do nó.</p>
              </InputGroup>
            )}

            {selectedNode.type === 'well' && (
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-700 italic">
                Para editar as propriedades avançadas do poço (níveis, profundidade), dê um clique duplo no ícone do poço no mapa.
              </div>
            )}

            {selectedNode.type === 'pump' && (
              <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg text-xs text-purple-700 italic">
                Para configurar a curva da bomba e potência, dê um clique duplo no ícone no mapa.
              </div>
            )}

            <InputGroup label="Posição da Legenda (Visual)">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="customPos"
                    checked={!!selectedNode.labelPosition}
                    onChange={(e) => updateNode?.(selectedNode.id, { labelPosition: e.target.checked ? 'top-right' : undefined })}
                    className="rounded border-slate-300 accent-blue-600"
                  />
                  <label htmlFor="customPos" className="text-xs font-bold text-slate-600 select-none">Sobrescrever Posição Global</label>
                </div>

                {selectedNode.labelPosition && (
                  <div className="flex justify-center animate-fade-in">
                    <DirectionControl
                      size="small"
                      value={selectedNode.labelPosition}
                      onChange={(p: LabelPosition) => updateNode?.(selectedNode.id, { labelPosition: p })}
                    />
                  </div>
                )}
              </div>
            </InputGroup>

            <button onClick={() => handleDeleteNode?.(selectedNode.id)} className="w-full py-2 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded text-sm font-medium flex items-center justify-center gap-2 mt-4"><TrashIcon /> Excluir Nó</button>
          </>
        )}
      </div>
    </div>
  );
};