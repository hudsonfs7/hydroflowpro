
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  UnitSystem, CalcMethod, FrictionMethod, Node, PipeSegment, CalculationResult, FlowUnit, SolverType, LabelPosition, VisualizationSettings, Vertex, GeoPosition, MapAnnotation, AnnotationType, LabelMode, NodeType, MDConfig, ProjectMetadata, User, MapStyle, CoordinateFormat, Material, EVTEConfig
} from './types';
import { solveNetwork, convertFlowFromSI, convertFlowToSI, calculateGeoDistance, getPumpOrientations, getTopologyLevels } from './services/calcService';
import { ErrorBoundary, useClickOutside, ModalContainer, SmartNumberInput, InputGroup } from './components/CommonUI';
import { MapControls } from './components/MapControls';
import { DrawControls } from './components/DrawControls'; 
import { SidebarSegment } from './components/SidebarSegments';
import { DrawingManager } from './components/DrawingManager';
import { MapCanvasLayer, MapSvgLayer } from './components/MapAnnotations';
import { NetworkPipe, NetworkJunction, NetworkReservoir, NetworkWell, NetworkPump } from './components/NetworkElements';
import { BottomBar } from './components/BottomBar';
import { 
    PlusIcon, PlayIcon, SettingsIcon, FolderIcon, 
    SaveIcon, UploadIcon, PenToolIcon, FileCadIcon, DropIcon,
    ChevronLeftIcon, ChevronRightIcon, ChartIcon, CloseIcon, TableIcon, WellIcon, MoreVerticalIcon, ChevronUpIcon,
    WaypointIcon, MapIcon, PumpIcon, CalculatorIcon, CloudIcon, CheckIcon, UserIcon, BuildingIcon
} from './components/Icons';

// Lazy load heavy components and modals
const EditorPanel = React.lazy(() => import('./components/EditorPanel').then(m => ({ default: m.EditorPanel })));
const AnnotationEditor = React.lazy(() => import('./components/AnnotationEditor').then(m => ({ default: m.AnnotationEditor })));
const ResultsContent = React.lazy(() => import('./components/ResultsPanel').then(m => ({ default: m.ResultsContent })));
const ConfigPopup = React.lazy(() => import('./components/ConfigPopup').then(m => ({ default: m.ConfigPopup })));
const FlexTableModal = React.lazy(() => import('./components/FlexTableModal').then(m => ({ default: m.FlexTableModal })));
const DemandTool = React.lazy(() => import('./components/DemandTool').then(m => ({ default: m.DemandTool })));
const WellEditorModal = React.lazy(() => import('./components/WellEditorModal').then(m => ({ default: m.WellEditorModal })));
const PumpEditorModal = React.lazy(() => import('./components/PumpEditorModal').then(m => ({ default: m.PumpEditorModal })));
const QuickCalcModal = React.lazy(() => import('./components/QuickCalcModal').then(m => ({ default: m.QuickCalcModal })));
const CreateProjectModal = React.lazy(() => import('./components/CreateProjectModal').then(m => ({ default: m.CreateProjectModal })));
const ProjectManagerModal = React.lazy(() => import('./components/ProjectManagerModal').then(m => ({ default: m.ProjectManagerModal })));
const FinancialManagerModal = React.lazy(() => import('./components/FinancialManagerModal').then(m => ({ default: m.FinancialManagerModal })));
const ProjectSelectorModal = React.lazy(() => import('./components/ProjectSelectorModal').then(m => ({ default: m.ProjectSelectorModal })));
const LoginModal = React.lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const UserManagerModal = React.lazy(() => import('./components/UserManagerModal').then(m => ({ default: m.UserManagerModal })));
const BudgetEditorModal = React.lazy(() => import('./components/BudgetEditorModal').then(m => ({ default: m.BudgetEditorModal })));
const DocumentToolsModal = React.lazy(() => import('./components/DocumentToolsModal').then(m => ({ default: m.DocumentToolsModal })));
import { SplashScreen } from './components/SplashScreen';

import { generateDXF } from './services/dxfService'; 
import { parseDxfToAnnotations } from './services/dxfImportService';
import { getTileFromCache, saveTileToCache } from './services/tileCacheService';
import { saveProjectToCloud, getCloudProjects, deleteProjectFromCloud, updateProjectInCloud, getOrganizationName } from './services/firebaseService';
import { COMMON_FITTINGS } from './constants';

import { useProjectData } from './hooks/useProjectData';
import L from 'leaflet';

type ModalView = 'CONFIG' | 'QUICK_CALC' | 'FLEX_TABLE' | 'WELL_EDITOR' | 'PUMP_EDITOR' | 'CREATE_PROJECT' | 'USER_MANAGER' | 'BUDGET' | 'PROJECT_DOCS' | null;

const CachedTileLayer = L.TileLayer.extend({
  createTile: function (coords: L.Coords, done: L.DoneCallback) {
    const tile = document.createElement('img');
    const url = this.getTileUrl(coords);
    L.DomEvent.on(tile, 'load', L.Util.bind(done, null, null, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind(done, null, null, tile));
    (async () => {
      try {
        const cachedBlob = await getTileFromCache(url);
        if (cachedBlob) { tile.src = URL.createObjectURL(cachedBlob); return; }
        tile.src = url;
      } catch (e) { tile.src = url; }
    })();
    return tile;
  }
});

const createCachedTileLayer = (url: string, options: L.LayerOptions) => {
  return new (CachedTileLayer as any)(url, options);
};

export default function App() {
  const {
      nodes, pipes, materials, demandGroups, annotations, annotationGroups, mdConfig, evteConfig, projectMetadata,
      setNodes, setPipes, setMaterials, setDemandGroups, setAnnotations, setAnnotationGroups, setMdConfig, setEvteConfig, setProjectMetadata,
      addNode, updateNode, removeNode,
      addPipe, updatePipe, removePipe,
      addDemandGroup, updateDemandGroup, removeDemandGroup,
      addAnnotationGroup, updateAnnotationGroup, removeAnnotationGroup,
      addAnnotation, updateAnnotation, removeAnnotation,
      triggerLengthRecalculation
  } = useProjectData();

  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number; geoPosition: GeoPosition; pointerX?: number; pointerY?: number } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street' | 'none'>('street'); 
  const [mapOpacity, setMapOpacity] = useState(1);
  const [coordFormat, setCoordFormat] = useState<'decimal' | 'utm'>('utm'); 
  const [searchQuery, setSearchQuery] = useState("");
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const [pendingNodeType, setPendingNodeType] = useState<NodeType | null>(null);
  const [nextDrawNodeType, setNextDrawNodeType] = useState<NodeType>('demand');
  const [drawStartNodeId, setDrawStartNodeId] = useState<string | null>(null);
  const [drawBufferVertices, setDrawBufferVertices] = useState<Vertex[]>([]);
  const [drawPlacementMode, setDrawPlacementMode] = useState<'node' | 'vertex'>('node');
  const [drawMaterialId, setDrawMaterialId] = useState<string>(''); 
  const [drawDiameter, setDrawDiameter] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<{ type: AnnotationType, groupId: string, points: GeoPosition[] } | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedPipeId, setSelectedPipeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{ type: ModalView; data?: any } | null>(null);
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isFinancialManagerOpen, setIsFinancialManagerOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string>("");
  
  const [managerRefreshKey, setManagerRefreshKey] = useState(0);

  const activeDragRef = useRef<{ node: string | null, vertex: any, annVertex: any, annLabel: string | null }>({
      node: null, vertex: null, annVertex: null, annLabel: null
  });

  const pumpSuctionMap = useMemo(() => {
    return getPumpOrientations(nodes, pipes);
  }, [nodes, pipes]);

  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); 
  const [sidebarMode, setSidebarMode] = useState<'results' | 'properties'>('results');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [showDemandTool, setShowDemandTool] = useState(false);
  const [demandSelection, setDemandSelection] = useState<Set<string>>(new Set());
  const [demandDecimals, setDemandDecimals] = useState<number>(3);

  const [snapshot, setSnapshot] = useState<{
      nodes: Node[],
      pipes: PipeSegment[],
      results: CalculationResult[],
      nodeResults: any[],
      materials: Material[],
      timestamp: number
  } | null>(null);

  const projectMenuRef = useClickOutside(() => setShowProjectMenu(false));
  
  const [globalC, setGlobalC] = useState<string>('');
  const [globalRoughness, setGlobalRoughness] = useState<string>('');
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcWarning, setCalcWarning] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(UnitSystem.SI);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>('l/s');
  const [calcMethod, setCalcMethod] = useState<CalcMethod>(CalcMethod.DARCY_WEISBACH);
  const [frictionMethod, setFrictionMethod] = useState<FrictionMethod>(FrictionMethod.COLEBROOK_WHITE);
  const [solverType, setSolverType] = useState<SolverType>(SolverType.GGA);
  const [nodeLabelPos, setNodeLabelPos] = useState<LabelPosition>('top-right');
  const [nodeLabelOffset, setNodeLabelOffset] = useState<number>(20);
  const [visSettings, setVisSettings] = useState<VisualizationSettings>({
      mode: 'adaptive',
      baseScale: 1.0,
      adaptiveStrength: 0.8
  });

  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragVertex, setDragVertex] = useState<{ pipeId: string, index: number } | null>(null);
  const [dragAnnVertex, setDragAnnVertex] = useState<{ annId: string, index: number } | null>(null);
  const [dragAnnLabel, setDragAnnLabel] = useState<string | null>(null);

  useEffect(() => { activeDragRef.current = { node: dragNode, vertex: dragVertex, annVertex: dragAnnVertex, annLabel: dragAnnLabel }; }, [dragNode, dragVertex, dragAnnVertex, dragAnnLabel]);

  useEffect(() => {
      if (currentUser && currentUser.organizationId) {
          getOrganizationName(currentUser.organizationId).then(name => setCurrentOrgName(name));
      } else {
          setCurrentOrgName("");
      }
  }, [currentUser]);

  const showValidationToast = useCallback((msg: string) => {
    setValidationMsg(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setValidationMsg(null);
    }, 3000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        setIsDrawMode(false);
        setPendingNodeType(null);
        setDrawingDraft(null);
        setActiveAnnotationId(null);
        setDrawStartNodeId(null);
        setDrawBufferVertices([]);
        setSelectedNodeId(null);
        setSelectedPipeId(null);
        setSelectedAnnotationId(null);
        setDemandSelection(new Set());
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          removeNode(selectedNodeId);
          setSelectedNodeId(null);
          setSnapshot(null);
          showValidationToast("Nó removido.");
        } else if (selectedPipeId) {
          removePipe(selectedPipeId);
          setSelectedPipeId(null);
          setSnapshot(null);
          showValidationToast("Trecho removido.");
        } else if (selectedAnnotationId) {
          removeAnnotation(selectedAnnotationId);
          setSelectedAnnotationId(null);
          showValidationToast("Anotação removida.");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedPipeId, selectedAnnotationId, removeNode, removePipe, removeAnnotation, showValidationToast]);

  const fetchElevation = useCallback(async (lat: number, lng: number): Promise<number | null> => {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
        const data = await response.json();
        if (data && data.elevation && data.elevation.length > 0) {
            return data.elevation[0];
        }
        return null;
    } catch (e) {
        console.error("Elevation fetch failed", e);
        return null;
    }
  }, []);

  const nodeResultsDisplay = useMemo(() => {
      const map = new Map<string, { head: number, pressure: number }>();
      if (snapshot && snapshot.nodeResults) {
          snapshot.nodeResults.forEach((nr: any) => {
              map.set(nr.nodeId, { head: nr.head, pressure: nr.pressure });
          });
      }
      return map;
  }, [snapshot]);

  const addNewNode = useCallback((type: NodeType) => {
      setPendingNodeType(type);
      setIsDrawMode(false);
      setDrawStartNodeId(null);
      setDrawBufferVertices([]);
      showValidationToast(`Clique no mapa para posicionar: ${type === 'source' ? 'Reservatório' : type === 'well' ? 'Poço' : type === 'pump' ? 'Bomba' : 'Nó'}`);
      setShowProjectMenu(false);
  }, [showValidationToast]);

  const toggleDrawMode = useCallback(() => {
      setIsDrawMode(prev => {
          const newState = !prev;
          if (newState) {
              showValidationToast("Modo Desenho: Clique em um nó para começar.");
              setPendingNodeType(null);
          } else {
              setDrawStartNodeId(null);
              setDrawBufferVertices([]);
              showValidationToast("Modo de desenho encerrado.");
          }
          return newState;
      });
  }, [showValidationToast]);

  const handleDrawMaterialChange = useCallback((matId: string) => {
      setDrawMaterialId(matId);
      const mat = materials.find(m => m.id === matId);
      if (mat && mat.availableDiameters.length > 0) {
          setDrawDiameter(mat.availableDiameters[0].dn);
      }
  }, [materials]);

  const isMapMode = mapStyle !== 'none';
  const computedScale = useMemo(() => {
    if (visSettings.mode === 'fixed' || !isMapMode) return visSettings.baseScale;
    const referenceZoom = 17;
    const scaleFactor = Math.pow(2, currentZoom - referenceZoom);
    const rawScale = visSettings.baseScale * scaleFactor;
    return Math.min(10, Math.max(0.1, rawScale)); // Strict clamping between 0.1x and 10x
  }, [visSettings, currentZoom, isMapMode]);

  const handleApplyGlobalParameters = () => {
    const parseGlobal = (val: string) => {
        if (!val || val.trim() === '') return undefined;
        const normalized = val.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? undefined : num;
    };
    const gRough = parseGlobal(globalRoughness);
    const gC = parseGlobal(globalC);
    if (gRough === undefined && gC === undefined) { showValidationToast("Informe um valor para aplicar."); return; }
    pipes.forEach(p => {
        const updates: any = {};
        if (calcMethod === CalcMethod.DARCY_WEISBACH && gRough !== undefined) { updates.customRoughness = gRough; }
        else if (calcMethod === CalcMethod.HAZEN_WILLIAMS && gC !== undefined) { updates.customC = gC; }
        if (Object.keys(updates).length > 0) { updatePipe(p.id, updates); }
    });
    showValidationToast("Parâmetros aplicados a toda a rede!");
  };

  const handleCalculate = () => {
    setCalcError(null); 
    const sources = nodes.filter(n => n.type === 'source' || n.type === 'well'); 
    if (sources.length === 0) { showValidationToast("Defina uma Fonte (Reservatório ou Poço)."); return; }

    // --- STRICT PRE-CALCULATION CONNECTIVITY VALIDATION ---
    const levels = getTopologyLevels(nodes, pipes);
    const disconnectedNodes = nodes.filter(n => !levels.has(n.id) && n.type !== 'source' && n.type !== 'well');
    
    if (disconnectedNodes.length > 0) {
        const names = disconnectedNodes.slice(0, 5).map(n => n.name || n.id).join(', ');
        alert(`ERRO DE CONECTIVIDADE: ${disconnectedNodes.length} trechos/nós estão sem acesso à fonte de água (Ex: ${names}). Corrija o traçado da rede antes de calcular.`);
        return;
    }

    const pumps = nodes.filter(n => n.type === 'pump');
    for (const p of pumps) {
        const cfg = p.cmbConfig;
        const hasCurve = p.pumpCurve && p.pumpCurve.length >= 2;
        if (!cfg || !cfg.designFlow || cfg.designFlow <= 0 || !cfg.designHead || cfg.designHead <= 0 || !hasCurve) {
            showValidationToast(`Configuração do CMB "${p.name}" incompleta. Defina a Vazão, AMT e Curva.`);
            if (window.innerWidth < 768) { setActiveModal({ type: 'PUMP_EDITOR', data: p.id }); }
            return; 
        }
    }
    const parseGlobal = (val: string) => {
        if (!val || val.trim() === '') return undefined;
        const normalized = val.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? undefined : num;
    };
    const gRough = parseGlobal(globalRoughness);
    const gC = parseGlobal(globalC);
    try {
        const { pipes: calculatedPipes, nodes: calculatedNodes } = solveNetwork(
            nodes, pipes, materials, calcMethod, frictionMethod, unitSystem, flowUnit, 20, gRough, gC, solverType
        );

        setSnapshot({ 
          nodes: JSON.parse(JSON.stringify(nodes)), 
          pipes: JSON.parse(JSON.stringify(pipes)), 
          results: calculatedPipes, 
          nodeResults: calculatedNodes, 
          materials: JSON.parse(JSON.stringify(materials)),
          timestamp: Date.now() 
        });
        setShowSidebar(true); setSidebarMode('results');
    } catch (err: any) {
        setCalcError(err.message || "Erro inesperado no cálculo.");
        setSnapshot(null); setShowSidebar(true); setSidebarMode('results');
    }
  };

  const handleDiameterChange = useCallback((pipeId: string, dn: number) => {
    const pipe = pipes.find(p => p.id === pipeId);
    if (!pipe) return;
    const mat = materials.find(m => m.id === pipe.materialId);
    if (!mat) return;
    const diaDef = mat.availableDiameters.find(d => d.dn === dn);
    if (diaDef) updatePipe(pipeId, { diameter: diaDef.di, nominalDiameter: diaDef.dn });
  }, [pipes, materials, updatePipe]);

  const addFittingToPipe = useCallback((pipeId: string) => {
    const pipe = pipes.find(p => p.id === pipeId);
    if (!pipe) return;
    const newFitting = { ...COMMON_FITTINGS[0], count: 1 };
    updatePipe(pipeId, { fittings: [...pipe.fittings, newFitting] });
  }, [pipes, updatePipe]);

  const updateFittingInPipe = useCallback((pipeId: string, index: number, count: number, fittingId: string) => {
    const pipe = pipes.find(p => p.id === pipeId);
    if (!pipe) return;
    const newFittings = [...pipe.fittings];
    const ref = COMMON_FITTINGS.find(f => f.id === fittingId);
    if (ref) { newFittings[index] = { ...ref, count }; updatePipe(pipeId, { fittings: newFittings }); }
  }, [pipes, updatePipe]);

  const changePipeMaterial = useCallback((pipeId: string, materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;
    updatePipe(pipeId, { materialId, diameter: mat.availableDiameters[0].di, nominalDiameter: mat.availableDiameters[0].dn });
  }, [materials, updatePipe]);

  const addPipeVertex = useCallback((pipeId: string) => {
    const pipe = pipes.find(p => p.id === pipeId);
    if (!pipe) return;
    const start = nodes.find(n => n.id === pipe.startNodeId);
    const end = nodes.find(n => n.id === pipe.endNodeId);
    if (!start || !end) return;
    const lastPoint = pipe.vertices && pipe.vertices.length > 0 ? pipe.vertices[pipe.vertices.length - 1] : start;
    const newLat = (lastPoint.geoPosition.lat + end.geoPosition.lat) / 2;
    const newLng = (lastPoint.geoPosition.lng + end.geoPosition.lng) / 2;
    let x = (lastPoint.x + end.x) / 2; let y = (lastPoint.y + end.y) / 2;
    if (mapInstance) { const pt = mapInstance.latLngToContainerPoint([newLat, newLng]); x = pt.x; y = pt.y; }
    const newVertex: Vertex = { x, y, geoPosition: { lat: newLat, lng: newLng } };
    updatePipe(pipeId, { vertices: [...(pipe.vertices || []), newVertex] });
  }, [pipes, nodes, updatePipe, mapInstance]);

  useEffect(() => {
    if (mapRef.current && !mapInstance) {
      const map = L.map(mapRef.current, { center: [-17.5353, -39.7423], zoom: 16, zoomControl: false, attributionControl: false, minZoom: 4, maxZoom: 23 });
      const satelliteLayer = createCachedTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 18, maxZoom: 23 } as any);
      const streetLayer = createCachedTileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxNativeZoom: 19, maxZoom: 23 } as any);
      (map as any)._satellite = satelliteLayer; (map as any)._street = streetLayer;
      streetLayer.addTo(map); setMapInstance(map); setCurrentZoom(map.getZoom());
      return () => { map.remove(); setMapInstance(null); };
    }
  }, [currentUser]);

  useEffect(() => {
    if (!mapInstance) return;
    const handleMoveStart = () => setIsPanning(true);
    const handleMoveEnd = () => setIsPanning(false);
    mapInstance.on('movestart', handleMoveStart); 
    mapInstance.on('moveend', handleMoveEnd);
    return () => {
      mapInstance.off('movestart', handleMoveStart);
      mapInstance.off('moveend', handleMoveEnd);
    };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;
    const sat = (mapInstance as any)._satellite; const str = (mapInstance as any)._street;
    if(mapInstance.hasLayer(sat)) mapInstance.removeLayer(sat); if(mapInstance.hasLayer(str)) mapInstance.removeLayer(str);
    if (mapStyle === 'satellite') { sat.addTo(mapInstance); sat.setOpacity(mapOpacity); }
    else if (mapStyle === 'street') { str.addTo(mapInstance); str.setOpacity(mapOpacity); }
  }, [mapStyle, mapOpacity, mapInstance]);

  const createPipeBetween = (startId: string, endId: string, endNodeOverride?: Node, initialVertices: Vertex[] = []) => {
    const exists = pipes.some(p => (p.startNodeId === startId && p.endNodeId === endId) || (p.startNodeId === endId && p.endNodeId === startId));
    if(exists) return;
    const start = nodes.find(n => n.id === startId); const end = endNodeOverride || nodes.find(n => n.id === endId);
    let initialLength = 100; let useCustom = true;
    if (start?.geoPosition && end?.geoPosition && isMapMode) { initialLength = parseFloat(calculateGeoDistance(start.geoPosition, end.geoPosition).toFixed(2)); useCustom = false; }
    const mat = materials.find(m => m.id === drawMaterialId) || materials[0];
    const defaultDia = mat.availableDiameters.find(d => d.dn === drawDiameter) || mat.availableDiameters[0];
    let nextIdx = (projectMetadata?.nextPipeIdx) || (Math.max(0, ...pipes.map(p => {
        const n = parseInt(p.id.replace(/\D/g, '')) || 0;
        return n < 1000000 ? n : 0;
    })) + 1);
    
    const nextPipeId = `p${nextIdx}`;
    const nextPipeName = `T${nextIdx}`;
    
    addPipe({ type: 'pipe', id: nextPipeId, name: nextPipeName, startNodeId: startId, endNodeId: endId, length: initialLength, diameter: defaultDia.di, nominalDiameter: defaultDia.dn, materialId: mat.id, flowRate: 0, distributedDemand: 0, fittings: [], useCustomLength: useCustom, vertices: initialVertices });
    if (projectMetadata) setProjectMetadata({ ...projectMetadata, nextPipeIdx: nextIdx + 1 });
    setSnapshot(null);
  };

  const openProperties = (type: 'node' | 'pipe' | 'ann', id: string) => {
    if (type === 'node') {
        const n = nodes.find(nx => nx.id === id);
        if (n?.type === 'well') { setActiveModal({ type: 'WELL_EDITOR', data: id }); return; }
        if (n?.type === 'pump') { setActiveModal({ type: 'PUMP_EDITOR', data: id }); return; }
        setSelectedNodeId(id); setSelectedPipeId(null); setSelectedAnnotationId(null);
    } else if (type === 'pipe') {
        setSelectedPipeId(id); setSelectedNodeId(null); setSelectedAnnotationId(null);
    } else if (type === 'ann') {
        setSelectedAnnotationId(id); setSelectedPipeId(null); setSelectedNodeId(null);
    }
    setSidebarMode('properties'); setShowSidebar(true);
  };

  const handleCanvasClick = (e: any) => {
    if (!mapInstance) return;
    if (drawingDraft) {
        const newPoints = [...drawingDraft.points, { lat: e.latlng.lat, lng: e.latlng.lng }];
        setDrawingDraft({ ...drawingDraft, points: newPoints });
        if (drawingDraft.type === 'line' && newPoints.length === 2) {
            const id = `ann-${Date.now()}`;
            addAnnotation({ id, type: 'line', groupId: drawingDraft.groupId, content: "", color: '#3b82f6', hatch: false, points: newPoints, labelMode: 'fixed' });
            setDrawingDraft(null); showValidationToast("Linha CAD criada!");
        }
        return;
    }
    if (activeAnnotationId) {
        const ann = annotations.find(a => a.id === activeAnnotationId);
        if (ann) {
            if (ann.type === 'area' || ann.type === 'polyline') {
                const newPoints = [...(ann.points || []), { lat: e.latlng.lat, lng: e.latlng.lng }];
                updateAnnotation(ann.id, { points: newPoints });
            } else if (ann.type === 'line') {
                const newPoints = [...(ann.points || []), { lat: e.latlng.lat, lng: e.latlng.lng }];
                updateAnnotation(ann.id, { points: newPoints });
                if (newPoints.length >= 2) setActiveAnnotationId(null);
            } else if (ann.type === 'text') {
                updateAnnotation(ann.id, { position: { lat: e.latlng.lat, lng: e.latlng.lng } });
                setActiveAnnotationId(null);
            }
            return;
        }
    }
    if (pendingNodeType) {
        let lat = e.latlng.lat; let lng = e.latlng.lng;
        const pt = mapInstance.latLngToContainerPoint(e.latlng);
        let nextIdx = (projectMetadata?.nextNodeIdx) || (Math.max(0, ...nodes.map(n => {
            const num = parseInt(n.id.replace(/\D/g, '')) || 0;
            return num < 1000000 ? num : 0;
        })) + 1);
        const newNodeId = `n${nextIdx}`;
        let namePrefix = 'Nó'; if (pendingNodeType === 'source') namePrefix = 'Res'; else if (pendingNodeType === 'well') namePrefix = 'Pç'; else if (pendingNodeType === 'pump') namePrefix = 'Bomba';
        const newNode: Node = { id: newNodeId, type: pendingNodeType, x: pt.x, y: pt.y, geoPosition: { lat, lng }, elevation: 0, autoElevation: true, name: `${namePrefix} ${nextIdx}`, baseDemand: 0, showFlowLabel: false };
        addNode(newNode); if (projectMetadata) setProjectMetadata({ ...projectMetadata, nextNodeIdx: nextIdx + 1 });
        setSnapshot(null);
        fetchElevation(lat, lng).then(z => { if (z !== null) updateNode(newNodeId, { elevation: z }); });
        setPendingNodeType(null); showValidationToast(`${newNode.name} criado!`);
        return;
    }
    if (isDrawMode) {
        let lat = 0, lng = 0, x = 0, y = 0;
        if (e.latlng) { lat = e.latlng.lat; lng = e.latlng.lng; const pt = mapInstance.latLngToContainerPoint(e.latlng); x = pt.x; y = pt.y; }
        if (drawPlacementMode === 'vertex') { if (!drawStartNodeId) { showValidationToast("Selecione um nó inicial."); return; } setDrawBufferVertices(prev => [...prev, { x, y, geoPosition: { lat, lng } }]); return; }
        const nodeTypeToCreate = nextDrawNodeType;
        let nextIdx = (projectMetadata?.nextNodeIdx) || (Math.max(0, ...nodes.map(n => {
            const num = parseInt(n.id.replace(/\D/g, '')) || 0;
            return num < 1000000 ? num : 0;
        })) + 1);
        const newNodeId = `n${nextIdx}`;
        let namePrefix = 'Nó'; if (nodeTypeToCreate === 'source') namePrefix = 'Res'; else if (nodeTypeToCreate === 'well') namePrefix = 'Pç'; else if (nodeTypeToCreate === 'pump') namePrefix = 'Bomba';
        const newNode: Node = { id: newNodeId, type: nodeTypeToCreate, x, y, geoPosition: { lat, lng }, elevation: 0, autoElevation: true, name: `${namePrefix} ${nextIdx}`, baseDemand: 0, showFlowLabel: false };
        addNode(newNode); if (projectMetadata) setProjectMetadata({ ...projectMetadata, nextNodeIdx: nextIdx + 1 });
        setSnapshot(null);
        fetchElevation(lat, lng).then(z => { if (z !== null) updateNode(newNodeId, { elevation: z }); });
        if (drawStartNodeId) { createPipeBetween(drawStartNodeId, newNodeId, newNode, drawBufferVertices); setDrawBufferVertices([]); }
        setDrawStartNodeId(newNodeId); if (nodeTypeToCreate !== 'demand') setNextDrawNodeType('demand');
        return; 
    }
    if (!showDemandTool) { setSelectedPipeId(null); setSelectedNodeId(null); setSelectedAnnotationId(null); }
    setShowProjectMenu(false);
  }; 

  const handleCanvasClickRef = useRef(handleCanvasClick);
  useEffect(() => { handleCanvasClickRef.current = handleCanvasClick; }, [isDrawMode, nodes, drawStartNodeId, pipes, showDemandTool, drawMaterialId, drawDiameter, drawPlacementMode, drawBufferVertices, activeAnnotationId, annotations, pendingNodeType, nextDrawNodeType, drawingDraft]); 

  useEffect(() => {
      if (!mapInstance) return;
      const handler = (e: any) => handleCanvasClickRef.current(e);
      const zoomHandler = () => { setCurrentZoom(mapInstance.getZoom()); }
      mapInstance.on('click', handler); mapInstance.on('zoom', zoomHandler);
      return () => { mapInstance.off('click', handler); mapInstance.off('zoom', zoomHandler); };
  }, [mapInstance]);

  const updateScreenPositions = useCallback(() => {
      if (!mapInstance) return;
      try {
        setNodes(prevNodes => {
            const upNodes = prevNodes.map(node => {
                if (!node || !node.geoPosition) return node;
                const point = mapInstance.latLngToContainerPoint([node.geoPosition.lat, node.geoPosition.lng]);
                return { ...node, x: point.x, y: point.y };
            });
            
            setPipes(prevPipes => prevPipes.map(pipe => {
                const newVertices = (pipe.vertices || []).map(v => {
                    const pt = mapInstance.latLngToContainerPoint([v.geoPosition.lat, v.geoPosition.lng]);
                    return { ...v, x: pt.x, y: pt.y };
                });
                return { ...pipe, vertices: newVertices };
            }));

            return upNodes;
        });

        setDrawBufferVertices(prev => prev.map(v => {
            const pt = mapInstance.latLngToContainerPoint([v.geoPosition.lat, v.geoPosition.lng]);
            return { ...v, x: pt.x, y: pt.y };
        }));
      } catch (err) {}
  }, [mapInstance, setNodes, setPipes, setDrawBufferVertices]);

  useEffect(() => {
      if (!mapInstance) return;
      mapInstance.on('move', updateScreenPositions); mapInstance.on('zoom', updateScreenPositions); mapInstance.on('resize', updateScreenPositions);
      return () => { mapInstance.off('move', updateScreenPositions); mapInstance.off('zoom', updateScreenPositions); mapInstance.off('resize', updateScreenPositions); };
  }, [mapInstance, updateScreenPositions]);

  const handlePointerDown = (e: any, type: 'node' | 'pipe', id: string) => { 
    e.stopPropagation(); 
    
    if (isDrawMode && type === 'node') {
        if (!drawStartNodeId) {
            setDrawStartNodeId(id);
            showValidationToast("Iniciando traçado a partir deste nó.");
            return;
        } else {
            if (drawStartNodeId !== id) {
                createPipeBetween(drawStartNodeId, id, undefined, drawBufferVertices);
                setDrawBufferVertices([]);
                setDrawStartNodeId(id);
                showValidationToast("Conectado ao nó existente.");
                return;
            }
        }
    }

    const isTouch = e.type.startsWith('touch');
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => { openProperties(type, id); }, 2500);
    if (type === 'node') {
        if (mapInstance) mapInstance.dragging.disable(); 
        setDragNode(id); 
        const node = nodes.find(n => n.id === id); 
        if (node) { dragStartRef.current = { x: node.x, y: node.y, time: Date.now(), geoPosition: { ...node.geoPosition }, pointerX: clientX, pointerY: clientY }; }
    }
  };

  const handlePointerMove = (e: any) => {
    const isDragging = dragNode || dragVertex || dragAnnVertex || dragAnnLabel;
    if (isDragging && dragStartRef.current && longPressTimerRef.current) {
        const isTouch = e.type.startsWith('touch');
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        const dx = clientX - (dragStartRef.current.pointerX || 0);
        const dy = clientY - (dragStartRef.current.pointerY || 0);
        if (dx*dx + dy*dy > 25) { window.clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    }
    if (!isDragging && !isDrawMode && !pendingNodeType && !drawingDraft) return;
    const isTouch = e.type.startsWith('touch'); 
    const clientX = isTouch ? e.touches[0].clientX : e.clientX; 
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    if (!mapInstance) return;
    const rect = mapRef.current?.getBoundingClientRect(); if (!rect) return;
    const containerX = clientX - rect.left; const containerY = clientY - rect.top;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => { 
      try { 
        if (isDrawMode || pendingNodeType || drawingDraft) setCursorPos({ x: containerX, y: containerY });
        if (isDragging) {
            const latLng = mapInstance.containerPointToLatLng([containerX, containerY]); 
            if (dragNode) setNodes(prev => prev.map(n => n.id === dragNode ? { ...n, x: containerX, y: containerY, geoPosition: { lat: latLng.lat, lng: latLng.lng } } : n)); 
            else if (dragVertex) setPipes(prev => prev.map(p => { if (p.id !== dragVertex.pipeId) return p; const nv = [...(p.vertices || [])]; nv[dragVertex.index] = { ...nv[dragVertex.index], x: containerX, y: containerY, geoPosition: { lat: latLng.lat, lng: latLng.lng } }; return { ...p, vertices: nv }; }));
            else if (dragAnnVertex) setAnnotations(prev => prev.map(a => { if (a.id !== dragAnnVertex.annId) return a; const np = [...(a.points || [])]; np[dragAnnVertex.index] = { lat: latLng.lat, lng: latLng.lng }; return { ...a, points: np }; }));
            else if (dragAnnLabel) setAnnotations(prev => prev.map(a => { if (a.id !== dragAnnLabel) return a; return { ...a, position: { lat: latLng.lat, lng: latLng.lng } }; }));
        }
      } finally { rafRef.current = null; } 
    });
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) { window.clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (mapInstance) mapInstance.dragging.enable();
    if (dragStartRef.current) { 
      if (Date.now() - dragStartRef.current.time > 300) {
        if (dragNode) { triggerLengthRecalculation(); const n = nodes.find(nx => nx.id === dragNode); if (n?.autoElevation) fetchElevation(n.geoPosition.lat, n.geoPosition.lng).then(z => { if (z !== null) updateNode(dragNode, { elevation: z }); }); }
        else if (dragVertex) triggerLengthRecalculation(); 
      }
    }
    setDragNode(null); setDragVertex(null); setDragAnnVertex(null); setDragAnnLabel(null); dragStartRef.current = null;
  };

  const handleImportDxf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      try {
        const importedAnns = parseDxfToAnnotations(content);
        if (importedAnns.length > 0) {
          const groupId = addAnnotationGroup(file.name, true);
          const finalizedAnns = importedAnns.map(ann => ({ ...ann, groupId }));
          setAnnotations(prev => [...prev, ...finalizedAnns]);
          showValidationToast(`${importedAnns.length} elementos importados de ${file.name}`);
        } else {
          showValidationToast("Nenhum elemento suportado encontrado no DXF.");
        }
      } catch (err) {
        showValidationToast("Erro ao processar DXF.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCloudSave = async () => {
    if (!projectMetadata) return;
    if (!currentUser) {
        setIsLoginOpen(true);
        return;
    }
    
    if (!projectMetadata._id) {
        showValidationToast("Erro: O projeto atual não possui vínculo no banco. Volte ao seletor e crie o empreendimento lá primeiro.");
        return;
    }

    showValidationToast("Salvando na nuvem...");
    try {
        const proj = { version: "1.5", metadata: projectMetadata, date: new Date().toISOString(), nodes, pipes, demandGroups, annotations, annotationGroups, mdConfig, settings: { unitSystem, flowUnit, calcMethod, frictionMethod, solverType, globalC, globalRoughness, mapStyle, mapOpacity, coordFormat, visSettings, nodeLabelPos, nodeLabelOffset } };
        
        await updateProjectInCloud(projectMetadata._id, projectMetadata.name, proj);
        showValidationToast("Empreendimento atualizado na nuvem com sucesso!");
        
        setManagerRefreshKey(prev => prev + 1);
        setShowProjectMenu(false);
    } catch (err: any) {
        alert(err.message || "Erro ao salvar na nuvem.");
        showValidationToast("Erro ao salvar.");
    }
  };

  const handleProjectsClick = () => {
      setShowProjectMenu(false);
      if (currentUser) {
          setIsProjectManagerOpen(true);
      } else {
          setIsLoginOpen(true);
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setIsProjectManagerOpen(false);
      setIsProjectSelectorOpen(false);
      setIsFinancialManagerOpen(false);
      setProjectMetadata(null);
      showValidationToast("Você saiu do sistema.");
      setShowProjectMenu(false);
  };

  const renderActiveModal = () => {
    if (isLoginOpen) {
        return <LoginModal onClose={() => setIsLoginOpen(false)} onLoginSuccess={(user) => { setCurrentUser(user); setIsLoginOpen(false); setIsProjectSelectorOpen(true); showValidationToast(`Bem-vindo, ${user.username}`); }} />;
    }

    if (!activeModal) return null;

    switch (activeModal.type) {
      case 'USER_MANAGER':
          return <UserManagerModal onClose={() => setActiveModal(null)} />;
      case 'CREATE_PROJECT':
        const initData = activeModal.data;
        const isEditingCloudProject = !!(initData && initData._id);
        return (
          <CreateProjectModal 
            initialData={initData}
            userOrgName={currentOrgName} 
            currentUser={currentUser} 
            onClose={() => {
                setActiveModal(null);
                if (!projectMetadata) {
                    setIsProjectSelectorOpen(true);
                }
            }} 
            onDelete={isEditingCloudProject ? async () => {
                 try {
                     if (!initData._id) throw new Error("ID do projeto não encontrado.");
                     await deleteProjectFromCloud(initData._id);
                     showValidationToast("Projeto deletado com sucesso!");
                     setManagerRefreshKey(prev => prev + 1);
                     setActiveModal(null);
                 } catch(e: any) {
                     alert("Erro ao deletar projeto: " + e.message);
                 }
            } : undefined}
            onSave={async (data) => { 
                const existingId = (initData as any)?._id || (data as any)._id;
                const orgId = data.organizationId || currentUser?.organizationId || 'legacy';
                const metadataWithId = { ...data, _id: existingId, organizationId: orgId };
                setProjectMetadata(metadataWithId);
                
                const settings = { unitSystem, flowUnit, calcMethod, frictionMethod, solverType, globalC, globalRoughness, mapStyle, mapOpacity, coordFormat, visSettings, nodeLabelPos, nodeLabelOffset };

                if (isProjectManagerOpen) {
                    try {
                        const proj = { version: "1.5", metadata: metadataWithId, date: new Date().toISOString(), nodes, pipes, demandGroups, annotations, annotationGroups, mdConfig, settings };
                        if (existingId) {
                            await updateProjectInCloud(existingId, data.name, proj);
                            showValidationToast("Projeto atualizado com sucesso!");
                        } else {
                            const newId = await saveProjectToCloud(data.name, proj, orgId);
                            setProjectMetadata(prev => prev ? ({ ...prev, _id: newId, organizationId: orgId }) : null);
                            showValidationToast("Projeto salvo com sucesso!");
                        }
                        setManagerRefreshKey(prev => prev + 1);
                    } catch (e) {
                        console.error(e);
                        showValidationToast("Erro ao salvar.");
                    }
                } else if (!projectMetadata) {
                    // if they created the first project, we can auto-load it
                    try {
                        const orgId = data.organizationId || currentUser?.organizationId || 'legacy';
                        const proj = { version: "1.5", metadata: metadataWithId, date: new Date().toISOString(), nodes: [], pipes: [], demandGroups: [], settings };
                        const newId = await saveProjectToCloud(data.name, proj, orgId);
                        setProjectMetadata({ ...metadataWithId, _id: newId });
                        setNodes([]); setPipes([]); setDemandGroups([]);
                        showValidationToast("Novo empreendimento criado e carregado!");
                    } catch(e) {}
                }
                setActiveModal(null); 
            }} 
          />
        );
      case 'CONFIG':
        return (
          <ConfigPopup 
            isOpen={true} 
            onClose={() => setActiveModal(null)}
            flowUnit={flowUnit} setFlowUnit={setFlowUnit}
            calcMethod={calcMethod} setCalcMethod={setCalcMethod}
            globalC={globalC} setGlobalC={setGlobalC}
            globalRoughness={globalRoughness} setGlobalRoughness={setGlobalRoughness}
            solverType={solverType} setSolverType={setSolverType}
            nodeLabelPos={nodeLabelPos} setNodeLabelPos={setNodeLabelPos}
            nodeLabelOffset={nodeLabelOffset} setNodeLabelOffset={setNodeLabelOffset}
            visSettings={visSettings} setVisSettings={setVisSettings}
            onApplyGlobal={handleApplyGlobalParameters}
            mdConfig={mdConfig} setMdConfig={setMdConfig}
            evteConfig={evteConfig} setEvteConfig={setEvteConfig}
            projectData={snapshot}
          />
        );
      case 'QUICK_CALC':
        return <QuickCalcModal onClose={() => setActiveModal(null)} flowUnit={flowUnit} unitSystem={unitSystem} />;
      case 'FLEX_TABLE':
        return snapshot ? (
          <FlexTableModal 
            onClose={() => setActiveModal(null)} 
            pipes={snapshot.pipes} 
            nodes={snapshot.nodes} 
            results={snapshot.results} 
            nodeResults={snapshot.nodeResults} 
            materials={materials} 
            flowUnit={flowUnit} 
            unitSystem={unitSystem} 
            calcMethod={calcMethod} 
          />
        ) : null;
      case 'WELL_EDITOR':
        const wellNode = nodes.find(n => n.id === activeModal.data);
        return wellNode ? (
          <WellEditorModal 
            node={wellNode} 
            updateNode={updateNode} 
            onClose={() => setActiveModal(null)} 
            onDelete={() => { removeNode(wellNode.id); setSnapshot(null); setActiveModal(null); }} 
            flowUnit={flowUnit} 
            fetchElevation={fetchElevation} 
          />
        ) : null;
      case 'PUMP_EDITOR': {
        const pumpNode = nodes.find(n => n.id === activeModal.data);
        let actualFlow: number | undefined;
        let actualHead: number | undefined;

        if (pumpNode && snapshot) {
            const suctionId = pumpSuctionMap.get(pumpNode.id);
            const suctionRes = suctionId ? nodeResultsDisplay.get(suctionId) : undefined;
            const res = nodeResultsDisplay.get(pumpNode.id);
            
            let Q_recalque = 0;
            pipes.filter(p => (p.startNodeId === pumpNode.id || p.endNodeId === pumpNode.id) && (p.startNodeId !== suctionId && p.endNodeId !== suctionId)).forEach(p => {
                const pr = snapshot.results.find(r => r.segmentId === p.id);
                if(pr) Q_recalque += Math.abs(convertFlowFromSI(pr.flowRate, flowUnit));
            });
            
            actualFlow = Q_recalque;
            const hMontante = suctionRes?.head || pumpNode.elevation;
            const hJusante = res?.head || pumpNode.elevation;
            actualHead = Math.max(0, hJusante - hMontante);
        }

        return pumpNode ? (
          <PumpEditorModal 
            node={pumpNode} 
            updateNode={updateNode} 
            onClose={() => setActiveModal(null)} 
            onDelete={() => { removeNode(pumpNode.id); setSnapshot(null); setActiveModal(null); }} 
            flowUnit={flowUnit} 
            actualFlow={actualFlow}
            actualHead={actualHead}
          />
        ) : null;
      }
      case 'BUDGET':
        return (
            <BudgetEditorModal 
                metadata={projectMetadata} 
                userOrgName={currentOrgName}
                onClose={() => setActiveModal(null)} 
                initialProposalId={activeModal.data}
            />
        );
      case 'PROJECT_DOCS':
        const docsData = activeModal.data || {
            nodes, pipes, demandGroups, annotations, annotationGroups, mdConfig,
            metadata: projectMetadata,
            snapshot: snapshot || { nodes, pipes, results: [], nodeResults: [], materials }
        };
        return (
            <DocumentToolsModal
                projectData={docsData}
                userOrgName={currentOrgName}
                onClose={() => setActiveModal(null)}
            />
        );
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
    {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
    
    {!showSplash && !currentUser && (
      <div className="fixed inset-0 z-[8000] bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <React.Suspense fallback={<div className="text-white font-bold animate-pulse italic">Carregando Acesso...</div>}>
          <LoginModal 
            onClose={() => {}} 
            onLoginSuccess={(user) => { 
                setCurrentUser(user); 
                setIsProjectSelectorOpen(true);
                showValidationToast(`Bem-vindo, ${user.username}`); 
            }} 
          />
        </React.Suspense>
      </div>
    )}

    {currentUser && (
      <div className={`flex flex-col h-[100dvh] w-full bg-slate-50 touch-none overflow-hidden pb-[64px] md:pb-0 ${isDrawMode || activeAnnotationId || pendingNodeType || drawingDraft ? 'cursor-crosshair' : ''} ${isPanning ? 'is-panning' : ''}`} onMouseMove={handlePointerMove} onTouchMove={handlePointerMove} onMouseUp={handlePointerUp} onTouchEnd={handlePointerUp}>
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-50 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">HF</div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 leading-none">HydroFlow <span className="text-accent">Pro</span></h1>
            {projectMetadata && <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{projectMetadata.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={() => setActiveModal({ type: 'QUICK_CALC' })} className="flex items-center justify-center bg-slate-800 text-white w-8 h-8 rounded-md hover:bg-slate-900 transition-all" title="Calculadora Rápida"><CalculatorIcon /></button>
          
          <button onClick={handleCloudSave} disabled={!projectMetadata} className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-xs transition-all shadow-sm border ${projectMetadata ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:shadow-md' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`} title="Salvar Dimensionamento (Nuvem)">
             <SaveIcon />
             <span className="hidden lg:inline">Salvar Projeto</span>
          </button>

          <div ref={projectMenuRef} className="relative">
            <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-medium text-xs"><FolderIcon /> <span className="hidden md:inline">Projeto</span></button>
            {showProjectMenu && (
                <div className="absolute top-10 right-0 w-64 bg-white shadow-2xl rounded-lg border border-slate-200 py-1 flex flex-col z-50 animate-fade-in overflow-hidden">
                    {currentUser ? (
                        <>
                            <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100 flex flex-col">
                                <span className="font-bold text-slate-800">{currentUser.username}</span>
                                <span className="text-[10px]">{currentUser.organizationId === 'MASTER_ACCESS' ? 'Master Admin' : currentOrgName || currentUser.organizationId}</span>
                            </div>
                            <div className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">Projetos</div>
                            <button onClick={handleProjectsClick} className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-blue-700 text-xs text-left w-full font-bold transition-colors"><CloudIcon /> Gerenciar</button>
                            <button onClick={handleCloudSave} disabled={!projectMetadata} className={`flex items-center gap-2 px-4 py-2.5 text-xs text-left w-full transition-colors ${projectMetadata ? 'hover:bg-blue-50 text-blue-700 font-bold' : 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-60'}`}>
                                <SaveIcon /> Salvar
                            </button>
                            <button onClick={() => { setIsProjectSelectorOpen(true); setShowProjectMenu(false); }} className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-blue-700 text-xs text-left w-full font-bold transition-colors">
                                <FolderIcon /> Abrir
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-red-600 text-xs text-left w-full font-bold transition-colors border-t border-slate-100"><CloseIcon /> Sair (Logout)</button>
                        </>
                    ) : (
                        <>
                            <div className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">Nuvem</div>
                            <button onClick={handleProjectsClick} className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-blue-700 text-xs text-left w-full font-bold transition-colors"><UserIcon /> Entrar / Login</button>
                        </>
                    )}
                    <div className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-y border-slate-100">Arquivo Local</div>
                    <button onClick={() => { 
                        setShowProjectMenu(false); 
                        const calculationSummary = {
                            studyName: projectMetadata?.studyName || projectMetadata?.name || 'Não identificado',
                            calcMethod: calcMethod?.toString().toLowerCase().includes('darcy') ? 'Darcy-Weisbach' : 'Hazen-Williams',
                            solverEngine: solverType,
                            globalCoefficient: calcMethod?.toString().toLowerCase().includes('darcy') ? globalRoughness || 'Padrão do material' : globalC || 'Padrão do material',
                            isCustomCoefficient: !!(calcMethod?.toString().toLowerCase().includes('darcy') ? globalRoughness : globalC)
                        };
                        const proj = { version: "1.5", metadata: projectMetadata, calculationSummary, date: new Date().toISOString(), nodes, pipes, demandGroups, annotations, annotationGroups, mdConfig, settings: { unitSystem, flowUnit, calcMethod, frictionMethod, solverType, globalC, globalRoughness, mapStyle, mapOpacity, coordFormat, visSettings, nodeLabelPos, nodeLabelOffset } }; 
                        const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' }); 
                        const url = URL.createObjectURL(blob); 
                        const link = document.createElement('a'); 
                        link.href = url; 
                        link.download = `hydroflow-${new Date().toISOString().slice(0,10)}.json`; 
                        document.body.appendChild(link); 
                        link.click(); 
                        document.body.removeChild(link); 
                    }} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs text-left w-full transition-colors"><SaveIcon /> Salvar (.json)</button>
                    <label className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs cursor-pointer w-full transition-colors">
                        <UploadIcon /> Abrir (.json) 
                        <input type="file" accept=".json" className="hidden" onChange={(e) => { 
                            const file = e.target.files?.[0]; 
                            if (!file) return; 
                            const reader = new FileReader(); 
                            reader.onload = (ev) => { 
                                try { 
                                    const data = JSON.parse(ev.target?.result as string); 
                                    if (data.metadata) setProjectMetadata(data.metadata); 
                                    if (data.nodes) setNodes(data.nodes); 
                                    if (data.pipes) setPipes(data.pipes); 
                                    if (data.demandGroups) setDemandGroups(data.demandGroups);
                                    if (data.annotations) setAnnotations(data.annotations);
                                    if (data.annotationGroups) setAnnotationGroups(data.annotationGroups);
                                    if (data.mdConfig) setMdConfig(data.mdConfig); 
                                    if (data.settings) {
                                        if (data.settings.unitSystem) setUnitSystem(data.settings.unitSystem as UnitSystem);
                                        if (data.settings.flowUnit) setFlowUnit(data.settings.flowUnit as FlowUnit);
                                        
                                        // Robust loading for Calculation Method
                                        if (data.settings.calcMethod) {
                                            const methodStr = String(data.settings.calcMethod).toLowerCase();
                                            if (methodStr.includes('hazen')) setCalcMethod(CalcMethod.HAZEN_WILLIAMS);
                                            else if (methodStr.includes('darcy')) setCalcMethod(CalcMethod.DARCY_WEISBACH);
                                        }

                                        if (data.settings.frictionMethod) setFrictionMethod(data.settings.frictionMethod as FrictionMethod);
                                        if (data.settings.solverType) setSolverType(data.settings.solverType as SolverType);
                                        
                                        // Ensure global coefficients are strings and fallback to empty string if undefined
                                        setGlobalC(data.settings.globalC !== undefined ? String(data.settings.globalC) : '');
                                        setGlobalRoughness(data.settings.globalRoughness !== undefined ? String(data.settings.globalRoughness) : '');
                                        
                                        if (data.settings.mapStyle) setMapStyle(data.settings.mapStyle as MapStyle);
                                        if (data.settings.mapOpacity !== undefined) setMapOpacity(data.settings.mapOpacity);
                                        if (data.settings.coordFormat) setCoordFormat(data.settings.coordFormat as CoordinateFormat);
                                        if (data.settings.visSettings) setVisSettings(data.settings.visSettings);
                                        if (data.settings.nodeLabelPos) setNodeLabelPos(data.settings.nodeLabelPos as LabelPosition);
                                        if (data.settings.nodeLabelOffset !== undefined) setNodeLabelOffset(data.settings.nodeLabelOffset);
                                    }
                                    setSnapshot(null); 
                                    setActiveModal(null);
                                    setShowSidebar(false);
                                    showValidationToast("Projeto carregado com sucesso!"); 
                                } catch(err) {
                                    showValidationToast("Erro ao carregar projeto.");
                                } 
                            }; 
                            reader.readAsText(file); 
                            setShowProjectMenu(false); 
                        }} />
                    </label>
                    <div className="px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-y border-slate-100">Exportar</div>
                    <button onClick={() => { const dxf = generateDXF(nodes, pipes, materials, snapshot?.nodeResults, snapshot?.results, annotations, isMapMode, unitSystem, flowUnit); const blob = new Blob([JSON.stringify(dxf)], { type: 'application/dxf' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `hydroflow-export.dxf`; document.body.appendChild(link); link.click(); document.body.removeChild(link); setShowProjectMenu(false); }} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs text-left w-full transition-colors"><FileCadIcon /> Exportar para CAD (DXF)</button>
                </div>
            )}
          </div>

          <button onClick={() => setShowDemandTool(!showDemandTool)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs ${showDemandTool ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><DropIcon /> <span className="hidden md:inline">Demanda</span></button>
          <button onClick={() => setActiveModal({ type: 'CONFIG' })} className={`hidden md:flex items-center justify-center p-2 rounded-md transition-colors ${activeModal?.type === 'CONFIG' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} title="Configurações"><SettingsIcon /> <span className="hidden lg:inline ml-1 text-xs font-medium">Configurações</span></button>
          <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
          <button onClick={handleCalculate} className="flex items-center gap-2 bg-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded-md font-bold text-xs shadow-sm transition-all active:scale-95"><PlayIcon /> <span className="hidden sm:inline">Calcular</span></button>
        </div>
      </header>

      {validationMsg && (
        <div className="fixed top-2 left-0 right-0 z-[10000] flex justify-center pointer-events-none px-4">
             <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-sm w-full animate-slide-down pointer-events-auto">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 font-bold">!</div>
                 <div className="flex-1 text-sm font-semibold text-slate-700">{validationMsg}</div>
                 <button onClick={() => setValidationMsg(null)} className="text-slate-400"><CloseIcon /></button>
             </div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <div id="network-map-container" className="absolute inset-0 z-0 bg-slate-100">
            <div ref={mapRef} className="absolute inset-0 z-0" style={{ backgroundColor: mapStyle === 'none' ? '#f8fafc' : undefined }} />
            <div className={`absolute top-1 z-20 pointer-events-none transition-transform duration-300 left-1/2 -translate-x-1/2 w-[calc(100%-36px)] max-w-sm md:w-full md:left-4 md:translate-x-0 ${isLeftSidebarOpen ? 'md:translate-x-64 lg:translate-x-80' : 'md:translate-x-0'}`}>
                <MapControls mapStyle={mapStyle} setMapStyle={setMapStyle} mapOpacity={mapOpacity} setMapOpacity={setMapOpacity} coordFormat={coordFormat} setCoordFormat={setCoordFormat} searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={() => { fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`).then(res => res.json()).then(data => { if(data && data.length > 0) { const lat = parseFloat(data[0].lat); const lon = parseFloat(data[0].lon); mapInstance?.setView([lat, lon], 18); } }); }} />
            </div>
            {projectMetadata && (
                <div className="absolute bottom-6 right-6 z-[400] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.15)] border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 pointer-events-none transition-all animate-fade-in shadow-blue-500/20">
                    <div className="text-blue-500"><FolderIcon /></div>
                    <span className="uppercase tracking-wide">{projectMetadata.name}</span>
                </div>
            )}
            <MapCanvasLayer annotations={annotations} groups={annotationGroups} mapInstance={mapInstance} globalScale={computedScale} />
            <svg ref={svgRef} className="absolute inset-0 z-[5] w-full h-full pointer-events-none">
               <MapSvgLayer annotations={annotations} groups={annotationGroups} mapInstance={mapInstance} globalScale={computedScale} activeAnnotationId={activeAnnotationId} selectedAnnotationId={selectedAnnotationId} reportMode={visSettings.reportMode} handlers={{ onAnnotationClick: (id) => { setSelectedAnnotationId(id); setSelectedPipeId(null); setSelectedNodeId(null); }, onVertexMouseDown: (e, id, idx) => { e.stopPropagation(); setDragAnnVertex({ annId: id, index: idx }); }, onLabelMouseDown: (e, id) => { e.stopPropagation(); setDragAnnLabel(id); } }} />
               {drawingDraft && drawingDraft.points.length > 0 && mapInstance && (
                    <g className="drawing-draft opacity-70">
                        {drawingDraft.type === 'area' ? (
                            <polygon points={drawingDraft.points.map(p => { const pt = mapInstance.latLngToContainerPoint([p.lat, p.lng]); return `${pt.x},${pt.y}`; }).join(' ')} fill="#f9731633" stroke="#f97316" strokeWidth={2 * computedScale} strokeDasharray="5,5" />
                        ) : (
                            <polyline points={drawingDraft.points.map(p => { const pt = mapInstance.latLngToContainerPoint([p.lat, p.lng]); return `${pt.x},${pt.y}`; }).join(' ')} fill="none" stroke="#f97316" strokeWidth={2 * computedScale} strokeDasharray="5,5" />
                        )}
                        {cursorPos && drawingDraft.points.length > 0 && (
                            <line 
                                x1={mapInstance.latLngToContainerPoint([drawingDraft.points[drawingDraft.points.length - 1].lat, drawingDraft.points[drawingDraft.points.length - 1].lng]).x}
                                y1={mapInstance.latLngToContainerPoint([drawingDraft.points[drawingDraft.points.length - 1].lat, drawingDraft.points[drawingDraft.points.length - 1].lng]).y}
                                x2={cursorPos.x} y2={cursorPos.y} stroke="#f97316" strokeWidth={1 * computedScale} strokeDasharray="3,3"
                            />
                        )}
                    </g>
               )}
               {isDrawMode && drawStartNodeId && (
                    <polyline points={[{x: nodes.find(n => n.id === drawStartNodeId)!.x, y: nodes.find(n => n.id === drawStartNodeId)!.y}, ...drawBufferVertices, ...(cursorPos ? [cursorPos] : [])].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#f97316" strokeWidth={2 * computedScale} strokeDasharray="5,5" pointerEvents="none" />
               )}
               {pendingNodeType && cursorPos && (
                   <g transform={`translate(${cursorPos.x}, ${cursorPos.y})`} className="opacity-60 pointer-events-none">
                        {pendingNodeType === 'demand' && <circle r={10 * computedScale} fill="white" stroke="#dc2626" strokeWidth={2 * computedScale} />}
                        {pendingNodeType === 'source' && <rect x={-12 * computedScale} y={-12 * computedScale} width={24 * computedScale} height={24 * computedScale} rx={2} fill="white" stroke="#0ea5e9" strokeWidth={2 * computedScale} />}
                        <text y={25 * computedScale} textAnchor="middle" fontSize={12 * computedScale} fontWeight="bold" fill="#1e293b" className="select-none font-sans bg-white bg-opacity-75 px-1 rounded">Clique para inserir</text>
                   </g>
               )}
               {pipes.map(pipe => {
                  const start = nodes.find(n => n?.id === pipe.startNodeId); const end = nodes.find(n => n?.id === pipe.endNodeId);
                  if(!start || !end) return null;
                  return <NetworkPipe key={pipe.id} pipe={pipe} startNode={start} endNode={end} isSelected={selectedPipeId === pipe.id || demandSelection.has(pipe.id)} material={materials.find(m => m.id === pipe.materialId)} result={snapshot?.results.find(r => r.segmentId === pipe.id)} unitSystem={unitSystem} flowUnit={flowUnit} demandDecimals={demandDecimals} showDemandValues={showDemandTool} globalScale={computedScale} reportMode={visSettings.reportMode} handlers={{ onClick: (e, id) => { e.stopPropagation(); setSelectedPipeId(id); setSelectedNodeId(null); setSelectedAnnotationId(null); }, onDoubleClick: (e, id) => { e.stopPropagation(); openProperties('pipe', id); }, onPipeMouseDown: (e, id) => handlePointerDown(e, 'pipe', id), onVertexMouseDown: (e, pid, idx) => { e.stopPropagation(); setDragVertex({ pipeId: pid, index: idx }); } }} />;
               })}
               {nodes.map(node => {
                  const res = nodeResultsDisplay.get(node.id);
                  const hnd = { onMouseDown: (e: any, id: string) => handlePointerDown(e, 'node', id), onClick: (e: any, id: string) => { e.stopPropagation(); setSelectedNodeId(id); setSelectedPipeId(null); setSelectedAnnotationId(null); }, onDoubleClick: (e: any, id: string) => { openProperties('node', id); } };
                  if (node.type === 'source') return <NetworkReservoir key={node.id} node={node} isSelected={selectedNodeId === node.id} resultDisplay={res} globalLabelPos={nodeLabelPos} globalLabelOffset={nodeLabelOffset} globalScale={computedScale} handlers={hnd} />;
                  if (node.type === 'well') return <NetworkWell key={node.id} node={node} isSelected={selectedNodeId === node.id} resultDisplay={res} globalLabelPos={nodeLabelPos} globalLabelOffset={nodeLabelOffset} globalScale={computedScale} handlers={hnd} />;
                  if (node.type === 'pump') {
                      const suctionId = pumpSuctionMap.get(node.id);
                      const suctionRes = suctionId ? nodeResultsDisplay.get(suctionId) : undefined;
                      let Q_recalque = 0;
                      if (snapshot) { pipes.filter(p => (p.startNodeId === node.id || p.endNodeId === node.id) && (p.startNodeId !== suctionId && p.endNodeId !== suctionId)).forEach(p => { const pr = snapshot.results.find(r => r.segmentId === p.id); if(pr) Q_recalque += Math.abs(convertFlowFromSI(pr.flowRate, flowUnit)); }); }
                      const hMontante = suctionRes?.head || node.elevation; const hJusante = res?.head || node.elevation;
                      const pumpExtra = { H: snapshot ? Math.max(0, hJusante - hMontante) : 0, Q: Q_recalque, Pm: suctionRes?.pressure || 0 };
                      return <NetworkPump key={node.id} node={node} isSelected={selectedNodeId === node.id} resultDisplay={res} globalLabelPos={nodeLabelPos} globalLabelOffset={nodeLabelOffset} globalScale={computedScale} suctionNodeId={suctionId} nodesContext={nodes} pumpExtraData={pumpExtra} handlers={hnd} />;
                  }
                  return <NetworkJunction key={node.id} node={node} isSelected={selectedNodeId === node.id} isDrawStart={drawStartNodeId === node.id} resultDisplay={res} globalLabelPos={nodeLabelPos} globalLabelOffset={nodeLabelOffset} globalScale={computedScale} reportMode={visSettings.reportMode} handlers={hnd} />;
               })}
            </svg>
        </div>
        <aside className={`hidden md:flex flex-col fixed top-14 bottom-0 left-0 z-40 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 w-64 lg:w-80 ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex-1 flex flex-col overflow-hidden w-full h-full">
            {showDemandTool ? (
                <React.Suspense fallback={null}>
                    <DemandTool onClose={() => setShowDemandTool(false)} selection={Array.from(demandSelection)} setSelection={(ids) => setDemandSelection(new Set(ids))} pipes={pipes} flowUnit={flowUnit} unitSystem={unitSystem} demandDecimals={demandDecimals} setDemandDecimals={setDemandDecimals} demandGroups={demandGroups} addDemandGroup={addDemandGroup} updateDemandGroup={updateDemandGroup} removeDemandGroup={removeDemandGroup} />
                </React.Suspense>
            ) : (
                <div className="flex flex-col h-full overflow-y-auto">
                    {(selectedPipeId || selectedNodeId || selectedAnnotationId) ? (
                        <SidebarSegment title="Propriedades" icon={<SettingsIcon />}>
                             <React.Suspense fallback={null}>
                                 {selectedPipeId && <EditorPanel selectedPipe={pipes.find(p => p.id === selectedPipeId)} updatePipe={updatePipe} materials={materials} addFitting={addFittingToPipe} updateFitting={updateFittingInPipe} handleMaterialChange={changePipeMaterial} handleDiameterChange={handleDiameterChange} handleDeletePipe={(id: string) => { removePipe(id); setSnapshot(null); setSelectedPipeId(null); }} closeEditor={() => setSelectedPipeId(null)} unitSystem={unitSystem} flowUnit={flowUnit} addVertex={addPipeVertex} resetVertices={(id: any) => updatePipe(id, { vertices: [] })} />}
                                 {selectedNodeId && <EditorPanel selectedNode={nodes.find(n => n.id === selectedNodeId)} updateNode={updateNode} handleDeleteNode={(id: string) => { removeNode(id); setSnapshot(null); setSelectedNodeId(null); }} closeEditor={() => setSelectedNodeId(null)} unitSystem={unitSystem} flowUnit={flowUnit} fetchElevation={fetchElevation} isMapMode={isMapMode} coordFormat={coordFormat} />}
                                 {selectedAnnotationId && <AnnotationEditor annotation={annotations.find(a => a.id === selectedAnnotationId)!} onUpdate={updateAnnotation} onDelete={(id) => { removeAnnotation(id); setSelectedAnnotationId(null); }} onClose={() => setSelectedAnnotationId(null)} />}
                             </React.Suspense>
                        </SidebarSegment>
                    ) : (
                        <>
                            <SidebarSegment title="Hidráulica" icon={<WaypointIcon />}>
                                <div className="grid grid-cols-3 gap-1 mb-2 px-1">
                                    <button onClick={() => addNewNode('demand')} className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded text-[10px] text-slate-700 font-medium transition-colors"><PlusIcon /><span>Nó</span></button>
                                    <button onClick={() => addNewNode('well')} className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded text-[10px] text-slate-700 font-medium transition-colors"><WellIcon /><span>Poço</span></button>
                                    <button onClick={() => addNewNode('pump')} className="flex flex-col items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 py-3 rounded text-[10px] text-slate-700 font-medium transition-colors"><PumpIcon /><span>CMB</span></button>
                                </div>
                                <button onClick={toggleDrawMode} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded text-xs font-medium border transition-colors ${isDrawMode ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}><PenToolIcon /><span>Traçado de Rede</span></button>
                                {isDrawMode && <div className="animate-fade-in border-t border-slate-100 mt-4 pt-4"><DrawControls isOpen={isDrawMode} materials={materials} currentMatId={drawMaterialId} currentDn={drawDiameter} onMaterialChange={handleDrawMaterialChange} onDiameterChange={setDrawDiameter} onClose={toggleDrawMode} instruction={drawStartNodeId ? "Clique para criar um nó final" : "Selecione o nó inicial"} variant="desktop" placementMode={drawPlacementMode} setPlacementMode={setDrawPlacementMode} /></div>}
                            </SidebarSegment>
                            <SidebarSegment title="Desenho & CAD" icon={<PenToolIcon />} defaultOpen={false}>
                                <DrawingManager annotations={annotations} groups={annotationGroups} onAdd={(type, groupId) => { setDrawingDraft({ type, groupId, points: [] }); showValidationToast(`Inicie o desenho de ${type}. ESC p/ concluir.`); }} onDelete={removeAnnotation} onUpdate={updateAnnotation} onDeleteGroup={removeAnnotationGroup} onUpdateGroup={updateAnnotationGroup} onImportDxf={handleImportDxf} />
                            </SidebarSegment>
                        </>
                    )}
                </div>
            )}
          </div>
          <button onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} className="absolute top-20 left-full z-50 bg-white border border-slate-300 shadow-md w-8 h-10 rounded-r-lg flex items-center justify-center transition-colors hover:bg-slate-50">{isLeftSidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}</button>
        </aside>
        <aside className={`fixed top-14 bottom-0 right-0 w-full sm:w-80 lg:w-96 bg-white shadow-xl z-[60] transform transition-transform duration-300 border-l border-slate-200 flex flex-col ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">{sidebarMode === 'properties' ? <><SettingsIcon/> Propriedades</> : <><ChartIcon/> Resultados</>}</h2>
              <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-slate-200 rounded-full"><CloseIcon/></button>
           </div>
           <div className="flex-1 p-4 overflow-y-auto">
               <React.Suspense fallback={null}>
                   {sidebarMode === 'results' ? <ResultsContent calcError={calcError} calcWarning={calcWarning} results={snapshot?.results || []} nodes={snapshot?.nodes || []} pipes={snapshot?.pipes || []} materials={materials} nodeResults={snapshot?.nodeResults} flowUnit={flowUnit} unitSystem={unitSystem} selectedPipeId={selectedPipeId} setSelectedPipeId={setSelectedPipeId} setSelectedNodeId={setSelectedNodeId} setShowMobileResults={setShowSidebar} onOpenTable={() => setActiveModal({ type: 'FLEX_TABLE' })} calcMethod={calcMethod} projectMetadata={projectMetadata} visSettings={visSettings} setVisSettings={setVisSettings} mapStyle={mapStyle} setMapStyle={setMapStyle} mapInstance={mapInstance} globalC={globalC} globalRoughness={globalRoughness} />
                   : <div className="animate-fade-in">{selectedPipeId && <EditorPanel selectedPipe={pipes.find(p => p.id === selectedPipeId)} updatePipe={updatePipe} materials={materials} addFitting={addFittingToPipe} updateFitting={updateFittingInPipe} handleMaterialChange={changePipeMaterial} handleDiameterChange={handleDiameterChange} handleDeletePipe={(id: string) => { removePipe(id); setSnapshot(null); setSelectedPipeId(null); setShowSidebar(false); }} closeEditor={() => setShowSidebar(false)} unitSystem={unitSystem} flowUnit={flowUnit} addVertex={addPipeVertex} resetVertices={(id: any) => updatePipe(id, { vertices: [] })} />}{selectedNodeId && <EditorPanel selectedNode={nodes.find(n => n.id === selectedNodeId)} updateNode={updateNode} handleDeleteNode={(id: string) => { removeNode(id); setSnapshot(null); setSelectedNodeId(null); setShowSidebar(false); }} closeEditor={() => setShowSidebar(false)} unitSystem={unitSystem} flowUnit={flowUnit} fetchElevation={fetchElevation} isMapMode={isMapMode} coordFormat={coordFormat} />}{selectedAnnotationId && <AnnotationEditor annotation={annotations.find(a => a.id === selectedAnnotationId)!} onUpdate={updateAnnotation} onDelete={(id) => { removeAnnotation(id); setSelectedAnnotationId(null); setShowSidebar(false); }} onClose={() => setShowSidebar(false)} />}</div>}
               </React.Suspense>
           </div>
        </aside>
      </div>

      {isProjectManagerOpen && (
          <React.Suspense fallback={null}>
              <ProjectManagerModal 
                  refreshKey={managerRefreshKey}
                  onClose={() => setIsProjectManagerOpen(false)}
                  currentUser={currentUser}
                  userOrgName={currentOrgName}
                  onOpenFinance={() => {
                      setIsProjectManagerOpen(false);
                      setIsFinancialManagerOpen(true);
                  }}
                  onOpenAdmin={() => { 
                      setIsProjectManagerOpen(false);
                      setActiveModal({ type: 'USER_MANAGER' }); 
                  }}
                  activeProjectId={projectMetadata?._id}
                  onOpenDocuments={(projData: any) => {
                      setIsProjectManagerOpen(false);
                      setActiveModal({ type: 'PROJECT_DOCS', data: projData });
                  }}
                  onEditMetadata={(sel: any) => {
                      try {
                          const data = JSON.parse(sel.data);
                          const metaWithId = { ...(data.metadata || {}), _id: sel.id };
                          setActiveModal({ type: 'CREATE_PROJECT', data: metaWithId });
                      } catch(e) {}
                  }}
                  onOpenProject={(proj: any) => {
                      const data = JSON.parse(proj.data);
                      if (data.metadata) {
                          setProjectMetadata({ ...data.metadata, _id: proj.id });
                      }
                      if (data.nodes) setNodes(data.nodes);
                      if (data.pipes) setPipes(data.pipes);
                      if (data.mdConfig) setMdConfig(data.mdConfig);
                      if (data.demandGroups) setDemandGroups(data.demandGroups);
                      if (data.annotations) setAnnotations(data.annotations);
                      if (data.annotationGroups) setAnnotationGroups(data.annotationGroups);
                      
                      if (data.settings) {
                          if (data.settings.unitSystem) setUnitSystem(data.settings.unitSystem as UnitSystem);
                          if (data.settings.flowUnit) setFlowUnit(data.settings.flowUnit as FlowUnit);
                          
                          // Robust loading for Calculation Method
                          if (data.settings.calcMethod) {
                              const methodStr = String(data.settings.calcMethod).toLowerCase();
                              if (methodStr.includes('hazen')) setCalcMethod(CalcMethod.HAZEN_WILLIAMS);
                              else if (methodStr.includes('darcy')) setCalcMethod(CalcMethod.DARCY_WEISBACH);
                          }

                          if (data.settings.frictionMethod) setFrictionMethod(data.settings.frictionMethod as FrictionMethod);
                          if (data.settings.solverType) setSolverType(data.settings.solverType as SolverType);
                          
                          // Ensure global coefficients are strings and fallback to empty string if undefined
                          setGlobalC(data.settings.globalC !== undefined ? String(data.settings.globalC) : '');
                          setGlobalRoughness(data.settings.globalRoughness !== undefined ? String(data.settings.globalRoughness) : '');

                          if (data.settings.mapStyle) setMapStyle(data.settings.mapStyle as MapStyle);
                          if (data.settings.mapOpacity !== undefined) setMapOpacity(data.settings.mapOpacity);
                          if (data.settings.coordFormat) setCoordFormat(data.settings.coordFormat as CoordinateFormat);
                          if (data.settings.visSettings) setVisSettings(data.settings.visSettings);
                          if (data.settings.nodeLabelPos) setNodeLabelPos(data.settings.nodeLabelPos as LabelPosition);
                          if (data.settings.nodeLabelOffset !== undefined) setNodeLabelOffset(data.settings.nodeLabelOffset);
                      }
                      
                      setSnapshot(null);
                      showValidationToast(`Empreendimento "${data.metadata?.name || 'Sem Nome'}" carregado!`);
                      setIsProjectManagerOpen(false);
                  }}
              />
          </React.Suspense>
      )}

      {isProjectSelectorOpen && (
          <React.Suspense fallback={null}>
              <ProjectSelectorModal
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onCreateNew={() => { setIsProjectSelectorOpen(false); setActiveModal({ type: 'CREATE_PROJECT' }); }}
                  onSelect={(proj: any) => {
                      try {
                          const data = JSON.parse(proj.data);
                          if (data.metadata) setProjectMetadata({ ...data.metadata, _id: proj.id });
                          if (data.nodes) setNodes(data.nodes); else setNodes([]);
                          if (data.pipes) setPipes(data.pipes); else setPipes([]);
                          if (data.demandGroups) setDemandGroups(data.demandGroups); else setDemandGroups([]);
                          if (data.annotations) setAnnotations(data.annotations); else setAnnotations([]);
                          if (data.annotationGroups) setAnnotationGroups(data.annotationGroups);
                          if (data.mdConfig) setMdConfig(data.mdConfig);
                          
                          if (data.settings) {
                              if (data.settings.unitSystem) setUnitSystem(data.settings.unitSystem as UnitSystem);
                              if (data.settings.flowUnit) setFlowUnit(data.settings.flowUnit as FlowUnit);
                              
                              // Robust loading for Calculation Method
                              if (data.settings.calcMethod) {
                                  const methodStr = String(data.settings.calcMethod).toLowerCase();
                                  if (methodStr.includes('hazen')) setCalcMethod(CalcMethod.HAZEN_WILLIAMS);
                                  else if (methodStr.includes('darcy')) setCalcMethod(CalcMethod.DARCY_WEISBACH);
                              }

                              if (data.settings.frictionMethod) setFrictionMethod(data.settings.frictionMethod as FrictionMethod);
                              if (data.settings.solverType) setSolverType(data.settings.solverType as SolverType);
                              
                              // Ensure global coefficients are strings and fallback to empty string if undefined
                              setGlobalC(data.settings.globalC !== undefined ? String(data.settings.globalC) : '');
                              setGlobalRoughness(data.settings.globalRoughness !== undefined ? String(data.settings.globalRoughness) : '');

                              if (data.settings.mapStyle) setMapStyle(data.settings.mapStyle as MapStyle);
                              if (data.settings.mapOpacity !== undefined) setMapOpacity(data.settings.mapOpacity);
                              if (data.settings.coordFormat) setCoordFormat(data.settings.coordFormat as CoordinateFormat);
                              if (data.settings.visSettings) setVisSettings(data.settings.visSettings);
                              if (data.settings.nodeLabelPos) setNodeLabelPos(data.settings.nodeLabelPos as LabelPosition);
                              if (data.settings.nodeLabelOffset !== undefined) setNodeLabelOffset(data.settings.nodeLabelOffset);
                          }

                          setSnapshot(null);
                          setIsProjectSelectorOpen(false);
                          showValidationToast(`Empreendimento "${data.metadata?.name || 'Carregado'}" aberto no mapa!`);
                      } catch(e) {
                          alert("Erro ao ler dados do projeto.");
                      }
                  }}
              />
          </React.Suspense>
      )}

      {isFinancialManagerOpen && (
          <React.Suspense fallback={null}>
              <FinancialManagerModal 
                  onClose={() => setIsFinancialManagerOpen(false)}
                  currentUser={currentUser}
                  userOrgName={currentOrgName}
                  onBackToProjects={() => {
                      setIsFinancialManagerOpen(false);
                      setIsProjectManagerOpen(true);
                  }}
                  onOpenBudget={(metadata: ProjectMetadata, proposalId?: string) => {
                      setProjectMetadata(metadata);
                      setActiveModal({ type: 'BUDGET', data: proposalId });
                  }}
              />
          </React.Suspense>
      )}

      <React.Suspense fallback={null}>
          {renderActiveModal()}
      </React.Suspense>

      <BottomBar onToggleDraw={toggleDrawMode} onAddNode={addNewNode} onAddPipe={() => { if (nodes.length >= 2) createPipeBetween(nodes[nodes.length - 2].id, nodes[nodes.length - 1].id); else showValidationToast("Crie ao menos 2 nós primeiro."); }} onToggleResults={() => { setSidebarMode('results'); setShowSidebar(!showSidebar || sidebarMode !== 'results'); }} onToggleConfig={() => setActiveModal({ type: 'CONFIG' })} isDrawMode={isDrawMode} isResultsOpen={showSidebar && sidebarMode === 'results'} isConfigOpen={activeModal?.type === 'CONFIG'} />
    </div>
    )}
    </ErrorBoundary>
  );
}
