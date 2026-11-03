import { describe, expect, it } from 'vitest'
import { passwordLinkTarget } from '@/lib/authRedirect'

describe('lien d’invitation ou de réinitialisation', () => {
  it('arrivé sur l’accueil, il mène à « Nouveau mot de passe » avec son jeton', () => {
    expect(passwordLinkTarget({ pathname: '/', search: '', hash: '#access_token=abc&refresh_token=def&type=invite' }))
      .toBe('/nouveau-mot-de-passe#access_token=abc&refresh_token=def&type=invite')
    expect(passwordLinkTarget({ pathname: '/connexion', search: '', hash: '#access_token=abc&type=recovery' }))
      .toBe('/nouveau-mot-de-passe#access_token=abc&type=recovery')
  })

  it('ne touche ni à la bonne page, ni aux autres liens', () => {
    expect(passwordLinkTarget({ pathname: '/nouveau-mot-de-passe', search: '', hash: '#access_token=abc&type=invite' })).toBeNull()
    expect(passwordLinkTarget({ pathname: '/', search: '', hash: '#access_token=abc&type=magiclink' })).toBeNull()
    expect(passwordLinkTarget({ pathname: '/portail', search: '', hash: '' })).toBeNull()
  })
})
