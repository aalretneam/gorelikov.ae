const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_core;
uniform float u_click;
uniform float u_hold;
uniform float u_idle;
uniform float u_energy;
uniform float u_presence;
uniform float u_zoom;
uniform vec3 u_void;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = m * p * 2.03;
    a *= 0.5;
  }
  return v;
}

float ridged(vec2 p) {
  return 1.0 - abs(fbm(p) * 2.0 - 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  uv *= u_zoom;

  vec2 m = u_mouse;
  vec2 core = u_core;
  float t = u_time * 0.12;

  float dMouse = length(uv - m);
  float dCore = length(uv - core);

  vec2 warp = vec2(
    fbm(uv * 1.4 + t),
    fbm(uv * 1.4 - t + 17.2)
  );
  warp = (warp * 2.0 - 1.0) * (0.22 + u_energy * 0.18 + u_hold * 0.2);

  vec2 p = uv + warp;
  p += (m - uv) * exp(-dMouse * 2.1) * (0.55 + u_hold * 1.35);

  float k = mix(0.0, 0.62, smoothstep(5.0, 22.0, u_idle));
  if (k > 0.001) {
    vec2 q = p - core;
    float ang = atan(q.y, q.x);
    float folds = 6.0;
    ang = abs(mod(ang, 6.283185 / folds) - 3.141592 / folds);
    p = core + vec2(cos(ang), sin(ang)) * length(q);
    p = mix(uv + warp, p, k);
  }

  float n1 = fbm(p * 2.05 + t * 0.7);
  float n2 = fbm(p * 3.4 - vec2(t * 0.4, -t * 0.55) + n1 * 2.1);
  float veins = pow(ridged(p * 2.6 + n2 * 1.6 + t * 0.25), 2.4);
  float sheen = pow(max(n2, 0.0), 3.4);

  float pulse = 0.5 + 0.5 * sin(u_time * 0.7);
  float glow = exp(-dCore * mix(2.5, 1.1, u_hold)) * (0.42 + pulse * 0.22 + u_hold * 0.75);
  float halo = exp(-dMouse * 3.1) * (0.32 + u_energy * 0.7);

  float ripple = 0.0;
  if (u_click < 3.6) {
    float rd = length(uv - m);
    ripple = sin(rd * 28.0 - u_click * 9.0) * exp(-rd * 2.6) * exp(-u_click * 0.8) * 0.85;
  }

  vec3 col = u_void * 1.35;
  col = mix(col, u_a, smoothstep(0.12, 0.68, n1));
  col = mix(col, u_b, smoothstep(0.28, 0.88, n2) * 0.85);
  col = mix(col, u_c, veins * 0.95 + max(ripple, 0.0) * 0.8);
  col += u_c * glow * 1.35;
  col += u_b * halo * 1.1;
  col += u_a * sheen * 0.45;
  col += vec3(0.08, 0.06, 0.1) * n1;

  float age = smoothstep(0.0, 80.0, u_presence);
  col += u_a * age * 0.08;

  float vig = 1.0 - dot(uv * 0.62, uv * 0.62);
  vig = pow(clamp(vig, 0.0, 1.0), 1.15);
  col *= mix(0.62, 1.0, vig);

  float grain = (hash(gl_FragCoord.xy + fract(u_time * 13.7)) - 0.5) * 0.06;
  col += grain;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.28);
  col = pow(max(col, 0.0), vec3(0.86));
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "compile error";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export class Field {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private uniforms: Record<string, WebGLUniformLocation | null>;
  private canvas: HTMLCanvasElement;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL is not available");
    this.canvas = canvas;
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!program) throw new Error("program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "a_pos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "link error");
    }
    gl.useProgram(program);
    this.program = program;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.buffer = buffer;

    const names = [
      "u_res",
      "u_time",
      "u_mouse",
      "u_core",
      "u_click",
      "u_hold",
      "u_idle",
      "u_energy",
      "u_presence",
      "u_zoom",
      "u_void",
      "u_a",
      "u_b",
      "u_c",
    ];
    this.uniforms = {};
    for (const name of names) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  resize(width: number, height: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const w = Math.max(1, Math.floor(width * this.dpr));
    const h = Math.max(1, Math.floor(height * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  draw(params: {
    time: number;
    mouse: [number, number];
    core: [number, number];
    click: number;
    hold: number;
    idle: number;
    energy: number;
    presence: number;
    zoom: number;
    void: [number, number, number];
    a: [number, number, number];
    b: [number, number, number];
    c: [number, number, number];
  }) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform2f(this.uniforms.u_res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.u_time, params.time);
    gl.uniform2f(this.uniforms.u_mouse, params.mouse[0], params.mouse[1]);
    gl.uniform2f(this.uniforms.u_core, params.core[0], params.core[1]);
    gl.uniform1f(this.uniforms.u_click, params.click);
    gl.uniform1f(this.uniforms.u_hold, params.hold);
    gl.uniform1f(this.uniforms.u_idle, params.idle);
    gl.uniform1f(this.uniforms.u_energy, params.energy);
    gl.uniform1f(this.uniforms.u_presence, params.presence);
    gl.uniform1f(this.uniforms.u_zoom, params.zoom);
    gl.uniform3f(this.uniforms.u_void, ...params.void);
    gl.uniform3f(this.uniforms.u_a, ...params.a);
    gl.uniform3f(this.uniforms.u_b, ...params.b);
    gl.uniform3f(this.uniforms.u_c, ...params.c);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
