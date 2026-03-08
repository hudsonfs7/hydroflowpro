
export enum UnitSystem {
  SI = 'SI (Métrico)',
  IMPERIAL = 'Imperial'
}

export type FlowUnit = 'm3/h' | 'l/s' | 'gpm';

export enum CalcMethod {
  HAZEN_WILLIAMS = 'Hazen-Williams',
  DARCY_WEISBACH = 'Darcy-Weisbach'
}

export enum FrictionMethod {
  COLEBROOK_WHITE = 'Colebrook-White (Implícito)',
  SWAMEE_JAIN = 'Swamee-Jain (Explícito)'
}

export type MapStyle = 'satellite' | 'street' | 'none';
export type CoordinateFormat = 'decimal' | 'utm';
export type LabelPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export enum SolverType {
    RELAXATION = 'Relaxation (Iterativo)',
    GGA = 'GGA (Matricial)'
}

export interface VisualizationSettings {
  mode: 'fixed' | 'adaptive';
  baseScale: number;
  adaptiveStrength: number;
}

// --- AUTH TYPES ---
export interface Organization {
    id: string;
    name: string; // Razão Social / Nome Legal
    fantasyName?: string; // Nome Fantasia
    cnpj?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    createdAt?: any;
}

export interface User {
    id: string;
    username: string;
    organizationId: string;
    role: 'admin' | 'user' | 'master';
    password?: string;
}

// --- PROPOSAL & BUDGET ---
export type ProposalStatus = 'pending' | 'rejected' | 'accepted';
export type ProposalCategory = 'subdivision' | 'service'; // New Category

export interface PaymentStage {
    id: string;
    description: string;
    percentage: number;
}

export interface Proposal {
    id: string;
    number: string; // Ex: 01/2026
    revision?: number; // Revision number (0, 1, 2...)
    category: ProposalCategory; // New field
    status: ProposalStatus;
    generatedBy: string;
    createdAt: string;
    projectType: 'water' | 'sewage' | 'both';
    waterRate: number;
    sewageRate: number;
    evtePrice: number;
    hasEvte: boolean;
    hasBooster: boolean;
    boosterPrice: number;
    boosterQty?: number;
    hasLiftStation: boolean;
    liftStationPrice: number;
    liftStationQty?: number;
    evteQty?: number;
    extraItems: BudgetItem[];
    validityDays: number;
    paymentStages: PaymentStage[];
    totalValue: number;
    paymentInstallments?: string; // For accepted proposals
}

export interface ProjectMetadata {
  _id?: string;
  organizationId?: string;
  createdBy?: string;
  name: string;
  company: string;
  companyCnpj?: string;
  consultant?: string;
  city: string;
  
  lotsHab: number;
  lotsCom: number;
  lotsInst: number;
  habDomRate: number;
  perCapita: number;
  
  consumptionCom?: number;
  consumptionInst?: number;
  attendanceRate?: number;

  supplyHours?: number;
  useK1?: boolean;
  useK2?: boolean;

  eventNumber: string; 
  
  hasEvte?: boolean;
  evteNumber?: string;
  evteDate?: string;
  hasConstraints?: boolean;
  constraintsText?: string;

  proposals?: Proposal[];
  acceptedProposalId?: string;
}

export interface PipeDiameterDefinition {
  dn: number;
  di: number;
  label?: string;
}

export interface Material {
  id: string;
  name: string;
  roughness: number;
  hwCoefficient: number;
  availableDiameters: PipeDiameterDefinition[];
}

export interface GeoPosition {
  lat: number;
  lng: number;
}

export type NodeType = 'source' | 'demand' | 'well' | 'pump';

export interface PumpCurvePoint {
  flow: number;
  head: number;
}

export interface PumpConfig {
  curveType: '1-point' | '3-point';
  designFlow?: number;
  designHead?: number;
  shutoffHead?: number;
  maxFlow?: number;
  efficiency?: number;
  motorPower?: number;
  speed?: number;
  enabled: boolean;
}

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  geoPosition: GeoPosition;
  elevation: number;
  autoElevation: boolean;
  pressureHead?: number;
  name: string;
  baseDemand?: number;
  showFlowLabel?: boolean; 
  labelPosition?: LabelPosition;
  
  wellDepth?: number;
  wellDiameter?: number;
  staticLevel?: number;
  dynamicLevel?: number;
  testFlow?: number;
  recoveryRate?: number;
  maxFlow?: number;
  maxOpTime?: number;
  minSubmergence?: number;
  safetyMargin?: number;
  pumpNMO?: number;
  pumpFlow?: number;
  pumpDepth?: number;
  pumpDiameter?: number;
  pumpHead?: number;
  pumpEfficiency?: number;
  pumpRoughnessC?: number;
  wellFittings?: Fitting[];
  pumpCurve?: PumpCurvePoint[];
  cmbConfig?: PumpConfig;
}

export interface Fitting {
  id: string;
  name: string;
  k: number;
  count: number;
}

export interface Vertex {
  x: number;
  y: number;
  geoPosition: GeoPosition;
}

export interface DemandCalculatorParams {
  connections: number;
  habPerConn: number;
  perCapita: number;
  kFactor: number;
  singularDemand: number;
  supplyHours: number;
}

export interface DemandGroup {
  id: string;
  name: string;
  totalFlow: number;
  pipeIds: string[];
  color?: string;
  calculatorParams?: DemandCalculatorParams;
}

export interface PipeSegment {
  type: 'pipe';
  id: string;
  startNodeId: string;
  endNodeId: string;
  length: number;
  diameter: number;
  nominalDiameter: number;
  materialId: string;
  flowRate: number;
  distributedDemand?: number;
  fittings: Fitting[];
  customC?: number;
  customRoughness?: number;
  useCustomLength?: boolean;
  vertices: Vertex[];
}

export interface AnnotationGroup {
    id: string;
    name: string;
    opacity: number;
    locked: boolean;
    visible: boolean;
}

export type AnnotationType = 'area' | 'text' | 'polyline' | 'line';
export type LabelMode = 'fixed' | 'aligned';

export interface MapAnnotation {
    id: string;
    groupId: string; 
    type: AnnotationType;
    points?: GeoPosition[];
    position?: GeoPosition;
    content: string;
    color: string;
    hatch: boolean;
    layer?: string; 
    strokeWidth?: number;
    dashArray?: string;
    labelMode?: LabelMode;
    opacity?: number; 
}

export interface MDConfig {
  title: string;
  subtitle: string;
  client: string;
  engineer: string;
  crea: string;
  location: string;
  year: string;
  company: string;
}

// --- CONTRACT TYPES ---
export interface ContractClause {
    id: string;
    title: string;
    text: string;
}

export interface ContractData {
    title: string;
    header: string;
    clauses: ContractClause[];
    footer: string;
    city: string;
    date: string;
    companyName: string;
    clientName: string;
}

// --- BUDGET TYPES ---
export interface BudgetItem {
    id: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isAuto?: boolean;
}

export interface BudgetData {
    companyName: string; 
    clientName: string;  
    projectName: string;
    city: string;
    date: string;
    totalLots: number;
    items: BudgetItem[];
    totalValue: number;
    validityDays: number;
    paymentStages: PaymentStage[];
    proposalNumber?: string;
    revision?: number;
    generatedBy?: string;
    organization?: Organization;
    category?: ProposalCategory; // Added to distinguish print layout
}

export interface CalculationResult {
  segmentId: string;
  flowRate: number;
  velocity: number;
  reynolds: number;
  frictionFactor: number;
  headLossFriction: number;
  headLossSingular: number;
  totalHeadLoss: number;
  pressureDrop: number;
  unitHeadLoss: number;
  energyLoss: number;
  regime: 'Laminar' | 'Transitional' | 'Turbulent';
  methodUsed: string;
  warnings: string[];
  roughnessUsed: number;
}

export interface NodeResult {
  nodeId: string;
  head: number;
  pressure: number;
}
