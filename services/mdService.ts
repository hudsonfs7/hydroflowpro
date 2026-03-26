
import { Node, PipeSegment, CalculationResult, MDConfig, CalcMethod, FlowUnit } from '../types';
import { convertFlowFromSI } from './calcService';

export const generateMD = (
  config: MDConfig,
  nodes: Node[],
  pipes: PipeSegment[],
  results: CalculationResult[],
  nodeResults: any[],
  calcMethod: CalcMethod,
  flowUnit: FlowUnit,
  globalC?: string,
  globalRoughness?: string
) => {
  const ResidentsCount = nodes.filter(n => n.type === 'demand').length * 2.8;

  const css = `
    @page { size: A4; margin: 3cm 2cm 2cm 3cm; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 12pt; 
      line-height: 1.5; 
      color: #000; 
      margin: 0; 
      padding: 0;
      text-align: justify;
    }
    .page { 
      page-break-after: always; 
      height: 24.7cm; /* Altura útil da página A4 descontando margens ABNT (29.7 - 3 - 2) */
      display: flex; 
      flex-direction: column; 
    }
    .center { text-align: center; }
    .uppercase { text-transform: uppercase; }
    .bold { font-weight: bold; }
    
    .header-info { margin-top: 0; margin-bottom: 2cm; }
    .main-title-box { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .main-title-box h1 { font-size: 16pt; margin: 0; letter-spacing: 1px; }
    .main-title-box h2 { font-size: 12pt; margin-top: 1cm; font-weight: normal; }
    
    .nature-container { 
      margin-top: 2cm; 
      margin-bottom: 2cm;
      display: flex; 
      justify-content: flex-end; 
    }
    .nature-text { 
      width: 50%; 
      font-size: 10pt; 
      line-height: 1.3; 
      text-align: justify;
    }

    .footer-info { 
      margin-top: auto; /* Empurra para o limite inferior da margem */
      padding-bottom: 0;
    }

    .toc h2 { text-align: center; margin-bottom: 2cm; font-size: 14pt; }
    .toc-item { display: flex; justify-content: space-between; margin-bottom: 0.4cm; font-weight: bold; border-bottom: 1px dotted #ccc; }
    .toc-item span:last-child { background: white; padding-left: 5px; }

    table { width: 100%; border-collapse: collapse; margin: 1cm 0; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 6px; text-align: center; }
    th { background-color: #f8fafc; font-weight: bold; }

    h1.section-title { font-size: 14pt; margin-top: 1.5cm; margin-bottom: 0.5cm; }
    p { margin-bottom: 0.5cm; text-indent: 1.5cm; }
  `;

  const cover = `
    <div class="page">
      <div class="header-info center bold uppercase">
        ${config.company}<br><br>
        <span style="font-weight: normal; font-size: 10pt;">PROJETISTA: ${config.engineer}</span>
      </div>
      
      <div class="main-title-box center bold uppercase">
        <h1>${config.title}</h1>
        <h2>${config.subtitle}</h2>
      </div>

      <div class="footer-info center bold uppercase">
        ${config.location}<br>
        ${config.year}
      </div>
    </div>
  `;

  const titlePage = `
    <div class="page">
      <div class="header-info center bold uppercase">
        PROJETISTA: ${config.engineer}<br>
        CREA: ${config.crea}
      </div>
      
      <div class="main-title-box center bold uppercase">
        <h1>${config.title}</h1>
        <h2>${config.subtitle}</h2>
      </div>

      <div class="nature-container">
        <div class="nature-text">
          Este memorial descritivo destaca os principais elementos do projeto de dimensionamento da rede de distribuição de água para o cliente ${config.client}, 
          abordando a demanda, cálculos hidráulicos e especificações técnicas de materiais para garantir que a infraestrutura atenda às necessidades do empreendimento.
        </div>
      </div>

      <div class="footer-info center bold uppercase">
        ${config.location}<br>
        ${config.year}
      </div>
    </div>
  `;

  const toc = `
    <div class="page toc">
      <h2 class="bold uppercase">Sumário</h2>
      <div class="toc-item"><span>1 VIABILIDADE</span><span>4</span></div>
      <div class="toc-item"><span>2 SOBRE O EMPREENDIMENTO</span><span>4</span></div>
      <div class="toc-item"><span>3 ESTUDO POPULACIONAL</span><span>5</span></div>
      <div class="toc-item"><span>4 MEMÓRIA DE CÁLCULO</span><span>6</span></div>
      <div class="toc-item"><span>5 PARÂMETROS BÁSICOS</span><span>7</span></div>
      <div class="toc-item"><span>6 RESULTADOS DO DIMENSIONAMENTO</span><span>8</span></div>
    </div>
  `;

  const content = `
    <div class="page-content">
      <h1 class="section-title bold uppercase">1 VIABILIDADE</h1>
      <p>O presente Projeto Executivo destina-se a implementar a Rede de Distribuição de Água (RDA) para o empreendimento ${config.company}. A concepção técnica visa garantir o pleno abastecimento com pressões dinâmicas superiores a 10 m.c.a em todos os pontos de consumo.</p>

      <h1 class="section-title bold uppercase">2 SOBRE O EMPREENDIMENTO</h1>
      <p>O empreendimento está situado em ${config.location}, composto por uma rede de ${pipes.length} trechos. A demanda foi dimensionada considerando o regime de fornecimento efetivo de 24 horas, ajustado para janelas operacionais conforme a necessidade do sistema.</p>

      <h1 class="section-title bold uppercase">3 ESTUDO POPULACIONAL</h1>
      <p>Para o cálculo das demandas, adotou-se uma taxa de ocupação de 2,8 habitantes por unidade habitacional. Com base nos nós de demanda identificados no projeto, estima-se uma população total de projeto equivalente a ${Math.round(ResidentsCount)} habitantes.</p>

      <h1 class="section-title bold uppercase">4 MEMÓRIA DE CÁLCULO</h1>
      <p>O dimensionamento hidráulico foi realizado utilizando o método de <strong>${calcMethod}</strong>. As perdas de carga localizadas foram computadas através do método dos coeficientes (K), integrando curvas de bombas (CMB) quando aplicável.</p>

      <h1 class="section-title bold uppercase">5 PARÂMETROS BÁSICOS</h1>
      <p>Utilizou-se para os cálculos os seguintes coeficientes globais: K1=1,2 e K2=1,5. O consumo per capita adotado foi de 120 L/hab.dia. A velocidade máxima permitida foi limitada a 2,5 m/s para evitar transientes hidráulicos e desgaste excessivo da tubulação.</p>
      ${(globalC || globalRoughness) ? `<p>Para o método de <strong>${calcMethod}</strong>, foi aplicado o coeficiente global de <strong>${calcMethod.toLowerCase().includes('darcy') ? globalRoughness : globalC}</strong> para trechos sem especificação individual.</p>` : ''}

      <h1 class="section-title bold uppercase">6 RESULTADOS DO DIMENSIONAMENTO</h1>
      <table>
        <thead>
          <tr>
            <th>Trecho</th>
            <th>Material</th>
            <th>Diâmetro (mm)</th>
            <th class="text-right">${calcMethod.toLowerCase().includes('darcy') ? 'Rug.' : 'C'}</th>
            <th>Extensão (m)</th>
            <th>Vazão (${flowUnit})</th>
            <th>Veloc. (m/s)</th>
            <th>Perda (m)</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => {
            const p = pipes.find(pipe => pipe.id === r.segmentId);
            const isDW = calcMethod.toLowerCase().includes('darcy');
            const coeff = isDW 
              ? (p?.customRoughness !== undefined ? p.customRoughness : (globalRoughness || 'Mat.'))
              : (p?.customC !== undefined ? p.customC : (globalC || 'Mat.'));

            return `
              <tr>
                <td class="bold">T${r.segmentId.replace(/\D/g, '')}</td>
                <td>${p?.materialId.split('-')[0].toUpperCase()}</td>
                <td>${p?.nominalDiameter}</td>
                <td>${coeff}</td>
                <td>${p?.length.toFixed(1)}</td>
                <td>${Math.abs(convertFlowFromSI(r.flowRate, flowUnit)).toFixed(3)}</td>
                <td>${r.velocity.toFixed(2)}</td>
                <td class="bold">${r.totalHeadLoss.toFixed(3)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>Memorial Descritivo ABNT - ${config.title}</title>
      <style>${css}</style>
    </head>
    <body>
      ${cover}
      ${titlePage}
      ${toc}
      <div class="page">
        ${content}
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
