#version 300 es
precision highp float;

uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;
uniform vec4  iMouse;
uniform sampler2D iChannel0;

out vec4 outColor;

float sampleT(inout float s, vec4 p) {
    vec2 uv = (s * p.zw + ceil(s * p.x)) / 200.0;
    float y = texture(iChannel0, uv).y;
    s += s;              // 明确顺序
    return y / s * 4.0;
}

void mainImage(out vec4 O, vec2 x){
    vec4 p = vec4(0.0);
    vec4 d = vec4(.8, 0.0, x/iResolution.y - .8);
    vec4 c = vec4(.6, .7, d);

    O = c - d.w;

    // 原样翻译：t 从 2e2+sin(dot(x,x)) 递减到 0
    for (float f, s, t = 2e2 + sin(dot(x,x)); --t > 0.; p = .05 * t * d)
    {
        p.xz += iTime;
        s = 2.0;
        float t1 = sampleT(s, p);
        float t2 = sampleT(s, p);
        float t3 = sampleT(s, p);
        float t4 = sampleT(s, p);
        f = p.w + 1.0 - t1 - t2 - t3 - t4;
        // 条件表达式：f<0 时累加，>=0 不变
        O += (f < 0.0) ? (O - 1.0 - f * c.zyxw) * f * 0.4 : vec4(0.0);
    }
}

void main(){
    vec4 color;
    mainImage(color, gl_FragCoord.xy);
    outColor = color;
}
