/* Frasco de perfume 3D procedural (three.js): vidrio, líquido, metal dorado.
   Reacciona al mouse/dedo y al scroll. Se renderiza solo cuando está visible. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STORE } from './config.js';

export function mountBottle(host) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Frasco de perfume en 3D, movelo con el mouse o el dedo');
  canvas.setAttribute('role', 'img');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.35, 9.4); camera.lookAt(0, 0.35, 0);

  const group = new THREE.Group(); scene.add(group);
  // Perfil del frasco (torneado)
  const prof = [[0, -1.3], [1.05, -1.3], [1.18, -1.18], [1.22, -0.9], [1.22, 0.75], [1.12, 1.0], [0.6, 1.2], [0.36, 1.28], [0.36, 1.42], [0, 1.42]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffe9f0, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.4, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new THREE.Color(0xf4a7bf), attenuationDistance: 2.5 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 8), glass); // 8 lados = facetado
  body.rotation.y = Math.PI / 8; group.add(body);
  const liqProf = [[0, -1.18], [1.0, -1.18], [1.08, -1.05], [1.08, 0.45], [0, 0.45]].map(([x, y]) => new THREE.Vector2(x, y));
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(liqProf, 8), new THREE.MeshPhysicalMaterial({ color: 0xf08fb0, roughness: 0.15, transmission: 0.55, thickness: 1, ior: 1.33 }));
  liquid.rotation.y = Math.PI / 8; group.add(liquid);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe7c27a, metalness: 1, roughness: 0.22 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 48), gold); neck.position.y = 1.5; group.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.9, 10, 1), new THREE.MeshPhysicalMaterial({ color: 0x5b0f2e, metalness: 0.2, roughness: 0.25, clearcoat: 1 }));
  cap.position.y = 2.06; group.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.04, 16, 64), gold); ring.rotation.x = Math.PI / 2; ring.position.y = 1.62; group.add(ring);
  // Etiqueta con el wordmark de la tienda
  const lc = document.createElement('canvas'); lc.width = 512; lc.height = 256; const g = lc.getContext('2d');
  g.fillStyle = '#fdf3f6'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#d7a85f'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 228);
  g.fillStyle = '#5b0f2e'; g.textAlign = 'center'; g.font = '700 96px Georgia, serif'; g.fillText(STORE.wordmark, 256, 140);
  g.font = '28px Georgia, serif'; g.fillText('eau de parfum', 256, 196);
  const tex = new THREE.CanvasTexture(lc); tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  label.position.set(0, -0.2, 1.14); group.add(label);
  // Perlas flotantes
  const pearlMat = new THREE.MeshPhysicalMaterial({ color: 0xfff4f7, roughness: 0.15, metalness: 0.1, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffc6d6) });
  const pearls = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 24, 16), pearlMat);
    const a = i / 9 * Math.PI * 2; m.userData = { a, r: 2 + Math.random() * 0.6, y: -1 + Math.random() * 2.6, s: 0.2 + Math.random() * 0.3 };
    scene.add(m); pearls.push(m);
  }
  // Sombra suave
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d');
  const grd = sg.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(91,15,46,.35)'); grd.addColorStop(1, 'rgba(91,15,46,0)'); sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.45; scene.add(shadow);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf3b6c8, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);

  let tx = 0, ty = 0, rx = 0, ry = 0, visible = false, raf = 0, scrollK = 0;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = w < 500 ? 11 : 9.4; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(resize).observe(host);
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 1.4; ty = ((e.clientY - r.top) / r.height - 0.5) * 0.6; });
  host.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  addEventListener('scroll', () => { const r = host.getBoundingClientRect(); scrollK = 1 - (r.top + r.height / 2) / innerHeight; }, { passive: true });
  const clock = new THREE.Clock();
  const loop = () => {
    const t = clock.getElapsedTime();
    rx += (ty - rx) * 0.06; ry += (tx - ry) * 0.06;
    group.rotation.y = t * 0.35 + ry + scrollK * 1.6; group.rotation.x = rx * 0.4;
    group.position.y = Math.sin(t * 1.2) * 0.06;
    pearls.forEach(p => { const u = p.userData; p.position.set(Math.cos(u.a + t * u.s) * u.r, u.y + Math.sin(t + u.a) * 0.15, Math.sin(u.a + t * u.s) * u.r * 0.6); });
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(host);
  host.classList.add('live');
  renderer.render(scene, camera);
}
