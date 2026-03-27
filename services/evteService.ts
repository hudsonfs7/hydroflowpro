
import { Node, PipeSegment, CalculationResult, EVTEConfig, EVTEPointInfo, CalcMethod, FlowUnit, Material } from '../types';
import { convertFlowFromSI } from './calcService';

export const generateEVTE = (
  config: EVTEConfig,
  nodes: Node[],
  pipes: PipeSegment[],
  results: CalculationResult[],
  nodeResults: any[],
  calcMethod: CalcMethod,
  flowUnit: FlowUnit,
  mapImage: string,
  materials: Material[]
) => {
  const css = `
    @page { size: A4 landscape; margin: 10mm; }
    body { 
      font-family: 'Inter', Arial, sans-serif; 
      font-size: 8pt; 
      color: #000; 
      margin: 0; 
      padding: 0;
    }
    .sheet {
      width: 277mm;
      height: 190mm;
      border: 1.5pt solid #000;
      display: flex;
      box-sizing: border-box;
      position: relative;
    }
    .viewport {
      flex: 1;
      height: 100%;
      border-right: 1pt solid #000;
      position: relative;
      overflow: hidden;
    }
    .selo {
      width: 80mm;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .selo-item {
      border-bottom: 1pt solid #000;
      padding: 3mm;
    }
    .selo-header {
      display: flex;
      align-items: center;
      gap: 5mm;
      height: 20mm;
    }
    .logo { width: 40mm; }
    .titulo-principal { font-size: 14pt; font-weight: bold; flex: 1; text-align: right; }
    
    .label { font-size: 7pt; color: #444; text-transform: uppercase; margin-bottom: 1mm; font-weight: bold; }
    .value { font-size: 10pt; font-weight: bold; text-transform: uppercase; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; }
    
    .legenda-title { background: #f0f0f0; text-align: center; font-weight: bold; padding: 1mm; border-bottom: 1pt solid #000; font-size: 9pt; }
    .legenda-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; padding: 2mm; font-size: 7pt; }
    .legenda-item { display: flex; align-items: center; gap: 2mm; }
    .line { width: 10mm; height: 1.5pt; }
    .circle { width: 3mm; height: 3mm; border: 1pt solid #000; border-radius: 50%; }
    
    .obs-box { flex: 1; padding: 2mm; font-size: 7pt; white-space: pre-wrap; vertical-align: top; border-bottom: 1pt solid #000;}
    
    .assinaturas {
      height: 25mm;
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      padding-bottom: 2mm;
    }
    .assinatura-line { border-top: 1pt solid #000; width: 35mm; text-align: center; font-size: 6pt; }

    .map-img { width: 100%; height: 100%; object-fit: contain; }
    .north-arrow { 
      position: absolute; 
      bottom: 5mm; 
      left: 5mm; 
      width: 15mm; 
      height: 15mm; 
      display: flex;
      flex-direction: column;
      align-items: center;
      font-weight: bold;
    }
    .north-arrow svg { width: 100%; height: 80%; }

    .entroncamento-box {
      position: absolute;
      top: 5mm;
      left: 5mm;
      border: 1pt solid #c05;
      background: rgba(255,255,255,0.8);
      padding: 2mm;
      width: 60mm;
      font-size: 7pt;
    }
    .entroncamento-title { color: #f0f; font-weight: bold; border-bottom: 0.5pt solid #c05; margin-bottom: 1mm; text-align: center; }
  `;

  // Determine existing vs projected based on properties (if we had them)
  // For now, let's use all pipes as projected unless they have a flag
  const pipesByDN = pipes.reduce((acc: any, p) => {
    if (!acc[p.nominalDiameter]) acc[p.nominalDiameter] = [];
    acc[p.nominalDiameter].push(p);
    return acc;
  }, {});

  const dnColors: any = {
    50: '#16a34a',
    75: '#2563eb',
    100: '#ea580c',
    150: '#dc2626',
    200: '#9333ea',
    250: '#facc15',
    300: '#000000'
  };

  const html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>EVTE BETA - ${config.local}</title>
      <style>${css}</style>
    </head>
    <body onload="window.print()">
      <div class="sheet">
        <div class="viewport">
          ${mapImage ? `<img src="${mapImage}" class="map-img" />` : '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#ccc;">Mapa não disponível</div>'}
          
          <div class="north-arrow">
            <span>N</span>
            <svg viewBox="0 0 100 100">
              <path d="M50 0 L60 85 L50 75 L40 85 Z" fill="#000" />
            </svg>
          </div>

          <!-- Placeholder for Entroncamento Box if we had the data -->
          <div class="entroncamento-box">
             <div class="entroncamento-title">PONTO DE ENTRONCAMENTO</div>
             <div><strong>REDE:</strong> PVC DEFOFO DN 150mm</div>
             <div><strong>PRESSÃO MÍNIMA:</strong> 10 m.c.a</div>
             <div><strong>COORDENADAS:</strong> UTM 24S X=491983, Y=8185448</div>
          </div>
        </div>

        <div class="selo">
          <div class="selo-item selo-header">
            <img src="https://logodownload.org/wp-content/uploads/2014/10/embasa-logo.png" class="logo" onerror="this.style.display='none'" />
            <div class="titulo-principal">${config.titulo}</div>
          </div>

          <div class="selo-item">
            <div class="label">SAA</div>
            <div class="value">${config.saa}</div>
          </div>

          <div class="selo-item">
            <div class="label">EMPREENDIMENTO</div>
            <div class="value">${config.local}</div>
          </div>

          <div class="selo-item grid-2">
            <div>
              <div class="label">Setor</div>
              <div class="value">${config.setor}</div>
            </div>
            <div style="border-left: 1pt solid #000; padding-left: 2mm;">
              <div class="label">Folha Nº</div>
              <div class="value">${config.folha}</div>
            </div>
          </div>

          <div class="selo-item grid-2">
            <div>
              <div class="label">Escala</div>
              <div class="value">${config.escala}</div>
            </div>
            <div style="border-left: 1pt solid #000; padding-left: 2mm;">
              <div class="label">Data</div>
              <div class="value">${config.data}</div>
            </div>
          </div>

          <div class="legenda-title">LEGENDA</div>
          <div class="selo-item" style="padding: 0;">
             <div class="legenda-grid" style="border-bottom: 1pt solid #eee;">
                <div class="legenda-item"><div class="line" style="background: #2563eb; border-top: 1.5pt dashed #2563eb; height:0;"></div> REDE PROJETADA</div>
                <div class="legenda-item"><div class="line" style="background: #16a34a;"></div> REDE EXISTENTE</div>
             </div>
             <div class="legenda-grid">
                ${Object.keys(dnColors).map(dn => `
                  <div class="legenda-item">
                    <div class="line" style="background: ${dnColors[dn]};"></div> DN ${dn}
                  </div>
                `).join('')}
             </div>
             <div class="legenda-grid" style="border-top: 1pt solid #eee;">
                <div class="legenda-item"><div class="circle" style="border-color: #16a34a;"></div> COTA EMPREEND.</div>
                <div class="legenda-item"><div class="circle" style="border-color: #2563eb;"></div> COTA ENTRONC.</div>
             </div>
          </div>

          <div class="label" style="padding: 2mm 0 0 2mm;">OBS:</div>
          <div class="obs-box">${config.obs}</div>

          <div class="assinaturas">
            <div class="assinatura-line">
              <strong>${config.tecnico}</strong><br/>
              Téc. Operacional Edificações<br/>
              Mat. ${config.matricula}
            </div>
            <div class="assinatura-line">
              <strong>Responsável Técnico</strong><br/>
              Engenheiro Civil
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
