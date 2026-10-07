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
    artworkData.position.z,
  );

  return mesh;
}

// function createImageAsset(artworkData) {
//   const texture = new THREE.TextureLoader().load(artworkData.mediaPath);
//   const geometry = new THREE.PlaneGeometry(1, 1);
//   const material = new THREE.MeshBasicMaterial({
//     map: texture,
//     transparent: true,
//   });
//   const mesh = new THREE.Mesh(geometry, material);

//   mesh.scale.set(artworkData.scale.x, artworkData.scale.y, artworkData.scale.z);
//   mesh.position.set(
//     artworkData.position.x,
//     artworkData.position.y,
//     artworkData.position.z,
//   );

//   return mesh;
// }

// TODO: clean up the PLANE
// function createImageAsset(artworkData) {
//   const geometry = new THREE.PlaneGeometry(1, 1);
//   const material = new THREE.MeshBasicMaterial({
//     color: 0xff0000,
//     side: THREE.DoubleSide,
//   });
//   const mesh = new THREE.Mesh(geometry, material);

//   mesh.scale.set(
//     artworkData.scale.x,
//     artworkData.scale.y,
//     artworkData.scale.z,
//   );

//   mesh.position.set(
//     artworkData.position.x,
//     artworkData.position.y,
//     artworkData.position.z,
//   );

//   return mesh;
// }

//TODO clean up and show actual image asset
function createImageAsset(artworkData) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0.1);

  return mesh;
}

function attachArtworkAsset(artworkData, anchorGroup, scene) {
  if (artworkData.mediaType === "video") {
    const videoMesh = createVideoAsset(artworkData);
    anchorGroup.add(videoMesh);
  } else if (artworkData.mediaType === "image") {
    const imageMesh = createImageAsset(artworkData);
    anchorGroup.add(imageMesh);
  } else if (artworkData.mediaType === "model") {
    loadModelAsset(artworkData, anchorGroup);
    setupLighting(scene);
  } else {
    throw new Error(`Unsupported media type: ${artworkData.mediaType}`);
  }
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

    const prompt = document.getElementById("scanning-prompt");

    anchor.onTargetFound = () => {
      console.log("🎯 TARGET FOUND!");

      anchor.group.visible = true;


      console.log("Anchor visible:", anchor.group.visible);
      console.log("Anchor children:", anchor.group.children.length);
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
      //   anchor.group.visible = false;
      prompt.style.display = "block";
      prompt.innerText = "Tracking lost. Point camera at artwork.";
    };

    attachArtworkAsset(artworkData, anchor.group, scene);

    mindarThree
      .start()
      .then(() => {
        //TODO
        // document.getElementById("scanning-prompt").style.display = "none";
        renderer.setAnimationLoop(() => {
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
      "Artwork not found. Please rescan.";
    console.error(error.message);
  }
});
