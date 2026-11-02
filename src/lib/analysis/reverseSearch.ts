// Recherche inversée (section 9, étape 6) : liens vers les moteurs, préremplis quand l'image a une adresse web.

export interface ReverseEngine {
  id: 'google_lens' | 'tineye' | 'yandex' | 'bing' | 'invid'
  name: string
  url: string
  /** true : l'image est déjà transmise ; false : il faut la déposer sur le site. */
  prefilled: boolean
}

export function reverseSearchLinks(imageUrl: string | null): ReverseEngine[] {
  const encoded = imageUrl ? encodeURIComponent(imageUrl) : null
  return [
    {
      id: 'google_lens',
      name: 'Google Lens',
      url: encoded ? `https://lens.google.com/uploadbyurl?url=${encoded}` : 'https://lens.google.com/',
      prefilled: Boolean(encoded),
    },
    {
      id: 'tineye',
      name: 'TinEye',
      url: encoded ? `https://tineye.com/search?url=${encoded}` : 'https://tineye.com/',
      prefilled: Boolean(encoded),
    },
    {
      id: 'yandex',
      name: 'Yandex',
      url: encoded ? `https://yandex.com/images/search?rpt=imageview&url=${encoded}` : 'https://yandex.com/images/',
      prefilled: Boolean(encoded),
    },
    {
      id: 'bing',
      name: 'Bing',
      url: encoded ? `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encoded}` : 'https://www.bing.com/visualsearch',
      prefilled: Boolean(encoded),
    },
    {
      id: 'invid',
      name: 'InVID-WeVerify',
      url: 'https://weverify.eu/verification-plugin/',
      prefilled: false,
    },
  ]
}
