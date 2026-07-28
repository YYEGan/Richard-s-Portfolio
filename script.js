import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#spiral-canvas");
const introStage = document.querySelector(".intro-stage");
const introLoadValue = document.querySelector("#intro-load-value");
const introLoadBar = document.querySelector("#intro-load-bar");
const projectCursorLabel = document.querySelector(".project-cursor-label");
const themeToggle = document.querySelector("#theme-toggle");
const platformTabList = document.querySelector(".platform-tabs");
const platformTabs = document.querySelectorAll(".platform-tab");
const backgroundLayers = [...document.querySelectorAll(".portfolio-background-layer")];

// 作品封面与跳转地址。新增项目时在此处补充平台、链接与本地截图路径即可。
const projects = [
  { id: "vision-on-you", platform: "shopify", url: "https://visiononyou.com/", image: "./assets/visionyou.png" },
  { id: "project9-motorsport", platform: "shopify", url: "https://project9motorsport.com/", image: "./assets/project9.png" },
  { id: "stack-store", platform: "shopify", url: "https://stackstore.com.au/", image: "./assets/stack.png" },
  { id: "ulanzi-store", platform: "shopify", url: "https://ulanzi-store-tooto.myshopify.com/", image: "./assets/ulanzi.png" },
  { id: "care-of-lord", platform: "shopify", url: "https://careoflord.com/", image: "./assets/careoflord.png" },
  { id: "waves-press", platform: "shopify", url: "https://wavespress.net/", image: "./assets/wavespress.png" },
  { id: "noirva", platform: "shopify", url: "https://noirva.com/", image: "./assets/noirva.png" },
  { id: "wooliving", platform: "shopify", url: "https://wooliving.com/", image: "./assets/wooliving.png" },
  { id: "taranis-kids", platform: "shopify", url: "https://taraniskids.com/", image: "./assets/taraniskids.png" },
  { id: "zenthora-vintage", platform: "shopify", url: "https://zenthora-vintage.myshopify.com/", image: "./assets/zenthora-vintage.png" },
  { id: "wipcool", platform: "shopify", url: "https://wipcool.myshopify.com/", image: "./assets/wipcool.png" },
  { id: "everinever", platform: "shopify", url: "https://everinever.com/", image: "./assets/everinever.png" },
  { id: "ugfc-parts", platform: "shopify", url: "https://ugfcparts.com/", image: "./assets/ugfcparts.png" },
  { id: "wintemp-water", platform: "wordpress", url: "https://wintempwater.com/", image: "./assets/wintempwater.png" },
  { id: "rapha-vape", platform: "wordpress", url: "https://raphavape.com/", image: "./assets/raphavape.png" },
  { id: "laplace", platform: "wordpress", url: "https://laplace.uptooto.tech/", image: "./assets/laplace.png" },
  { id: "kompac-grill", platform: "wordpress", url: "https://www.kompacgrill.com/", image: "./assets/kompacgrill.png" },
  { id: "chicmax", platform: "wordpress", url: "https://chicmax.art/", image: "./assets/chicmax.png" },
  { id: "citi-surface", platform: "wordpress", url: "https://citisurface.com/", image: "./assets/citisurface.png" },
  { id: "hyperdoll", platform: "wordpress", url: "https://hyperdoll.uptooto.tech/", image: "./assets/hyperdoll.png" },
  { id: "net-surf", platform: "wordpress", url: "https://netsurf.com.hk/en/", image: "./assets/netsurf.png" },
  { id: "lumino-jewel", platform: "wordpress", url: "https://luminojewel.com/", image: "./assets/luminojewel.png" },
  { id: "wanzai-rubber", platform: "wordpress", url: "https://wanzairubber.com/", image: "./assets/wanzairubber.png" },
  { id: "comodita-health", platform: "wordpress", url: "https://comoditahealth.com.au/", image: "./assets/comoditahealth.png" },
  { id: "taohoo", platform: "wordpress", url: "https://www.taohoo.cc/", image: "./assets/taohoo.png" },
];

// 展示窗口里的主卡片尺寸。作品数量较少时，让每一张在中心位置有足够的存在感。
const ORTHO_HEIGHT = 3;
const PLANE_WIDTH = 1.78;
const PLANE_HEIGHT = 1;
const SCROLL_RANGE = 2400;
const AUTO_SCROLL_SPEED = 0.12;
const PROJECT_REPEAT_COUNT = 2;

const vertexShader = `
uniform float uVelocity;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;

  float angle = uVelocity * 0.05;
  float si = sin(angle);
  float co = cos(angle);

  vec2 p = uv - 0.5;
  vec2 rotated = vec2(p.x * co - p.y * si, p.x * si + p.y * co);

  pos.x += (rotated.x - p.x) * 0.06;
  pos.y += (rotated.y - p.y) * 0.06;

  float d = distance(uv, vec2(0.5));
  pos.z -= abs((1.0 - d) * uVelocity * 0.1);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 plane, vec2 image) {
  float planeAspect = plane.x / plane.y;
  float imageAspect = image.x / image.y;
  vec2 scale = planeAspect > imageAspect
    ? vec2(1.0, imageAspect / planeAspect)
    : vec2(planeAspect / imageAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = coverUv(vUv, uPlaneSize, uImageSize);
  vec4 color = texture2D(uTexture, uv);
  color.rgb = pow(color.rgb, vec3(0.9));
  color.a *= uOpacity;
  gl_FragColor = color;
}
`;

const scroll = {
  current: 0,
  target: 0,
  velocity: 0,
  momentum: 0,
  touchY: 0,
};

let visibleBackground = 0;
let backgroundUrl = "";
let introReady = false;
let introComplete = false;
let loadedAssetCount = 0;

function updateIntroLoading(progress) {
  const percentage = Math.round(THREE.MathUtils.clamp(progress, 0, 1) * 100);
  introLoadValue.textContent = `${percentage}%`;
  introLoadBar.style.width = `${percentage}%`;
}

function setPortfolioBackground(url) {
  if (!url || url === backgroundUrl || backgroundLayers.length < 2) return;

  const nextLayer = backgroundLayers[1 - visibleBackground];
  nextLayer.style.setProperty("--background-image", `url("${url}")`);
  nextLayer.classList.add("is-visible");
  backgroundLayers[visibleBackground].classList.remove("is-visible");
  visibleBackground = 1 - visibleBackground;
  backgroundUrl = url;
}

function clearPortfolioBackground() {
  backgroundLayers.forEach((layer) => layer.classList.remove("is-visible"));
  backgroundUrl = "";
}

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

class SpiralPath {
  constructor({
    radius = 1.25,
    zOffset = 0.35,
    turns = 2.5,
    camZ = 6,
    // 拉长路径，让十几个作品循环时卡片之间仍有更舒展的留白。
    yFar = -5.1,
    yNear = 5.1,
  } = {}) {
    this.radius = radius;
    this.zOffset = zOffset;
    this.turns = turns;
    this.camZ = camZ;
    this.yFar = yFar;
    this.yNear = yNear;
    this.yRange = yNear - yFar;
  }

  angleAt(y, turnOffset = 0) {
    return ((y - this.yFar) / this.yRange) * this.turns * Math.PI * 2 + turnOffset;
  }

  positionAt(y, turnOffset = 0) {
    const angle = this.angleAt(y, turnOffset);
    return new THREE.Vector3(
      this.radius * Math.cos(angle),
      y,
      this.camZ - 3 + this.zOffset * Math.sin(angle),
    );
  }

  rotationAt(y, turnOffset = 0) {
    const angle = this.angleAt(y, turnOffset);
    return new THREE.Euler(
      Math.sin(angle) * 0.1,
      -Math.cos(angle) * 0.25,
      0,
    );
  }
}

class GalleryItem {
  constructor(texture, sceneRef) {
    const image = texture.image;
    this.uniforms = {
      uTexture: { value: texture },
      uOpacity: { value: 0 },
      uVelocity: { value: 0 },
      uImageSize: {
        value: new THREE.Vector2(image?.naturalWidth || 1200, image?.naturalHeight || 800),
      },
      uPlaneSize: { value: new THREE.Vector2(PLANE_WIDTH, PLANE_HEIGHT) },
    };

    const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, 20, 20);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.visibility = 1;
    sceneRef.add(this.mesh);
  }

  update(progress, velocity) {
    const fadeIn = smoothstep(progress, 0.04, 0.18);
    const fadeOut = 1 - smoothstep(progress, 0.88, 0.98);
    this.uniforms.uOpacity.value = (0.72 + fadeIn * fadeOut * 0.28) * this.visibility;
    // 手动滚动时不让瞬时速度把卡片扭得过猛。
    this.uniforms.uVelocity.value = THREE.MathUtils.clamp(velocity, -0.36, 0.36);
  }

  dispose(sceneRef) {
    sceneRef.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class SpiralGallery {
  constructor(sceneRef, cameraRef, textures) {
    this.scene = sceneRef;
    this.camera = cameraRef;
    this.textures = new Map(projects.map((project, index) => [project.id, textures[index]]));
    this.projects = projects;
    this.activeProjects = projects.filter((project) => project.platform === "shopify");
    this.path = new SpiralPath();
    this.items = [];
    this.transitioningItems = [];
    this.platformTransitionStart = 0;
    this.platformTransitionDuration = 560;
    this.responsiveScale = 1;

    this.camera.position.set(0, 0, this.path.camZ);
    this.camera.lookAt(0, 0, 0);
    this.init();
  }

  init() {
    if (!this.activeProjects.length) return;

    const displayProjects = Array.from(
      { length: this.activeProjects.length * PROJECT_REPEAT_COUNT },
      (_, index) => this.activeProjects[index % this.activeProjects.length],
    );
    const step = this.path.yRange / displayProjects.length;

    displayProjects.forEach((project, index) => {
      const texture = this.textures.get(project.id);
      const item = new GalleryItem(texture, this.scene);
      item.baseY = this.path.yFar + index * step;
      item.project = project;
      item.backgroundUrl = project.image;
      this.items.push(item);
    });
  }

  setPlatform(platform) {
    const nextProjects = this.projects.filter((project) => project.platform === platform);
    if (nextProjects.map((project) => project.id).join() === this.activeProjects.map((project) => project.id).join()) {
      return;
    }

    this.transitioningItems.forEach((item) => item.dispose(this.scene));
    this.transitioningItems = this.items;
    this.items = [];
    this.activeProjects = nextProjects;
    this.init();
    this.items.forEach((item) => {
      item.visibility = 0;
    });
    this.platformTransitionStart = performance.now();

    if (!this.items.length && !this.transitioningItems.length) clearPortfolioBackground();
  }

  resize(width, height) {
    // 窄屏时仅略微收紧，避免把作品卡片缩得过小。
    const scale = Math.min(1, Math.max(0.74, (width / height) * 0.9));
    this.responsiveScale = scale;
    this.path.radius = 1.25 * scale;
    this.path.zOffset = 0.35 * scale;
  }

  update(offset, velocity = 0) {
    const scrollY = (offset / SCROLL_RANGE) * this.path.yRange;
    let nearestItem;
    let nearestDistance = Infinity;
    const transitionProgress = this.transitioningItems.length
      ? Math.min((performance.now() - this.platformTransitionStart) / this.platformTransitionDuration, 1)
      : 1;

    this.items.forEach((item) => {
      item.visibility = transitionProgress;
    });
    this.transitioningItems.forEach((item) => {
      item.visibility = 1 - transitionProgress;
    });

    [...this.items, ...this.transitioningItems].forEach((item) => {
      const y =
        ((((item.baseY + scrollY - this.path.yFar) % this.path.yRange) + this.path.yRange) %
          this.path.yRange) +
        this.path.yFar;

      item.mesh.position.copy(this.path.positionAt(y));
      item.mesh.rotation.copy(this.path.rotationAt(y));

      const progress = (y - this.path.yFar) / this.path.yRange;
      const focusDistance = Math.abs(progress - 0.5);
      if (item.visibility > 0.5 && focusDistance < nearestDistance) {
        nearestDistance = focusDistance;
        nearestItem = item;
      }
      const focus = smoothstep(Math.max(0, 1 - Math.abs(progress - 0.5) * 2), 0, 1);
      item.mesh.scale.setScalar((0.12 + focus * 0.9) * this.responsiveScale);
      item.update(progress, velocity);
    });

    if (transitionProgress === 1 && this.transitioningItems.length) {
      this.transitioningItems.forEach((item) => item.dispose(this.scene));
      this.transitioningItems = [];
    }

    setPortfolioBackground(nearestItem?.backgroundUrl);
  }
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} background`);
  renderer.setClearColor(0x000000, 0);
}

function smoothstep(value, min, max) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

function createPlaceholderTexture(index) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 16;
  textureCanvas.height = 16;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = `hsl(${(index * 37) % 360}, 70%, 62%)`;
  ctx.fillRect(0, 0, 16, 16);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function loadTexture(url, index) {
  return new Promise((resolve) => {
    const complete = (texture) => {
      loadedAssetCount += 1;
      updateIntroLoading(loadedAssetCount / projects.length);
      resolve(texture);
    };

    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        complete(texture);
      },
      undefined,
      () => complete(createPlaceholderTexture(index)),
    );
  });
}

async function loadTextures() {
  return Promise.all(projects.map((project, index) => loadTexture(project.image, index)));
}

let gallery;

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  camera.left = (-ORTHO_HEIGHT * aspect) / 2;
  camera.right = (ORTHO_HEIGHT * aspect) / 2;
  camera.top = ORTHO_HEIGHT / 2;
  camera.bottom = -ORTHO_HEIGHT / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  gallery?.resize(width, height);
}

function setTarget(value) {
  scroll.target = introComplete ? Math.max(0, value) : 0;
}

function handleWheel(event) {
  event.preventDefault();
  if (!introComplete) return;
  const normalized = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 64);
  scroll.momentum += normalized * 0.01;
  scroll.momentum = THREE.MathUtils.clamp(scroll.momentum, -1.2, 1.2);
  setTarget(scroll.target + normalized * 0.075);
}

function handleKeydown(event) {
  const keys = {
    ArrowDown: 48,
    PageDown: 120,
    " ": 72,
    ArrowUp: -48,
    PageUp: -120,
  };

  if (!(event.key in keys)) return;
  event.preventDefault();
  if (!introComplete) return;
  scroll.momentum += keys[event.key] * 0.006;
  scroll.momentum = THREE.MathUtils.clamp(scroll.momentum, -2.2, 2.2);
  setTarget(scroll.target + keys[event.key] * 0.45);
}

function handleTouchStart(event) {
  scroll.touchY = event.touches[0].clientY;
}

function handleTouchMove(event) {
  event.preventDefault();
  if (!introComplete) return;
  const y = event.touches[0].clientY;
  const delta = scroll.touchY - y;
  scroll.touchY = y;
  scroll.momentum += delta * 0.01;
  scroll.momentum = THREE.MathUtils.clamp(scroll.momentum, -2.2, 2.2);
  setTarget(scroll.target + delta * 0.04);
}

let pointerDown;

function getProjectAtPointer(event) {
  if (!gallery?.items.length) return;

  pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(gallery.items.map((item) => item.mesh), false)[0];
  if (!hit) return undefined;

  return gallery.items.find((galleryItem) => galleryItem.mesh === hit.object);
}

function openProjectAtPointer(event) {
  const item = getProjectAtPointer(event);
  if (item?.project?.url) window.open(item.project.url, "_blank", "noopener,noreferrer");
}

function animate() {
  const previous = scroll.current;
  if (introComplete) {
    scroll.target += AUTO_SCROLL_SPEED;
  }

  scroll.target = introComplete ? Math.max(0, scroll.target + scroll.momentum) : 0;
  scroll.momentum *= 0.955;
  if (Math.abs(scroll.momentum) < 0.001) scroll.momentum = 0;

  scroll.current += (scroll.target - scroll.current) * 0.038;
  scroll.velocity += (scroll.current - previous - scroll.velocity) * 0.12;

  if (introComplete) {
    gallery?.update(scroll.current, scroll.velocity);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
setTheme("light");
updateIntroLoading(0);
animate();

loadTextures().then((textures) => {
  gallery = new SpiralGallery(scene, camera, textures);
  resize();
  updateIntroLoading(1);
  window.setTimeout(() => {
    introReady = true;
    introStage.classList.add("is-ready");
    window.setTimeout(() => {
      introComplete = true;
      introStage.classList.add("is-complete");
      document.body.classList.add("is-gallery");
    }, 880);
  }, 420);
});

window.addEventListener("resize", resize);
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("keydown", handleKeydown);
window.addEventListener("touchstart", handleTouchStart, { passive: true });
window.addEventListener("touchmove", handleTouchMove, { passive: false });
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  const distance = Math.hypot(event.clientX - pointerDown?.x, event.clientY - pointerDown?.y);
  if (distance < 8) openProjectAtPointer(event);
  pointerDown = undefined;
});
canvas.addEventListener("pointermove", (event) => {
  const project = getProjectAtPointer(event)?.project;
  const isClickable = Boolean(project?.url);
  canvas.classList.toggle("is-clickable", isClickable);
  projectCursorLabel.classList.toggle("is-visible", isClickable);
  projectCursorLabel.style.setProperty("--cursor-x", `${event.clientX}px`);
  projectCursorLabel.style.setProperty("--cursor-y", `${event.clientY}px`);
});
canvas.addEventListener("pointerleave", () => {
  canvas.classList.remove("is-clickable");
  projectCursorLabel.classList.remove("is-visible");
});
themeToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

platformTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    platformTabs.forEach((item) => {
      const isSelected = item === tab;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-selected", String(isSelected));
    });

    document.body.dataset.platform = tab.dataset.platform;
    platformTabList.dataset.selectedPlatform = tab.dataset.platform;
    gallery?.setPlatform(tab.dataset.platform);
  });
});
