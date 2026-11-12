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

/** 手机百度、百度 App、百度浏览器（T7 / SP-engine）。 */
export function isBaidu(): boolean {
  if (typeof navigator === 'undefined') return false
  return /baiduboxapp|baidubrowser|BaiduHD|SP-engine|T7\//i.test(navigator.userAgent)
}

export function baiduMicMessage(): string {
  if (isAppleTouch()) {
    return '百度没有把可用的麦克风交给这个网页。请到「系统设置 → 百度 → 麦克风」打开。即便点了允许，手机百度里的网页也经常录不到声音。请点右上角「···」→「在Safari中打开」，再用 Safari 说话。也可以把句子打在下面评分。'
  }
  return '百度没有把可用的麦克风交给这个网页。若弹出权限，点允许后音量条仍不动，也是没有把声音传进来。请到系统「设置 → 应用 → 百度（手机百度或百度浏览器）→ 权限 → 麦克风」打开。仍不行就点右上角菜单 →「在浏览器中打开」，用 vivo 浏览器或 Chrome 说话。也可以把句子打在下面评分。'
}

export function isX5(): boolean {
  if (typeof navigator === 'undefined') return false
  return /TBS\//i.test(navigator.userAgent)
}

/** QQ app in-app browser and QQ browser, including iOS WKWebView (`QQ/` + `QBWebViewType`). */
export function isQQ(): boolean {
  if (typeof navigator === 'undefined') return false
  return /MQQBrowser|QQBrowser|\bQQ\/|V1_AND_SQ_|V1_IPH_SQ_/i.test(navigator.userAgent)
}

export function qqListenMessage(): string {
  if (isAppleTouch()) {
    return 'QQ 里没有播出来。请再点一次播放。若仍然没有声音，点右上角「···」，选择「在Safari中打开」。原文仍可看。'
  }
  return 'QQ 里没有播出来。请再点一次播放。若仍然没有声音，点右上角菜单，选择「在浏览器中打开」（用手机自带浏览器或 Chrome）。原文仍可看。'
}

/** Hosts where speechSynthesis is present but Japanese comes out silent. */
export function prefersBundledAudio(jaVoices: number, voicesReady: boolean): boolean {
  if (typeof navigator === 'undefined') return false
  if (isVivoBrowser() || isQQ()) return true
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
