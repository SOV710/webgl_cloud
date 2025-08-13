const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl2");
if (!gl) alert("WebGL2 not supported");

/* 线性缩放系数（与 CSS --scale 保持一致 */
const X_SCALE = 0.3;
const Y_SCALE = 0.3;

/* 如果设备 DPR 很高，可进一步削弱实际 DPR（可选） */
const DPR_CAP = 1.0; // 设为 1 避免 2x/3x 真渲染，进一步提速

function resize() {
    // 舞台的 CSS 尺寸仍是视口全屏；我们把“实际渲染像素”按缩放系数降低
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    // 真分辨率：CSS尺寸 × DPR × SCALE
    const w = Math.max(1, Math.floor(cssW * dpr * X_SCALE));
    const h = Math.max(1, Math.floor(cssH * dpr * Y_SCALE));

    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
    }
}
addEventListener("resize", resize);
resize();

async function fetchText(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url);
    return (await r.text()).replace(/\r\n/g, "\n");
}
function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (
        !gl.getShaderParameter(s, gl.COMPLETE_STATUS) &&
        !gl.getShaderParameter(s, gl.COMPILE_STATUS)
    ) {
        console.error(
            src
                .split("\n")
                .map((l, i) => `${i + 1}: ${l}`)
                .join("\n"),
        );
        throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
}
async function createProgram(vsUrl, fsUrl) {
    const vs = compile(gl.VERTEX_SHADER, await fetchText(vsUrl));
    const fs = compile(gl.FRAGMENT_SHADER, await fetchText(fsUrl));
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
}

// 生成一张 256x256 的灰度噪声，作为 iChannel0（也可替换为你自己的图片/视频）
function makeNoiseTex(size = 256) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const v = (Math.random() * 255) | 0;
        data[i * 4 + 0] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
}

(async function run() {
    const prog = await createProgram("shaders/vert.glsl", "shaders/frag.glsl");
    gl.useProgram(prog);

    // uniforms
    const loc = {
        iResolution: gl.getUniformLocation(prog, "iResolution"),
        iTime: gl.getUniformLocation(prog, "iTime"),
        iFrame: gl.getUniformLocation(prog, "iFrame"),
        iMouse: gl.getUniformLocation(prog, "iMouse"),
        iChannel0: gl.getUniformLocation(prog, "iChannel0"),
    };
    gl.uniform1i(loc.iChannel0, 0); // 采样器绑定到纹理单元0
    makeNoiseTex(); // 初始化 iChannel0（也可改为加载图片）

    // 鼠标（可选）
    let frame = 0,
        t0 = performance.now(),
        mouse = [0, 0, 0, 0],
        down = false;
    canvas.addEventListener("mousemove", (e) => {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (devicePixelRatio || 1);
        const y = (r.bottom - e.clientY) * (devicePixelRatio || 1);
        mouse[0] = x;
        mouse[1] = y;
        if (down) {
            mouse[2] = x;
            mouse[3] = y;
        }
    });
    canvas.addEventListener("mousedown", () => (down = true));
    canvas.addEventListener("mouseup", () => (down = false));

    function loop(now) {
        resize();
        gl.uniform3f(loc.iResolution, canvas.width, canvas.height, 1.0);
        gl.uniform1f(loc.iTime, (now - t0) * 0.001);
        gl.uniform1i(loc.iFrame, frame++);
        gl.uniform4f(loc.iMouse, mouse[0], mouse[1], mouse[2], mouse[3]);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();
