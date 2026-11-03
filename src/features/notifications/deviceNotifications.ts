// Notifications sur l'appareil (M14) : choix de l'utilisateur, en plus de la permission du navigateur.
import { readStorage, writeStorage } from '@/lib/storage'

const KEY = 'maso.deviceNotifications'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export const deviceNotificationsOn = () => notificationsSupported() && Notification.permission === 'granted' && readStorage(KEY) === '1'

/** Active les notifications (demande la permission si besoin) ; renvoie l'état obtenu. */
export async function setDeviceNotifications(on: boolean): Promise<boolean> {
  if (!on || !notificationsSupported()) {
    writeStorage(KEY, '')
    return false
  }
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  writeStorage(KEY, permission === 'granted' ? '1' : '')
  return permission === 'granted'
}
