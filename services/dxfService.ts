import { Node, PipeSegment, CalculationResult, Material, FlowUnit, MapAnnotation } from '../types';
import { toUTM } from './geoUtils';
import { convertFlowFromSI } from './calcService';

/**
 * DXF Writer for AutoCAD Release 12 (AC1009) compatibility.
 * Optimized for professional hydraulic design and mapping.
 */
export class DxfWriter {
    private lines: string[] = [];

    add(code: number, value: string | number) {
        let safeValue = "";
        if (value === undefined || value === null) safeValue = "";
        else safeValue = value.toString();

        if ([10, 11, 20, 21, 30, 31, 40, 41, 42, 43, 50].includes(code)) {
            const num = parseFloat(safeValue);
            if (isNaN(num) || !isFinite(num)) safeValue = "0.0000";
            else safeValue = num.toFixed(4);
        }
        this.lines.push(code.toString());
        this.lines.push(safeValue);
    }

    sanitize(str: string): string {
        if (!str) return "";
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "") 
                  .replace(/[^\x20-\x7E]/g, "?");
    }

    header() {
        this.add(0, "SECTION");
        this.add(2, "HEADER");
        this.add(9, "$ACADVER");
        this.add(1, "AC1009");
        this.add(0, "ENDSEC");
    }

    tables(customLayers: {name: string, color: number}[] = []) {
        this.add(0, "SECTION");
        this.add(2, "TABLES");

        this.add(0, "TABLE");
        this.add(2, "LTYPE");
        this.add(70, 1);
        this.add(0, "LTYPE");
        this.add(2, "CONTINUOUS");
        this.add(70, 64);
        this.add(3, "Solid line");
        this.add(72, 65);
        this.add(73, 0);
        this.add(40, 0.0);
        this.add(0, "ENDTAB");

        this.add(0, "TABLE");
        this.add(2, "LAYER");
        const defaultLayers = [
            { name: "0", color: 7 },
            { name: "HF_TUBULACAO", color: 7 },
            { name: "HF_NOS", color: 1 },      
            { name: "HF_LABELS", color: 7 }    
        ];
        const allLayers = [...defaultLayers];
        customLayers.forEach(cl => {
            if (!allLayers.some(l => l.name === cl.name)) allLayers.push(cl);
        });
        this.add(70, allLayers.length);
        allLayers.forEach(l => {
            this.add(0, "LAYER");
            this.add(2, l.name);
            this.add(70, 64);
            this.add(62, l.color);
            this.add(6, "CONTINUOUS");
        });
        this.add(0, "ENDTAB");

        this.add(0, "TABLE");
        this.add(2, "STYLE");
        this.add(70, 1);
        this.add(0, "STYLE");
        this.add(2, "STANDARD");
        this.add(70, 64);
        this.add(40, 0.0);
        this.add(41, 1.0);
        this.add(50, 0.0);
        this.add(71, 0);
        this.add(42, 2.0);
        this.add(3, "txt"); 
        this.add(4, "");
        this.add(0, "ENDTAB");

        this.add(0, "ENDSEC");
    }

    beginEntities() {
        this.add(0, "SECTION");
        this.add(2, "ENTITIES");
    }

    endEntities() {
        this.add(0, "ENDSEC");
        this.add(0, "EOF");
    }

    line(x1: number, y1: number, x2: number, y2: number, layer: string, color?: number) {
        this.add(0, "LINE");
        this.add(8, layer);
        if (color !== undefined) this.add(62, color);
        this.add(10, x1);
        this.add(20, y1);
        this.add(30, 0.0);
        this.add(11, x2);
        this.add(21, y2);
        this.add(31, 0.0);
    }

    circle(x: number, y: number, radius: number, layer: string, color?: number) {
        this.add(0, "CIRCLE");
        this.add(8, layer);
        if (color !== undefined) this.add(62, color);
        this.add(10, x);
        this.add(20, y);
        this.add(30, 0.0);
        this.add(40, radius);
    }

    text(x: number, y: number, height: number, content: string, layer: string, rotation: number = 0, color?: number, align: "LEFT" | "CENTER" | "RIGHT" = "LEFT") {
        if (!content) return;
        this.add(0, "TEXT");
        this.add(8, layer);
        if (color !== undefined) this.add(62, color);
        this.add(10, x);
        this.add(20, y);
        this.add(30, 0.0);
        this.add(40, height);
        this.add(1, this.sanitize(content));
        this.add(50, rotation);
        if (align !== "LEFT") {
            this.add(72, align === "CENTER" ? 1 : 2);
            this.add(11, x);
            this.add(21, y);
            this.add(31, 0.0);
        }
    }

    toString() { return this.lines.join('\r\n') + '\r\n'; }
}

const getCoord = (node: any, isMapMode: boolean) => {
    if (isMapMode && node.geoPosition) {
        const utm = toUTM(node.geoPosition.lat, node.geoPosition.lng);
        return { x: utm.x, y: utm.y };
    }
    return { x: node.x, y: -node.y };
};

const getAngle = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return angle;
};

// Help map DN to AutoCAD Index colors
const getDxfColorForPipe = (dn: number): number => {
    switch (dn) {
        case 32: return 33; // Brownish
        case 50: 
        case 63: return 3;  // Green (Lime)
        case 75: 
        case 90: return 30; // Orange
        case 100: 
        case 110: return 4; // Cyan/Light Blue
        case 150: return 1; // Red
        case 200: return 6; // Magenta
        case 250: return 2; // Yellow
        case 300: return 211; // Pink
        default: return 8; // Gray
    }
};

export const generateDXF = (
    nodes: Node[], 
    pipes: PipeSegment[], 
    materials: Material[], 
    pipeResults: CalculationResult[] | undefined, 
    nodeResults: any[] | undefined,
    annotations: MapAnnotation[], 
    isMapMode: boolean,
    textHeight: number = 1.5,
    flowUnit: FlowUnit = 'l/s'
): string => {
    const writer = new DxfWriter();
    writer.header();
    writer.tables();
    writer.beginEntities();
    
    pipes.forEach(pipe => {
        const start = nodes.find(n => n.id === pipe.startNodeId);
        const end = nodes.find(n => n.id === pipe.endNodeId);
        if (!start || !end) return;
        
        const pts: {x: number, y: number}[] = [];
        pts.push(getCoord(start, isMapMode));
        if (pipe.vertices) pipe.vertices.forEach(v => pts.push(getCoord(v, isMapMode)));
        pts.push(getCoord(end, isMapMode));

        const pipeColor = getDxfColorForPipe(pipe.nominalDiameter || 0);

        for (let i = 0; i < pts.length - 1; i++) {
            writer.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 'HF_TUBULACAO', pipeColor);
        }

        let maxL = 0;
        let bestSeg = { p1: pts[0], p2: pts[1] };
        for(let i=0; i<pts.length-1; i++){
            const d = Math.sqrt(Math.pow(pts[i+1].x-pts[i].x, 2) + Math.pow(pts[i+1].y-pts[i].y, 2));
            if(d > maxL){ maxL = d; bestSeg = { p1: pts[i], p2: pts[i+1] }; }
        }

        const angle = getAngle(bestSeg.p1, bestSeg.p2);
        const rad = angle * Math.PI / 180;
        const mid = { x: (bestSeg.p1.x + bestSeg.p2.x)/2, y: (bestSeg.p1.y + bestSeg.p2.y)/2 };
        const perp = { x: -Math.sin(rad), y: Math.cos(rad) };
        
        const mat = materials.find(m => m.id === pipe.materialId);
        let shortMat = mat?.name || 'Mat';
        shortMat = shortMat.includes('/') ? shortMat.split('/').pop()?.split(' ')[0] || '' : shortMat.split(' ')[0];
        
        const result = pipeResults?.find(r => r.segmentId === pipe.id);
        const flowValSI = result ? result.flowRate : 0;
        // CORRECT CONVERSION: Fix zero flow issue
        const flowValConverted = convertFlowFromSI(flowValSI, flowUnit);
        const flowStr = `${Math.abs(flowValConverted).toFixed(2)} ${flowUnit}`;

        const line1 = `${pipe.name || pipe.id} - ${shortMat} - DN${pipe.nominalDiameter || pipe.diameter}`;
        writer.text(mid.x + perp.x * (textHeight * 0.8), mid.y + perp.y * (textHeight * 0.8), textHeight, line1, 'HF_LABELS', angle, 7, "CENTER");

        const line2 = `${flowStr} - ${pipe.length.toFixed(2)}m`;
        writer.text(mid.x - perp.x * (textHeight * 1.8), mid.y - perp.y * (textHeight * 1.8), textHeight, line2, 'HF_LABELS', angle, 7, "CENTER");
    });

    nodes.forEach(node => {
        const c = getCoord(node, isMapMode);
        const resList = Array.isArray(nodeResults) ? nodeResults : ((nodeResults as any) instanceof Map ? Array.from((nodeResults as any).values()) : []);
        const res = resList.find((r: any) => r.nodeId === node.id || r.id === node.id);

        writer.circle(c.x, c.y, textHeight * 0.4, 'HF_NOS', 1);

        // NODE LABELS: CP, P, CT
        writer.text(c.x + textHeight, c.y + textHeight * 1.5, textHeight, node.name || node.id, 'HF_LABELS', 0, 7);
        writer.text(c.x + textHeight, c.y + textHeight * 0.4, textHeight * 0.7, `CP= ${(res?.head || node.elevation).toFixed(2)}m`, 'HF_LABELS', 0, 8);
        writer.text(c.x + textHeight, c.y - textHeight * 0.5, textHeight * 0.7, `P= ${(res?.pressure || 0).toFixed(2)}mca`, 'HF_LABELS', 0, 3);
        writer.text(c.x + textHeight, c.y - textHeight * 1.4, textHeight * 0.7, `CT= ${node.elevation.toFixed(2)}m`, 'HF_LABELS', 0, 15); // Gray brownish
    });

    annotations.forEach(ann => {
        if (!ann.points || ann.points.length < 2) return;
        const pts = ann.points.map(p => {
            const u = toUTM(p.lat, p.lng);
            return { x: u.x, y: u.y };
        });
        let colorCode = 7;
        if (ann.color === '#3b82f6') colorCode = 5; 
        else if (ann.color === '#ef4444') colorCode = 1; 
        else if (ann.color === '#10b981') colorCode = 3; 

        for (let i = 0; i < pts.length - 1; i++) {
            writer.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, ann.layer || '0', colorCode);
        }
        if (ann.type === 'area' && pts.length > 2) {
            writer.line(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y, ann.layer || '0', colorCode);
        }
    });

    writer.endEntities();
    return writer.toString();
};