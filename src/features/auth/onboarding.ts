import { readStorage, writeStorage } from '@/lib/storage'

const ONBOARDED_KEY = 'maso.onboarded'

/** La présentation en 3 écrans n'est montrée qu'une fois par appareil. */
export const isOnboarded = () => readStorage(ONBOARDED_KEY) === '1'
export const markOnboarded = () => writeStorage(ONBOARDED_KEY, '1')
