
import React, { useState } from 'react';
import { 
  FlowUnit, CalcMethod, SolverType, LabelPosition, VisualizationSettings, MDConfig, Node, PipeSegment, CalculationResult, NodeResult 
} from '../types';
import { GlobalSettingsInputs, DirectionControl } from './ResultsPanel';
import { 
  CloseIcon, SettingsIcon, LayoutIcon, EyeIcon, 
  CalculatorIcon, FileTextIcon, PlayIcon 
} from './Icons';
import { ModalContainer, InputGroup, SmartNumberInput } from './CommonUI';
import { generateMD } from '../services/mdService';

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
  projectData: {
    nodes: Node[];
    pipes: PipeSegment[];
    results: CalculationResult[];
    nodeResults: NodeResult[];
  } | null;
}

type ConfigTab = 'calc' | 'scale' | 'vis' | 'md';

export const ConfigPopup: React.FC<ConfigPopupProps> = ({
  onClose, flowUnit, setFlowUnit, calcMethod, setCalcMethod,
  globalC, setGlobalC, globalRoughness, setGlobalRoughness,
  solverType, setSolverType, visSettings, setVisSettings,
  nodeLabelPos, setNodeLabelPos, nodeLabelOffset, setNodeLabelOffset,
  onApplyGlobal, mdConfig, setMdConfig, projectData
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('calc');
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
      flowUnit
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
