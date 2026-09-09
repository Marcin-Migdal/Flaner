export type BambuColor = {
  name: string;
  hex: string;
};

export type BambuType = {
  name: string;
  colors: BambuColor[];
};

export type BambuMaterial = {
  name: string;
  types: BambuType[];
};

export const bambuFilaments: BambuMaterial[] = [
  {
    name: 'PLA',
    types: [
      {
        name: 'Basic',
        colors: [
          { name: 'Black', hex: '#111111' },
          { name: 'Jade White', hex: '#f9f6f0' },
          { name: 'Red', hex: '#d32f2f' },
          { name: 'Blue', hex: '#1976d2' },
          { name: 'Green', hex: '#388e3c' },
          { name: 'Yellow', hex: '#fbc02d' },
          { name: 'Orange', hex: '#f57c00' },
          { name: 'Pink', hex: '#e91e63' },
          { name: 'Purple', hex: '#7b1fa2' },
          { name: 'Grey', hex: '#616161' },
          { name: 'Silver', hex: '#b0bec5' },
          { name: 'Gold', hex: '#ffd700' },
          { name: 'Bronze', hex: '#cd7f32' }
        ]
      },
      {
        name: 'Matte',
        colors: [
          { name: 'Charcoal', hex: '#212121' },
          { name: 'Desert White', hex: '#ede6d6' },
          { name: 'Sakura Pink', hex: '#fbcfe8' },
          { name: 'Lilac Purple', hex: '#d8b4fe' },
          { name: 'Marine Blue', hex: '#1e3a8a' },
          { name: 'Grass Green', hex: '#4ade80' },
          { name: 'Ash Grey', hex: '#94a3b8' },
          { name: 'Ivory White', hex: '#fffff0' },
          { name: 'Latte Brown', hex: '#c6a07b' }
        ]
      },
      {
        name: 'Silk',
        colors: [
          { name: 'Silk Gold', hex: '#e5c158' },
          { name: 'Silk Silver', hex: '#d1d5db' },
          { name: 'Silk Bronze', hex: '#a77044' },
          { name: 'Silk Red', hex: '#ef4444' },
          { name: 'Silk Blue', hex: '#3b82f6' },
          { name: 'Silk Green', hex: '#10b981' }
        ]
      },
      {
        name: 'Sparkle',
        colors: [
          { name: 'Sparkle Black', hex: '#1e293b' },
          { name: 'Sparkle Red', hex: '#991b1b' },
          { name: 'Sparkle Blue', hex: '#1e3a8a' }
        ]
      },
      {
        name: 'Glow',
        colors: [
          { name: 'Glow Green', hex: '#86efac' },
          { name: 'Glow Blue', hex: '#93c5fd' }
        ]
      },
      {
        name: 'CF (Carbon Fiber)',
        colors: [
          { name: 'PLA-CF Black', hex: '#0f172a' },
          { name: 'PLA-CF Grey', hex: '#475569' }
        ]
      }
    ]
  },
  {
    name: 'PETG',
    types: [
      {
        name: 'Basic',
        colors: [
          { name: 'Black', hex: '#09090b' },
          { name: 'White', hex: '#fafafa' },
          { name: 'Red', hex: '#dc2626' },
          { name: 'Blue', hex: '#2563eb' },
          { name: 'Green', hex: '#16a34a' },
          { name: 'Grey', hex: '#4b5563' },
          { name: 'Translucent Clear', hex: '#e2e8f0' }
        ]
      },
      {
        name: 'CF (Carbon Fiber)',
        colors: [
          { name: 'PETG-CF Black', hex: '#18181b' },
          { name: 'PETG-CF Dark Grey', hex: '#3f3f46' }
        ]
      }
    ]
  },
  {
    name: 'ABS',
    types: [
      {
        name: 'Basic',
        colors: [
          { name: 'Black', hex: '#020617' },
          { name: 'White', hex: '#f8fafc' },
          { name: 'Red', hex: '#e11d48' },
          { name: 'Blue', hex: '#1d4ed8' },
          { name: 'Grey', hex: '#64748b' }
        ]
      }
    ]
  },
  {
    name: 'ASA',
    types: [
      {
        name: 'Basic',
        colors: [
          { name: 'Black', hex: '#090d16' },
          { name: 'White', hex: '#fdfdfd' },
          { name: 'Grey', hex: '#71717a' },
          { name: 'Orange', hex: '#ea580c' }
        ]
      }
    ]
  },
  {
    name: 'TPU',
    types: [
      {
        name: '95A',
        colors: [
          { name: 'Black', hex: '#0a0f1d' },
          { name: 'White', hex: '#f8fafc' },
          { name: 'Red', hex: '#ef4444' },
          { name: 'Blue', hex: '#3b82f6' },
          { name: 'Neon Yellow', hex: '#d9f99d' }
        ]
      }
    ]
  }
];
