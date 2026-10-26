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
  vec2 texel = vec2(1.0 / 1600.0, 1.0 / 800.0);

  // Sample water mask: 1.0 = ocean, 0.0 = land
  float wC = texture2D(uEarthMap, vUv).r;
  float wR = texture2D(uEarthMap, vUv + vec2(texel.x, 0.0)).r;
  float wL = texture2D(uEarthMap, vUv - vec2(texel.x, 0.0)).r;
  float wU = texture2D(uEarthMap, vUv + vec2(0.0, texel.y)).r;
  float wD = texture2D(uEarthMap, vUv - vec2(0.0, texel.y)).r;

  // Sharp coastline edge
  float dX = wR - wL;
  float dY = wU - wD;
  float edgeCore = length(vec2(dX, dY)) * 2.8;

  // Wider sample for subtle outer neon glow around continent borders
  vec2 texelW = texel * 0.1;
  float wR2 = texture2D(uEarthMap, vUv + vec2(texelW.x, 0.0)).r;
  float wL2 = texture2D(uEarthMap, vUv - vec2(texelW.x, 0.0)).r;
  float wU2 = texture2D(uEarthMap, vUv + vec2(0.0, texelW.y)).r;
  float wD2 = texture2D(uEarthMap, vUv - vec2(0.0, texelW.y)).r;
  float edgeGlow = length(vec2(wR2 - wL2, wU2 - wD2)) * 1.4;

  float neonCoast = clamp(edgeCore * 1.2 + edgeGlow * 0.6, 0.0, 1.0);

  // Identify land vs water
  float isWater = mix(1.0, wC, uLoaded);
  float isLand  = clamp(1.0 - isWater, 0.0, 1.0);

  // Micro-dot matrix pattern inside continents (futuristic digital earth)
  float dotX = sin(vUv.x * 360.0 * 2.5);
  float dotY = sin(vUv.y * 180.0 * 5.0);
  float dotPattern = smoothstep(0.3, 0.9, dotX * dotY);

  vec3 landBase = vec3(0.03, 0.11, 0.20);
  vec3 landDots = vec3(0.08, 0.26, 0.44);
  vec3 continentCol = mix(landBase, landDots, dotPattern * 0.55);

  // Ocean: translucent dark tech navy
  vec3 oceanCol = vec3(0.006, 0.024, 0.055);

  // Base globe color
  vec3 color = mix(oceanCol, continentCol, isLand);

  // High-tech wireframe longitude and latitude grid lines
  float lonDeg = vUv.x * 360.0;
  float latDeg = (vUv.y - 0.5) * 180.0;
  float fLon = abs(fract(lonDeg / 15.0 + 0.5) - 0.5) * 15.0;
  float fLat = abs(fract(latDeg / 15.0 + 0.5) - 0.5) * 15.0;
  float lineLon = 1.0 - smoothstep(0.0, 0.50, fLon);
  float lineLat = 1.0 - smoothstep(0.0, 0.50, fLat);
  float grid = max(lineLon, lineLat);

  // Add grid (prominent in oceans, subtle under continents)
  vec3 gridCol = vec3(0.0, 0.65, 0.95);
  color += gridCol * grid * (0.60 - isLand * 0.35);

  // Neon continent border (crisp cyan with electric glow)
  vec3 neonCyan = vec3(0.0, 1.0, 0.96);
  vec3 neonBlue = vec3(0.0, 0.55, 1.0);
  vec3 borderCol = mix(neonBlue, neonCyan, edgeCore);
  color += borderCol * neonCoast * 2.2;

  // Fresnel rim glow
  vec3 V = normalize(-vViewPos);
  float rim = pow(1.0 - max(dot(vNormal, V), 0.0), 3.0);
  color += neonCyan * rim * 0.65;

  // Subtle digital scan effect
  float scan = sin(gl_FragCoord.y * 1.4 + uTime * 2.2) * 0.5 + 0.5;
  color *= 0.96 + scan * 0.04;

  // Alpha: oceans are translucent, continents have body, outlines and rims pop
  float alpha = 0.28 + isLand * 0.52 + neonCoast * 0.45 + rim * 0.35;
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
 * Earth water mask URL — local fast asset with CDN fallback.
 * 1.0 (white) = water / oceans, 0.0 (black) = land / continents.
 */
const EARTH_TEX_URL = '/earth-water.png';
const CDN_EARTH_TEX_URL =
  'https://unpkg.com/three-globe/example/img/earth-water.png';

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

    /* ── Load Earth water/land mask texture ── */
    const applyTexture = (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      uniforms.uEarthMap.value = tex;
      uniforms.uLoaded.value = 1.0;
      disposables.push(tex);
    };

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      EARTH_TEX_URL,
      applyTexture,
      undefined,
      () => {
        loader.load(
          CDN_EARTH_TEX_URL,
          applyTexture,
          undefined,
          () => console.warn('Globe3D: texture load failed — grid-only mode'),
        );
      },
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

    /* ── Outer HUD ring (framing outside the globe, never intersecting or cutting) ── */
    for (let i = 0; i < 24; i++) {
      if (i % 3 === 0) continue;
      const g = new THREE.RingGeometry(
        1.30, 1.32, 16, 1,
        (i * Math.PI * 2) / 24, Math.PI / 36,
      );
      const m = new THREE.MeshBasicMaterial({
        color: 0x00ccff, transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const seg = new THREE.Mesh(g, m);
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
