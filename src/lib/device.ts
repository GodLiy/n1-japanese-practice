export function isAppleTouch(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isWeChat(): boolean {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent)
}

export function isVivoBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /VivoBrowser/i.test(navigator.userAgent)
}

export function isX5(): boolean {
  if (typeof navigator === 'undefined') return false
  return /TBS\//i.test(navigator.userAgent)
}

/** Hosts where speechSynthesis is present but Japanese comes out silent. */
export function prefersBundledAudio(jaVoices: number, voicesReady: boolean): boolean {
  if (typeof navigator === 'undefined') return false
  if (isVivoBrowser()) return true
  if (!isAppleTouch() && (isWeChat() || isX5())) return true
  if (typeof window !== 'undefined' && !('speechSynthesis' in window)) return true
  if (!isAppleTouch() && voicesReady && jaVoices === 0) return true
  return false
}

export function wechatMicMessage(): string {
  if (isAppleTouch()) {
    return '微信没有把麦克风交给这个网页。请到「系统设置 → 微信 → 麦克风」打开。即便打开了，微信里的网页经常仍然不能录音。请点右上角「···」→「在Safari中打开」，再用 Safari 说话。侧面静音开关不会挡住麦克风。也可以把句子打在下面评分。这个网站没有微信公众号接口，不能在微信里强行打开麦克风。'
  }
  return '微信没有把麦克风交给这个网页。请到系统「设置 → 应用 → 微信 → 权限 → 麦克风」打开。若网页仍不能录音，点右上角「···」→「在浏览器中打开」。也可以把句子打在下面评分。这个网站没有微信公众号接口，不能在微信里强行打开麦克风。'
}

type WeixinBridge = {
  invoke: (name: string, args: Record<string, unknown>, callback: () => void) => void
}

/** WeChat's built-in bridge can unlock HTML audio. It does not grant the microphone. */
export function unlockWeChatAudio(retry: () => void): void {
  if (typeof window === 'undefined' || !isWeChat()) return
  const host = window as unknown as { WeixinJSBridge?: WeixinBridge }
  const run = () => {
    try {
      host.WeixinJSBridge?.invoke('getNetworkType', {}, retry)
    } catch {
      /* the bridge is absent; the click's play() still runs */
    }
  }
  if (host.WeixinJSBridge) {
    run()
    return
  }
  document.addEventListener('WeixinJSBridgeReady', run, { once: true })
}

export function desktopChrome(): boolean {
  if (typeof navigator === 'undefined' || isAppleTouch()) return false
  const ua = navigator.userAgent
  if (/Android|Mobi/i.test(ua)) return false
  if (!/Chrome|Chromium/i.test(ua)) return false
  if (/Edg|OPR|CriOS|FxiOS|SamsungBrowser/i.test(ua)) return false
  return true
}
