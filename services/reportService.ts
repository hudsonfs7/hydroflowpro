
import { Node, PipeSegment, CalculationResult, NodeResult, UnitSystem, FlowUnit, Material } from '../types';
import { convertFlowFromSI } from './calcService';

export const generateReportHtml = (projectData: any) => {
  const { nodes, pipes, results, nodeResults, totals, flowUnit, unitSystem, materials } = projectData;
  const date = new Date().toLocaleDateString('pt-BR');
  
  // Find Material Helper
  const getMatName = (id: string) => {
      if (!materials) return id;
      const m = materials.find((mat: Material) => mat.id === id);
      return m ? m.name : id;
  };

  // Safe Node Results Lookup
  const getNodeRes = (id: string) => {
      if (!nodeResults) return null;
      // Handle both Map and Array (flexible)
      if (nodeResults instanceof Map) return nodeResults.get(id);
      if (Array.isArray(nodeResults)) return nodeResults.find((n: any) => n.nodeId === id);
      return null;
  };

  const style = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 20px; max-width: 210mm; margin: 0 auto; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 24px; }
    h2 { color: #475569; margin-top: 30px; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .card { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .card-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 5px; }
    .card-value { font-size: 18px; font-weight: bold; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { background: #eff6ff; color: #1e40af; text-align: left; padding: 8px; font-weight: 600; border-bottom: 2px solid #bfdbfe; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .text-right { text-align: right; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  `;

  // Helper to safely format numbers
  const safeFixed = (val: any, digits: number = 2) => {
      if (typeof val === 'number' && !isNaN(val)) return val.toFixed(digits);
      return "0.00";
  };

  // Generate Rows
  const nodeRows = (nodes || []).map((n: Node) => {
      let rawRes = getNodeRes(n.id);
      
      // Conversion
      let cp = n.elevation;
      let p = n.pressureHead || 0;

      if (rawRes) {
          if (unitSystem === UnitSystem.SI) {
              cp = rawRes.head !== undefined ? rawRes.head : rawRes.cp;
              p = rawRes.pressure !== undefined ? rawRes.pressure : rawRes.p;
          } else {
              const h = rawRes.head !== undefined ? rawRes.head : rawRes.cp;
              const pr = rawRes.pressure !== undefined ? rawRes.pressure : rawRes.p;
              cp = h / 0.3048;
              p = pr / 0.3048;
          }
      }

      return `<tr>
        <td>${n.id}</td>
        <td>${n.name || ''}</td>
        <td>${n.type === 'source' ? 'Fonte' : 'Demanda'}</td>
        <td class="text-right">${safeFixed(n.elevation)}</td>
        <td class="text-right">${n.baseDemand || 0}</td>
        <td class="text-right"><strong>${safeFixed(cp)}</strong></td>
        <td class="text-right">${safeFixed(p)}</td>
      </tr>`;
  }).join('');

  const pipeRows = (pipes || []).map((p: PipeSegment) => {
      const res = results ? results.find((r: any) => r.segmentId === p.id) : null;
      const flowVal = res ? Math.abs(convertFlowFromSI(res.flowRate, flowUnit)) : 0;
      const vel = res ? res.velocity : 0;
      const hl = res ? res.totalHeadLoss : 0;
      const hlUnit = res ? res.unitHeadLoss : 0;
      const matFull = getMatName(p.materialId) || "Desconhecido";
      const mat = matFull.split(' ')[0];
      
      return `<tr>
        <td>${p.id.replace('p', 'T')}</td>
        <td>${p.startNodeId} → ${p.endNodeId}</td>
        <td>${safeFixed(p.length, 1)}</td>
        <td>${p.nominalDiameter}</td>
        <td>${mat}</td>
        <td class="text-right font-bold">${safeFixed(flowVal)}</td>
        <td class="text-right">${safeFixed(vel)}</td>
        <td class="text-right">${safeFixed(hl)}</td>
        <td class="text-right">${safeFixed(hlUnit)}</td>
      </tr>`;
  }).join('');

  const totalHeadLoss = totals ? totals.total : 0;
  const totalFlowSI = totals ? totals.flow : 0;
  const totalFlowDisp = convertFlowFromSI(totalFlowSI, flowUnit);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório HydroFlow Pro</title>
        <meta charset="utf-8" />
        <style>${style}</style>
      </head>
      <body>
        <div class="meta">
           <div>
             <strong>HydroFlow Pro</strong><br/>
             Relatório de Cálculo Hidráulico
           </div>
           <div class="text-right">
             <strong>Data:</strong> ${date}<br/>
             <strong>Sistema:</strong> ${unitSystem} / ${flowUnit}
           </div>
        </div>
        
        <h1>Relatório Técnico</h1>
        
        <div class="summary-grid">
           <div class="card">
              <div class="card-label">Perda de Carga Total</div>
              <div class="card-value">${safeFixed(totalHeadLoss)} m</div>
           </div>
           <div class="card">
              <div class="card-label">Vazão Total</div>
              <div class="card-value">${safeFixed(totalFlowDisp)} ${flowUnit}</div>
           </div>
           <div class="card">
              <div class="card-label">Elementos</div>
              <div class="card-value">${nodes ? nodes.length : 0} Nós / ${pipes ? pipes.length : 0} Tubos</div>
           </div>
        </div>

        <h2>Detalhamento de Nós</h2>
        <table>
           <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th class="text-right">Elev. (m)</th><th class="text-right">Demanda</th><th class="text-right">Cota Piez. (m)</th><th class="text-right">Pressão (mca)</th></tr></thead>
           <tbody>${nodeRows}</tbody>
        </table>

        <h2>Detalhamento de Tubulações</h2>
        <table>
           <thead><tr><th>ID</th><th>Trecho</th><th>Comp. (m)</th><th>DN</th><th>Mat</th><th class="text-right">Vazão (${flowUnit})</th><th class="text-right">Vel. (m/s)</th><th class="text-right">Perda (m)</th><th class="text-right">J (m/km)</th></tr></thead>
           <tbody>${pipeRows}</tbody>
        </table>

        <div class="footer">Gerado por HydroFlow Pro</div>
        <script>
            setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;
};
