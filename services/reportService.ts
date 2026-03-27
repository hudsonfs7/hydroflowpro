import { Node, PipeSegment, CalculationResult, NodeResult, UnitSystem, FlowUnit, Material } from '../types';
import { convertFlowFromSI, getPumpOrientations } from './calcService';

const calculatePowerCV = (flow: number, head: number, unit: FlowUnit, efficiency: number) => {
    let flowM3h = flow;
    const u = unit as string;
    if (u.toLowerCase() === 'l/s') flowM3h = flow * 3.6;
    else if (u === 'm³/day' || u === 'm3/dia') flowM3h = flow / 24;
    else if (u === 'gpm') flowM3h = flow * 0.227124;

    const powerKW = (flowM3h * head * 9.81) / (3600 * (efficiency / 100));
    return powerKW * 1.35962; // Convert kW to CV
};

const escapeHtml = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeFixedValue = (val: any, digits: number = 2) => {
    if (typeof val === 'number' && !isNaN(val)) return val.toFixed(digits);
    return "0.00";
};

const getNodePressure = (nodeResults: NodeResult[] | Map<string, NodeResult> | any, nodeId: string) => {
    if (!nodeResults) return null;
    if (nodeResults instanceof Map) return nodeResults.get(nodeId)?.pressure ?? null;
    if (Array.isArray(nodeResults)) return nodeResults.find((n: any) => n.nodeId === nodeId)?.pressure ?? null;
    return null;
};

const getPipeColorForReport = (dn: number): string => {
    switch (dn) {
        case 32: return '#cd853f';
        case 50:
        case 63: return '#32cd32';
        case 75:
        case 90: return '#f97316';
        case 100:
        case 110: return '#0ea5e9';
        case 150: return '#dc2626';
        case 200: return '#9333ea';
        case 250: return '#eab308';
        case 300: return '#db2777';
        default: return '#64748b';
    }
};

const buildSchematicCroquiSvg = (
    nodes: Node[] = [],
    pipes: PipeSegment[] = [],
    _results: CalculationResult[] = [],
    nodeResults: NodeResult[] | Map<string, NodeResult> | any,
    _flowUnit: FlowUnit
) => {
    if (nodes.length === 0) {
        return '<div class="chart-placeholder">Rede não disponível</div>';
    }

    const width = 1200;
    const height = 680;
    const padding = 55;
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    const rawPoints = nodes.map((node, index) => ({
        id: node.id,
        x: Number.isFinite(node.x) ? node.x : (Number.isFinite(node.geoPosition?.lng) ? node.geoPosition.lng : index * 120),
        y: Number.isFinite(node.y) ? node.y : (Number.isFinite(node.geoPosition?.lat) ? -node.geoPosition.lat : index * 80)
    }));

    const minX = Math.min(...rawPoints.map(point => point.x));
    const maxX = Math.max(...rawPoints.map(point => point.x));
    const minY = Math.min(...rawPoints.map(point => point.y));
    const maxY = Math.max(...rawPoints.map(point => point.y));
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
    const offsetX = (width - spanX * scale) / 2;
    const offsetY = (height - spanY * scale) / 2;

    const projectPoint = (x: number, y: number) => ({
        x: offsetX + (x - minX) * scale,
        y: offsetY + (y - minY) * scale
    });

    const resolveVertexPoint = (vertex: any, fallbackIndex: number) => {
        const baseX = Number.isFinite(vertex?.x) ? vertex.x : (Number.isFinite(vertex?.geoPosition?.lng) ? vertex.geoPosition.lng : minX + fallbackIndex * 10);
        const baseY = Number.isFinite(vertex?.y) ? vertex.y : (Number.isFinite(vertex?.geoPosition?.lat) ? -vertex.geoPosition.lat : minY + fallbackIndex * 10);
        return projectPoint(baseX, baseY);
    };

    const positionedNodes = new Map(rawPoints.map(point => [point.id, projectPoint(point.x, point.y)]));

    const pipeMarkup = pipes.map((pipe, pipeIndex) => {
        const start = nodeMap.get(pipe.startNodeId);
        const end = nodeMap.get(pipe.endNodeId);
        if (!start || !end) return '';

        const points = [
            positionedNodes.get(start.id)!,
            ...(pipe.vertices || []).map((vertex, vertexIndex) => resolveVertexPoint(vertex, pipeIndex + vertexIndex + 1)),
            positionedNodes.get(end.id)!
        ];

        let totalDist = 0;
        const segDists: number[] = [];
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            segDists.push(dist);
            totalDist += dist;
        }

        let labelX = (points[0].x + points[points.length - 1].x) / 2;
        let labelY = (points[0].y + points[points.length - 1].y) / 2;
        let baseAngle = 0;

        let accumulated = 0;
        const midDist = totalDist / 2;
        for (let i = 0; i < segDists.length; i++) {
            if (accumulated + segDists[i] >= midDist) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const ratio = segDists[i] > 0 ? (midDist - accumulated) / segDists[i] : 0.5;
                labelX = p1.x + (p2.x - p1.x) * ratio;
                labelY = p1.y + (p2.y - p1.y) * ratio;
                baseAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
                break;
            }
            accumulated += segDists[i];
        }

        let textAngle = baseAngle;
        if (textAngle > 90 || textAngle < -90) textAngle += 180;

        const polylinePoints = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
        const pipeColor = getPipeColorForReport(pipe.nominalDiameter);

        return `
        <g>
            <polyline points="${polylinePoints}" fill="none" stroke="${pipeColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <g transform="translate(${labelX.toFixed(1)}, ${labelY.toFixed(1)}) rotate(${textAngle.toFixed(2)})">
                <text y="-11" text-anchor="middle" font-size="16" font-family="monospace" font-weight="700" fill="#1e293b" style="paint-order: stroke; stroke: rgba(255,255,255,0.92); stroke-width: 4px;">DN${escapeHtml(pipe.nominalDiameter)}</text>
                <text y="14" text-anchor="middle" font-size="15" font-family="monospace" fill="#475569" style="paint-order: stroke; stroke: rgba(255,255,255,0.92); stroke-width: 4px;">${escapeHtml(safeFixedValue(pipe.length, 1))} m</text>
            </g>
        </g>`;
    }).join('');

    const nodeMarkup = nodes.map((node, index) => {
        const point = positionedNodes.get(node.id);
        if (!point) return '';

        const pressure = getNodePressure(nodeResults, node.id);
        const radius = node.type === 'pump' ? 13 : 11;
        const strokeColor = node.type === 'source'
            ? '#0ea5e9'
            : node.type === 'well'
                ? '#6366f1'
                : node.type === 'pump'
                    ? '#7c3aed'
                    : '#dc2626';

        const sideRight = (index % 2 === 0);
        const x1 = sideRight ? radius : -radius;
        const y1 = -radius * 0.3;
        const x2 = sideRight ? radius + 20 : -(radius + 20);
        const y2 = -radius - 20;
        const x3 = sideRight ? x2 + 68 : x2 - 68;
        const pX = sideRight ? x3 + 4 : x3 - 4;
        const pAnchor = sideRight ? 'start' : 'end';

        const shape = node.type === 'source'
            ? `<rect x="${-radius}" y="${-radius}" width="${radius * 2}" height="${radius * 2}" rx="2" fill="white" stroke="${strokeColor}" stroke-width="2" />`
            : node.type === 'pump'
                ? `<g><circle r="${radius}" fill="white" stroke="${strokeColor}" stroke-width="2" /><line x1="${-radius * 0.4}" y1="0" x2="${radius * 0.55}" y2="0" stroke="${strokeColor}" stroke-width="1.4" /><polyline points="${radius * 0.25},${-radius * 0.25} ${radius * 0.55},0 ${radius * 0.25},${radius * 0.25}" fill="none" stroke="${strokeColor}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></g>`
                : node.type === 'well'
                    ? `<g><rect x="${-radius}" y="${-radius}" width="${radius * 2}" height="${radius * 2}" fill="white" stroke="${strokeColor}" stroke-width="2" /><circle r="3.5" fill="${strokeColor}" /></g>`
                    : `<circle r="${radius}" fill="white" stroke="${strokeColor}" stroke-width="2" />`;

        return `
        <g transform="translate(${point.x.toFixed(1)}, ${point.y.toFixed(1)})">
            <polyline points="${x1},${y1} ${x2},${y2} ${x3},${y2}" fill="none" stroke="#dc2626" stroke-width="1.2" />
            <text x="${pX}" y="${(y2 + 1).toFixed(1)}" text-anchor="${pAnchor}" font-size="18" font-family="monospace" font-weight="700" fill="#dc2626" dominant-baseline="middle" style="paint-order: stroke; stroke: rgba(255,255,255,0.92); stroke-width: 4px;">P=${escapeHtml(safeFixedValue(pressure ?? 0, 2))}</text>
            ${shape}
            <text x="0" y="4" text-anchor="middle" font-size="13" font-weight="700" fill="${strokeColor}">${escapeHtml(node.id.replace(/\D/g, '') || node.id)}</text>
        </g>`;
    }).join('');

    return `
    <svg viewBox="0 0 ${width} ${height}" class="croqui-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Croqui técnico da rede">
        <rect width="${width}" height="${height}" fill="#ffffff" />
        ${pipeMarkup}
        ${nodeMarkup}
    </svg>`;
};

export const generateReportHtml = (projectData: any, options: { autoPrint?: boolean } = {}) => {
    const { nodes, pipes, results, nodeResults, totals, flowUnit, unitSystem, materials, projectMetadata, calcMethod, mapImage, globalC, globalRoughness } = projectData;
    const { autoPrint = true } = options;
    const date = new Date().toLocaleDateString('pt-BR');

    const studyName = projectMetadata?.studyName || projectMetadata?.name || 'Projeto Sem Nome';
    const location = projectMetadata?.location || '';

    // Cálculo de Pessoas Atendidas e Ligações
    const hab = projectMetadata?.lotsHab || 0;
    const dom = projectMetadata?.habDomRate || 0;
    const att = (projectMetadata?.attendanceRate !== undefined ? projectMetadata.attendanceRate : 100) / 100;
    const calculatedPeople = Math.round(hab * dom * att);
    const totalLots = (projectMetadata?.lotsHab || 0) + (projectMetadata?.lotsCom || 0) + (projectMetadata?.lotsInst || 0);

    const calcMethodName = calcMethod?.toString().toLowerCase().includes('darcy') ? 'Darcy-Weisbach' : 'Hazen-Williams';

    const getNodeRes = (id: string) => {
        if (!nodeResults) return null;
        if (nodeResults instanceof Map) return nodeResults.get(id);
        if (Array.isArray(nodeResults)) return nodeResults.find((n: any) => n.nodeId === id);
        return null;
    };

    const safeFixed = (val: any, digits: number = 2) => {
        if (typeof val === 'number' && !isNaN(val)) return val.toFixed(digits);
        return "0.00";
    };

    const style = `
    @page { size: A4 portrait; margin: 15mm; }
    @page landscape-page { size: A4 landscape; margin: 10mm; }
    
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.5; }
    .page { width: 100%; box-sizing: border-box; page-break-after: always; }
    .page-landscape { page: landscape-page; width: 100%; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
    .header-title { font-size: 20px; font-weight: 800; color: #1e40af; text-transform: uppercase; }
    .header-meta { text-align: right; font-size: 10px; color: #64748b; }
    
    .presentation-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .presentation-box h2 { margin-top: 0; color: #1e40af; font-size: 16px; border: none; padding: 0; }
    .presentation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; }
    .presentation-grid div strong { color: #475569; }

    h1 { font-size: 18px; color: #0f172a; margin: 20px 0 10px 0; border-left: 4px solid #3b82f6; padding-left: 10px; text-transform: uppercase; }
    h2 { font-size: 14px; color: #334155; margin: 15px 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; }
    
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; }
    th { background: #f1f5f9; color: #475569; text-align: left; padding: 8px; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    tr { page-break-inside: avoid; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
    .card-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .card-value { font-size: 16px; font-weight: 800; color: #1e40af; }
    
    .pump-container { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; background: #fff; page-break-inside: avoid; }
    .pump-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .chart-placeholder { width: 100%; height: 250px; background: #f8fafc; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; margin-top: 15px; }
    
    .croqui-container { width: 100%; height: 140mm; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; position: relative; margin-bottom: 10px; }
    .croqui-img { width: 100%; height: 100%; object-fit: contain; }
    .croqui-svg { width: 100%; height: 100%; display: block; }
    
    .footer { width: 100%; text-align: center; font-size: 9px; color: #94a3b8; padding: 10px 0; border-top: 1px solid #f1f5f9; margin-top: 30px; }
    
    @media print {
      .no-print { display: none; }
      body { -webkit-print-color-adjust: exact; }
      .page { page-break-after: always; }
      .page:last-of-type { page-break-after: auto; }
      .page-landscape { page: landscape-page; }
    }
  `;

    // Quantitativo de Material e DN
    const quantitativoMap = new Map<string, number>();
    (pipes || []).forEach((p: PipeSegment) => {
        const matObj = materials ? materials.find((m: Material) => m.id === p.materialId) : null;
        const matName = matObj ? matObj.name : p.materialId || "Desconhecido";
        const key = `${matName}|${p.nominalDiameter}`;
        quantitativoMap.set(key, (quantitativoMap.get(key) || 0) + p.length);
    });

    const quantitativoRows = Array.from(quantitativoMap.entries()).map(([key, length]) => {
        const [mat, dn] = key.split('|');

        const matObj = materials ? materials.find((m: Material) => m.name === mat) : null;
        let di = '-';
        if (matObj && matObj.availableDiameters) {
            const dObj = matObj.availableDiameters.find((d: any) => String(d.dn) === String(dn));
            if (dObj) di = dObj.di.toFixed(2);
        }

        const matLower = mat.toLowerCase();
        const multiplo = (matLower.includes('pead') || matLower.includes('p.e.a.d')) ? 100 : 6;

        const numTubos = Math.ceil((length * 1.1) / multiplo);
        const necM = numTubos * multiplo;

        return `<tr>
          <td>${mat}</td>
          <td class="text-center font-bold" style="background: #f1f5f9; color: #1e40af;">${dn}</td>
          <td class="text-center">${di}</td>
          <td class="text-right">${safeFixed(length, 1)}</td>
          <td class="text-right font-bold text-blue-700">${necM}</td>
          <td class="text-center font-bold text-red-600">${numTubos}</td>
      </tr>`;
    }).join('');

    const pipeRows = (pipes || []).map((p: PipeSegment) => {
        const res = results ? results.find((r: any) => r.segmentId === p.id) : null;
        const flowVal = res ? Math.abs(convertFlowFromSI(res.flowRate, flowUnit)) : 0;
        const vel = res ? res.velocity : 0;
        const hl = res ? res.totalHeadLoss : 0;
        const hlUnit = res ? res.unitHeadLoss : 0;
        const matObj = materials ? materials.find((m: Material) => m.id === p.materialId) : null;
        const matFull = matObj ? matObj.name : p.materialId || "Desconhecido";

        const isDW = calcMethod?.toString().toLowerCase().includes('darcy');
        let coeffValue: any = 0;
        if (isDW) {
            coeffValue = p.customRoughness !== undefined ? p.customRoughness : (globalRoughness || (matObj ? matObj.roughness : 0));
        } else {
            coeffValue = p.customC !== undefined ? p.customC : (globalC || (matObj ? matObj.hwCoefficient : 0));
        }

        return `<tr>
        <td>${p.name || p.id.replace('p', 'T')}</td>
        <td>${p.startNodeId} → ${p.endNodeId}</td>
        <td class="text-right">${safeFixed(p.length, 1)}</td>
        <td class="text-right">${p.nominalDiameter}</td>
        <td>${matFull.split(' ')[0]}</td>
        <td class="text-right">${coeffValue}</td>
        <td class="text-right font-bold">${safeFixed(flowVal)}</td>
        <td class="text-right">${safeFixed(vel)}</td>
        <td class="text-right">${safeFixed(hl)}</td>
        <td class="text-right">${safeFixed(hlUnit)}</td>
      </tr>`;
    }).join('');

    const nodeRows = (nodes || []).map((n: Node) => {
        let rawRes = getNodeRes(n.id);
        let cp = n.elevation;
        let p = n.pressureHead || 0;

        if (rawRes) {
            const h = rawRes.head !== undefined ? rawRes.head : rawRes.cp;
            const pr = rawRes.pressure !== undefined ? rawRes.pressure : rawRes.p;
            if (unitSystem === UnitSystem.SI) {
                cp = h; p = pr;
            } else {
                cp = h / 0.3048; p = pr / 0.3048;
            }
        }

        return `<tr>
        <td>${n.id}</td>
        <td>${n.name || '-'}</td>
        <td class="text-right">${safeFixed(n.elevation)}</td>
        <td class="text-right">${n.baseDemand || 0}</td>
        <td class="text-right">${safeFixed(cp)}</td>
        <td class="text-right font-bold">${safeFixed(p)}</td>
      </tr>`;
    }).join('');

    let maxJ = 0; let maxVel = 0;
    if (results) {
        results.forEach((r: any) => {
            if (r.unitHeadLoss > maxJ) maxJ = r.unitHeadLoss;
            if (r.velocity > maxVel) maxVel = r.velocity;
        });
    }
    let maxCotaPiez = -Infinity, minElev = Infinity, maxPress = -Infinity, minPress = Infinity;
    (nodes || []).forEach((n: Node) => {
        let rawRes = getNodeRes(n.id);
        let cp = n.elevation, p = n.pressureHead || 0;
        if (rawRes) {
            const h = rawRes.head !== undefined ? rawRes.head : rawRes.cp;
            const pr = rawRes.pressure !== undefined ? rawRes.pressure : rawRes.p;
            if (unitSystem === UnitSystem.SI) { cp = h; p = pr; } else { cp = h / 0.3048; p = pr / 0.3048; }
        }
        if (cp > maxCotaPiez) maxCotaPiez = cp;
        if (n.elevation < minElev) minElev = n.elevation;
        if (p > maxPress) maxPress = p;
        if (p < minPress) minPress = p;
    });
    if (minElev === Infinity) minElev = 0; if (maxCotaPiez === -Infinity) maxCotaPiez = 0; if (maxPress === -Infinity) maxPress = 0; if (minPress === Infinity) minPress = 0;

    const verificationsHtml = `
  <h2>2.2. Verificações do Dimensionamento</h2>
  <table>
      <thead>
          <tr>
              <th style="width: 40%;">VERIFICAÇÕES</th>
              <th class="text-center">Limite</th>
              <th class="text-center">Máx. Obtido</th>
              <th class="text-center">-</th>
          </tr>
      </thead>
      <tbody>
          <tr>
              <td>Perda de Carga - J (m/km)</td>
              <td class="text-center font-bold">10.00</td>
              <td class="text-center font-bold" style="color: ${maxJ > 10 ? '#dc2626' : '#334155'}">${safeFixed(maxJ)}</td>
              <td class="text-center font-bold" style="color: ${maxJ <= 10 ? '#16a34a' : '#dc2626'}">${maxJ <= 10 ? 'OK' : 'ALTO'}</td>
          </tr>
          <tr>
              <td>Velocidade (m/s)</td>
              <td class="text-center font-bold">2.00</td>
              <td class="text-center font-bold" style="color: ${maxVel > 2 ? '#dc2626' : '#334155'}">${safeFixed(maxVel)}</td>
              <td class="text-center font-bold" style="color: ${maxVel <= 2 ? '#16a34a' : '#dc2626'}">${maxVel <= 2 ? 'OK' : 'ALTO'}</td>
          </tr>
          <tr>
              <td>Cota Piezométrica máxima (m)</td>
              <td class="text-center font-bold">${safeFixed(maxCotaPiez)}</td>
              <td>Pressão dinâmica máxima (mca)</td>
              <td class="text-center font-bold text-blue-800">${safeFixed(maxPress)}</td>
          </tr>
          <tr>
              <td>Cota Terreno mínima (m)</td>
              <td class="text-center font-bold">${safeFixed(minElev)}</td>
              <td>Pressão dinâmica mínima (mca)</td>
              <td class="text-center font-bold text-red-600">${safeFixed(minPress)}</td>
          </tr>
      </tbody>
  </table>`;



    const formulaUniversal = calcMethod?.toString().toLowerCase().includes('darcy')
        ? `<tr>
              <td style="background:#3b82f6; color:white; font-weight:bold; width: 25%;">Fórmula Universal</td>
              <td style="background:#eff6ff; color:#1e40af; font-weight:bold; text-align:center; width: 35%;">hf = f . ( L / D ) . ( V² / 2g )</td>
              <td style="font-size: 9px;">f = Fator de Atrito, L = Extensão (m), D = Diâmetro Interno (m), V = Velocidade (m/s), g = Gravidade</td>
           </tr>`
        : `<tr>
              <td style="background:#3b82f6; color:white; font-weight:bold; width: 25%;">Hazen-Williams</td>
              <td style="background:#eff6ff; color:#1e40af; font-weight:bold; text-align:center; width: 35%;">hf = 10.67 . L . (Q^1.85) / ( C^1.85 . D^4.87 )</td>
              <td style="font-size: 9px;">C = Coeficiente, L = Extensão (m), D = Diâm. Interno (m), Q = Vazão (m³/s)</td>
           </tr>`;

    const formulasHtml = `
  <h2>2.3. Fórmulas Aplicadas</h2>
  <table>
      <thead>
          <tr><th colspan="3" style="background:#1e40af; color:white; text-align:center;">MÉTODO DE DIMENSIONAMENTO: ${calcMethodName.toUpperCase()}</th></tr>
      </thead>
      <tbody>
          ${formulaUniversal}
          <tr>
              <td style="background:#60a5fa; color:white; font-weight:bold;">Número de Reynolds</td>
              <td style="background:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">Re = V . D / &nu;</td>
              <td style="font-size: 9px;">V = Velocidade (m/s), D = Diâmetro Interno (m), &nu; = Viscosidade Cinemática (m²/s)</td>
          </tr>
          <tr>
              <td style="background:#3b82f6; color:white; font-weight:bold;">Equação da Continuidade</td>
              <td style="background:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">Q = ( &pi; D² / 4 ) . V</td>
              <td style="font-size: 9px;">Q = Vazão (m³/s), D = Diâmetro Interno (m), V = Velocidade (m/s)</td>
          </tr>
      </tbody>
  </table>`;

    const pumps = (nodes || []).filter((n: Node) => n.type === 'pump');
    let cmbContent = '';
    if (pumps.length > 0) {
        const pumpOrientations = getPumpOrientations(nodes, pipes);
        pumps.forEach((p: Node) => {
            const config = p.cmbConfig;
            if (!config) return;

            let actualFlow = 0;
            let actualHead = 0;
            const suctionId = pumpOrientations.get(p.id);
            const suctionRes = suctionId ? getNodeRes(suctionId) : undefined;
            const res = getNodeRes(p.id);

            (pipes || []).filter((pipe: PipeSegment) => (pipe.startNodeId === p.id || pipe.endNodeId === p.id) && (pipe.startNodeId !== suctionId && pipe.endNodeId !== suctionId)).forEach((pipe: PipeSegment) => {
                const pr = results ? results.find((r: any) => r.segmentId === pipe.id) : null;
                if (pr) actualFlow += Math.abs(convertFlowFromSI(pr.flowRate, flowUnit));
            });

            const getHead = (nr: any, def: number) => {
                if (!nr) return def;
                const h = nr.head !== undefined ? nr.head : nr.cp;
                return unitSystem === UnitSystem.SI ? h : h / 0.3048;
            };

            const hMontante = getHead(suctionRes, p.elevation);
            const hJusante = getHead(res, p.elevation);
            actualHead = Math.max(0, hJusante - hMontante);

            const sysReqFlow = actualFlow || config.designFlow || 0;
            const sysReqHead = actualHead || config.designHead || 0;

            const Hstat = sysReqHead * 0.4;
            const k_sys = sysReqFlow > 0 ? (sysReqHead - Hstat) / Math.pow(sysReqFlow, 2) : 0;

            const Qd = config.designFlow || 0;
            const Hd = config.designHead || 0;
            const H0 = config.curveType === '3-point' && config.shutoffHead ? config.shutoffHead : 1.33 * Hd;
            const A = Qd > 0 ? (H0 - Hd) / Math.pow(Qd, 2) : 0;

            let opFlow = 0;
            let opHead = 0;
            if (A + k_sys > 0 && H0 > Hstat) {
                opFlow = Math.sqrt((H0 - Hstat) / (A + k_sys));
                opHead = H0 - A * Math.pow(opFlow, 2);
            }

            const powerCV = calculatePowerCV(opFlow, opHead, flowUnit, config.efficiency || 70);

            const q_max = A > 0 ? Math.sqrt(H0 / A) : Qd * 1.5;
            const plotMax = Math.max(q_max, sysReqFlow * 1.3, opFlow * 1.2) || 1;
            const maxHeadPlot = Math.max(H0, sysReqHead * 1.2, opHead * 1.2) || 1;

            const mapX = (q: number) => 40 + (q / plotMax) * 340;
            const mapY = (h: number) => 210 - (h / maxHeadPlot) * 190;

            let pumpPath = "";
            let sysPath = "";

            for (let i = 0; i <= 50; i++) {
                const q = (plotMax * i) / 50;
                const pumpHead = Math.max(0, H0 - A * Math.pow(q, 2));
                const sysHead = Hstat + k_sys * Math.pow(q, 2);

                const px = mapX(q);
                const pyPump = mapY(pumpHead);
                const pySys = mapY(sysHead);

                if (i === 0) {
                    pumpPath += `M ${px} ${pyPump} `;
                    sysPath += `M ${px} ${pySys} `;
                } else {
                    pumpPath += `L ${px} ${pyPump} `;
                    sysPath += `L ${px} ${pySys} `;
                }
            }

            const opX = mapX(opFlow);
            const opY = mapY(opHead);

            const fmtQ = (qNum: number) => {
                const qM3 = flowUnit.toLowerCase() === 'l/s' ? qNum * 3.6 : (flowUnit === 'm³/day' ? qNum / 24 : qNum);
                return `${safeFixed(qNum)} ${flowUnit} (${safeFixed(qM3)} m³/h)`;
            };

            cmbContent += `
          <div class="pump-container">
              <h2 style="color: #1e40af; margin-top: 0;">${p.name || 'Bomba ' + p.id}</h2>
              <div class="pump-grid">
                  <div>
                      <h3 style="font-size: 11px; color: #64748b; margin-bottom: 5px;">DADOS DE PROJETO</h3>
                      <table style="margin-bottom: 0;">
                          <tr><td>Vazão Projetada</td><td class="text-right font-bold">${fmtQ(config.designFlow)}</td></tr>
                          <tr><td>AMT Projetada</td><td class="text-right font-bold">${safeFixed(config.designHead)} mca</td></tr>
                          <tr><td>Rendimento</td><td class="text-right">${safeFixed(config.efficiency)}%</td></tr>
                      </table>
                  </div>
                  <div>
                      <h3 style="font-size: 11px; color: #64748b; margin-bottom: 5px;">DADOS DE OPERAÇÃO</h3>
                      <table style="margin-bottom: 0;">
                          <tr><td>Vazão Efetiva</td><td class="text-right font-bold text-blue-700">${fmtQ(actualFlow)}</td></tr>
                          <tr><td>AMT Efetiva</td><td class="text-right font-bold text-blue-700">${safeFixed(actualHead)} mca</td></tr>
                          <tr><td>Potência Estimada</td><td class="text-right font-bold text-red-600">${safeFixed(powerCV)} cv</td></tr>
                      </table>
                  </div>
              </div>
              <div class="chart-container" style="margin-top: 15px; text-align: center;">
                  <svg width="400" height="250" viewBox="0 0 400 250" style="border: 1px solid #e2e8f0; border-radius: 4px; display: inline-block; max-width: 100%; font-family: sans-serif;">
                      <line x1="40" y1="20" x2="40" y2="210" stroke="#e2e8f0" stroke-width="1" />
                      <line x1="40" y1="210" x2="380" y2="210" stroke="#e2e8f0" stroke-width="1" />
                      
                      <path d="${pumpPath}" fill="none" stroke="#2563eb" stroke-width="3" />
                      <path d="${sysPath}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4" />
                      
                      <circle cx="${opX}" cy="${opY}" r="6" fill="#dc2626" />
                      <text x="${opX + 10}" y="${opY - 5}" font-size="12" fill="#dc2626" font-weight="bold">Ponto de Operação</text>
                      
                      <text x="210" y="245" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">Vazão</text>
                      <text x="12" y="115" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold" transform="rotate(-90 12 115)">AMT (mca)</text>
                      
                      <text x="${mapX(0)}" y="228" text-anchor="middle" font-size="10" fill="#64748b">0</text>
                      <text x="${mapX(plotMax / 2)}" y="228" text-anchor="middle" font-size="10" fill="#64748b">${safeFixed(plotMax / 2, 1)}</text>
                      <text x="${mapX(plotMax)}" y="228" text-anchor="middle" font-size="10" fill="#64748b">${safeFixed(plotMax, 1)}</text>
                      
                      <text x="32" y="${mapY(maxHeadPlot)}" text-anchor="end" font-size="10" fill="#64748b" alignment-baseline="middle">${safeFixed(maxHeadPlot, 0)}</text>
                      <text x="32" y="${mapY(maxHeadPlot / 2)}" text-anchor="end" font-size="10" fill="#64748b" alignment-baseline="middle">${safeFixed(maxHeadPlot / 2, 0)}</text>
                      <text x="32" y="${mapY(0)}" text-anchor="end" font-size="10" fill="#64748b" alignment-baseline="middle">0</text>
                  </svg>
                  <div style="font-size: 11px; margin-top: 8px; color: #475569; background: #f8fafc; padding: 5px; border-radius: 4px; display: inline-block;">
                      <strong>Ponto de Referência (Projeto):</strong> ${fmtQ(config.designFlow)} @ ${safeFixed(config.designHead)} mca
                  </div>
              </div>
              <div style="background: #fff8f1; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 15px; font-size: 10px; color: #78350f; text-align: left; border-radius: 4px;">
                  <strong style="font-size: 11px; display:block; margin-bottom: 4px;">OBSERVAÇÕES PARA COTAÇÃO DO CONJUNTO MOTOBOMBA:</strong>
                  &bull; O motor, se da marca WEG, deve ser da linha IR03.<br/>
                  &bull; 04 polos.<br/>
                  &bull; Líquido a bombear: Água Tratada.<br/>
                  &bull; Favor encaminhar catálogo completo do equipamento junto à proposta preliminar.<br/>
                  <br/>
                  <div style="background-color: #fee2e2; color: #b91c1c; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; border-left: 3px solid #ef4444; display: inline-block;">
                      <strong>⚠️ ATENÇÃO - FRETE CIF:</strong> Embasa Rua Buerarema, Parque ETA, S/N - Itamaraju-BA. CEP: 45836-000.
                  </div><br/>
                  <div style="background-color: #fef08a; color: #854d0e; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; border-left: 3px solid #eab308; display: inline-block;">
                      <strong>⚠️ ATENÇÃO:</strong> Declarar DIFAL nos impostos.
                  </div>
              </div>
          </div>`;
        });
    } else {
        cmbContent = '<p style="color: #94a3b8; text-align: center; padding: 40px;">Nenhum Conjunto Motobomba configurado neste projeto.</p>';
    }

    const schematicCroqui = buildSchematicCroquiSvg(nodes, pipes, results, nodeResults, flowUnit);
    const croquiMarkup = mapImage
        ? `<img src="${mapImage}" class="croqui-img" alt="Croqui da rede" />`
        : schematicCroqui;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório Técnico - ${studyName.toUpperCase()}</title>
        <meta charset="utf-8" />
        <style>${style}</style>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      </head>
      <body>
        <!-- PÁGINA 1: APRESENTAÇÃO E TUBULAÇÕES -->
        <div class="page">
            <div class="header">
                <div class="header-title">HydroFlow Pro</div>
                <div class="header-meta">
                    <strong>PROJETO:</strong> ${studyName.toUpperCase()}<br/>
                    <strong>DATA:</strong> ${date}
                </div>
            </div>
            
            <div class="presentation-box">
                <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">OBJETO</div>
                <div style="font-size: 18px; font-weight: 800; color: #1e40af; margin-bottom: 12px; text-transform: uppercase;">
                    ${studyName.toUpperCase()}
                </div>
                <div class="presentation-grid">
                    <div><strong>Localidade:</strong> ${(projectMetadata?.city ? projectMetadata.city + (projectMetadata?.state ? ' - ' + projectMetadata.state : '') : (location || '-')).toUpperCase()}</div>
                    <div><strong>Pessoas Atendidas:</strong> ${calculatedPeople}</div>
                    <div><strong>Número de Ligações:</strong> ${totalLots}</div>
                    <div><strong>Vazão Total do Sistema:</strong> ${totals?.flowDisplay || '0.00'} ${flowUnit}</div>
                    <div><strong>Método de Cálculo:</strong> ${calcMethodName} (${calcMethod?.toString().toLowerCase().includes('darcy') ? (globalRoughness || 'Mat.') : (globalC || 'Mat.')})</div>
                    <div><strong>Data de Emissão:</strong> ${date}</div>
                </div>
            </div>
            
            <h1>1. Quantitativo de Materiais</h1>
            <table>
                <thead>
                    <tr>
                        <th class="text-left">Material</th>
                        <th class="text-center">DN (mm)</th>
                        <th class="text-center">DI (mm)</th>
                        <th class="text-right">Extensão Efetiva (m)</th>
                        <th class="text-right">Tub. Necessária (m)*</th>
                        <th class="text-center">Nº de Tubos/Rolos</th>
                    </tr>
                </thead>
                <tbody>${quantitativoRows}</tbody>
            </table>
            <div style="font-size: 8px; color: #64748b; margin-top: -15px; margin-bottom: 20px; text-align: right;">*Calculada com margem de 10% de perda estrutural. Múltiplos adotados em metros lineares: PEAD (100m) | Demais Variantes (6m).</div>

            <h1>2. Detalhamento das Tubulações</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Trecho</th>
                        <th class="text-right">Extensão (m)</th>
                        <th class="text-right">DN (mm)</th>
                        <th>Material</th>
                        <th class="text-right">${calcMethod?.toString().toLowerCase().includes('darcy') ? 'Rug.' : 'C'}</th>
                        <th class="text-right">Vazão (${flowUnit})</th>
                        <th class="text-right">Vel. (m/s)</th>
                        <th class="text-right">Perda (m)</th>
                        <th class="text-right">J (m/km)</th>
                    </tr>
                </thead>
                <tbody>${pipeRows}</tbody>
            </table>

            <h2>2.1. Dados dos Nós</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th class="text-right">Elev. (m)</th>
                        <th class="text-right">Demanda</th>
                        <th class="text-right">Cota Piez. (m)</th>
                        <th class="text-right">Pressão (mca)</th>
                    </tr>
                </thead>
                <tbody>${nodeRows}</tbody>
            </table>
            
            <div style="margin-top: 30px;">
                ${verificationsHtml}
                ${formulasHtml}
            </div>
            
            <div class="footer">Relatório Gerado por HydroFlow Pro</div>
        </div>

        <!-- PÁGINA 2: CMB E CURVAS -->
        <div class="page">
            <div class="header">
                <div class="header-title">HydroFlow Pro</div>
                <div class="header-meta">
                    <strong>PROJETO:</strong> ${studyName}<br/>
                    <strong>DATA:</strong> ${date}
                </div>
            </div>
            
            <h1>3. Conjunto Motobomba</h1>
            ${cmbContent}
            
            <div class="footer">Relatório Gerado por HydroFlow Pro</div>
        </div>

        <!-- PÁGINA 3: CROQUI (PAISAGEM) -->
        <div class="page page-landscape">
            <div class="header">
                <div class="header-title">HydroFlow Pro</div>
                <div class="header-meta">
                    <strong>PROJETO:</strong> ${studyName}<br/>
                    <strong>DATA:</strong> ${date}
                </div>
            </div>
            
            <h1>4. Croqui da Rede Hidráulica</h1>
            <div class="croqui-container">
                ${croquiMarkup}
            </div>
            
            <div style="margin-top: 10px; display: flex; gap: 20px; font-size: 10px; color: #64748b; font-weight: 600;">
                <div><strong>LEGENDA:</strong></div>
                <div>P: Pressão (mca)</div>
                <div>DN: Diâmetro nominal</div>
                <div>E: Extensão (m)</div>
                <div>Cor: Faixa por DN</div>
            </div>
            
            <div class="footer">Relatório Gerado por HydroFlow Pro</div>
        </div>

        ${autoPrint ? `<script>
            window.onload = () => {
                setTimeout(() => { window.print(); }, 1000);
            };
        </script>` : ''}
      </body>
    </html>
  `;
};

export const generateReport = (projectData: any) => {
    const html = generateReportHtml(projectData, { autoPrint: true });
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
    }
};
