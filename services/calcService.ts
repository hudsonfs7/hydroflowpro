import { CalcMethod, FrictionMethod, PipeSegment, CalculationResult, UnitSystem, Node, FlowUnit, GeoPosition, Material, SolverType, NodeResult, PumpCurvePoint } from '../types';
import { GRAVITY, getViscosity } from '../constants';

// --- Helpers de Conversão ---
export const convertFlowToSI = (q: number, unit: FlowUnit): number => {
  if (unit === 'm3/h') return q / 3600; 
  if (unit === 'l/s') return q / 1000;  
  if (unit === 'gpm') return q * 0.0000630901964; 
  return 0;
};

export const convertFlowFromSI = (q: number, unit: FlowUnit): number => {
  if (unit === 'm3/h') return q * 3600; 
  if (unit === 'l/s') return q * 1000;  
  if (unit === 'gpm') return q / 0.0000630901964; 
  return 0;
};

export const calculateGeoDistance = (pos1: GeoPosition, pos2: GeoPosition): number => {
  const R = 6371e3; 
  const φ1 = pos1.lat * Math.PI/180;
  const φ2 = pos2.lat * Math.PI/180;
  const Δφ = (pos2.lat-pos1.lat) * Math.PI/180;
  const Δλ = (pos2.lng-pos1.lng) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

/**
 * Identifica a hierarquia da rede a partir das fontes.
 * Retorna um mapa de nodeId -> distância da fonte (em saltos).
 */
export const getTopologyLevels = (nodes: Node[], pipes: PipeSegment[]): Map<string, number> => {
    const levels = new Map<string, number>();
    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n.id, []));
    pipes.forEach(p => {
        adj.get(p.startNodeId)?.push(p.endNodeId);
        adj.get(p.endNodeId)?.push(p.startNodeId);
    });

    const sources = nodes.filter(n => n.type === 'source' || n.type === 'well');
    const queue: {id: string, lvl: number}[] = sources.map(s => ({ id: s.id, lvl: 0 }));
    sources.forEach(s => levels.set(s.id, 0));

    while (queue.length > 0) {
        const { id, lvl } = queue.shift()!;
        for (const neighborId of (adj.get(id) || [])) {
            if (!levels.has(neighborId)) {
                levels.set(neighborId, lvl + 1);
                queue.push({ id: neighborId, lvl: lvl + 1 });
            }
        }
    }
    return levels;
};

export const getPumpOrientations = (nodes: Node[], pipes: PipeSegment[]): Map<string, string> => {
    const pumpSuctionNodes = new Map<string, string>();
    const levels = getTopologyLevels(nodes, pipes);
    const pumps = nodes.filter(n => n.type === 'pump');

    pumps.forEach(pump => {
        const adjPipes = pipes.filter(p => p.startNodeId === pump.id || p.endNodeId === pump.id);
        let bestNeighbor = null;
        let minLvl = Infinity;

        adjPipes.forEach(p => {
            const neighborId = p.startNodeId === pump.id ? p.endNodeId : p.startNodeId;
            const lvl = levels.get(neighborId);
            if (lvl !== undefined && lvl < minLvl) {
                minLvl = lvl;
                bestNeighbor = neighborId;
            }
        });

        if (bestNeighbor) pumpSuctionNodes.set(pump.id, bestNeighbor);
    });

    return pumpSuctionNodes;
};

const getHeadFromCurve = (flowSI: number, curve: PumpCurvePoint[], flowUnit: FlowUnit): number => {
    if (!curve || curve.length === 0) return 0;
    const qUser = Math.abs(convertFlowFromSI(flowSI, flowUnit));
    const sorted = [...curve].sort((a, b) => a.flow - b.flow);
    if (qUser <= sorted[0].flow) return sorted[0].head;
    if (qUser >= sorted[sorted.length - 1].flow) return Math.max(0, sorted[sorted.length - 1].head);
    for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i];
        const p2 = sorted[i+1];
        if (qUser >= p1.flow && qUser <= p2.flow) {
            const ratio = (qUser - p1.flow) / (p2.flow - p1.flow);
            return p1.head + ratio * (p2.head - p1.head);
        }
    }
    return 0;
};

const calculatePipeLoss = (flow: number, p: PipeSegment, mat: Material | undefined, method: CalcMethod, frictionMethod: FrictionMethod, viscosity: number, globalRoughness?: number, globalC?: number): number => {
    if (Math.abs(flow) < 1e-9) return 0;
    const dM = p.diameter / 1000;
    const lM = p.length;
    const area = Math.PI * Math.pow(dM / 2, 2);
    const velocity = Math.abs(flow) / area;

    if (method === CalcMethod.HAZEN_WILLIAMS) {
        const C = p.customC || globalC || mat?.hwCoefficient || 140;
        return 10.643 * Math.pow(Math.abs(flow), 1.852) * Math.pow(C, -1.852) * Math.pow(dM, -4.87) * lM;
    } else {
        const rM = (p.customRoughness || globalRoughness || mat?.roughness || 0.0015) / 1000;
        const re = (velocity * dM) / viscosity;
        let f = 0.02;
        if (re < 2300) f = 64 / re;
        else {
            const relRoughness = rM / dM;
            if (frictionMethod === FrictionMethod.SWAMEE_JAIN) {
                f = 0.25 / Math.pow(Math.log10(relRoughness / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
            } else {
                for (let i = 0; i < 10; i++) {
                    const nextF = 1 / Math.pow(-2 * Math.log10(relRoughness / 3.7 + 2.51 / (re * Math.sqrt(f))), 2);
                    if (Math.abs(nextF - f) < 0.000001) break;
                    f = nextF;
                }
            }
        }
        return (f * lM * Math.pow(velocity, 2)) / (dM * 2 * GRAVITY);
    }
};

export interface SolveResult {
    pipes: CalculationResult[];
    nodes: NodeResult[];
}

export const solveNetwork = (
    nodes: Node[],
    pipes: PipeSegment[],
    materials: Material[],
    method: CalcMethod,
    frictionMethod: FrictionMethod,
    unitSystem: UnitSystem,
    flowUnit: FlowUnit,
    tempC: number = 20,
    globalRoughness?: number,
    globalC?: number,
    solverType: SolverType = SolverType.GGA
): SolveResult => {
    
    // 1. Validação CMB
    const pumps = nodes.filter(n => n.type === 'pump');
    for (const p of pumps) {
        if (!p.cmbConfig?.designFlow || !p.pumpCurve || p.pumpCurve.length < 2) {
            throw new Error(`Configuração do CMB "${p.name}" incompleta. Defina Vazão, AMT e Curva.`);
        }
    }

    const viscosity = getViscosity(tempC);
    const nodeHeads = new Map<string, number>();
    const pipeFlows = new Map<string, number>();
    const levels = getTopologyLevels(nodes, pipes);
    const pumpSuctionMap = getPumpOrientations(nodes, pipes);

    // 2. Cálculo de Vazões (Mass Balance Propagation)
    const sortedNodeIds = nodes
        .filter(n => levels.has(n.id))
        .sort((a, b) => (levels.get(b.id) || 0) - (levels.get(a.id) || 0))
        .map(n => n.id);

    const nodeDemandsSI = new Map<string, number>();
    nodes.forEach(n => nodeDemandsSI.set(n.id, n.type === 'demand' ? convertFlowToSI(n.baseDemand || 0, flowUnit) : 0));

    const processedPipes = new Set<string>();
    
    sortedNodeIds.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId)!;
        if (node.type === 'source' || node.type === 'well') return;

        let totalFlowAtNode = nodeDemandsSI.get(nodeId) || 0;
        
        const adjPipes = pipes.filter(p => p.startNodeId === nodeId || p.endNodeId === nodeId);
        adjPipes.forEach(p => {
            if (processedPipes.has(p.id)) {
                totalFlowAtNode += Math.abs(pipeFlows.get(p.id) || 0);
            }
        });

        const parentPipe = adjPipes.find(p => !processedPipes.has(p.id));
        if (parentPipe) {
            const qMarcha = convertFlowToSI(parentPipe.distributedDemand || 0, flowUnit);
            const flowInParent = totalFlowAtNode + qMarcha;
            pipeFlows.set(parentPipe.id, flowInParent);
            processedPipes.add(parentPipe.id);
        }
    });

    // 3. Cálculo de Pressões (Energy Propagation)
    nodes.forEach(n => {
        if (n.type === 'source' || n.type === 'well') {
            nodeHeads.set(n.id, n.elevation + (n.pressureHead || 0));
        }
    });

    const propagationOrder = [...sortedNodeIds].reverse();

    propagationOrder.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId)!;
        if (node.type === 'source' || node.type === 'well') return;

        const adjPipes = pipes.filter(p => p.startNodeId === nodeId || p.endNodeId === nodeId);
        
        let parentNodeId: string | null = null;
        let connectingPipe: PipeSegment | null = null;

        adjPipes.forEach(p => {
            const otherId = p.startNodeId === nodeId ? p.endNodeId : p.startNodeId;
            if (nodeHeads.has(otherId)) {
                if (!parentNodeId || (levels.get(otherId)! < levels.get(parentNodeId)!)) {
                    parentNodeId = otherId;
                    connectingPipe = p;
                }
            }
        });

        if (parentNodeId && connectingPipe) {
            const hMontante = nodeHeads.get(parentNodeId)!;
            const flow = pipeFlows.get((connectingPipe as PipeSegment).id) || 0;
            const mat = materials.find(m => m.id === connectingPipe!.materialId);
            const loss = calculatePipeLoss(flow, connectingPipe, mat, method, frictionMethod, viscosity, globalRoughness, globalC);
            let hNode = hMontante - loss;

            if (node.type === 'pump') {
                let qRecalque = 0;
                pipes.filter(p => (p.startNodeId === node.id || p.endNodeId === node.id) && p.id !== connectingPipe!.id)
                     .forEach(p => qRecalque += (pipeFlows.get(p.id) || 0));
                
                const boost = getHeadFromCurve(qRecalque, node.pumpCurve || [], flowUnit);
                hNode += boost;
            }

            nodeHeads.set(node.id, hNode);
        }
    });

    // 4. Formatação de Resultados
    const pipeResults: CalculationResult[] = pipes.map(p => {
        const flow = pipeFlows.get(p.id) || 0;
        const mat = materials.find(m => m.id === p.materialId);
        const hl = calculatePipeLoss(flow, p, mat, method, frictionMethod, viscosity, globalRoughness, globalC);
        const dM = p.diameter / 1000;
        const velocity = Math.abs(flow) / (Math.PI * Math.pow(dM / 2, 2));

        // LÓGICA DE FUNCIONAMENTO: Captura o valor efetivamente usado no cálculo para exibição
        let effectiveRoughnessOrC = 0;
        if (method === CalcMethod.HAZEN_WILLIAMS) {
            effectiveRoughnessOrC = p.customC || globalC || mat?.hwCoefficient || 140;
        } else {
            effectiveRoughnessOrC = p.customRoughness || globalRoughness || mat?.roughness || 0.0015;
        }
        
        return {
            segmentId: p.id, flowRate: flow, velocity, reynolds: (velocity * dM) / viscosity,
            frictionFactor: 0, headLossFriction: hl, headLossSingular: 0, totalHeadLoss: hl,
            pressureDrop: hl, unitHeadLoss: hl / (p.length / 1000), energyLoss: 0,
            regime: velocity > 0 ? 'Turbulent' : 'Laminar', methodUsed: method, warnings: [], 
            roughnessUsed: effectiveRoughnessOrC
        };
    });

    const nodeResults: NodeResult[] = nodes.map(n => ({
        nodeId: n.id, head: nodeHeads.get(n.id) || n.elevation, pressure: (nodeHeads.get(n.id) || n.elevation) - n.elevation
    }));

    return { pipes: pipeResults, nodes: nodeResults };
};