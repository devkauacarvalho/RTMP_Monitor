import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════
 *  GLSL SHADERS — Digital / Futuristic Earth
 * ═══════════════════════════════════════════════════════════════════════ */

const GLOBE_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

const GLOBE_FS = /* glsl */ `
precision highp float;

uniform sampler2D uEarthMap;
uniform float uTime;
uniform float uLoaded;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vec4 tex = texture2D(uEarthMap, vUv);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114)) * uLoaded;

  float land  = smoothstep(0.03, 0.12, lum);
  float city  = smoothstep(0.15, 0.50, lum);
  float coast = smoothstep(0.02, 0.05, lum) - smoothstep(0.08, 0.16, lum);

  vec3 ocean    = vec3(0.004, 0.012, 0.03);
  vec3 landCol  = vec3(0.0,   0.10,  0.18);
  vec3 cityCol  = vec3(0.0,   0.85,  1.0);
  vec3 neonCyan = vec3(0.0,   1.0,   0.95);

  vec3 color = mix(ocean, landCol, land);
  color = mix(color, cityCol, city * 0.55);
  
  float coastCore = pow(clamp(coast, 0.0, 1.0), 2.5); 
  
  color += neonCyan * coast * 0.5;
  color += neonCyan * coastCore * 2.5; 

  float lonDeg = vUv.x * 360.0;
  float latDeg = vUv.y * 180.0;

  float s1 = 15.0;
  float gx1 = min(mod(lonDeg, s1), s1 - mod(lonDeg, s1));
  float gy1 = min(mod(latDeg, s1), s1 - mod(latDeg, s1));
  float fine = 1.0 - smoothstep(0.0, 0.35, min(gx1, gy1));

  float s2 = 45.0;
  float gx2 = min(mod(lonDeg, s2), s2 - mod(lonDeg, s2));
  float gy2 = min(mod(latDeg, s2), s2 - mod(latDeg, s2));
  float major = 1.0 - smoothstep(0.0, 0.5, min(gx2, gy2));

  color += vec3(0.0, 0.20, 0.35) * fine  * 0.12;
  color += vec3(0.0, 0.35, 0.55) * major * 0.22;

  vec3 V = normalize(-vViewPos);
  float rim = pow(1.0 - max(dot(vNormal, V), 0.0), 3.0);
  color += vec3(0.0, 0.50, 0.90) * rim * 0.55;

  float scan = sin(gl_FragCoord.y * 1.2 + uTime * 2.0) * 0.5 + 0.5;
  color *= 0.97 + scan * 0.03;

  float alpha = 0.72 + land * 0.22 + rim * 0.28 + coastCore * 0.3;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

/* ── Atmosphere shaders ── */

const ATMO_VS = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

const ATMO_FS = /* glsl */ `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vec3 V = normalize(-vViewPos);
  float rim = 1.0 - max(dot(vNormal, V), 0.0);
  float intensity = pow(rim, 2.5) * 0.6;
  gl_FragColor = vec4(0.0, 0.50, 0.92, intensity);
}
`;

/* ═══════════════════════════════════════════════════════════════════════
 *  Helper — background halo sprite texture
 * ═══════════════════════════════════════════════════════════════════════ */

function createGlowCanvas() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0, 180, 255, 0.50)');
  g.addColorStop(0.25, 'rgba(0, 130, 255, 0.25)');
  g.addColorStop(0.55, 'rgba(0,  80, 180, 0.08)');
  g.addColorStop(1, 'rgba(0,   0,   0, 0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

/* ═══════════════════════════════════════════════════════════════════════
 *  COMPONENT
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Earth texture URL — NASA night-lights via the three-globe package on
 * unpkg (CORS-enabled, very reliable CDN).
 */
const EARTH_TEX_URL =
  'https://unpkg.com/three-globe/example/img/earth-night.jpg';

export default function Globe3D({ size = 150 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const px = size * 2;          // render at 2× for retina
    const disposables = [];       // collect GPU resources for cleanup

    /* ── Scene, Camera, Renderer ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.0;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(px, px);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = size + 'px';
    renderer.domElement.style.height = size + 'px';
    el.appendChild(renderer.domElement);

    /* ── Shared uniforms ── */
    const uniforms = {
      uEarthMap: { value: new THREE.Texture() },
      uTime: { value: 0 },
      uLoaded: { value: 0.0 },
    };

    /* ── Load Earth night-lights texture ── */
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      EARTH_TEX_URL,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        uniforms.uEarthMap.value = tex;
        uniforms.uLoaded.value = 1.0;
        disposables.push(tex);
      },
      undefined,
      () => console.warn('Globe3D: texture load failed — grid-only mode'),
    );

    /* ── Globe ── */
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: GLOBE_VS,
      fragmentShader: GLOBE_FS,
      transparent: true,
      depthWrite: true,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.rotation.x = 0.41;   // ≈ 23.5° axial tilt
    scene.add(globe);
    disposables.push(globeGeo, globeMat);

    /* ── Atmosphere rim ── */
    const atmoGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: ATMO_VS,
      fragmentShader: ATMO_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    atmo.rotation.x = 0.41;
    scene.add(atmo);
    disposables.push(atmoGeo, atmoMat);

    /* ── Background glow sprite ── */
    const glowTex = new THREE.CanvasTexture(createGlowCanvas());
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex, transparent: true, opacity: 0.85, depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(3.8, 3.8, 1);
    glowSprite.position.z = -0.5;
    scene.add(glowSprite);
    disposables.push(glowTex, glowMat);

    /* ── Orbital rings ── */
    const addRing = (inner, outer, opacity, rx, ry) => {
      const g = new THREE.RingGeometry(inner, outer, 128);
      const m = new THREE.MeshBasicMaterial({
        color: 0x00ccff, transparent: true, opacity,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = rx;
      mesh.rotation.y = ry;
      scene.add(mesh);
      disposables.push(g, m);
    };

    addRing(1.35, 1.38, 0.28, Math.PI / 2.2, 0.3);
    addRing(1.55, 1.57, 0.16, Math.PI / 2.5, -0.2);

    // Dashed outer ring
    for (let i = 0; i < 24; i++) {
      const g = new THREE.RingGeometry(
        1.65, 1.67, 6, 1,
        (i * Math.PI * 2) / 24, Math.PI / 30,
      );
      const m = new THREE.MeshBasicMaterial({
        color: 0x00ccff, transparent: true, opacity: 0.2,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const seg = new THREE.Mesh(g, m);
      seg.rotation.x = Math.PI / 2.3;
      seg.rotation.y = 0.1;
      scene.add(seg);
      disposables.push(g, m);
    }

    /* ── Lighting (subtle fill for the Phong-free ShaderMaterial) ── */
    scene.add(new THREE.AmbientLight(0x112233, 1));

    /* ── Animation loop ── */
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      globe.rotation.y += 0.003;
      atmo.rotation.y += 0.003;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(animId);
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return <div ref={mountRef} className="globe-3d-mount" />;
}
