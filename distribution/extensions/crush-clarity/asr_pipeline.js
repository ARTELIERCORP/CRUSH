"use strict";(()=>{var u=`#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`,f=`#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`,m=`#version 300 es
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
}`,v=`#version 300 es
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
}`;function n(r,a,e){let t=r.createShader(a);if(!t)throw new Error("Shader creation failed");if(r.shaderSource(t,e),r.compileShader(t),!r.getShaderParameter(t,r.COMPILE_STATUS)){let c=r.getShaderInfoLog(t);throw r.deleteShader(t),new Error(`Shader compile error: ${c}`)}return t}function l(r,a,e){let t=n(r,r.VERTEX_SHADER,a),c=n(r,r.FRAGMENT_SHADER,e),i=r.createProgram();if(!i)throw new Error("Program creation failed");if(r.attachShader(i,t),r.attachShader(i,c),r.linkProgram(i),!r.getProgramParameter(i,r.LINK_STATUS))throw new Error(`Program link error: ${r.getProgramInfoLog(i)}`);return i}var o=class{canvas;gl;progEasu;progRcas;quadVao;srcTex;easuFbo;easuTex;fboW=0;fboH=0;sharpness=.3;splitEnabled=!1;splitX=.5;constructor(a){this.canvas=a;let e=a.getContext("webgl2",{alpha:!1,depth:!1,stencil:!1,antialias:!1});if(!e)throw new Error("WebGL2 context unavailable");this.gl=e,this.progEasu=l(this.gl,u,m),this.progRcas=l(this.gl,f,v),this.quadVao=this.gl.createVertexArray(),this.gl.bindVertexArray(this.quadVao);let t=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(0),this.gl.vertexAttribPointer(0,2,this.gl.FLOAT,!1,0,0),this.srcTex=this.gl.createTexture(),this.gl.bindTexture(this.gl.TEXTURE_2D,this.srcTex),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.easuFbo=this.gl.createFramebuffer(),this.easuTex=this.gl.createTexture(),this.gl.bindTexture(this.gl.TEXTURE_2D,this.easuTex),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE)}ensureFramebuffer(a,e){if(this.fboW===a&&this.fboH===e)return;let t=this.gl;this.fboW=a,this.fboH=e,t.bindTexture(t.TEXTURE_2D,this.easuTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,a,e,0,t.RGBA,t.UNSIGNED_BYTE,null),t.bindFramebuffer(t.FRAMEBUFFER,this.easuFbo),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,this.easuTex,0),t.bindFramebuffer(t.FRAMEBUFFER,null)}render(a){if(!a||a.readyState<2)return;let e=this.gl,t=a.videoWidth||1280,c=a.videoHeight||720,i=this.canvas.width,s=this.canvas.height;i===0||s===0||(this.ensureFramebuffer(i,s),e.bindTexture(e.TEXTURE_2D,this.srcTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,a),e.bindFramebuffer(e.FRAMEBUFFER,this.easuFbo),e.viewport(0,0,i,s),e.useProgram(this.progEasu),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.srcTex),e.uniform1i(e.getUniformLocation(this.progEasu,"u_srcTex"),0),e.uniform2f(e.getUniformLocation(this.progEasu,"u_srcSize"),t,c),e.uniform2f(e.getUniformLocation(this.progEasu,"u_outSize"),i,s),e.bindVertexArray(this.quadVao),e.drawArrays(e.TRIANGLES,0,6),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,i,s),e.useProgram(this.progRcas),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.easuTex),e.uniform1i(e.getUniformLocation(this.progRcas,"u_easuTex"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.srcTex),e.uniform1i(e.getUniformLocation(this.progRcas,"u_rawTex"),1),e.uniform2f(e.getUniformLocation(this.progRcas,"u_outSize"),i,s),e.uniform1f(e.getUniformLocation(this.progRcas,"u_sharpness"),this.sharpness),e.uniform1f(e.getUniformLocation(this.progRcas,"u_splitEnabled"),this.splitEnabled?1:0),e.uniform1f(e.getUniformLocation(this.progRcas,"u_splitX"),this.splitX),e.bindVertexArray(this.quadVao),e.drawArrays(e.TRIANGLES,0,6))}destroy(){let a=this.gl;this.srcTex&&a.deleteTexture(this.srcTex),this.easuTex&&a.deleteTexture(this.easuTex),this.easuFbo&&a.deleteFramebuffer(this.easuFbo),this.progEasu&&a.deleteProgram(this.progEasu),this.progRcas&&a.deleteProgram(this.progRcas)}};window.CrushAsrPipeline=o;})();
