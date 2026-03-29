
import React, { useState } from 'react';
import { 
  FlowUnit, CalcMethod, SolverType, LabelPosition, VisualizationSettings, MDConfig, Node, PipeSegment, CalculationResult, NodeResult, EVTEConfig, Material, GlobalUnitSettings
} from '../types';
import { GlobalSettingsInputs, DirectionControl } from './ResultsPanel';
import { 
  CloseIcon, SettingsIcon, LayoutIcon, EyeIcon, 
  CalculatorIcon, FileTextIcon, PlayIcon, 
  MapIcon
} from './Icons';
import { ModalContainer, InputGroup, SmartNumberInput } from './CommonUI';
import { generateMD } from '../services/mdService';
import { generateEVTE } from '../services/evteService';

interface ConfigPopupProps {
  isOpen: boolean;
  onClose: () => void;
  flowUnit: FlowUnit;
  setFlowUnit: (u: FlowUnit) => void;
  calcMethod: CalcMethod;
  setCalcMethod: (m: CalcMethod) => void;
  globalC: string;
  setGlobalC: (val: string) => void;
  globalRoughness: string;
  setGlobalRoughness: (val: string) => void;
  solverType: SolverType;
  setSolverType: (s: SolverType) => void;
  nodeLabelPos: LabelPosition;
  setNodeLabelPos: (p: LabelPosition) => void;
  nodeLabelOffset: number;
  setNodeLabelOffset: (n: number) => void;
  visSettings: VisualizationSettings;
  setVisSettings: (s: VisualizationSettings) => void;
  onApplyGlobal: () => void;
  mdConfig: MDConfig;
  setMdConfig: (cfg: MDConfig) => void;
  evteConfig: EVTEConfig;
  setEvteConfig: (cfg: EVTEConfig) => void;
  projectData: {
    nodes: Node[];
    pipes: PipeSegment[];
    results: CalculationResult[];
    nodeResults: NodeResult[];
    materials: Material[];
  } | null;
  unitSettings: GlobalUnitSettings;
  setUnitSettings: (s: GlobalUnitSettings) => void;
}

type ConfigTab = 'calc' | 'scale' | 'vis' | 'md' | 'units';

export const ConfigPopup: React.FC<ConfigPopupProps> = ({
  onClose, flowUnit, setFlowUnit, calcMethod, setCalcMethod,
  globalC, setGlobalC, globalRoughness, setGlobalRoughness,
  solverType, setSolverType, visSettings, setVisSettings,
  nodeLabelPos, setNodeLabelPos, nodeLabelOffset, setNodeLabelOffset,
  onApplyGlobal, mdConfig, setMdConfig, 
  evteConfig, setEvteConfig, projectData,
  unitSettings, setUnitSettings
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab | 'evte'>('calc');
  const selectClass = "w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-[12px] text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm font-medium";

  const updateMD = (field: keyof MDConfig, val: string) => {
    setMdConfig({ ...mdConfig, [field]: val });
  };

  const handleGenerate = () => {
    if (!projectData) {
      alert("É necessário calcular a rede antes de gerar o memorial.");
      return;
    }
    generateMD(
      mdConfig, 
      projectData.nodes, 
      projectData.pipes, 
      projectData.results, 
      projectData.nodeResults, 
      calcMethod, 
      flowUnit,
      globalC,
      globalRoughness
    );
  };

  const updateEVTE = (field: keyof EVTEConfig, val: string) => {
    setEvteConfig({ ...evteConfig, [field]: val });
  };

  const handleGenerateEVTE = async () => {
    if (!projectData) {
      alert("É necessário calcular a rede antes de gerar a planta.");
      return;
    }

    // Attempt to capture the map if possible
    let mapImage = '';
    const mapContainer = document.getElementById('network-map-container');
    if (mapContainer) {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2
      });
      mapImage = canvas.toDataURL('image/jpeg', 0.9);
    }

    generateEVTE(
      evteConfig,
      projectData.nodes,
      projectData.pipes,
      projectData.results,
      projectData.nodeResults,
      calcMethod,
      flowUnit,
      mapImage,
      projectData.materials
    );
  };

  return (
    <ModalContainer onClose={onClose} zIndex="z-[1000]" backdropClass="bg-slate-900/10 backdrop-blur-[2px]">
      <div 
        className="bg-white shadow-2xl border border-slate-200 rounded-xl flex flex-col overflow-hidden animate-fade-in"
        style={{ minWidth: '480px', width: '680px', height: '620px' }}
      >
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-slate-400"><SettingsIcon /></div>
            <div>
                <h2 className="text-[13px] font-semibold text-slate-800 tracking-tight uppercase">Configurações do Projeto</h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Controle de motor de cálculo e interface</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-50 rounded text-slate-300 hover:text-slate-500 transition-all"><CloseIcon /></button>
        </div>

        <div className="flex px-8 bg-white border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
          <TabBtn active={activeTab === 'calc'} onClick={() => setActiveTab('calc')} label="Cálculos" icon={<CalculatorIcon />} />
          <TabBtn active={activeTab === 'scale'} onClick={() => setActiveTab('scale')} label="Precisão de Zoom" icon={<LayoutIcon />} />
          <TabBtn active={activeTab === 'vis'} onClick={() => setActiveTab('vis')} label="Anotações" icon={<EyeIcon />} />
          <TabBtn active={activeTab === 'md'} onClick={() => setActiveTab('md')} label="MD (ABNT)" icon={<FileTextIcon />} />
          <TabBtn active={activeTab === 'evte'} onClick={() => setActiveTab('evte')} label="EVTE Beta" icon={<MapIcon />} />
          <TabBtn active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Unidades" icon={<SettingsIcon />} />
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {activeTab === 'calc' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Método de Cálculo</label>
                  <select value={calcMethod} onChange={(e) => setCalcMethod(e.target.value as CalcMethod)} className={selectClass}>
                    <option value={CalcMethod.DARCY_WEISBACH}>Darcy-Weisbach</option>
                    <option value={CalcMethod.HAZEN_WILLIAMS}>Hazen-Williams</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Solver</label>
                  <select value={solverType} onChange={(e) => setSolverType(e.target.value as SolverType)} className={selectClass}>
                    <option value={SolverType.RELAXATION}>Relaxation</option>
                    <option value={SolverType.GGA}>GGA Matricial</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unidade</label>
                  <select value={flowUnit} onChange={(e) => setFlowUnit(e.target.value as FlowUnit)} className={selectClass}>
                    <option value="m3/h">m³/h</option>
                    <option value="l/s">L/s</option>
                  </select>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-100">
                <GlobalSettingsInputs calcMethod={calcMethod} globalC={globalC} setGlobalC={setGlobalC} globalRoughness={globalRoughness} setGlobalRoughness={setGlobalRoughness} onApply={onApplyGlobal} />
              </div>
            </div>
          )}

          {activeTab === 'scale' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-4 tracking-wider">Comportamento das Legendas</h4>
                <div className="space-y-4">
                  <InputGroup label="Modo de Escala">
                      <select 
                          value={visSettings.mode} 
                          onChange={e => setVisSettings({...visSettings, mode: e.target.value as 'adaptive' | 'fixed'})}
                          className={selectClass}
                      >
                          <option value="adaptive">Adaptativo (Zoom Dinâmico)</option>
                          <option value="fixed">Fixo (Independente do Zoom)</option>
                      </select>
                  </InputGroup>
                  <InputGroup label="Escala Base">
                      <SmartNumberInput 
                          value={visSettings.baseScale} 
                          onChange={(v: number) => setVisSettings({...visSettings, baseScale: v})}
                      />
                  </InputGroup>
                  {visSettings.mode === 'adaptive' && (
                      <InputGroup label="Força de Adaptação">
                          <SmartNumberInput 
                              value={visSettings.adaptiveStrength} 
                              onChange={(v: number) => setVisSettings({...visSettings, adaptiveStrength: v})}
                          />
                      </InputGroup>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">O modo adaptativo ajusta o tamanho dos textos e ícones conforme você aproxima ou afasta o mapa.</p>
            </div>
          )}

          {activeTab === 'vis' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-4 tracking-wider">Posicionamento Global de Legendas</h4>
                <div className="space-y-6">
                  <InputGroup label="Posição Padrão">
                      <div className="py-2">
                          <DirectionControl value={nodeLabelPos} onChange={setNodeLabelPos} />
                      </div>
                  </InputGroup>
                  <InputGroup label="Afastamento (Offset)">
                      <SmartNumberInput value={nodeLabelOffset} onChange={setNodeLabelOffset} />
                  </InputGroup>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Estas configurações afetam todos os nós que não possuem uma posição de legenda definida individualmente.</p>
            </div>
          )}
          
          {activeTab === 'md' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-blue-600"><FileTextIcon /></div>
                  <h3 className="text-sm font-bold text-blue-900 uppercase">Memorial Descritivo Técnico</h3>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Gere um documento completo com Capa, Folha de Rosto, Sumário e Memória de Cálculo 
                  seguindo as normas ABNT de formatação de trabalhos técnicos.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InputGroup label="Título do Projeto">
                  <input type="text" value={mdConfig.title} onChange={(e) => updateMD('title', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Subtítulo">
                  <input type="text" value={mdConfig.subtitle} onChange={(e) => updateMD('subtitle', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Empresa / Instituição">
                  <input type="text" value={mdConfig.company} onChange={(e) => updateMD('company', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Cliente">
                  <input type="text" value={mdConfig.client} onChange={(e) => updateMD('client', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Engenheiro Responsável">
                  <input type="text" value={mdConfig.engineer} onChange={(e) => updateMD('engineer', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Número do CREA">
                  <input type="text" value={mdConfig.crea} onChange={(e) => updateMD('crea', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Localidade (Cidade - UF)">
                  <input type="text" value={mdConfig.location} onChange={(e) => updateMD('location', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Ano">
                  <input type="text" value={mdConfig.year} onChange={(e) => updateMD('year', e.target.value)} className={selectClass} />
                </InputGroup>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={handleGenerate}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg flex items-center gap-3 transition-all active:scale-95"
                >
                  <PlayIcon /> GERAR DOCUMENTO ABNT
                </button>
              </div>
              
              {!projectData && (
                <p className="text-center text-[10px] text-red-400 font-bold animate-pulse">
                  ⚠️ Ative o motor de cálculo para incluir os resultados no memorial.
                </p>
              )}
            </div>
          )}

          {activeTab === 'evte' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-indigo-600"><MapIcon /></div>
                  <h3 className="text-sm font-bold text-indigo-900 uppercase">Estudo de Viabilidade (EVTE Beta)</h3>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Gere uma prancha técnica profissional com selo vertical, legenda de diâmetros 
                  e área de assinatura, ideal para processos de viabilidade técnica.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InputGroup label="Título da Folha">
                  <input type="text" value={evteConfig.titulo} onChange={(e) => updateEVTE('titulo', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="SAA (Sistema)">
                  <input type="text" value={evteConfig.saa} onChange={(e) => updateEVTE('saa', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Local / Empreendimento">
                  <input type="text" value={evteConfig.local} onChange={(e) => updateEVTE('local', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Setor">
                  <input type="text" value={evteConfig.setor} onChange={(e) => updateEVTE('setor', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Escala">
                  <input type="text" value={evteConfig.escala} onChange={(e) => updateEVTE('escala', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Folha Nº">
                  <input type="text" value={evteConfig.folha} onChange={(e) => updateEVTE('folha', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Técnico Especialista">
                  <input type="text" value={evteConfig.tecnico} onChange={(e) => updateEVTE('tecnico', e.target.value)} className={selectClass} />
                </InputGroup>
                <InputGroup label="Matrícula">
                  <input type="text" value={evteConfig.matricula} onChange={(e) => updateEVTE('matricula', e.target.value)} className={selectClass} />
                </InputGroup>
                <div className="col-span-2">
                   <InputGroup label="Observações do Estudo">
                      <textarea 
                        value={evteConfig.obs} 
                        onChange={(e) => updateEVTE('obs', e.target.value)} 
                        className={selectClass + " min-h-[80px] py-2"} 
                      />
                   </InputGroup>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={handleGenerateEVTE}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg flex items-center gap-3 transition-all active:scale-95"
                >
                  <MapIcon /> GERAR PLANTA EVTE BETA
                </button>
              </div>
              
              {!projectData && (
                <p className="text-center text-[10px] text-red-400 font-bold animate-pulse">
                  ⚠️ Ative o motor de cálculo para incluir os resultados na planta.
                </p>
              )}
            </div>
          )}

          {activeTab === 'units' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="text-slate-600 font-bold text-xs uppercase tracking-widest">Configuração de Medidas e Precisão</div>
                </div>
                
                <div className="space-y-6">
                    {/* Meters Section */}
                    <div className="p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Medidas em Metros (m)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Casas Decimais (Cotas/HGL/Extensão)">
                                <select 
                                    value={unitSettings.meters.decimals} 
                                    onChange={e => setUnitSettings({...unitSettings, meters: {...unitSettings.meters, decimals: parseInt(e.target.value)}})}
                                    className={selectClass}
                                >
                                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} casas</option>)}
                                </select>
                            </InputGroup>
                            <div className="flex items-end pb-1.5 px-2">
                                <span className="text-[10px] text-slate-400 font-medium italic">Ex: {(123.45678).toFixed(unitSettings.meters.decimals)} m</span>
                            </div>
                        </div>
                    </div>

                    {/* Pressure Section */}
                    <div className="p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Medidas de Pressão (mca)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Casas Decimais (Pressão nos Nós)">
                                <select 
                                    value={unitSettings.pressure.decimals} 
                                    onChange={e => setUnitSettings({...unitSettings, pressure: {...unitSettings.pressure, decimals: parseInt(e.target.value)}})}
                                    className={selectClass}
                                >
                                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} casas</option>)}
                                </select>
                            </InputGroup>
                            <div className="flex items-end pb-1.5 px-2">
                                <span className="text-[10px] text-slate-400 font-medium italic">Ex: {(15.2345).toFixed(unitSettings.pressure.decimals)} mca</span>
                            </div>
                        </div>
                    </div>

                    {/* Flow Section */}
                    <div className="p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Medidas de Vazão</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Unidade de Vazão">
                                <select 
                                    value={unitSettings.flow.unit} 
                                    onChange={e => {
                                        const u = e.target.value as FlowUnit;
                                        setFlowUnit(u);
                                        setUnitSettings({...unitSettings, flow: {...unitSettings.flow, unit: u}});
                                    }}
                                    className={selectClass}
                                >
                                    <option value="l/s">L/s (Litros por segundo)</option>
                                    <option value="m3/h">m³/h (Metros cúbicos por hora)</option>
                                </select>
                            </InputGroup>
                            <InputGroup label="Casas Decimais">
                                <select 
                                    value={unitSettings.flow.decimals} 
                                    onChange={e => setUnitSettings({...unitSettings, flow: {...unitSettings.flow, decimals: parseInt(e.target.value)}})}
                                    className={selectClass}
                                >
                                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} casas</option>)}
                                </select>
                            </InputGroup>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-medium px-1">
                            A troca da unidade de vazão converte automaticamente todas as demandas e resultados calculados.
                        </div>
                    </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic font-medium">As alterações de precisão decimal são aplicadas instantaneamente em todos os painéis e rótulos do projeto.</p>
            </div>
          )}
        </div>
        
        <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">ABNT Export Engine v1.0</span>
        </div>
      </div>
    </ModalContainer>
  );
};

const TabBtn = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 text-[12px] font-semibold transition-all relative outline-none whitespace-nowrap ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
    <span className={`scale-90 ${active ? 'opacity-100' : 'opacity-40'}`}>{icon}</span>
    <span className="uppercase tracking-wide">{label}</span>
    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
  </button>
);
