function validateArtworkId(queryString, config) {
    const urlParams = new URLSearchParams(queryString);
    const id = urlParams.get('id');

    if (!id || !config.artworks[id]) {
        throw new Error("Invalid artwork ID.");
    }
    return config.artworks[id];
}

// Three.js Mesh
function createVideoAsset(artworkData) {
    const video = document.createElement('video');
    video.src = artworkData.mediaPath;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true; 
    video.playsInline = true;

    video.addEventListener('loadeddata', () => {
        video.play();
    });

    const texture = new THREE.VideoTexture(video);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.scale.set(artworkData.scale.x, artworkData.scale.y, artworkData.scale.z);
    mesh.position.set(artworkData.position.x, artworkData.position.y, artworkData.position.z);

    return mesh;
}

function createImageAsset(artworkData) {
    const texture = new THREE.TextureLoader().load(artworkData.mediaPath);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.scale.set(artworkData.scale.x, artworkData.scale.y, artworkData.scale.z);
    mesh.position.set(artworkData.position.x, artworkData.position.y, artworkData.position.z);

    return mesh;
}

function attachArtworkAsset(artworkData, anchorGroup, scene) {
    if (artworkData.mediaType === 'video') {
        const videoMesh = createVideoAsset(artworkData);
        anchorGroup.add(videoMesh);
    } else if (artworkData.mediaType === 'image') {
        const imageMesh = createImageAsset(artworkData);
        anchorGroup.add(imageMesh);
    } else if (artworkData.mediaType === 'model') {
        loadModelAsset(artworkData, anchorGroup);
        setupLighting(scene);
    } else {
        throw new Error(`Unsupported media type: ${artworkData.mediaType}`);
    }
}

//.glb 3D model async and attaches it to the AR anchor group.
function loadModelAsset(artworkData, targetGroup) {
    const loader = new THREE.GLTFLoader();
    loader.load(artworkData.mediaPath, (gltf) => {
        const model = gltf.scene;
        model.scale.set(artworkData.scale.x, artworkData.scale.y, artworkData.scale.z);
        model.position.set(artworkData.position.x, artworkData.position.y, artworkData.position.z);
        targetGroup.add(model);
    }, undefined, (error) => {
        console.error("Error loading GLB model:", error);
    });
}

//ambient and directional lighting into the Three.js scene (required for 3D meshes).
function setupLighting(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 5);
    
    scene.add(ambientLight);
    scene.add(directionalLight);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const artworkData = validateArtworkId(window.location.search, exhibitionConfig);
        console.log(`Booting AR engine for: ${artworkData.title}`);

        const mindarThree = new window.MINDAR.IMAGE.MindARThree({
            container: document.getElementById('ar-container'),
            imageTargetSrc: artworkData.targetPath
        });

        const { renderer, scene, camera } = mindarThree;
        const anchor = mindarThree.addAnchor(0);

        attachArtworkAsset(artworkData, anchor.group, scene);

        mindarThree.start().then(() => {
            document.getElementById('scanning-prompt').style.display = 'none';
            renderer.setAnimationLoop(() => {
                renderer.render(scene, camera);
            });
        }).catch((error) => {
            console.error("Failed to start AR Engine:", error);
            document.getElementById('scanning-prompt').innerText = "Camera access denied or failed.";
        });

    } catch (error) {
        document.getElementById('scanning-prompt').innerText = "Artwork not found. Please rescan.";
        console.error(error.message);
    }
});