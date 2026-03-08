
import { Material, Fitting } from './types';

export const GRAVITY = 9.80665; // m/s^2

// Kinematic Viscosity of water at various temps (approx) - m^2/s
export const getViscosity = (tempC: number): number => {
  // Simple approximation curve for water
  return (1.78e-6 / (1 + 0.0337 * tempC + 0.000221 * (tempC ** 2)));
};

export const DEFAULT_MATERIALS: Material[] = [
  { 
    id: 'pvc-defofo-1.0', 
    name: 'PVC DEFOFO 1.0 MPa (NBR 7665)', 
    roughness: 0.0015, 
    hwCoefficient: 150, 
    availableDiameters: [
      { dn: 100, di: 108.4 },
      { dn: 150, di: 156.4 },
      { dn: 200, di: 204.2 },
      { dn: 250, di: 252 },
      { dn: 300, di: 299.8 },
      { dn: 350, di: 347.6 },
      { dn: 400, di: 394.6 },
      { dn: 500, di: 489.4 },
      { dn: 600, di: 584.2 },
    ]
  },
  { 
    id: 'pvc-defofo-1.6', 
    name: 'PVC DEFOFO 1.6 MPa (NBR 7665)', 
    roughness: 0.0015, 
    hwCoefficient: 150, 
    availableDiameters: [
      { dn: 100, di: 103.2 },
      { dn: 150, di: 148.6 },
      { dn: 200, di: 194.2 },
      { dn: 250, di: 239.6 },
      { dn: 300, di: 285.2 },
      { dn: 350, di: 330.6 },
      { dn: 400, di: 375.2 },
    ]
  },
  { 
    id: 'ff-saint-gobain', 
    name: 'Ferro Fundido (Padrão Saint Gobain)', 
    roughness: 0.03, // Cement lined usually smoother than old iron
    hwCoefficient: 140, 
    availableDiameters: [
      { dn: 80, di: 80 },
      { dn: 100, di: 100 },
      { dn: 150, di: 152 },
      { dn: 200, di: 203.4 },
      { dn: 250, di: 254.4 },
      { dn: 300, di: 305.6 },
      { dn: 350, di: 352.6 },
      { dn: 400, di: 402.8 },
      { dn: 450, di: 452.8 },
      { dn: 500, di: 504 },
      { dn: 600, di: 605.2 },
      { dn: 700, di: 697.2 },
      { dn: 800, di: 798.8 },
      { dn: 900, di: 899.4 },
      { dn: 1000, di: 1000 },
      { dn: 1200, di: 1202.2 },
    ]
  },
  { 
    id: 'pead-pn10', 
    name: 'PEAD PE100 PN10 SDR 17', 
    roughness: 0.0015, 
    hwCoefficient: 150, 
    availableDiameters: [
      { dn: 63, di: 55.4 }, // User note: DN and DE are same number for PEAD in this context
      { dn: 90, di: 79.2 },
      { dn: 110, di: 96.8 },
      { dn: 160, di: 141 },
      { dn: 200, di: 176.2 },
    ]
  },
  { 
    id: 'pvc-pba-12', 
    name: 'PVC/PBA Classe 12 0.6 MPa', 
    roughness: 0.0015, 
    hwCoefficient: 150, 
    availableDiameters: [
      { dn: 32, di: 35.2 }, // Re-ordered by size
      { dn: 50, di: 54.6 },
      { dn: 75, di: 77.2 },
      { dn: 100, di: 100 },
    ]
  },
];

export const COMMON_FITTINGS: Fitting[] = [
  { id: 'fit-1', name: 'Cotovelo 90° (Padrão)', k: 0.9, count: 0 },
  { id: 'fit-2', name: 'Cotovelo 45°', k: 0.4, count: 0 },
  { id: 'fit-3', name: 'Tê (Passagem direta)', k: 0.6, count: 0 },
  { id: 'fit-4', name: 'Tê (Saída lateral)', k: 1.8, count: 0 },
  { id: 'fit-5', name: 'Válvula de Gaveta (Aberta)', k: 0.2, count: 0 },
  { id: 'fit-6', name: 'Válvula Globo (Aberta)', k: 10.0, count: 0 },
];
