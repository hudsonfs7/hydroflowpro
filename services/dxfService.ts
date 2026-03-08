import { Node, PipeSegment, NodeResult, CalculationResult, UnitSystem, Material, FlowUnit, MapAnnotation } from '../types';
import { toUTM } from './geoUtils';

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
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
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

        // LTYPE
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

        // LAYER
        this.add(0, "TABLE");
        this.add(2, "LAYER");
        const defaultLayers = [
            { name: "0", color: 7 },
            { name: "HF_TUBOS", color: 5 },
            { name: "HF_NOS", color: 1 },
            { name: "HF_TEXTO", color: 7 }
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

        // STYLE
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

    // Modern Polyline (LWPOLYLINE) allows global width
    lwPolyline(points: {x: number, y: number}[], layer: string, width: number = 0, color?: number, closed: boolean = false) {
        if (points.length < 2) return;
        this.add(0, "LWPOLYLINE");
        this.add(8, layer);
        this.add(100, "AcDbEntity");
        this.add(100, "AcDbPolyline");
        if (color !== undefined) this.add(62, color);
        this.add(90, points.length); // Num vertices
        this.add(70, closed ? 1 : 0); // Flags (1 = closed)
        if (width > 0) this.add(43, width); // Constant width

        points.forEach(p => {
            this.add(10, p.x);
            this.add(20, p.y);
        });
    }

    text(x: number, y: number, height: number, content: string, layer: string, rotation: number = 0, color?: number) {
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
        this.add(72, 1); // Center alignment
        this.add(11, x);
        this.add(21, y);
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

export const generateDXF = (nodes: Node[], pipes: PipeSegment[], materials: Material[], nodeResults: NodeResult[] | undefined, pipeResults: CalculationResult[] | undefined, annotations: MapAnnotation[], isMapMode: boolean, unitSystem: UnitSystem, flowUnit: FlowUnit): string => {
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

        // Use LWPOLYLINE for connected pipes
        writer.lwPolyline(pts, 'HF_TUBOS', 0, 5); 
    });

    nodes.forEach(node => {
        const c = getCoord(node, isMapMode);
        // Cross marker
        writer.line(c.x-0.5, c.y, c.x+0.5, c.y, 'HF_NOS', 1);
        writer.line(c.x, c.y-0.5, c.x, c.y+0.5, 'HF_NOS', 1);
        // Text
        writer.text(c.x + 1, c.y + 1, 2.0, node.name, 'HF_TEXTO', 0, 7);
    });

    // Map Annotations
    annotations.forEach(ann => {
        if (!ann.points) return;
        const pts = ann.points.map(p => {
            const u = toUTM(p.lat, p.lng);
            return { x: u.x, y: u.y };
        });
        
        // Convert hex color to AutoCAD index color approximation
        // Simple mapping for demo
        let colorCode = 7;
        if (ann.color === '#3b82f6') colorCode = 5; // Blue
        else if (ann.color === '#ef4444') colorCode = 1; // Red
        else if (ann.color === '#10b981') colorCode = 3; // Green
        else if (ann.color === '#f59e0b') colorCode = 2; // Yellow

        if (ann.type === 'area') {
            writer.lwPolyline(pts, ann.layer || '0', 0, colorCode, true);
        } else if (ann.type === 'polyline' || ann.type === 'line') {
            writer.lwPolyline(pts, ann.layer || '0', 0, colorCode, false);
        }
    });

    writer.endEntities();
    return writer.toString();
};