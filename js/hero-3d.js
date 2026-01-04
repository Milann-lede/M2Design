document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hero-3d-container');
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    function updateSize() {
        // Use container dimensions or fallback to window if container is 0 height during load?
        // Ideally, hero should have height.
        let width = container.offsetWidth;
        let height = container.offsetHeight;

        // Fallback for safety
        if (width === 0) width = window.innerWidth;
        if (height === 0) height = window.innerHeight;

        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    // Initial Size
    updateSize();
    container.appendChild(renderer.domElement);

    // Styling the container to be absolute and full screen/section behind content
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '0'; // Behind text (z-index 1)
    container.style.pointerEvents = 'none'; // Let clicks pass through to buttons

    // CARD GEOMETRY (A flattened box)
    // Width, Height, Depth
    const geometry = new THREE.BoxGeometry(2.2, 1.4, 0.1);

    // MATERIAL
    // Using MeshPhysicalMaterial for premium glass/plastic look - UPDATED TO BLUE
    const material = new THREE.MeshPhysicalMaterial({
        color: 0x2563EB, // Blue
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.1,
        thickness: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
    });

    // Create Mesh
    const card = new THREE.Mesh(geometry, material);
    scene.add(card);

    // TEXT TEXTURE using Canvas
    function createTextTexture(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1024; // High resolution
        canvas.height = 512;

        // Transparent background
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text style
        ctx.font = 'bold 200px "Outfit", sans-serif'; // Using site font
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow/Glow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; // Better quality
        return texture;
    }

    // Add Text Plane slightly above the card
    const textGeometry = new THREE.PlaneGeometry(2.2, 1.1); // Match aspect ratio
    const textMaterial = new THREE.MeshBasicMaterial({
        map: createTextTexture('welcome'),
        transparent: true,
        opacity: 0.9,
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.06; // Slightly in front of the card (half depth + tiny offset)
    card.add(textMesh); // Parent it to the card so it rotates with it

    // Initial Rotation
    card.rotation.x = 0.2;
    card.rotation.y = -0.3;

    // Scale down
    card.scale.set(0.7, 0.7, 0.7);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Reduced slightly for contrast
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x60A5FA, 2.0); // Lighter Blue for highlights
    pointLight.position.set(-2, 1, 2);
    scene.add(pointLight);

    // MOUSE INTERACTION
    // We want the card to rotate slightly based on mouse position
    let mouseX = 0;
    let mouseY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    // Add event listener to BODY/WINDOW to capture movement over the whole section
    // even though the canvas is behind.
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX) / 1000; // Adjusted sensitivity
        mouseY = (e.clientY - windowHalfY) / 1000;

        // Optional: Move light source slightly for dynamic shadows
        pointLight.position.x = -2 + (mouseX * 5);
        pointLight.position.y = 1 - (mouseY * 5);
    });

    // ANIMATION LOOP
    const animate = () => {
        requestAnimationFrame(animate);

        // Smoothly interpolate rotation towards target
        const targetRotX = 0.2 + mouseY * 1.5;
        const targetRotY = -0.3 + mouseX * 1.5;

        // Simple lerp
        card.rotation.x += (targetRotX - card.rotation.x) * 0.05;
        card.rotation.y += (targetRotY - card.rotation.y) * 0.05;

        // Add a subtle floating efffect
        const time = Date.now() * 0.001;
        card.position.y = 0.35 + Math.sin(time) * 0.05; // Adjusted height (0.35)

        renderer.render(scene, camera);
    };

    animate();

    // RESIZE HANDLER
    window.addEventListener('resize', updateSize);
});
