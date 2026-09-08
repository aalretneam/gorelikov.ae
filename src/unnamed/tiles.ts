import { dprCap } from "../shared/gpu";

const VERT = `#version 300 es
in vec2 a_unit;
in vec4 a_pose;
in vec4 a_uv;
in vec4 a_var;
uniform vec2 u_res;
out vec2 v_uv;
out vec2 v_st;
out float v_shine;
out float v_chip;
void main() {
  float c = cos(a_pose.z);
  float s = sin(a_pose.z);
  vec2 p = a_unit * a_pose.w;
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  vec2 clip = vec2((a_pose.x + p.x) / u_res.x * 2.0 - 1.0, 1.0 - (a_pose.y + p.y) / u_res.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_unit;
  vec2 t = a_unit * 0.5 + 0.5;
  v_st = mix(a_uv.xy, a_uv.zw, t);
  v_shine = a_var.x;
  v_chip = a_var.y;
}
`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_hasTex;
in vec2 v_uv;
in vec2 v_st;
in float v_shine;
in float v_chip;
out vec4 frag;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 q = abs(v_uv);
  float r = 0.04 + v_chip * 0.05;
  vec2 b = q - vec2(1.0 - r);
  float sdf = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - r;
  sdf += (hash(v_st * 36.0) - 0.5) * 0.07 * v_chip;
  if (sdf > 0.055) discard;

  vec3 tex = texture(u_tex, v_st).rgb;
  tex *= 0.93 + 0.09 * hash(v_st * 88.0);
  tex *= 0.9 + 0.1 * (0.58 - v_uv.y * 0.42);

  vec3 mortar = vec3(0.058, 0.05, 0.044);
  float edge = 1.0 - smoothstep(-0.055, 0.018, sdf);
  vec3 col = mix(mortar, tex, edge * u_hasTex);

  float bevel = smoothstep(0.07, -0.015, sdf);
  col += bevel * 0.06 * v_shine;

  float lum = dot(tex, vec3(0.3, 0.52, 0.18));
  float warm = clamp(tex.r * 0.55 + tex.g * 0.42 - tex.b * 0.48, 0.0, 1.0);
  float gold = smoothstep(0.42, 0.72, lum) * smoothstep(0.12, 0.42, warm);
  float spec = pow(clamp(dot(normalize(vec3(v_uv, 0.82)), vec3(-0.22, -0.48, 0.82)), 0.0, 1.0), 26.0);
  col += spec * mix(0.05, 0.34, gold) * v_shine * u_hasTex;

  float rim = smoothstep(0.045, 0.0, abs(sdf + 0.018));
  col += rim * vec3(0.07, 0.065, 0.055) * 0.45;

  frag = vec4(col, smoothstep(0.05, -0.012, sdf));
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  }
  return sh;
}

export class Tiles {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private pose: WebGLBuffer;
  private uv: WebGLBuffer;
  private extra: WebGLBuffer;
  private uRes: WebGLUniformLocation | null;
  private uHas: WebGLUniformLocation | null;
  private tex: WebGLTexture;
  private hasTex = 0;
  readonly max: number;

  constructor(
    private canvas: HTMLCanvasElement,
    max: number,
  ) {
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("webgl2");
    this.gl = gl;
    this.max = max;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "link");
    }
    this.program = program;
    gl.useProgram(program);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aUnit = gl.getAttribLocation(program, "a_unit");
    gl.enableVertexAttribArray(aUnit);
    gl.vertexAttribPointer(aUnit, 2, gl.FLOAT, false, 0, 0);

    const pose = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, pose);
    gl.bufferData(gl.ARRAY_BUFFER, max * 16, gl.DYNAMIC_DRAW);
    const aPose = gl.getAttribLocation(program, "a_pose");
    gl.enableVertexAttribArray(aPose);
    gl.vertexAttribPointer(aPose, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aPose, 1);
    this.pose = pose;

    const uv = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.bufferData(gl.ARRAY_BUFFER, max * 16, gl.DYNAMIC_DRAW);
    const aUv = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aUv, 1);
    this.uv = uv;

    const extra = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, extra);
    gl.bufferData(gl.ARRAY_BUFFER, max * 16, gl.DYNAMIC_DRAW);
    const aVar = gl.getAttribLocation(program, "a_var");
    gl.enableVertexAttribArray(aVar);
    gl.vertexAttribPointer(aVar, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aVar, 1);
    this.extra = extra;

    this.vao = vao;
    this.uRes = gl.getUniformLocation(program, "u_res");
    this.uHas = gl.getUniformLocation(program, "u_hasTex");
    gl.uniform1i(gl.getUniformLocation(program, "u_tex"), 0);

    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([18, 16, 14, 255]));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setTexture(img: HTMLImageElement | null) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (!img) {
      this.hasTex = 0;
      return;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.hasTex = 1;
  }

  resize(w: number, h: number) {
    const dpr = dprCap(2, 1.25);
    const cw = Math.max(1, Math.floor(w * dpr));
    const ch = Math.max(1, Math.floor(h * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.gl.viewport(0, 0, cw, ch);
    }
    return dpr;
  }

  draw(pose: Float32Array, uv: Float32Array, extra: Float32Array, count: number) {
    const gl = this.gl;
    const n = Math.max(0, Math.min(this.max, count | 0));
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uHas, this.hasTex);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pose);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pose.subarray(0, n * 4));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uv);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, uv.subarray(0, n * 4));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.extra);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, extra.subarray(0, n * 4));
    gl.clearColor(0.038, 0.034, 0.032, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (n) gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  }
}
