const VERT = `#version 300 es
in vec2 a_unit;
in vec4 a_pose;
in vec4 a_col;
uniform vec2 u_res;
out vec2 v_uv;
out vec3 v_col;
out float v_shine;
void main() {
  float c = cos(a_pose.z);
  float s = sin(a_pose.z);
  vec2 p = a_unit * a_pose.w;
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  vec2 clip = vec2((a_pose.x + p.x) / u_res.x * 2.0 - 1.0, 1.0 - (a_pose.y + p.y) / u_res.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_unit;
  v_col = a_col.rgb;
  v_shine = a_col.a;
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_col;
in float v_shine;
out vec4 frag;
void main() {
  vec2 q = abs(v_uv);
  float r = 0.16;
  vec2 b = q - vec2(1.0 - r);
  float sdf = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - r;
  if (sdf > 0.04) discard;
  float edge = 1.0 - smoothstep(-0.1, 0.02, sdf);
  vec3 grout = vec3(0.045, 0.04, 0.048);
  vec3 col = mix(grout, v_col, edge);
  float hl = pow(clamp(1.0 - length(v_uv - vec2(-0.32, -0.4)) * 1.35, 0.0, 1.0), 1.6);
  col += hl * 0.28 * v_shine;
  float rim = smoothstep(0.07, 0.0, abs(sdf + 0.025));
  col += rim * vec3(0.16, 0.18, 0.2) * v_shine;
  col *= 0.72 + 0.28 * (0.55 - v_uv.y * 0.45);
  float glass = pow(clamp(dot(normalize(vec3(v_uv, 0.8)), vec3(-0.2, -0.45, 0.85)), 0.0, 1.0), 28.0);
  col += glass * 0.22;
  frag = vec4(col, smoothstep(0.04, -0.01, sdf));
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
  private col: WebGLBuffer;
  private uRes: WebGLUniformLocation | null;
  count: number;

  constructor(
    private canvas: HTMLCanvasElement,
    count: number,
  ) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("webgl2");
    this.gl = gl;
    this.count = count;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "link");
    }
    this.program = program;

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
    gl.bufferData(gl.ARRAY_BUFFER, count * 16, gl.DYNAMIC_DRAW);
    const aPose = gl.getAttribLocation(program, "a_pose");
    gl.enableVertexAttribArray(aPose);
    gl.vertexAttribPointer(aPose, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aPose, 1);
    this.pose = pose;

    const col = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, col);
    gl.bufferData(gl.ARRAY_BUFFER, count * 16, gl.DYNAMIC_DRAW);
    const aCol = gl.getAttribLocation(program, "a_col");
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aCol, 1);
    this.col = col;

    this.vao = vao;
    this.uRes = gl.getUniformLocation(program, "u_res");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.floor(w * dpr));
    const ch = Math.max(1, Math.floor(h * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.gl.viewport(0, 0, cw, ch);
    }
    return dpr;
  }

  draw(pose: Float32Array, color: Float32Array) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pose);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pose);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.col);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, color);
    gl.clearColor(0.035, 0.032, 0.038, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count);
  }
}
