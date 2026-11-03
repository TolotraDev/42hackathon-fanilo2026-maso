import { describe, expect, it } from 'vitest'
import { installPlatform } from '@/lib/installPrompt'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A145F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
}

describe('installation : marche à suivre adaptée à l’appareil', () => {
  it('reconnaît chaque appareil et navigateur', () => {
    expect(installPlatform(UA.iphone)).toBe('ios')
    expect(installPlatform(UA.ipadDesktopMode, 5)).toBe('ios')
    expect(installPlatform(UA.androidChrome)).toBe('android')
    expect(installPlatform(UA.facebookAndroid)).toBe('in_app')
    expect(installPlatform(UA.windowsChrome)).toBe('desktop_chromium')
    expect(installPlatform(UA.windowsEdge)).toBe('desktop_chromium')
    expect(installPlatform(UA.linuxFirefox)).toBe('firefox')
    expect(installPlatform(UA.macSafari, 0)).toBe('desktop_safari')
  })
})
