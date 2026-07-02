/**
 * Wagner Barbosa Portfolio - Antigravity Particle Wave Effect
 * Powered by Three.js (WebGL)
 * 
 * Recreates the premium interactive particle waves from antigravity.google.
 */

(function () {
    // 1. Poisson Disk Sampling implementation for uniform, organic particle layout
    function poissonDiskSampling(width, height, minDistance, maxTries = 25) {
        const cellSize = minDistance / Math.sqrt(2);
        const gridWidth = Math.ceil(width / cellSize);
        const gridHeight = Math.ceil(height / cellSize);
        const grid = new Array(gridWidth * gridHeight).fill(null);
        
        const points = [];
        const active = [];
        
        function insertPoint(p) {
            points.push(p);
            active.push(p);
            const col = Math.floor(p[0] / cellSize);
            const row = Math.floor(p[1] / cellSize);
            grid[col + row * gridWidth] = p;
        }
        
        // Start with a point in the center
        insertPoint([width / 2, height / 2]);
        
        while (active.length > 0) {
            const randIdx = Math.floor(Math.random() * active.length);
            const p = active[randIdx];
            let found = false;
            
            for (let i = 0; i < maxTries; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = minDistance + Math.random() * minDistance;
                const newX = p[0] + Math.cos(angle) * dist;
                const newY = p[1] + Math.sin(angle) * dist;
                
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const col = Math.floor(newX / cellSize);
                    const row = Math.floor(newY / cellSize);
                    
                    let tooClose = false;
                    for (let r = Math.max(0, row - 2); r <= Math.min(gridHeight - 1, row + 2); r++) {
                        for (let c = Math.max(0, col - 2); c <= Math.min(gridWidth - 1, col + 2); c++) {
                            const neighbor = grid[c + r * gridWidth];
                            if (neighbor) {
                                const dx = neighbor[0] - newX;
                                const dy = neighbor[1] - newY;
                                if (dx * dx + dy * dy < minDistance * minDistance) {
                                    tooClose = true;
                                    break;
                                }
                            }
                        }
                        if (tooClose) break;
                    }
                    
                    if (!tooClose) {
                        insertPoint([newX, newY]);
                        found = true;
                        break;
                    }
                }
            }
            
            if (!found) {
                active.splice(randIdx, 1);
            }
        }
        
        return points;
    }

    // 2. Main Application Setup
    let container, scene, camera, renderer, particleGeometry, particleMaterial, particleSystem;
    const mouse = new THREE.Vector2(0, 0);
    const smoothMouse = new THREE.Vector2(0, 0);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();
    const ndcMouse = new THREE.Vector2();
    let mouseActive = 0.0;
    let mouseActiveTarget = 0.0;
    let clock = new THREE.Clock();

    // Custom Shader Definitions
    const vertexShader = `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uMouseActive;
        
        attribute float aSize;
        attribute vec3 aRandoms;
        
        varying vec3 vColor;
        varying float vDisplacement;
        
        void main() {
            vec3 pos = position;
            
            // 1. Idle breathing floating animation
            float floatSpeed = 0.4 + aRandoms.z * 0.4;
            float floatAmplitude = 1.0 + aRandoms.x * 2.0;
            pos.x += sin(uTime * floatSpeed + aRandoms.y * 10.0) * floatAmplitude * 0.15;
            pos.y += cos(uTime * floatSpeed + aRandoms.x * 10.0) * floatAmplitude * 0.15;
            pos.z += sin(uTime * floatSpeed * 0.8 + (aRandoms.x + aRandoms.y) * 5.0) * floatAmplitude * 0.6;
            
            // 2. Wave deformation based on 2D distance to mouse
            float dist = distance(pos.xy, uMouse);
            
            float waveRadius = 38.0;
            float waveWidth = 28.0;
            float maxDisplacement = 24.0;
            
            float ripple = 0.0;
            if (dist < waveRadius + waveWidth) {
                float normDist = (dist - waveRadius) / waveWidth;
                ripple = exp(-pow(normDist * 2.2, 2.0));
            }
            
            float displacement = ripple * maxDisplacement * uMouseActive;
            pos.z += displacement;
            
            // 3. Outward push away from the cursor (repulsion)
            if (dist > 0.1 && dist < waveRadius + waveWidth) {
                vec2 dir = normalize(pos.xy - uMouse);
                float push = ripple * 7.0 * uMouseActive;
                pos.xy += dir * push;
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Size attenuation (gets larger closer to camera)
            gl_PointSize = aSize * (350.0 / -mvPosition.z);
            
            // 4. Color states (mix grey-white with neon gradients during interaction)
            vec3 baseColor = vec3(0.40, 0.41, 0.45);
            
            // Antigravity active color palette (interpolated red-blue gradient)
            vec3 activeColorRed = vec3(0.98, 0.27, 0.25);  // #FF4641
            vec3 activeColorBlue = vec3(0.20, 0.42, 0.95); // #346BF1
            
            // Mix active colors based on X position to create a beautiful gradient sweep
            vec3 activeColor = mix(activeColorRed, activeColorBlue, sin(position.x * 0.012) * 0.5 + 0.5);
            
            // Interpolate colors based on displacement amount
            float colorFactor = clamp((displacement - 0.5) / 14.0, 0.0, 1.0);
            vColor = mix(baseColor, activeColor, colorFactor);
            vDisplacement = displacement;
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;
        varying float vDisplacement;
        
        void main() {
            // Cut off square coordinates to render round dots
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            
            if (dist > 0.5) {
                discard;
            }
            
            // Anti-aliasing for clean point borders
            float alpha = smoothstep(0.5, 0.43, dist);
            
            // Dynamic neon glow factor for high waves
            float glow = 1.0 + clamp(vDisplacement * 0.05, 0.0, 1.2);
            
            gl_FragColor = vec4(vColor * glow, alpha * 0.75);
        }
    `;

    function init() {
        container = document.getElementById('particles');
        if (!container) return;

        // Clean any leftovers
        container.innerHTML = '';

        // Setup Scene & Renderer
        scene = new THREE.Scene();
        
        // Setup Camera: positioned at Z = 120, looking at (0, 0, 0)
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
        camera.position.z = 125;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0); // Transparent background
        container.appendChild(renderer.domElement);

        // Generate Particles using Poisson Disk Sampling
        // Using a coordinate grid from -220 to 220 on X, and -150 to 150 on Y to fully cover typical viewports
        const gridW = 440;
        const gridH = 300;
        const rawPoints = poissonDiskSampling(gridW, gridH, 5.8);
        
        const count = rawPoints.length;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const randoms = new Float32Array(count * 3); // random offsets and speeds

        // Offset center to (0,0) and populate attributes
        for (let i = 0; i < count; i++) {
            const px = rawPoints[i][0] - gridW / 2;
            const py = rawPoints[i][1] - gridH / 2;
            const pz = 0;

            positions[i * 3 + 0] = px;
            positions[i * 3 + 1] = py;
            positions[i * 3 + 2] = pz;

            // Default base point color (subtle grey)
            colors[i * 3 + 0] = 0.40;
            colors[i * 3 + 1] = 0.41;
            colors[i * 3 + 2] = 0.45;

            // Point size (randomized slightly for texture richness)
            sizes[i] = 1.0 + Math.random() * 1.8;

            // Random attributes for individual breathing animations
            randoms[i * 3 + 0] = Math.random(); // amplitude factor
            randoms[i * 3 + 1] = Math.random(); // phase offset
            randoms[i * 3 + 2] = Math.random(); // speed multiplier
        }

        particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        particleGeometry.setAttribute('aRandoms', new THREE.BufferAttribute(randoms, 3));

        // Create Custom Shader Material
        particleMaterial = new THREE.ShaderMaterial({
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

        particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

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
        ndcMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndcMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Project mouse on Z = 0 Plane using Raycaster
        raycaster.setFromCamera(ndcMouse, camera);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(planeZ, intersect);

        mouse.x = intersect.x;
        mouse.y = intersect.y;
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

        if (!renderer || !scene || !camera || !particleMaterial) return;

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Pass elapsed time to Shader
        particleMaterial.uniforms.uTime.value = time;

        // Smoothly ease/interpolate mouse position (lag trailing wave effect)
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.07;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.07;
        particleMaterial.uniforms.uMouse.value.copy(smoothMouse);

        // Smoothly fade mouse activation (prevent hard transitions)
        mouseActive += (mouseActiveTarget - mouseActive) * 0.05;
        particleMaterial.uniforms.uMouseActive.value = mouseActive;

        renderer.render(scene, camera);
    }

    // Initialize once page is loaded
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
