/**
 * Wagner Barbosa Portfolio - Antigravity Particle Wave Effect
 * Powered by Three.js (WebGL)
 * 
 * Recreates the premium interactive particle waves from antigravity.google.
 * Inspired by Hinarosha's BreathDearMedusae implementation.
 */

(function () {
    let container, scene, camera, renderer, instancedMesh;
    const countX = 85;
    const countY = 48;
    const count = countX * countY;

    const mouseTarget = new THREE.Vector2(0, 0);
    const mouseCurrent = new THREE.Vector2(0, 0);
    let mouseActive = 0.0;
    let mouseActiveTarget = 0.0;
    let clock = new THREE.Clock();

    // Shaders for Instanced Mesh
    const vertexShader = `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uMouseActive;
        
        varying vec2 vUv;
        varying float vSize;
        varying vec2 vPos;
        
        attribute vec3 aOffset; 
        attribute float aRandom;
        
        #define PI 3.14159265359

        // 2D Value Noise for organic halo shape
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        mat2 rotate2d(float _angle){
            return mat2(cos(_angle), sin(_angle),
                        -sin(_angle), cos(_angle));
        }

        void main() {
            vUv = uv;
            vec3 pos = aOffset;
            
            // --- 1. ALIVE FLOW (Base layer) ---
            float driftSpeed = uTime * 0.15;
            float dx = sin(driftSpeed + pos.y * 0.5) + sin(driftSpeed * 0.5 + pos.y * 2.0);
            float dy = cos(driftSpeed + pos.x * 0.5) + cos(driftSpeed * 0.5 + pos.x * 2.0);
            
            pos.x += dx * 0.15; 
            pos.y += dy * 0.15;

            // --- 2. THE JELLYFISH HALO (Smooth & Subtle) ---
            vec2 relToMouse = pos.xy - uMouse;
            float distFromMouse = length(relToMouse);
            float angleToMouse = atan(relToMouse.y, relToMouse.x);
            
            // Organic Halo Shape evolving slowly over time
            float shapeFactor = noise(vec2(angleToMouse * 2.0, uTime * 0.1));
            
            // Breathing cycle: slow expansion/contraction of the Halo Radius
            float breathCycle = sin(uTime * 0.8);
            
            // Radius breathes
            float currentRadius = 2.4 + breathCycle * 0.2 + (shapeFactor * 0.4);
            
            // Interaction Ring Influence (wider ring but still keeping center empty)
            float rimWidth = 1.6;
            float rimInfluence = smoothstep(rimWidth, 0.0, abs(distFromMouse - currentRadius));
            
            // --- 3. WAVE MOVEMENT (Gentle Ripple) ---
            vec2 pushDir = normalize(relToMouse + vec2(0.0001, 0.0));
            float pushAmt = (breathCycle * 0.5 + 0.5) * 0.3; // 0 to 0.3
            
            // Apply push near the ring, scaled by uMouseActive
            pos.xy += pushDir * pushAmt * rimInfluence * uMouseActive;
            pos.z += rimInfluence * 0.2 * sin(uTime) * uMouseActive;

            // --- 4. SIZE & SCALE (Balanced) ---
            float baseSize = 0.015; // Slightly larger base so they don't disappear entirely
            float activeSize = 0.040; // Allow them to grow enough to be clearly seen
            float currentScale = baseSize + (rimInfluence * activeSize * uMouseActive);
            
            // Stretch along the X axis (pointing towards mouse)
            float stretch = rimInfluence * 0.08 * uMouseActive;
            
            vec3 transformed = position;
            transformed.x *= (currentScale + stretch); // Length of the dash
            transformed.y *= currentScale * 0.6; // Thickness of the dash
            
            vSize = rimInfluence * uMouseActive;
            vPos = pos.xy;
            
            // --- 5. ROTATION (Directed towards mouse / Radial) ---
            float targetAngle = angleToMouse; 
            transformed.xy = rotate2d(targetAngle) * transformed.xy;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + transformed, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        varying vec2 vUv;
        varying float vSize;
        varying vec2 vPos;

        void main() {
            // Shape: "Rectangle with rounded corners"
            vec2 center = vec2(0.5);
            vec2 pos = abs(vUv - center) * 2.0; 
            
            float d = pow(pow(pos.x, 2.6) + pow(pos.y, 2.6), 1.0 / 2.6);
            float alpha = 1.0 - smoothstep(0.7, 1.0, d);
            
            if (alpha < 0.01) discard;

            // Subtle but bright Light Blue Colors
            vec3 cBlue1 = vec3(0.5, 0.75, 1.0);   // Bright soft blue
            vec3 cBlue2 = vec3(0.3, 0.6, 1.0);    // Bright medium blue
            vec3 cWhite = vec3(0.9, 0.95, 1.0);   // Bright tinted white
            
            // Dynamic Color Shifting based on position and time
            float t = uTime * 0.8;
            float p1 = sin(vPos.x * 0.8 + t);
            float p2 = sin(vPos.y * 0.8 + t * 0.8 + p1);
            
            vec3 activeColor = mix(cBlue1, cBlue2, p1 * 0.5 + 0.5);
            activeColor = mix(activeColor, cWhite, p2 * 0.5 + 0.5);
            
            vec3 finalColor = activeColor;
            
            // Fade alpha to 0 when far from cursor (vSize goes to 0)
            // Restore maximum alpha back to 1.0 so the particles are vividly glowing
            float finalAlpha = alpha * mix(0.0, 1.0, vSize);

            if (finalAlpha < 0.01) discard;

            gl_FragColor = vec4(finalColor, finalAlpha);
        }
    `;

    function init() {
        container = document.getElementById('particles');
        if (!container) return;

        // Clean any leftovers
        container.innerHTML = '';

        // Setup Scene & Renderer
        scene = new THREE.Scene();
        
        // Setup Camera: placed at Z = 15, matching React Three Fiber setup
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.z = 15;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0); // Transparent background
        container.appendChild(renderer.domElement);

        // Setup Instanced Mesh
        // Using a Plane Geometry for the stretched pills
        const geometry = new THREE.PlaneGeometry(1, 1);

        // Populate instanced attributes
        const offsets = new Float32Array(count * 3);
        const randoms = new Float32Array(count);

        // Grid boundaries (covers Z=15 viewport perfectly with some overflow)
        const gridWidth = 40;
        const gridHeight = 22;
        const jitter = 0.25;

        let i = 0;
        for (let y = 0; y < countY; y++) {
            for (let x = 0; x < countX; x++) {
                const u = x / (countX - 1);
                const v = y / (countY - 1);

                // Grid positions centered around (0,0)
                let px = (u - 0.5) * gridWidth;
                let py = (v - 0.5) * gridHeight;

                // Add grid jitter/noise
                px += (Math.random() - 0.5) * jitter;
                py += (Math.random() - 0.5) * jitter;

                offsets[i * 3 + 0] = px;
                offsets[i * 3 + 1] = py;
                offsets[i * 3 + 2] = 0;

                randoms[i] = Math.random();
                i++;
            }
        }

        geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
        geometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1));

        // Create Custom Shader Material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uMouseActive: { value: 0.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        scene.add(instancedMesh);

        // Bind Events
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseenter', onMouseEnter);
        window.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('resize', onWindowResize);

        // Run Animation Loop
        animate();
    }

    function onMouseMove(e) {
        if (!container || !camera) return;

        // Calculate Normalized Device Coordinates (NDC)
        const rect = container.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Directly project mouse coords to Z=0 plane using viewport size
        const vFOV = (camera.fov * Math.PI) / 180;
        const viewportHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
        const viewportWidth = viewportHeight * (window.innerWidth / window.innerHeight);

        mouseTarget.x = (ndcX * viewportWidth) / 2;
        mouseTarget.y = (ndcY * viewportHeight) / 2;
        mouseActiveTarget = 1.0;
    }

    function onMouseEnter() {
        mouseActiveTarget = 1.0;
    }

    function onMouseLeave() {
        mouseActiveTarget = 0.0;
    }

    function onWindowResize() {
        if (!container || !camera || !renderer) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    function animate() {
        requestAnimationFrame(animate);

        if (!renderer || !scene || !camera || !instancedMesh) return;

        const time = clock.getElapsedTime();

        // Pass elapsed time to Shader
        instancedMesh.material.uniforms.uTime.value = time;

        // Smoothly ease/interpolate mouse position (lag trailing wave effect)
        const current = instancedMesh.material.uniforms.uMouse.value;
        const dragFactor = 0.055; // Matches BreathDearMedusae drag
        current.x += (mouseTarget.x - current.x) * dragFactor;
        current.y += (mouseTarget.y - current.y) * dragFactor;

        // Smoothly fade mouse activation (prevent hard transitions)
        mouseActive += (mouseActiveTarget - mouseActive) * 0.05;
        instancedMesh.material.uniforms.uMouseActive.value = mouseActive;

        renderer.render(scene, camera);
    }

    // Initialize once page is loaded
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
