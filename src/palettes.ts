export type RGB = [number, number, number];

export type Palette = {
  void: RGB;
  a: RGB;
  b: RGB;
  c: RGB;
  dust: RGB;
};

export const palettes: Palette[] = [
  {
    void: [0.03, 0.015, 0.07],
    a: [0.62, 0.22, 1.0],
    b: [0.0, 0.98, 0.92],
    c: [1.0, 0.28, 0.62],
    dust: [0.92, 0.82, 1.0],
  },
  {
    void: [0.06, 0.02, 0.01],
    a: [1.0, 0.38, 0.08],
    b: [1.0, 0.82, 0.28],
    c: [0.72, 0.08, 0.18],
    dust: [1.0, 0.9, 0.62],
  },
  {
    void: [0.01, 0.05, 0.045],
    a: [0.08, 1.0, 0.62],
    b: [0.22, 0.72, 1.0],
    c: [0.95, 1.0, 0.72],
    dust: [0.72, 1.0, 0.9],
  },
  {
    void: [0.07, 0.01, 0.05],
    a: [1.0, 0.22, 0.55],
    b: [0.55, 0.18, 1.0],
    c: [1.0, 0.72, 0.38],
    dust: [1.0, 0.78, 0.88],
  },
];

export function mixPalette(a: Palette, b: Palette, t: number): Palette {
  const m = (x: RGB, y: RGB): RGB => [
    x[0] + (y[0] - x[0]) * t,
    x[1] + (y[1] - x[1]) * t,
    x[2] + (y[2] - x[2]) * t,
  ];
  return {
    void: m(a.void, b.void),
    a: m(a.a, b.a),
    b: m(a.b, b.b),
    c: m(a.c, b.c),
    dust: m(a.dust, b.dust),
  };
}
