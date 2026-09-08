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
uniform float u_cam;
uniform float u_state;
uniform float u_density;
uniform float u_entropy;
uniform float u_coherence;
uniform float u_brightness;
uniform float u_distortion;
uniform float u_impulse;
uniform float u_freeze;
uniform float u_complexity;
uniform float u_seed;
uniform float u_force;

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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  uv *= u_cam;

  float t = mix(u_time, floor(u_time * 8.0) / 8.0, u_freeze) * 0.1;
  t += u_seed * 12.0;

  vec2 m = u_mouse;
  float dMouse = length(uv - m);
  float d0 = length(uv);

  vec2 warp = vec2(fbm(uv * 1.6 + t), fbm(uv * 1.6 - t + 9.1));
  warp = (warp * 2.0 - 1.0) * (0.08 + u_distortion * 0.28 + u_entropy * 0.18);
  warp += (m - uv) * exp(-dMouse * 3.8) * u_force;

  vec2 p = uv + warp;

  float n1 = fbm(p * (1.8 + u_complexity) + t * 0.6);
  float n2 = fbm(p * 3.1 - t * 0.4 + n1 * 1.4);
  float veins = pow(1.0 - abs(n2 * 2.0 - 1.0), 2.6);

  float core = exp(-d0 * mix(7.5, 2.2, u_brightness));
  float pulse = 0.55 + 0.45 * sin(u_time * mix(0.8, 0.12, u_freeze));
  core *= 0.35 + pulse * 0.25 + u_impulse * 0.5;

  float rings = 0.0;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    float r = 0.09 * fi + 0.02 * sin(t * 1.4 + fi + u_seed * 6.0);
    rings += smoothstep(0.012, 0.0, abs(d0 - r)) * (0.18 / fi);
  }

  float spark = step(0.992 - u_density * 0.02, hash(floor(gl_FragCoord.xy * 0.45) + floor(u_time * 2.0)));
  spark *= 0.45;

  float creation = smoothstep(3.4, 4.2, u_state);
  float form = n2 * 0.55 + veins * (0.35 + creation * 0.5) + core + rings;

  vec3 voidc = vec3(0.02, 0.02, 0.027);
  vec3 violet = vec3(0.545, 0.361, 1.0);
  vec3 cyan = vec3(0.333, 0.839, 1.0);
  vec3 lilac = vec3(0.776, 0.655, 1.0);

  vec3 col = voidc;
  col = mix(col, violet * 0.55, smoothstep(0.2, 0.75, n1) * (0.35 + u_brightness * 0.5));
  col = mix(col, cyan * 0.4, veins * (0.25 + creation * 0.45));
  col += violet * core * 1.4;
  col += cyan * rings * 0.8;
  col += lilac * spark;
  col += cyan * u_impulse * exp(-dMouse * 2.2) * 0.35;
  col *= 0.55 + u_coherence * 0.5;
  col += form * 0.04;

  float ca = 0.012 * creation * (0.4 + u_entropy);
  col.r += veins * ca;
  col.b += n1 * ca;

  float vig = pow(clamp(1.0 - dot(uv * 0.85, uv * 0.85), 0.0, 1.0), 1.35);
  col *= mix(0.42, 1.0, vig);

  float grain = (hash(gl_FragCoord.xy + fract(u_time * 11.0)) - 0.5) * 0.045;
  col += grain;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.12);
  col = pow(max(col, 0.0), vec3(0.9));
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
    const log = gl.getShaderInfoLog(shader) ?? "compile";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export class MachineField {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
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
      throw new Error(gl.getProgramInfoLog(program) ?? "link");
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
    for (const name of [
      "u_res",
      "u_time",
      "u_mouse",
      "u_cam",
      "u_state",
      "u_density",
      "u_entropy",
      "u_coherence",
      "u_brightness",
      "u_distortion",
      "u_impulse",
      "u_freeze",
      "u_complexity",
      "u_seed",
      "u_force",
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  draw(p: {
    time: number;
    mouse: [number, number];
    cam: number;
    state: number;
    density: number;
    entropy: number;
    coherence: number;
    brightness: number;
    distortion: number;
    impulse: number;
    freeze: number;
    complexity: number;
    seed: number;
    force: number;
  }) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform2f(this.uniforms.u_res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.u_time, p.time);
    gl.uniform2f(this.uniforms.u_mouse, p.mouse[0], p.mouse[1]);
    gl.uniform1f(this.uniforms.u_cam, p.cam);
    gl.uniform1f(this.uniforms.u_state, p.state);
    gl.uniform1f(this.uniforms.u_density, p.density);
    gl.uniform1f(this.uniforms.u_entropy, p.entropy);
    gl.uniform1f(this.uniforms.u_coherence, p.coherence);
    gl.uniform1f(this.uniforms.u_brightness, p.brightness);
    gl.uniform1f(this.uniforms.u_distortion, p.distortion);
    gl.uniform1f(this.uniforms.u_impulse, p.impulse);
    gl.uniform1f(this.uniforms.u_freeze, p.freeze);
    gl.uniform1f(this.uniforms.u_complexity, p.complexity);
    gl.uniform1f(this.uniforms.u_seed, p.seed);
    gl.uniform1f(this.uniforms.u_force, p.force);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
