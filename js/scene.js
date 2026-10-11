import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const MODEL_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260929_212926_92423081-b0e4-4f5a-b650-14af6c05c058.glb';

let quality = 1, bgDirty = true, needsRender = true;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');
let heroVisible = true;
const io = new IntersectionObserver(e => { heroVisible = e[0].isIntersecting; if (heroVisible) needsRender = true; });
io.observe(canvas);
const loaderEl = document.getElementById('loader');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const FOV = 30;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
const bgScene = new THREE.Scene();
const pivot = new THREE.Group();
const spinner = new THREE.Group();
scene.add(pivot);
pivot.add(spinner);
spinner.rotation.set(-0.42, 0.62, 0.18);

/* ---------- Background headline ---------- */
const hCanvas = document.createElement('canvas');
const hCtx = hCanvas.getContext('2d');
const hTex = new THREE.CanvasTexture(hCanvas);
hTex.colorSpace = THREE.SRGBColorSpace;
hTex.minFilter = THREE.LinearFilter;
hTex.magFilter = THREE.LinearFilter;
hTex.generateMipmaps = false;

const bgMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: hTex } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D uTex; varying vec2 vUv;
void main(){
  gl_FragColor = texture2D(uTex, vUv);
  #include <colorspace_fragment>
}`,
  depthTest: false, depthWrite: false
});
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgQuad.frustumCulled = false;
bgScene.add(bgQuad);

function isMobile(W, H) { return W < 768 || W / H < 1; }

function drawHeadline() {
  const W = window.innerWidth, H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mobile = isMobile(W, H);
  hCanvas.width = Math.round(W * dpr);
  hCanvas.height = Math.round(H * dpr);
  hCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hCtx.fillStyle = '#000';
  hCtx.fillRect(0, 0, W, H);
  const lines = ['CRAFT', 'STACK'];
  let fs = Math.min(H * 0.21, W * (mobile ? 0.21 : 0.09));
  hCtx.font = `800 ${fs}px Poppins`;
  let widest = Math.max(...lines.map(l => hCtx.measureText(l).width));
  const maxW = W * (mobile ? 0.9 : 0.4);
  if (widest > maxW) { fs *= maxW / widest; hCtx.font = `800 ${fs}px Poppins`; }
  hCtx.fillStyle = '#d4d4d4';
  hCtx.textAlign = 'center';
  hCtx.textBaseline = 'alphabetic';
  const cx = W * (mobile ? 0.5 : 0.69);
  const cy = H * (mobile ? 0.3 : 0.5);
  const gap = fs * 1.07, cap = fs * 0.7;
  lines.forEach((l, i) => hCtx.fillText(l, cx, cy + cap / 2 + (i - 0.5) * gap));
  hTex.needsUpdate = true;
}

/* ---------- Glass material ---------- */
const glassVert = `
varying vec3 vNormal; varying vec3 vEye;
void main(){
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 mvPos = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPos;
  vNormal = normalize(normalMatrix * normal);
  vEye = normalize(mvPos.xyz);
}`;
const glassFrag = `
precision highp float;
uniform sampler2D uTexture; uniform vec2 uResolution; uniform float uBackside;
uniform float uIorR, uIorY, uIorG, uIorC, uIorB, uIorP;
uniform float uRefractPower, uChromatic, uSaturation, uShininess, uDiffuseness, uFresnelPower;
uniform vec3 uLight;
varying vec3 vNormal; varying vec3 vEye;
const int LOOP = 16;
float specular(vec3 light, float shininess, float diffuseness, vec3 n, vec3 eye){
  vec3 lightVec = normalize(-light);
  vec3 viewVec = -eye;
  vec3 halfVec = normalize(lightVec + viewVec);
  return pow(max(dot(n, halfVec), 0.0), shininess) + max(0.0, dot(n, lightVec)) * diffuseness;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 n = normalize(vNormal);
  if (uBackside > 0.5) n = -n;
  vec3 eye = normalize(vEye);
  vec3 color = vec3(0.0);
  for (int i = 0; i < LOOP; i++){
    float slide = float(i) / float(LOOP) * 0.045;
    vec3 rR = refract(eye, n, 1.0 / uIorR);
    vec3 rY = refract(eye, n, 1.0 / uIorY);
    vec3 rG = refract(eye, n, 1.0 / uIorG);
    vec3 rC = refract(eye, n, 1.0 / uIorC);
    vec3 rB = refract(eye, n, 1.0 / uIorB);
    vec3 rP = refract(eye, n, 1.0 / uIorP);
    vec3 tR = texture2D(uTexture, uv + rR.xy * (uRefractPower + slide * 1.0) * uChromatic).rgb;
    vec3 tY = texture2D(uTexture, uv + rY.xy * (uRefractPower + slide * 1.0) * uChromatic).rgb;
    vec3 tG = texture2D(uTexture, uv + rG.xy * (uRefractPower + slide * 2.0) * uChromatic).rgb;
    vec3 tC = texture2D(uTexture, uv + rC.xy * (uRefractPower + slide * 2.5) * uChromatic).rgb;
    vec3 tB = texture2D(uTexture, uv + rB.xy * (uRefractPower + slide * 3.0) * uChromatic).rgb;
    vec3 tP = texture2D(uTexture, uv + rP.xy * (uRefractPower + slide * 1.0) * uChromatic).rgb;
    float r = tR.x * 0.5;
    float y = (tY.x * 2.0 + tY.y * 2.0 - tY.z) / 6.0;
    float g = tG.y * 0.5;
    float c = (tC.y * 2.0 + tC.z * 2.0 - tC.x) / 6.0;
    float b = tB.z * 0.5;
    float p = (tP.z * 2.0 + tP.x * 2.0 - tP.y) / 6.0;
    float R = r + (2.0 * p + 2.0 * y - c) / 3.0;
    float G = g + (2.0 * y + 2.0 * c - p) / 3.0;
    float B = b + (2.0 * c + 2.0 * p - y) / 3.0;
    color += vec3(R, G, B);
  }
  color /= float(LOOP);
  float luma = dot(color, vec3(0.2125, 0.7154, 0.0721));
  color = mix(vec3(luma), color, uSaturation);
  float back = uBackside > 0.5 ? 1.0 : 0.0;
  float spec = specular(uLight, uShininess, uDiffuseness, n, eye)
             + 0.6 * specular(vec3(1.0, 1.0, -1.0), uShininess * 0.6, uDiffuseness * 0.5, n, eye);
  color += spec * mix(1.0, 0.35, back);
  float f = pow(1.0 + dot(eye, n), uFresnelPower);
  color = mix(color, vec3(1.0), f * mix(0.55, 0.25, back));
  color += vec3(0.004, 0.005, 0.007);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

function makeGlass(side, backside, power) {
  return new THREE.ShaderMaterial({
    vertexShader: glassVert, fragmentShader: glassFrag, side,
    uniforms: {
      uTexture: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBackside: { value: backside },
      uIorR: { value: 1.15 }, uIorY: { value: 1.16 }, uIorG: { value: 1.18 },
      uIorC: { value: 1.22 }, uIorB: { value: 1.22 }, uIorP: { value: 1.22 },
      uRefractPower: { value: power }, uChromatic: { value: 0.5 }, uSaturation: { value: 1.08 },
      uShininess: { value: 90 }, uDiffuseness: { value: 0.02 }, uFresnelPower: { value: 5.0 },
      uLight: { value: new THREE.Vector3(-1, 1, 1) }
    }
  });
}
const frontMat = makeGlass(THREE.FrontSide, 0, 0.30);
const backMat = makeGlass(THREE.BackSide, 1, 0.22);

/* ---------- Render targets ---------- */
const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
const rtBack = new THREE.WebGLRenderTarget(1, 1, rtOpts);
const rtFront = new THREE.WebGLRenderTarget(1, 1, rtOpts);
backMat.uniforms.uTexture.value = rtBack.texture;
frontMat.uniforms.uTexture.value = rtFront.texture;

/* ---------- Cube mesh ---------- */
const cube = new THREE.Mesh(new THREE.BufferGeometry(), frontMat);
cube.visible = false;
spinner.add(cube);

function setGeometry(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const c = new THREE.Vector3(); bb.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  const s = new THREE.Vector3(); bb.getSize(s);
  const m = Math.max(s.x, s.y, s.z) || 1;
  geo.scale(1 / m, 1 / m, 1 / m);
  cube.geometry.dispose();
  cube.geometry = geo;
  cube.visible = true; needsRender = true;
  loaderEl.classList.add('done');
}

new GLTFLoader().load(MODEL_URL, gltf => {
  try {
    gltf.scene.updateMatrixWorld(true);
    const parts = [];
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      let g = o.geometry.clone();
      ['uv', 'color', 'tangent'].forEach(a => g.deleteAttribute(a));
      g = mergeVertices(g, 1e-4);
      g.computeVertexNormals();
      g.applyMatrix4(o.matrixWorld);
      parts.push(g);
    });
    setGeometry(mergeGeometries(parts, false));
  } catch (e) { setGeometry(new RoundedBoxGeometry(1, 1, 1, 8, 0.12)); }
}, undefined, () => setGeometry(new RoundedBoxGeometry(1, 1, 1, 8, 0.12)));

/* ---------- Layout ---------- */
function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
  rtBack.setSize(bw, bh);
  rtFront.setSize(bw, bh);
  const db = renderer.getDrawingBufferSize(new THREE.Vector2());
  frontMat.uniforms.uResolution.value.copy(db);
  backMat.uniforms.uResolution.value.copy(db);
  drawHeadline();
  bgDirty = needsRender = true;
  const mobile = isMobile(W, H);
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * 10;
  const visW = visH * camera.aspect;
  const sx = mobile ? 0.5 : 0.69, sy = mobile ? 0.3 : 0.5;
  pivot.position.set((sx - 0.5) * visW, (0.5 - sy) * visH, 0);
  const px = Math.min(H * 0.44, W * (mobile ? 0.45 : 0.29));
  pivot.scale.setScalar((px / H) * visH);
}
const ac = new AbortController(), sig = { signal: ac.signal };
let lw = 0, lh = 0, layTick = false;
function queueLayout() {
  if (layTick) return; layTick = true;
  requestAnimationFrame(() => { layTick = false;
    if (innerWidth === lw && innerHeight === lh) return;
    lw = innerWidth; lh = innerHeight; layout(); });
}
window.addEventListener('resize', queueLayout, sig);
if (document.fonts) document.fonts.addEventListener('loadingdone', () => { drawHeadline(); bgDirty = needsRender = true; }, sig);

/* ---------- Interaction ---------- */
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
function rotWorld(dx, dy) {
  if (dx) { qa.setFromAxisAngle(AY, dx); spinner.quaternion.premultiply(qa); }
  if (dy) { qb.setFromAxisAngle(AX, dy); spinner.quaternion.premultiply(qb); }
}
let dragging = false, lastX = 0, lastY = 0, lastT = 0;
let pendX = 0, pendY = 0, velX = 0, velY = 0, releaseT = -2000, spinRemaining = 0;
const FOLLOW = 22; // 1/s, higher = tighter follow

canvas.addEventListener('pointerdown', e => {
  dragging = true; spinRemaining = 0; pendX = pendY = velX = velY = 0;
  lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging'); needsRender = true;
}, sig);
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  pendX += (e.clientX - lastX) * 0.008; pendY += (e.clientY - lastY) * 0.008;
  lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); needsRender = true;
}, sig);
function endDrag(e) {
  if (!dragging) return;
  dragging = false; releaseT = performance.now();
  if (performance.now() - lastT > 80) velX = velY = 0;
  canvas.classList.remove('dragging');
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}
canvas.addEventListener('pointerup', endDrag, sig);
canvas.addEventListener('pointercancel', endDrag, sig);
/* ---------- Loop ---------- */
let prev = performance.now(), raf = 0, slow = 0, lastRender = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  if (!heroVisible || document.hidden) return;
  const f = dt * 60;
  let moving = false;

  if (dragging || Math.abs(pendX) + Math.abs(pendY) > 1e-5) {
    const k = 1 - Math.exp(-FOLLOW * dt);          // frame-rate independent damping
    const sx = pendX * k, sy = pendY * k;
    rotWorld(sx, sy); pendX -= sx; pendY -= sy;
    if (dt > 0) { velX = THREE.MathUtils.lerp(velX, sx / f, 0.3); velY = THREE.MathUtils.lerp(velY, sy / f, 0.3); }
    moving = true;
  }
  if (!dragging) {
    if (Math.abs(spinRemaining) > 0) {
      const step = REDUCE ? spinRemaining : spinRemaining * (1 - Math.exp(-5.7 * dt));
      rotWorld(step, 0); spinRemaining -= step; moving = true;
      if (Math.abs(spinRemaining) < 0.0005) spinRemaining = 0;
    } else {
      if (!REDUCE && (Math.abs(velX) + Math.abs(velY) > 1e-5)) {
        rotWorld(velX * f, velY * f);
        const damp = Math.pow(0.94, f); velX *= damp; velY *= damp; moving = true;
      }
      if (!REDUCE) {
        const blend = THREE.MathUtils.clamp((now - releaseT - 600) / 1000, 0, 1);
        rotWorld(0.0035 * blend * f, 0.0012 * blend * f); moving = true;
      }
    }
  }
  if (!moving && !needsRender) return;   // nothing changed: skip the expensive passes
  needsRender = false;

  // adaptive resolution: if frames run long, lower the render scale once or twice
  const t0 = performance.now();
  renderFrame();
  const cost = performance.now() - t0;
  if (cost > 20 && quality > 0.6) { if (++slow > 20) { slow = 0; quality = Math.max(0.6, quality - 0.2); layout(); } } else slow = Math.max(0, slow - 1);
}
function renderFrame() {
  renderer.autoClear = true;
  if (bgDirty) { renderer.setRenderTarget(rtBack); renderer.render(bgScene, camera); bgDirty = false; } // text is static

  renderer.setRenderTarget(rtFront);
  renderer.render(bgScene, camera);
  if (cube.visible) {
    renderer.autoClear = false;
    cube.material = backMat;
    renderer.render(scene, camera);
  }
  renderer.setRenderTarget(null);
  renderer.autoClear = true;
  renderer.render(bgScene, camera);
  if (cube.visible) {
    renderer.autoClear = false;
    renderer.clearDepth();
    cube.material = frontMat;
    renderer.render(scene, camera);
  }
  renderer.autoClear = true;
}
export function dispose() {
  cancelAnimationFrame(raf); ac.abort(); io.disconnect();
  [rtBack, rtFront, hTex, bgMat, frontMat, backMat, cube.geometry].forEach(o => o.dispose());
  renderer.dispose();
}
document.addEventListener('visibilitychange', () => { prev = performance.now(); needsRender = true; }, sig);

const fontsReady = document.fonts
  ? Promise.race([
      Promise.all([document.fonts.load('800 100px Poppins'), document.fonts.ready]),
      new Promise(r => setTimeout(r, 2500))
    ])
  : Promise.resolve();
fontsReady.then(() => { lw = innerWidth; lh = innerHeight; layout(); raf = requestAnimationFrame(frame); });
