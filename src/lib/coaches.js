// The three coaches who log their hours via the public form
export const COACHES = [
  { name: 'Bec',   slug: 'bec',   aliases: ['bec-log'], email: 'bec@promotableyou.com.au'   },
  { name: 'Tanya', slug: 'tanya', aliases: ['tanya-log'], email: 'tanya@promotableyou.com.au' },
  { name: 'Tanaz', slug: 'tanaz', aliases: ['tanaz-log'], email: 'tanaz@promotableyou.com.au' },
]

export function coachBySlug(slug) {
  const s = slug.toLowerCase()
  return COACHES.find(c => c.slug === s || (c.aliases || []).includes(s)) || null
}
