function validateArtworkId(queryString, config) {
  const urlParams = new URLSearchParams(queryString);
  const id = urlParams.get("id");

  if (!id || !config.artworks[id]) {
    throw new Error("Invalid artwork ID.");
  }
  return config.artworks[id];
}

// Three.js Mesh
function createVideoAsset(artworkData) {
  const video = document.createElement("video");
  video.src = artworkData.mediaPath;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  video.addEventListener("loadeddata", () => {
    video.play();
  });

  const texture = new THREE.VideoTexture(video);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.scale.set(artworkData.scale.x, artworkData.scale.y, artworkData.scale.z);
  mesh.position.set(
    artworkData.position.x,
    artworkData.position.y,
    artworkData.position.z + 0.1,
  );

  return mesh;
}

function createImageAsset(artworkData) {
  const texture = new THREE.TextureLoader().load(
    artworkData.mediaPath,
    () => console.log("Overlay image loaded:", artworkData.mediaPath),
    undefined,
    (error) => console.error("Overlay image failed to load:", error),
  );
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    artworkData.position.x,
    artworkData.position.y,
    artworkData.position.z + 0.1,
  );
  mesh.scale.set(
    artworkData.scale.x,
    artworkData.scale.y,
    artworkData.scale.z,
  );

  return mesh;
}

function createCubeAsset(artworkData) {
  const size = artworkData.cubeSize ?? 0.5;
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshBasicMaterial({
    color: artworkData.cubeColor ?? 0xff0000,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    artworkData.position.x,
    artworkData.position.y,
    artworkData.position.z,
  );
  mesh.scale.set(
    artworkData.scale.x,
    artworkData.scale.y,
    artworkData.scale.z,
  );

  return mesh;
}

function createImageLayersAsset(artworkData) {
  const layerGroup = new THREE.Group();
  const textureLoader = new THREE.TextureLoader();
  const layerAspectRatio = 6000 / 4800;

  artworkData.layers.forEach((layerPath, index) => {
    const imagePath = `${artworkData.layerPath}${layerPath}`;
    const texture = textureLoader.load(
      imagePath,
      () => console.log("Layer image loaded:", imagePath),
      undefined,
      (error) => console.error("Layer image failed to load:", imagePath, error),
    );
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(layerAspectRatio, 1),
      material,
    );

    mesh.position.set(
      artworkData.position.x,
      artworkData.position.y,
      artworkData.position.z,
    );
    mesh.renderOrder = index + 1;
    mesh.scale.set(
      artworkData.scale.x,
      artworkData.scale.y,
      artworkData.scale.z,
    );
    mesh.userData.isEnlarged = false;
    mesh.userData.baseScale = mesh.scale.clone();
    mesh.userData.layerIndex = index;
    layerGroup.add(mesh);
  });

  return layerGroup;
}

function attachArtworkAsset(artworkData, anchorGroup, scene) {
  const assetGroup = new THREE.Group();
  anchorGroup.add(assetGroup);

  if (artworkData.mediaType === "video") {
    const videoMesh = createVideoAsset(artworkData);
    assetGroup.add(videoMesh);
  } else if (artworkData.mediaType === "image") {
    const imageMesh = createImageAsset(artworkData);
    assetGroup.add(imageMesh);
  } else if (artworkData.mediaType === "cube") {
    assetGroup.add(createCubeAsset(artworkData));
  } else if (artworkData.mediaType === "image-layers") {
    assetGroup.add(createImageLayersAsset(artworkData));
  } else if (artworkData.mediaType === "model") {
    loadModelAsset(artworkData, assetGroup);
    setupLighting(scene);
  } else {
    throw new Error(`Unsupported media type: ${artworkData.mediaType}`);
  }

  return assetGroup;
}

//.glb 3D model async and attaches it to the AR anchor group.
function loadModelAsset(artworkData, targetGroup) {
  const loader = new THREE.GLTFLoader();
  loader.load(
    artworkData.mediaPath,
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(
        artworkData.scale.x,
        artworkData.scale.y,
        artworkData.scale.z,
      );
      model.position.set(
        artworkData.position.x,
        artworkData.position.y,
        artworkData.position.z,
      );
      targetGroup.add(model);
    },
    undefined,
    (error) => {
      console.error("Error loading GLB model:", error);
    },
  );
}

//ambient and directional lighting into the Three.js scene (required for 3D meshes).
function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 5);

  scene.add(ambientLight);
  scene.add(directionalLight);
}

function toggleArtworkScale(assetGroup, interaction) {
  if (interaction?.type !== "toggle-scale") {
    return;
  }

  const isEnlarged = assetGroup.userData.isEnlarged === true;
  const scale = isEnlarged ? 1 : interaction.enlargedScale;
  assetGroup.scale.set(scale, scale, scale);
  assetGroup.userData.isEnlarged = !isEnlarged;
}

function toggleLayerScale(layer, interaction) {
  if (interaction?.type !== "layer-scale") {
    return;
  }

  const isEnlarged = layer.userData.isEnlarged === true;
  const scale = isEnlarged ? layer.userData.baseScale : layer.userData.baseScale
    .clone()
    .multiplyScalar(interaction.enlargedScale);
  layer.scale.copy(scale);
  layer.userData.isEnlarged = !isEnlarged;
}

function easeInOut(progress) {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

function startFlipY(assetGroup, interaction) {
  if (interaction?.type !== "flip-y" || assetGroup.userData.flipYAnimating) {
    return;
  }

  assetGroup.userData.flipYAnimating = true;
  assetGroup.userData.flipYStart = performance.now();
  assetGroup.userData.flipYDuration = interaction.duration ?? 1900;
  assetGroup.userData.flipYBaseRotation = assetGroup.rotation.y;
}

function updateFlipY(assetGroup) {
  if (!assetGroup.userData.flipYAnimating) {
    return;
  }

  const elapsed = performance.now() - assetGroup.userData.flipYStart;
  const duration = assetGroup.userData.flipYDuration;
  const progress = Math.min(elapsed / duration, 1);
  const easedProgress = easeInOut(progress);
  const rotation = easedProgress <= 0.5
    ? easedProgress * 2 * Math.PI
    : (1 - (easedProgress - 0.5) * 2) * Math.PI;

  assetGroup.rotation.y = assetGroup.userData.flipYBaseRotation + rotation;

  if (progress === 1) {
    assetGroup.rotation.y = assetGroup.userData.flipYBaseRotation;
    assetGroup.userData.flipYAnimating = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const artworkData = validateArtworkId(
      window.location.search,
      exhibitionConfig,
    );

    console.log(`Booting AR engine for: ${artworkData.title}`);
    console.log("Artwork:", artworkData.title);
    console.log("Target:", artworkData.targetPath);
    console.log("Media:", artworkData.mediaPath);
    console.log("Media type:", artworkData.mediaType);
    console.log("Layers:", artworkData.layers);
    console.log("Layer path:", artworkData.layerPath);

    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.getElementById("ar-container"),
      imageTargetSrc: artworkData.targetPath,
      filterMinCF: 0.0001,
      filterBeta: 0.001,
      warmupTolerance: 5,
      missTolerance: 10,
    });

    const { renderer, scene, camera } = mindarThree;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const anchor = mindarThree.addAnchor(0);
    anchor.group.visible = false;
    let targetIsFound = false;

    const prompt = document.getElementById("scanning-prompt");

    anchor.onTargetFound = () => {
      console.log("🎯 TARGET FOUND!");

      targetIsFound = true;
      anchor.group.visible = true;


      console.log("Anchor visible:", anchor.group.visible);
      console.log("Anchor children:", anchor.group.children.length);
      console.log(
        "Rendered meshes:",
        anchor.group.children[0]?.children[0]?.children.map((layer) => ({
          index: layer.userData.layerIndex,
          visible: layer.visible,
          scale: layer.scale.toArray(),
          renderOrder: layer.renderOrder,
        })),
      );
      console.log(
        "Child visibility:",
        anchor.group.children.map((child) => ({
          visible: child.visible,
          position: child.position.toArray(),
          scale: child.scale.toArray(),
        })),
      );
      const child = anchor.group.children[0];

console.log("Child type:", child.type);
console.log("Child visible:", child.visible);
console.log("Child position:", child.position.toArray());
console.log("Child scale:", child.scale.toArray());
console.log("Child renderOrder:", child.renderOrder);

      prompt.style.display = "none";
    };

    anchor.onTargetLost = () => {
      console.log("Target lost.");
      targetIsFound = false;
      //   anchor.group.visible = false;
      prompt.style.display = "block";
      prompt.innerText = "Tracking lost. Point camera at artwork.";
    };

    const assetGroup = attachArtworkAsset(artworkData, anchor.group, scene);

    const arContainer = document.getElementById("ar-container");
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    arContainer.style.touchAction = "manipulation";
    arContainer.addEventListener("pointerup", (event) => {
      console.log("AR surface tapped");

      if (!targetIsFound) {
        console.log("Ignoring tap because the target is not found");
        return;
      }

      if (artworkData.interaction?.type === "layer-scale") {
        const bounds = arContainer.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const intersections = raycaster.intersectObjects(assetGroup.children, true);
        const layer = intersections.find(
          (intersection) => intersection.object.userData.layerIndex !== undefined,
        )?.object;

        if (layer) {
          toggleLayerScale(layer, artworkData.interaction);
          console.log(
            "Layer scale:",
            layer.userData.layerIndex,
            layer.scale.toArray(),
          );
        }
        return;
      }

      if (artworkData.interaction?.type === "flip-y") {
        startFlipY(assetGroup, artworkData.interaction);
      } else {
        toggleArtworkScale(assetGroup, artworkData.interaction);
      }
      console.log("Artwork scale:", assetGroup.scale.toArray());
    });

    mindarThree
      .start()
      .then(() => {
        console.log("MindAR started. Waiting for target recognition.");
        //TODO
        // document.getElementById("scanning-prompt").style.display = "none";
        renderer.setAnimationLoop(() => {
          updateFlipY(assetGroup);
          renderer.render(scene, camera);
        });
      })
      .catch((error) => {
        console.error("Failed to start AR Engine:", error);
        document.getElementById("scanning-prompt").innerText =
          "Camera access denied or failed.";
      });

    const stopAr = () => {
      anchor.group.visible = false;
      document.getElementById("ar-container").style.visibility = "hidden";
      mindarThree.stop();
      renderer.setAnimationLoop(null);
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        stopAr();
      }
    });
    window.addEventListener("pagehide", stopAr);
    window.addEventListener("beforeunload", stopAr);
  } catch (error) {
    document.getElementById("scanning-prompt").innerText =
      "Artwork not found. Please rescan. Try moving the camera closer or further away from the artwork.";
    console.error(error.message);
  }
});
