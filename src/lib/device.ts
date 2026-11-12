export function isAppleTouch(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function desktopChrome(): boolean {
  if (typeof navigator === 'undefined' || isAppleTouch()) return false
  const ua = navigator.userAgent
  if (/Android|Mobi/i.test(ua)) return false
  if (!/Chrome|Chromium/i.test(ua)) return false
  if (/Edg|OPR|CriOS|FxiOS|SamsungBrowser/i.test(ua)) return false
  return true
}
