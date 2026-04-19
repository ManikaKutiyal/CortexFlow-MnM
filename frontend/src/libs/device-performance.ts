let cachedWebGLSupport: boolean | null = null;
let cachedSoftwareRenderer: boolean | null = null;

function getNavigatorInfo() {
  if (typeof navigator === "undefined") {
    return {
      cores: 2,
      memory: 2,
      saveData: true,
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
    mozConnection?: { saveData?: boolean };
    webkitConnection?: { saveData?: boolean };
  };

  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

  return {
    cores: nav.hardwareConcurrency ?? 2,
    memory: nav.deviceMemory ?? 2,
    saveData: Boolean(connection?.saveData),
  };
}

function hasWebGLSupport(): boolean {
  if (cachedWebGLSupport !== null) {
    return cachedWebGLSupport;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    cachedWebGLSupport = false;
    return cachedWebGLSupport;
  }

  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl") ||
    canvas.getContext("webgl2");

  cachedWebGLSupport = Boolean(gl);
  return cachedWebGLSupport;
}

function isLikelySoftwareRenderer(): boolean {
  if (cachedSoftwareRenderer !== null) {
    return cachedSoftwareRenderer;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    cachedSoftwareRenderer = true;
    return cachedSoftwareRenderer;
  }

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl") ||
      canvas.getContext("webgl2")) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;

    if (!gl) {
      cachedSoftwareRenderer = true;
      return cachedSoftwareRenderer;
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as
      | { UNMASKED_RENDERER_WEBGL: number }
      | null;

    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "").toLowerCase()
      : "";

    cachedSoftwareRenderer =
      renderer.includes("swiftshader") ||
      renderer.includes("llvmpipe") ||
      renderer.includes("software") ||
      renderer.includes("microsoft basic render");

    return cachedSoftwareRenderer;
  } catch {
    cachedSoftwareRenderer = true;
    return cachedSoftwareRenderer;
  }
}

export function isLowPowerDevice(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const touchLike = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallViewport = window.innerWidth < 1280;

  const { cores, memory, saveData } = getNavigatorInfo();
  const weakCpu = cores <= 6;
  const lowMemory = memory <= 8;
  const noWebgl = !hasWebGLSupport();
  const softwareRenderer = isLikelySoftwareRenderer();

  return (
    touchLike ||
    reducedMotion ||
    smallViewport ||
    saveData ||
    weakCpu ||
    lowMemory ||
    noWebgl ||
    softwareRenderer
  );
}
