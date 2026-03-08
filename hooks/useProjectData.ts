
import { useState, useCallback } from 'react';
import { Node, PipeSegment, Material, Vertex, DemandGroup, MapAnnotation, AnnotationGroup, MDConfig, ProjectMetadata } from '../types';
import { DEFAULT_MATERIALS, COMMON_FITTINGS } from '../constants';
import { calculateGeoDistance } from '../services/calcService';

export const useProjectData = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pipes, setPipes] = useState<PipeSegment[]>([]);
  const [materials, setMaterials] = useState<Material[]>(DEFAULT_MATERIALS);
  const [demandGroups, setDemandGroups] = useState<DemandGroup[]>([]);
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([]);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [mdConfig, setMdConfig] = useState<MDConfig>({
    title: 'PROJETO DE REDE HIDRÁULICA',
    subtitle: 'MEMORIAL DESCRITIVO E CÁLCULOS',
    client: 'NOME DO CLIENTE',
    engineer: 'NOME DO ENGENHEIRO',
    crea: '00000000-0',
    location: 'CIDADE - UF',
    year: new Date().getFullYear().toString(),
    company: 'NOME DA EMPRESA'
  });
  
  const [annotationGroups, setAnnotationGroups] = useState<AnnotationGroup[]>([
    { id: 'default', name: 'Desenho Manual', opacity: 1, locked: false, visible: true }
  ]);

  const recalculatePipeLengths = useCallback((currentNodes: Node[], currentPipes: PipeSegment[]) => {
      return currentPipes.map(p => {
          if (p.useCustomLength) return p;
          const start = currentNodes.find(n => n && n.id === p.startNodeId);
          const end = currentNodes.find(n => n && n.id === p.endNodeId);
          if (!start || !end || !start.geoPosition || !end.geoPosition) return p;
          let dist = 0;
          let points = [start.geoPosition];
          if (p.vertices) {
              p.vertices.forEach(v => { if (v && v.geoPosition) points.push(v.geoPosition); });
          }
          points.push(end.geoPosition);
          for (let i = 0; i < points.length - 1; i++) {
              if (points[i] && points[i+1]) dist += calculateGeoDistance(points[i], points[i + 1]);
          }
          return { ...p, length: parseFloat(dist.toFixed(2)) };
      });
  }, []);

  const recalculateDemands = (currentPipes: PipeSegment[], currentGroups: DemandGroup[]) => {
      const demandMap = new Map<string, number>();
      currentPipes.forEach(p => demandMap.set(p.id, 0));
      currentGroups.forEach(group => {
          if (group.totalFlow === 0 || group.pipeIds.length === 0) return;
          const groupPipes = currentPipes.filter(p => group.pipeIds.includes(p.id));
          const totalLength = groupPipes.reduce((sum, p) => sum + p.length, 0);
          if (totalLength > 0) {
              groupPipes.forEach(p => {
                  const contribution = group.totalFlow * (p.length / totalLength);
                  const current = demandMap.get(p.id) || 0;
                  demandMap.set(p.id, current + contribution);
              });
          }
      });
      return currentPipes.map(p => ({ ...p, distributedDemand: parseFloat((demandMap.get(p.id) || 0).toFixed(6)) }));
  };

  const addNode = (node: Node) => setNodes(prev => [...prev, node]);
  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const removeNode = useCallback((nodeId: string) => {
     setNodes(prev => prev.filter(n => n.id !== nodeId));
     setPipes(prev => {
         const remaining = prev.filter(p => p.startNodeId !== nodeId && p.endNodeId !== nodeId);
         const updatedGroups = demandGroups.map(g => ({ ...g, pipeIds: g.pipeIds.filter(pid => remaining.some(rp => rp.id === pid)) }));
         setDemandGroups(updatedGroups);
         return recalculateDemands(remaining, updatedGroups);
     });
  }, [demandGroups]);

  const addPipe = useCallback((pipe: PipeSegment) => {
      setPipes(prev => {
          const newPipes = [...prev, pipe];
          const lenUpdated = recalculatePipeLengths(nodes, newPipes);
          return recalculateDemands(lenUpdated, demandGroups);
      });
  }, [nodes, demandGroups, recalculatePipeLengths]);

  const updatePipe = useCallback((id: string, updates: Partial<PipeSegment>) => {
    setPipes(prev => {
        const updatedPipes = prev.map(p => p.id === id ? { ...p, ...updates } : p);
        if (updates.vertices !== undefined || updates.useCustomLength !== undefined) {
             const lenUpdated = recalculatePipeLengths(nodes, updatedPipes);
             return recalculateDemands(lenUpdated, demandGroups);
        }
        return updatedPipes;
    });
  }, [nodes, demandGroups, recalculatePipeLengths]);

  const removePipe = useCallback((pipeId: string) => {
     setPipes(prev => {
         const remaining = prev.filter(p => p.id !== pipeId);
         const updatedGroups = demandGroups.map(g => ({ ...g, pipeIds: g.pipeIds.filter(id => id !== pipeId) }));
         setDemandGroups(updatedGroups);
         return recalculateDemands(remaining, updatedGroups);
     });
  }, [demandGroups]);

  const addDemandGroup = () => {
      const newGroup: DemandGroup = { id: `dg-${Date.now()}`, name: `Setor ${demandGroups.length + 1}`, totalFlow: 0, pipeIds: [] };
      setDemandGroups(prev => [...prev, newGroup]);
      return newGroup;
  };

  const updateDemandGroup = (id: string, updates: Partial<DemandGroup>) => {
      const nextGroups = demandGroups.map(g => g.id === id ? { ...g, ...updates } : g);
      setDemandGroups(nextGroups);
      setPipes(currentPipes => recalculateDemands(currentPipes, nextGroups));
  };

  const removeDemandGroup = (id: string) => {
      const nextGroups = demandGroups.filter(g => g.id !== id);
      setDemandGroups(nextGroups);
      setPipes(currentPipes => recalculateDemands(currentPipes, nextGroups));
  };

  const addAnnotationGroup = (name: string, locked = true) => {
      const id = `group-${Date.now()}`;
      setAnnotationGroups(prev => [...prev, { id, name, opacity: 1, locked, visible: true }]);
      return id;
  };
  const updateAnnotationGroup = (id: string, updates: Partial<AnnotationGroup>) => {
      setAnnotationGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };
  const removeAnnotationGroup = (id: string) => {
      setAnnotationGroups(prev => prev.filter(g => g.id !== id));
      setAnnotations(prev => prev.filter(a => a.groupId !== id));
  };

  const addAnnotation = (annotation: MapAnnotation) => setAnnotations(prev => [...prev, annotation]);
  const updateAnnotation = (id: string, updates: Partial<MapAnnotation>) => setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  const removeAnnotation = useCallback((id: string) => setAnnotations(prev => prev.filter(a => a.id !== id)), []);

  return {
      nodes, pipes, materials, demandGroups, annotations, annotationGroups, mdConfig, projectMetadata,
      setMaterials, setNodes, setPipes, setDemandGroups, setAnnotations, setAnnotationGroups, setMdConfig, setProjectMetadata,
      addNode, updateNode, removeNode,
      addPipe, updatePipe, removePipe,
      addDemandGroup, updateDemandGroup, removeDemandGroup,
      addAnnotationGroup, updateAnnotationGroup, removeAnnotationGroup,
      addAnnotation, updateAnnotation, removeAnnotation,
      triggerLengthRecalculation: () => setPipes(prev => recalculateDemands(recalculatePipeLengths(nodes, prev), demandGroups))
  };
};
