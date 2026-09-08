/** Mobile / weak GPU profile. Independent of prefers-reduced-motion. */
export function isMobileGpu() {
  if (typeof window === "undefined") return false;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const narrow = innerWidth < 720;
  return coarse || narrow;
}

export function gpuScale() {
  return isMobileGpu() ? 0.5 : 1;
}

export function dprCap(maxDesktop = 1.6, maxMobile = 1.25) {
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, isMobileGpu() ? maxMobile : maxDesktop);
}

export function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
