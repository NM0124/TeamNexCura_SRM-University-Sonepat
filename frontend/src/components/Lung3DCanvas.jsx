import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  Wind, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  EyeOff, 
  Activity
} from 'lucide-react';

/**
 * Procedurally sculpts a unified, anatomically continuous volumetric 3D lung.
 * Models realistic human respiratory anatomy:
 * - Rounded conical apex
 * - Convex costal ribcage contours
 * - Medial hilum cavity
 * - Deep concave diaphragmatic base
 * - Anatomical fissures (oblique & horizontal on right; oblique & cardiac notch on left)
 * 
 * @param {boolean} isLeft - True for left lung (2 lobes + cardiac notch), False for right lung (3 lobes)
 */
function createUnifiedAnatomicalLungGeometry(isLeft = false) {
  // High-density sphere for smooth organic curvature and normals
  const geom = new THREE.SphereGeometry(1, 56, 44);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const yNorm = v.y; // -1 to +1

    // 1. Height, Width, Depth scaling (Natural lung aspect ratio)
    v.y *= 2.65;  // Thoracic vertical height
    v.x *= 1.38;  // Lateral width
    v.z *= 1.18;  // Antero-posterior depth

    // 2. Apex Sculpting (Upper pole narrows smoothly into cervical dome)
    if (yNorm > 0.1) {
      const apexFactor = (yNorm - 0.1) / 0.9;
      const taper = 1.0 - 0.46 * Math.pow(apexFactor, 1.25);
      v.x *= taper;
      v.z *= taper;
      // Apex curves slightly posterior-medially
      v.z -= apexFactor * 0.15;
    }

    // 3. Diaphragmatic Base (Deep upward dome concavity)
    if (yNorm < -0.35) {
      const baseProg = (-yNorm - 0.35) / 0.65;
      const r = Math.sqrt(v.x * v.x + v.z * v.z);
      // Upward dome concavity
      const dome = Math.max(0, 1.25 - r * 0.72) * Math.pow(baseProg, 1.35) * 0.92;
      v.y += dome;
      // Sharp costodiaphragmatic margin flare
      v.x *= 1.0 + baseProg * 0.14;
      v.z *= 1.0 + baseProg * 0.10;
      // Posterior base extends slightly lower
      if (v.z < 0) {
        v.y -= baseProg * 0.22;
      }
    }

    // 4. Medial Hilum Concavity (Surface facing midline is flat with a central indentation)
    const medialSign = isLeft ? -1 : 1;
    if (v.x * medialSign < 0) {
      // Flatten towards mediastinum
      v.x *= 0.68;
      // Hilum depression for airway & vascular entry
      if (Math.abs(v.y) < 0.8 && Math.abs(v.z) < 0.6) {
        const hilumDepth = (1.0 - Math.abs(v.y) / 0.8) * (1.0 - Math.abs(v.z) / 0.6);
        v.x += medialSign * hilumDepth * 0.28;
      }
    }

    // 5. Left Lung Specific Features: Cardiac Notch & Lingula
    if (isLeft) {
      // Deep anterior-medial impression for the pericardium & cardiac silhouette
      if (v.x > -0.2 && v.z > 0.05 && v.y > -0.75 && v.y < 0.45) {
        const notchProg = (v.y + 0.75) / 1.2;
        const notchFactor = Math.sin(notchProg * Math.PI) * Math.max(0, v.z) * 0.68;
        v.x -= notchFactor * 0.55;
        v.z -= notchFactor * 0.35;
      }
      // Lingula process projecting antero-inferiorly
      if (v.y < -0.5 && v.y > -1.2 && v.x > 0.1 && v.z > 0.1) {
        v.x += 0.18;
        v.y -= 0.12;
      }
      // Left Oblique Fissure indentation groove
      const fissPlane = v.y + v.z * 1.1; // oblique angle
      if (Math.abs(fissPlane) < 0.35 && v.x < 0.8) {
        const groove = (1.0 - Math.abs(fissPlane) / 0.35) * 0.12;
        v.x -= groove * 0.5;
        v.z -= groove * 0.5;
      }
    } else {
      // Right Lung Specific Features: 3-Lobe Volume & Fissure Grooves
      v.x *= 1.08;
      v.z *= 1.04;
      // Horizontal Fissure groove (between superior & middle lobes)
      if (Math.abs(v.y - 0.25) < 0.30 && v.z > -0.2) {
        const hGroove = (1.0 - Math.abs(v.y - 0.25) / 0.30) * 0.10;
        v.y -= (v.y > 0.25 ? 1 : -1) * hGroove * 0.3;
        v.z -= hGroove * 0.4;
      }
      // Oblique Fissure groove (separating inferior lobe)
      const rFissPlane = v.y + v.z * 1.15 + 0.1;
      if (Math.abs(rFissPlane) < 0.35) {
        const oGroove = (1.0 - Math.abs(rFissPlane) / 0.35) * 0.12;
        v.x -= oGroove * 0.4;
        v.z -= oGroove * 0.4;
      }
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates high-fidelity GLSL Fresnel Rim Shader matching the approved reference:
 * Translucent cyan-blue pleural tissue with brilliant electric neon rim lighting,
 * and high optical transparency revealing the inner glowing coral-pink airways.
 */
function createPleuralShader(isAlert = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorBase: { value: new THREE.Color(0x011330) },      // Deep translucent midnight sapphire
      uColorRim: { value: new THREE.Color(0x00f0ff) },       // Electric neon cyan rim
      uColorAlertRim: { value: new THREE.Color(0xff2255) },  // Fiery crimson alert rim
      uColorAlertBase: { value: new THREE.Color(0x28020a) }, // Alert deep burgundy
      uAlert: { value: isAlert ? 1.0 : 0.0 },
      uRimPower: { value: 2.2 },
      uOpacity: { value: 0.36 } // Translucent to highlight the interior airways
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorBase;
      uniform vec3 uColorRim;
      uniform vec3 uColorAlertRim;
      uniform vec3 uColorAlertBase;
      uniform float uAlert;
      uniform float uRimPower;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        // High-contrast Fresnel power calculation for neon edge glow
        float fresnel = 1.0 - abs(dot(normal, viewDir));
        float rim = pow(clamp(fresnel, 0.0, 1.0), uRimPower);
        
        vec3 rimCol = mix(uColorRim, uColorAlertRim, uAlert);
        vec3 baseCol = mix(uColorBase, uColorAlertBase, uAlert);
        
        // Luminous rim highlight with translucent interior
        vec3 finalColor = baseCol + rimCol * (rim * 2.5 + 0.15);
        float alpha = clamp(uOpacity * (0.30 + rim * 1.6), 0.0, 0.95);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
  });
}

export default function Lung3DCanvas({
  patient,
  currentObservation,
  onSelectAnnotation
}) {
  const mountRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const rootGroupRef = useRef(null);
  const lungsGroupRef = useRef(null);
  const airwaysGroupRef = useRef(null);
  const leftLungShaderRef = useRef(null);

  // Interaction State
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isBreathing, setIsBreathing] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [labels, setLabels] = useState([]);

  // Telemetry check
  const pef = currentObservation?.peak_flow_pef_l_min || 320;
  const pbPef = patient?.baseline?.personal_best_pef || 450;
  const pefRatio = Math.max(0.4, Math.min(1.0, pef / pbPef));
  const pefDropPct = Math.round((1.0 - pefRatio) * 100);
  const isWheezing = currentObservation?.wheezing === 1;
  const hasAirTrapping = pefDropPct >= 15;
  const respRate = currentObservation?.respiratory_rate_bpm || 18;

  // Orbit State: Positioned so 3D model is visually dominant and centered
  const orbitState = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    distance: 9.2, // Closer camera distance for large, dominant lungs
    targetDistance: 9.2,
    autoRotateSpeed: 0.0032,
    idleTimer: null,
    touchDist: null
  });

  // Anatomical Anchors definition for external leader line callouts
  const anchorsConfig = useMemo(() => [
    {
      id: 'trachea',
      title: 'Trachea',
      subtitle: isWheezing ? 'Mucosal Irritation [Simulated]' : 'Normal Patency',
      status: isWheezing ? 'alert' : 'normal',
      side: 'left',
      preferredY: 0.16,
      pos: new THREE.Vector3(0, 2.6, 0.45),
      worldPos: new THREE.Vector3()
    },
    {
      id: 'right_bronchus',
      title: 'Right Main Bronchus',
      subtitle: 'Steeper 25° Descent',
      status: 'normal',
      side: 'left',
      preferredY: 0.45,
      pos: new THREE.Vector3(-0.95, 0.45, 0.35),
      worldPos: new THREE.Vector3()
    },
    {
      id: 'right_lung',
      title: 'Right Lung (3 Lobes)',
      subtitle: 'Normal Aeration',
      status: 'normal',
      side: 'left',
      preferredY: 0.76,
      pos: new THREE.Vector3(-2.4, -0.6, 0.45),
      worldPos: new THREE.Vector3()
    },
    {
      id: 'left_bronchus',
      title: 'Left Main Bronchus',
      subtitle: 'Elongated 45° Angle',
      status: 'normal',
      side: 'right',
      preferredY: 0.22,
      pos: new THREE.Vector3(1.1, 0.40, 0.35),
      worldPos: new THREE.Vector3()
    },
    {
      id: 'left_lung',
      title: 'Left Lung (2 Lobes)',
      subtitle: hasAirTrapping ? 'Air Trapping [Simulated]' : 'Adequate Ventilation',
      status: hasAirTrapping ? 'alert' : 'normal',
      side: 'right',
      preferredY: 0.52,
      pos: new THREE.Vector3(2.4, -0.5, 0.45),
      worldPos: new THREE.Vector3()
    },
    {
      id: 'bronchioles',
      title: 'Bronchioles & Alveoli',
      subtitle: 'Dense Subsegmental Network',
      status: 'normal',
      side: 'right',
      preferredY: 0.80,
      pos: new THREE.Vector3(1.6, -1.7, 0.35),
      worldPos: new THREE.Vector3()
    }
  ], [isWheezing, hasAirTrapping]);

  const anchorsRef = useRef(anchorsConfig);
  useEffect(() => {
    anchorsRef.current = anchorsConfig;
  }, [anchorsConfig]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 550;
    const height = container.clientHeight || 440;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, orbitState.current.distance);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    container.appendChild(renderer.domElement);

    // 3. Lighting System (Electric Cyan Silhouettes + Radiant Pink-Orange Airway Core)
    const ambientLight = new THREE.AmbientLight(0x061430, 1.4);
    scene.add(ambientLight);

    // Cyan directional lights casting rim highlights
    const cyanLightTop = new THREE.DirectionalLight(0x00f0ff, 2.4);
    cyanLightTop.position.set(3, 7, 7);
    scene.add(cyanLightTop);

    const cyanLightLeft = new THREE.DirectionalLight(0x00e5ff, 2.0);
    cyanLightLeft.position.set(-4, 5, 6);
    scene.add(cyanLightLeft);

    // Deep blue fill from bottom
    const blueFillLight = new THREE.DirectionalLight(0x1e3a8a, 1.2);
    blueFillLight.position.set(0, -7, 4);
    scene.add(blueFillLight);

    // Radiant Coral/Pink-Orange Point Lights (Glowing from inside the carina and hilum)
    const carinaCoreLight = new THREE.PointLight(0xff5533, 6.0, 15, 1.1);
    carinaCoreLight.position.set(0, 1.2, 0.35);
    scene.add(carinaCoreLight);

    const rightHilumLight = new THREE.PointLight(0xff4757, 4.5, 10, 1.1);
    rightHilumLight.position.set(-1.2, 0.1, 0.3);
    scene.add(rightHilumLight);

    const leftHilumLight = new THREE.PointLight(0xff4757, 4.5, 10, 1.1);
    leftHilumLight.position.set(1.2, 0.1, 0.3);
    scene.add(leftHilumLight);

    // 4. Root Container Group (Centered and scaled to be visually dominant)
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, -0.2, 0); // Centers the lungs in the viewport
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    const lungsGroup = new THREE.Group();
    const airwaysGroup = new THREE.Group();
    rootGroup.add(lungsGroup);
    rootGroup.add(airwaysGroup);
    lungsGroupRef.current = lungsGroup;
    airwaysGroupRef.current = airwaysGroup;

    // ==========================================
    // 5. Genuine 3D Airway Tree (Trachea, Bronchi, Multi-Tier Bronchioles)
    // ==========================================

    // A. Trachea Tube
    const tracheaGeom = new THREE.CylinderGeometry(0.38, 0.35, 3.4, 32, 1, true);
    const airwayMat = new THREE.MeshStandardMaterial({
      color: 0xff5533,
      emissive: 0xff3838,
      emissiveIntensity: 2.2,
      roughness: 0.18,
      metalness: 0.10,
      side: THREE.DoubleSide
    });
    const tracheaMesh = new THREE.Mesh(tracheaGeom, airwayMat);
    tracheaMesh.position.set(0, 2.8, 0);
    airwaysGroup.add(tracheaMesh);

    // B. Segmented Tracheal Cartilaginous Rings (15 distinct rings with spacing)
    const ringCount = 15;
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff7733,
      emissive: 0xff5522,
      emissiveIntensity: 2.4,
      roughness: 0.14
    });
    for (let r = 0; r < ringCount; r++) {
      const ringGeom = new THREE.TorusGeometry(0.40, 0.056, 14, 36);
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(0, 1.35 + r * 0.21, 0);
      airwaysGroup.add(ringMesh);
    }

    // Thyroid cartilage prominence at trachea top
    const thyroidGeom = new THREE.CylinderGeometry(0.46, 0.38, 0.45, 24);
    const thyroidMesh = new THREE.Mesh(thyroidGeom, ringMat);
    thyroidMesh.position.set(0, 4.4, 0.05);
    airwaysGroup.add(thyroidMesh);

    // C. Primary Mainstem Bronchi
    const rightMainBronchusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.25, 0),
      new THREE.Vector3(-0.45, 0.85, 0.06),
      new THREE.Vector3(-1.05, 0.35, 0.10),
      new THREE.Vector3(-1.55, -0.15, 0.12)
    ]);
    const rightMainBronchusMesh = new THREE.Mesh(
      new THREE.TubeGeometry(rightMainBronchusCurve, 24, 0.25, 16, false),
      airwayMat
    );
    airwaysGroup.add(rightMainBronchusMesh);

    const leftMainBronchusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.25, 0),
      new THREE.Vector3(0.55, 0.80, 0.05),
      new THREE.Vector3(1.20, 0.30, 0.08),
      new THREE.Vector3(1.75, -0.20, 0.10)
    ]);
    const leftMainBronchusMesh = new THREE.Mesh(
      new THREE.TubeGeometry(leftMainBronchusCurve, 24, 0.22, 16, false),
      airwayMat
    );
    airwaysGroup.add(leftMainBronchusMesh);

    // D. Multi-Tier Branching Bronchial Trees throughout both lungs
    const bronchioleMat = new THREE.MeshStandardMaterial({
      color: 0xff5252,
      emissive: 0xff3b30,
      emissiveIntensity: 1.45,
      roughness: 0.22
    });

    const alveoliPositions = [];

    function addBranch(pts, radius) {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
      const geom = new THREE.TubeGeometry(curve, 14, radius, 10, false);
      const mesh = new THREE.Mesh(geom, bronchioleMat);
      airwaysGroup.add(mesh);

      const tip = pts[pts.length - 1];
      alveoliPositions.push(new THREE.Vector3(tip[0], tip[1], tip[2]));
    }

    // Right Lung Bronchiole Tree (Superior, Middle & Inferior Lobes)
    addBranch([[-1.55, -0.15, 0.12], [-1.75, 0.65, 0.18], [-1.85, 1.40, 0.14], [-1.70, 1.95, 0.08]], 0.14);
    addBranch([[-1.75, 0.65, 0.18], [-2.30, 0.95, 0.30], [-2.60, 1.30, 0.20]], 0.09);
    addBranch([[-1.85, 1.40, 0.14], [-2.15, 1.80, 0.20], [-2.05, 2.15, 0.12]], 0.06);
    addBranch([[-2.30, 0.95, 0.30], [-2.75, 0.90, 0.35], [-2.95, 1.05, 0.25]], 0.06);

    addBranch([[-1.55, -0.15, 0.12], [-2.15, 0.05, 0.35], [-2.75, 0.15, 0.35], [-3.10, 0.25, 0.22]], 0.13);
    addBranch([[-2.15, 0.05, 0.35], [-2.45, -0.45, 0.42], [-2.85, -0.65, 0.32]], 0.08);
    addBranch([[-2.75, 0.15, 0.35], [-3.15, -0.15, 0.38], [-3.35, -0.30, 0.25]], 0.06);

    addBranch([[-1.55, -0.15, 0.12], [-1.85, -0.85, 0.22], [-2.05, -1.65, 0.16], [-2.15, -2.25, 0.10]], 0.14);
    addBranch([[-1.85, -0.85, 0.22], [-2.50, -1.15, 0.30], [-2.95, -1.50, 0.20]], 0.09);
    addBranch([[-2.05, -1.65, 0.16], [-1.65, -2.15, 0.14], [-1.45, -2.45, 0.06]], 0.07);
    addBranch([[-2.50, -1.15, 0.30], [-2.85, -1.85, 0.24], [-2.90, -2.25, 0.14]], 0.06);
    addBranch([[-2.05, -1.65, 0.16], [-2.55, -2.05, 0.18], [-2.60, -2.40, 0.10]], 0.05);

    // Left Lung Bronchiole Tree (Superior & Inferior Lobes)
    addBranch([[1.75, -0.20, 0.10], [1.95, 0.60, 0.16], [2.10, 1.30, 0.12], [1.85, 1.90, 0.06]], 0.13);
    addBranch([[1.95, 0.60, 0.16], [2.50, 0.85, 0.25], [2.80, 1.20, 0.16]], 0.08);
    addBranch([[2.10, 1.30, 0.12], [2.35, 1.75, 0.16], [2.25, 2.10, 0.10]], 0.06);
    addBranch([[1.75, -0.20, 0.10], [2.30, 0.05, 0.30], [2.75, 0.15, 0.24], [3.05, 0.22, 0.12]], 0.11);
    addBranch([[2.30, 0.05, 0.30], [2.65, -0.40, 0.36], [2.90, -0.70, 0.28]], 0.07);

    addBranch([[1.75, -0.20, 0.10], [2.00, -0.90, 0.20], [2.20, -1.65, 0.14], [2.30, -2.25, 0.08]], 0.13);
    addBranch([[2.00, -0.90, 0.20], [2.65, -1.20, 0.26], [3.00, -1.55, 0.16]], 0.08);
    addBranch([[2.20, -1.65, 0.14], [1.70, -2.20, 0.10], [1.50, -2.45, 0.04]], 0.07);
    addBranch([[2.65, -1.20, 0.26], [2.85, -1.85, 0.20], [2.80, -2.25, 0.12]], 0.06);
    addBranch([[2.20, -1.65, 0.14], [2.55, -2.05, 0.15], [2.55, -2.40, 0.08]], 0.05);

    // E. Instanced Alveolar Sac Clouds (Glowing Pink-Magenta Clusters)
    const alveoliCount = alveoliPositions.length * 6;
    const alveoliGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const alveoliMat = new THREE.MeshStandardMaterial({
      color: 0xff70a6,
      emissive: 0xff4081,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8
    });
    const alveoliInstanced = new THREE.InstancedMesh(alveoliGeom, alveoliMat, alveoliCount);
    const dummy = new THREE.Object3D();

    let aIdx = 0;
    alveoliPositions.forEach(tip => {
      for (let k = 0; k < 6; k++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.5) * 0.30
        );
        dummy.position.copy(tip).add(offset);
        const s = 0.6 + Math.random() * 0.7;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        alveoliInstanced.setMatrixAt(aIdx++, dummy.matrix);
      }
    });
    alveoliInstanced.instanceMatrix.needsUpdate = true;
    airwaysGroup.add(alveoliInstanced);

    // F. Dynamic Airflow Particles along Airways
    const pCount = 55;
    const pGeom = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pPhases = new Float32Array(pCount);

    for (let p = 0; p < pCount; p++) {
      pPhases[p] = Math.random();
      pPositions[p * 3] = 0;
      pPositions[p * 3 + 1] = 4.2 - pPhases[p] * 6.0;
      pPositions[p * 3 + 2] = 0.1;
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.14,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const airflowParticles = new THREE.Points(pGeom, pMat);
    airwaysGroup.add(airflowParticles);

    // ==========================================
    // 6. Unified Organic 3D Anatomical Lungs (Cyan Translucent Glassmorphism)
    // ==========================================
    // Right Lung (3 Anatomical Lobes: Superior, Middle, Inferior)
    const rightLungGeom = createUnifiedAnatomicalLungGeometry(false);
    const rightLungShader = createPleuralShader(false);
    const rightLungMesh = new THREE.Mesh(rightLungGeom, rightLungShader);
    rightLungMesh.position.set(-2.0, -0.3, 0);
    lungsGroup.add(rightLungMesh);

    // Left Lung (2 Anatomical Lobes with Cardiac Notch)
    const leftLungGeom = createUnifiedAnatomicalLungGeometry(true);
    const leftLungShader = createPleuralShader(false);
    leftLungShaderRef.current = leftLungShader;
    const leftLungMesh = new THREE.Mesh(leftLungGeom, leftLungShader);
    leftLungMesh.position.set(2.0, -0.3, 0);
    lungsGroup.add(leftLungMesh);

    // Fine Neon Pleural Contour Wireframes (Defines organic edge borders)
    const rightWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(rightLungGeom),
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.08 })
    );
    rightWire.position.copy(rightLungMesh.position);
    lungsGroup.add(rightWire);

    const leftWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(leftLungGeom),
      new THREE.LineBasicMaterial({ 
        color: 0x00f0ff, 
        transparent: true, 
        opacity: 0.08 
      })
    );
    leftWire.position.copy(leftLungMesh.position);
    lungsGroup.add(leftWire);

    // Atmospheric Ground Horizon
    const groundGeom = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x020817,
      transparent: true,
      opacity: 0.45
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -3.2, 0);
    scene.add(groundMesh);

    // ==========================================
    // 7. Render & Animation Loop
    // ==========================================
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth Camera & Orbit Dampening
      const s = orbitState.current;
      if (isAutoRotating && !s.isDragging) {
        s.targetYaw += s.autoRotateSpeed;
      }

      s.yaw += (s.targetYaw - s.yaw) * 0.1;
      s.pitch += (s.targetPitch - s.pitch) * 0.1;
      s.distance += (s.targetDistance - s.distance) * 0.12;

      rootGroup.rotation.y = s.yaw;
      rootGroup.rotation.x = s.pitch;
      camera.position.z = s.distance;

      // Gentle Tidal Breathing Animation
      if (isBreathing) {
        const breathFreq = (respRate / 60) * Math.PI * 2;
        const breathFactor = Math.sin(time * breathFreq) * 0.5 + 0.5;

        // Volumetric expansion of lung envelopes
        const lungScale = 1.0 + breathFactor * 0.058;
        lungsGroup.scale.set(lungScale, 1.0 + breathFactor * 0.040, lungScale);

        // Airway pulsation
        const airwayScale = 1.0 + breathFactor * 0.018;
        airwaysGroup.scale.set(airwayScale, 1.0, airwayScale);

        carinaCoreLight.intensity = 5.2 + breathFactor * 1.6;
      }

      // Airflow Particles Animation
      const pArr = pGeom.attributes.position.array;
      for (let p = 0; p < pCount; p++) {
        pPhases[p] = (pPhases[p] + delta * 0.48) % 1.0;
        const ph = pPhases[p];

        if (ph < 0.4) {
          pArr[p * 3] = (Math.random() - 0.5) * 0.14;
          pArr[p * 3 + 1] = 4.2 - (ph / 0.4) * 3.0;
          pArr[p * 3 + 2] = 0.12;
        } else {
          const branchSide = p % 2 === 0 ? -1 : 1;
          const branchProg = (ph - 0.4) / 0.6;
          pArr[p * 3] = branchSide * branchProg * 2.3;
          pArr[p * 3 + 1] = 1.2 - branchProg * 2.7;
          pArr[p * 3 + 2] = 0.12 + Math.sin(branchProg * Math.PI) * 0.15;
        }
      }
      pGeom.attributes.position.needsUpdate = true;

      // Dynamic Zero-Clipping Leader Line Callouts
      if (showLabels && container) {
        const curW = container.clientWidth || width;
        const curH = container.clientHeight || height;
        const halfW = curW / 2;
        const halfH = curH / 2;

        const leftCol = [];
        const rightCol = [];

        anchorsRef.current.forEach(anchor => {
          anchor.worldPos.copy(anchor.pos);
          anchor.worldPos.applyEuler(rootGroup.rotation);
          anchor.worldPos.add(rootGroup.position);

          const ndc = anchor.worldPos.clone().project(camera);
          const isFront = ndc.z < 1.0 && ndc.z > -1.0;
          const ax = ndc.x * halfW + halfW;
          const ay = -ndc.y * halfH + halfH;

          const item = {
            id: anchor.id,
            title: anchor.title,
            subtitle: anchor.subtitle,
            status: anchor.status,
            side: anchor.side,
            preferredY: anchor.preferredY * curH,
            anchorX: ax,
            anchorY: ay,
            depth: anchor.worldPos.z,
            visible: isFront
          };

          if (anchor.side === 'left') {
            leftCol.push(item);
          } else {
            rightCol.push(item);
          }
        });

        // Anti-Collision Margin Alignment:
        // Left badges anchor to left edge (left: 12px)
        // Right badges anchor to right edge (right: 12px)
        const layoutColumn = (items, isRight) => {
          items.sort((a, b) => a.preferredY - b.preferredY);
          const minGap = 56;
          const topBound = 52;
          const bottomBound = curH - 58;

          let currentY = topBound;
          items.forEach(item => {
            const idealY = Math.max(topBound, Math.min(bottomBound, item.preferredY));
            currentY = Math.max(currentY, idealY);
            item.labelY = currentY;
            // Leader line elbow point
            item.elbowX = isRight ? curW - 145 : 145;
            item.elbowY = currentY;
            // Leader target line attachment point
            item.targetX = isRight ? curW - 130 : 130;
            item.targetY = currentY;
            currentY += minGap;
          });
        };

        layoutColumn(leftCol, false);
        layoutColumn(rightCol, true);

        setLabels([...leftCol, ...rightCol]);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isAutoRotating, isBreathing, showLabels, respRate, hasAirTrapping]);

  // ==========================================
  // 8. Pointer & Touch Event Handlers
  // ==========================================
  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    orbitState.current.isDragging = true;
    setIsDragging(true);
    orbitState.current.prevX = e.clientX;
    orbitState.current.prevY = e.clientY;

    if (orbitState.current.idleTimer) clearTimeout(orbitState.current.idleTimer);
  };

  const handlePointerMove = (e) => {
    const s = orbitState.current;
    if (!s.isDragging) return;

    const dx = e.clientX - s.prevX;
    const dy = e.clientY - s.prevY;
    s.prevX = e.clientX;
    s.prevY = e.clientY;

    s.targetYaw += dx * 0.0075;
    s.targetPitch += dy * 0.0075;

    // Pitch clamping between -75deg and +75deg
    const maxPitch = (75 * Math.PI) / 180;
    s.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, s.targetPitch));
  };

  const handlePointerUp = (e) => {
    orbitState.current.isDragging = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    if (orbitState.current.idleTimer) clearTimeout(orbitState.current.idleTimer);
    orbitState.current.idleTimer = setTimeout(() => {}, 3500);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const s = orbitState.current;
    const zoomDelta = e.deltaY * 0.010;
    s.targetDistance = Math.max(6.5, Math.min(18.0, s.targetDistance + zoomDelta));
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (orbitState.current.touchDist !== null) {
        const delta = (orbitState.current.touchDist - dist) * 0.025;
        orbitState.current.targetDistance = Math.max(6.5, Math.min(18.0, orbitState.current.targetDistance + delta));
      }
      orbitState.current.touchDist = dist;
    }
  };

  const handleTouchEnd = () => {
    orbitState.current.touchDist = null;
  };

  const handleResetView = () => {
    const s = orbitState.current;
    s.targetYaw = 0;
    s.targetPitch = 0;
    s.targetDistance = 9.2;
  };

  const handleZoomIn = () => {
    const s = orbitState.current;
    s.targetDistance = Math.max(6.5, s.targetDistance - 2.0);
  };

  const handleZoomOut = () => {
    const s = orbitState.current;
    s.targetDistance = Math.min(18.0, s.targetDistance + 2.0);
  };

  return (
    <div 
      ref={containerRef}
      className="lung-3d-viewport-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '420px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 45%, #05122b 0%, #030816 70%, #01040a 100%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* SVG Leader Lines Connecting Exterior Callouts to 3D Anchors */}
      {showLabels && (
        <svg 
          className="lung-3d-leader-lines"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 12
          }}
        >
          <defs>
            <filter id="leaderGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {labels.map(l => l.visible && (
            <g key={`leader-${l.id}`} opacity={Math.max(0.35, Math.min(1.0, 1.2 + l.depth * 0.22))}>
              {/* Leader Line to Badge attachment */}
              <polyline
                points={`${l.anchorX},${l.anchorY} ${l.elbowX},${l.elbowY} ${l.targetX},${l.targetY}`}
                fill="none"
                stroke={l.status === 'alert' ? '#ff2255' : '#00f0ff'}
                strokeWidth="1.2"
                strokeDasharray="3 2"
                opacity="0.8"
                filter="url(#leaderGlow)"
              />
              {/* Glowing Anchor Dot on 3D Organ */}
              <circle
                cx={l.anchorX}
                cy={l.anchorY}
                r="3.5"
                fill={l.status === 'alert' ? '#ff2255' : '#00f0ff'}
                filter="url(#leaderGlow)"
              />
              <circle
                cx={l.anchorX}
                cy={l.anchorY}
                r="1.5"
                fill="#ffffff"
              />
            </g>
          ))}
        </svg>
      )}

      {/* Floating HUD Controls Toolbar (Compact single row at top-right) */}
      <div className="lung-3d-hud-toolbar">
        <button
          className="hud-btn"
          onClick={handleResetView}
          title="Reset Anatomical Orientation & Zoom"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>

        <button
          className={`hud-btn ${isAutoRotating ? 'active' : ''}`}
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          title={isAutoRotating ? "Pause Idle Orbit" : "Resume Idle Orbit"}
        >
          {isAutoRotating ? <Pause size={12} /> : <Play size={12} />}
          <span>{isAutoRotating ? 'Auto' : 'Paused'}</span>
        </button>

        <button
          className={`hud-btn ${isBreathing ? 'active' : ''}`}
          onClick={() => setIsBreathing(!isBreathing)}
          title="Toggle Tidal Breathing Dynamics"
        >
          <Wind size={12} />
          <span>Breathing</span>
        </button>

        <div className="hud-btn-group">
          <button className="hud-btn icon-only" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={12} />
          </button>
          <button className="hud-btn icon-only" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={12} />
          </button>
        </div>

        <button
          className={`hud-btn icon-only ${showLabels ? 'active' : ''}`}
          onClick={() => setShowLabels(!showLabels)}
          title={showLabels ? "Hide Anatomical Labels" : "Show Anatomical Labels"}
        >
          {showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
      </div>

      {/* Exterior Margin Non-Colliding Callout Badges */}
      {showLabels && labels.map(label => label.visible && (
        <div
          key={label.id}
          className={`lung-3d-anchor-pin ${label.status === 'alert' ? 'alert' : ''}`}
          style={{
            position: 'absolute',
            ...(label.side === 'left' ? { left: '10px' } : { right: '10px', left: 'auto' }),
            top: `${label.labelY}px`,
            transform: 'translateY(-50%)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 15,
            transition: 'top 0.1s ease',
            maxWidth: '150px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectAnnotation?.({
              title: label.title,
              subtitle: label.subtitle,
              status: label.status
            });
          }}
        >
          <div className={`pin-pill ${label.status === 'alert' ? 'alert' : ''}`}>
            <span className={`pin-dot ${label.status === 'alert' ? 'red' : ''}`} />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <strong style={{ fontSize: '10px', lineHeight: 1.15, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {label.title}
              </strong>
              <span style={{ fontSize: '8.5px', opacity: 0.85, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {label.subtitle}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Subtle Bottom Status Bar */}
      <div className="lung-3d-bottom-info">
        <span className="info-indicator">
          <Activity size={11} style={{ color: '#00f0ff' }} />
          <span>Physiological 3D Twin • Luminous Volumetric Model</span>
        </span>
        <span className="info-hint">Drag to inspect • Scroll to zoom</span>
      </div>
    </div>
  );
}
