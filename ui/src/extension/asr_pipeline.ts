// Genuine AMD FSR 1.0 2-Pass Luma & RGB Upscaling & Detail Reconstruction (ASR)
// Pass 1: EASU 12-Tap Directional Lanczos Edge Reconstruction with Strict Anti-Ringing Clamp
// Pass 2: RCAS Contrast-Adaptive Sharpening with Local 5-Tap Neighborhood Clamping

const VS_EASU = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const VS_RCAS = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS_EASU = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_srcTex;
uniform vec2 u_srcSize;
uniform vec2 u_outSize;

float getLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void accumulateTap(inout vec3 aC, inout float aW, vec2 offset, vec2 dir, vec2 len2, float lob, float clp, vec3 c) {
    float vx = offset.x * dir.x + offset.y * dir.y;
    float vy = -offset.x * dir.y + offset.y * dir.x;
    float sx = vx * len2.x;
    float sy = vy * len2.y;
    float d2 = min(sx * sx + sy * sy, clp);
    float wB = d2 * 0.40 - 1.0;
    float wA = d2 * lob - 1.0;
    float w = max(0.0, (wB * wB * 1.5625 - 0.5625)) * (wA * wA);
    aC += c * w;
    aW += w;
}

void main() {
    vec2 invSrc = 1.0 / max(u_srcSize, vec2(1.0));
    vec2 pp = v_uv * u_srcSize - 0.5;
    vec2 fp = floor(pp);
    vec2 f = pp - fp;
    vec2 baseUV = (fp + 0.5) * invSrc;

    vec3 cB = texture(u_srcTex, baseUV + vec2( 0.0, -1.0) * invSrc).rgb;
    vec3 cC = texture(u_srcTex, baseUV + vec2( 1.0, -1.0) * invSrc).rgb;
    vec3 cE = texture(u_srcTex, baseUV + vec2(-1.0,  0.0) * invSrc).rgb;
    vec3 cF = texture(u_srcTex, baseUV + vec2( 0.0,  0.0) * invSrc).rgb;
    vec3 cG = texture(u_srcTex, baseUV + vec2( 1.0,  0.0) * invSrc).rgb;
    vec3 cH = texture(u_srcTex, baseUV + vec2( 2.0,  0.0) * invSrc).rgb;
    vec3 cI = texture(u_srcTex, baseUV + vec2(-1.0,  1.0) * invSrc).rgb;
    vec3 cJ = texture(u_srcTex, baseUV + vec2( 0.0,  1.0) * invSrc).rgb;
    vec3 cK = texture(u_srcTex, baseUV + vec2( 1.0,  1.0) * invSrc).rgb;
    vec3 cL = texture(u_srcTex, baseUV + vec2( 2.0,  1.0) * invSrc).rgb;
    vec3 cN = texture(u_srcTex, baseUV + vec2( 0.0,  2.0) * invSrc).rgb;
    vec3 cO = texture(u_srcTex, baseUV + vec2( 1.0,  2.0) * invSrc).rgb;

    float sB = getLuma(cB); float sC = getLuma(cC);
    float sE = getLuma(cE); float sF = getLuma(cF); float sG = getLuma(cG); float sH = getLuma(cH);
    float sI = getLuma(cI); float sJ = getLuma(cJ); float sK = getLuma(cK); float sL = getLuma(cL);
    float sN = getLuma(cN); float sO = getLuma(cO);

    vec2 d0 = vec2(sG - sE, sJ - sB);
    vec2 d1 = vec2(sH - sF, sK - sC);
    vec2 d2 = vec2(sK - sI, sN - sF);
    vec2 d3 = vec2(sL - sJ, sO - sG);

    float w0 = (1.0 - f.x) * (1.0 - f.y);
    float w1 = f.x * (1.0 - f.y);
    float w2 = (1.0 - f.x) * f.y;
    float w3 = f.x * f.y;

    vec2 dir = d0 * w0 + d1 * w1 + d2 * w2 + d3 * w3;
    float dirLen = length(dir);
    vec2 normDir = dirLen > 0.0001 ? dir / dirLen : vec2(0.0);

    float len = clamp(dirLen * 2.0, 0.0, 1.0);
    vec2 len2 = vec2(1.0 + len, 1.0 - len * 0.4);
    float lob = 0.5 + (0.21 - 0.5) * len;
    float clp = 1.0 / lob;

    vec3 aC = vec3(0.0);
    float aW = 0.0;

    accumulateTap(aC, aW, vec2( 0.0, -1.0) - f, normDir, len2, lob, clp, cB);
    accumulateTap(aC, aW, vec2( 1.0, -1.0) - f, normDir, len2, lob, clp, cC);
    accumulateTap(aC, aW, vec2(-1.0,  0.0) - f, normDir, len2, lob, clp, cE);
    accumulateTap(aC, aW, vec2( 0.0,  0.0) - f, normDir, len2, lob, clp, cF);
    accumulateTap(aC, aW, vec2( 1.0,  0.0) - f, normDir, len2, lob, clp, cG);
    accumulateTap(aC, aW, vec2( 2.0,  0.0) - f, normDir, len2, lob, clp, cH);
    accumulateTap(aC, aW, vec2(-1.0,  1.0) - f, normDir, len2, lob, clp, cI);
    accumulateTap(aC, aW, vec2( 0.0,  1.0) - f, normDir, len2, lob, clp, cJ);
    accumulateTap(aC, aW, vec2( 1.0,  1.0) - f, normDir, len2, lob, clp, cK);
    accumulateTap(aC, aW, vec2( 2.0,  1.0) - f, normDir, len2, lob, clp, cL);
    accumulateTap(aC, aW, vec2( 0.0,  2.0) - f, normDir, len2, lob, clp, cN);
    accumulateTap(aC, aW, vec2( 1.0,  2.0) - f, normDir, len2, lob, clp, cO);

    vec3 reconRGB = aW > 0.001 ? (aC / aW) : cF;

    vec3 min4 = min(min(cF, cG), min(cJ, cK));
    vec3 max4 = max(max(cF, cG), max(cJ, cK));
    vec3 clampedRGB = clamp(reconRGB, min4, max4);

    fragColor = vec4(clampedRGB, 1.0);
}`;

const FS_RCAS = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_easuTex;
uniform sampler2D u_rawTex;
uniform vec2 u_outSize;
uniform float u_sharpness;
uniform float u_splitEnabled;
uniform float u_splitX;

float getLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    if (u_splitEnabled > 0.5 && v_uv.x < u_splitX) {
        fragColor = texture(u_rawTex, vec2(v_uv.x, 1.0 - v_uv.y));
        return;
    }

    vec2 px = 1.0 / max(u_outSize, vec2(1.0));
    vec3 e = texture(u_easuTex, v_uv).rgb;

    vec3 b = texture(u_easuTex, v_uv + vec2( 0.0, -px.y)).rgb;
    vec3 d = texture(u_easuTex, v_uv + vec2(-px.x,  0.0)).rgb;
    vec3 f = texture(u_easuTex, v_uv + vec2( px.x,  0.0)).rgb;
    vec3 h = texture(u_easuTex, v_uv + vec2( 0.0,  px.y)).rgb;

    float bL = getLuma(b);
    float dL = getLuma(dL);
    float eL = getLuma(e);
    float fL = getLuma(f);
    float hL = getLuma(h);

    float mn4 = min(min(bL, dL), min(fL, hL));
    float mx4 = max(max(bL, dL), max(fL, hL));
    float mn = min(mn4, eL);
    float mx = max(mx4, eL);

    float hitMin = mn / max(4.0 * mx, 0.0001);
    float hitMax = (1.0 - mx) / max(4.0 - 4.0 * mn, 0.0001);
    float lobe = max(-0.18, -min(hitMin, hitMax));

    float sharpnessWeight = exp2(clamp(u_sharpness, 0.0, 1.0) - 2.0);
    float w = lobe * sharpnessWeight;

    float contrast = mx - mn;
    float noiseFloor = smoothstep(0.015, 0.05, contrast);
    w *= noiseFloor;

    vec3 sharpRgb = (b + d + f + h) * w + e;
    sharpRgb = sharpRgb / max(4.0 * w + 1.0, 0.001);

    vec3 minRgb = min(min(min(b, d), min(f, h)), e);
    vec3 maxRgb = max(max(max(b, d), max(f, h)), e);
    vec3 finalRgb = clamp(sharpRgb, minRgb, maxRgb);

    float y = getLuma(finalRgb);
    float satMask = sin(clamp(y, 0.0, 1.0) * 3.14159265);
    vec3 vibrantRgb = mix(finalRgb, mix(vec3(y), finalRgb, 1.08), satMask);

    fragColor = vec4(vibrantRgb, 1.0);
}`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader creation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compile error: ${err}`);
    }
    return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    if (!prog) throw new Error('Program creation failed');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`);
    }
    return prog;
}

export class CrushAsrPipeline {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    progEasu: WebGLProgram;
    progRcas: WebGLProgram;
    quadVao: WebGLVertexArrayObject | null;
    srcTex: WebGLTexture | null;
    easuFbo: WebGLFramebuffer | null;
    easuTex: WebGLTexture | null;
    fboW: number = 0;
    fboH: number = 0;
    sharpness: number = 0.30;
    splitEnabled: boolean = false;
    splitX: number = 0.50;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('webgl2', {
            alpha: false,
            depth: false,
            stencil: false,
            antialias: false,
        });

        if (!ctx) throw new Error('WebGL2 context unavailable');
        this.gl = ctx;

        this.progEasu = createProgram(this.gl, VS_EASU, FS_EASU);
        this.progRcas = createProgram(this.gl, VS_RCAS, FS_RCAS);

        this.quadVao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.quadVao);
        const quadBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1, -1,  1,
            -1,  1,  1, -1,  1,  1,
        ]), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        this.srcTex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.srcTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.easuFbo = this.gl.createFramebuffer();
        this.easuTex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.easuTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }

    ensureFramebuffer(w: number, h: number): void {
        if (this.fboW === w && this.fboH === h) return;
        const gl = this.gl;
        this.fboW = w;
        this.fboH = h;
        gl.bindTexture(gl.TEXTURE_2D, this.easuTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.easuFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.easuTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render(video: HTMLVideoElement): void {
        if (!video || video.readyState < 2) return;
        const gl = this.gl;
        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;
        const cW = this.canvas.width;
        const cH = this.canvas.height;
        if (cW === 0 || cH === 0) return;

        this.ensureFramebuffer(cW, cH);

        gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.easuFbo);
        gl.viewport(0, 0, cW, cH);
        gl.useProgram(this.progEasu);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
        gl.uniform1i(gl.getUniformLocation(this.progEasu, 'u_srcTex'), 0);
        gl.uniform2f(gl.getUniformLocation(this.progEasu, 'u_srcSize'), vW, vH);
        gl.uniform2f(gl.getUniformLocation(this.progEasu, 'u_outSize'), cW, cH);

        gl.bindVertexArray(this.quadVao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, cW, cH);
        gl.useProgram(this.progRcas);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.easuTex);
        gl.uniform1i(gl.getUniformLocation(this.progRcas, 'u_easuTex'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
        gl.uniform1i(gl.getUniformLocation(this.progRcas, 'u_rawTex'), 1);

        gl.uniform2f(gl.getUniformLocation(this.progRcas, 'u_outSize'), cW, cH);
        gl.uniform1f(gl.getUniformLocation(this.progRcas, 'u_sharpness'), this.sharpness);
        gl.uniform1f(gl.getUniformLocation(this.progRcas, 'u_splitEnabled'), this.splitEnabled ? 1.0 : 0.0);
        gl.uniform1f(gl.getUniformLocation(this.progRcas, 'u_splitX'), this.splitX);

        gl.bindVertexArray(this.quadVao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    destroy(): void {
        const gl = this.gl;
        if (this.srcTex) gl.deleteTexture(this.srcTex);
        if (this.easuTex) gl.deleteTexture(this.easuTex);
        if (this.easuFbo) gl.deleteFramebuffer(this.easuFbo);
        if (this.progEasu) gl.deleteProgram(this.progEasu);
        if (this.progRcas) gl.deleteProgram(this.progRcas);
    }
}

(window as unknown as { CrushAsrPipeline: typeof CrushAsrPipeline }).CrushAsrPipeline = CrushAsrPipeline;
