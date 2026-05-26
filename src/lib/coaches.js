// The three coaches who log their hours via the public form
export const COACHES = [
  { name: 'Bec',   slug: 'bec',   email: 'bec@promotableyou.com.au'   },
  { name: 'Tanya', slug: 'tanya', email: 'tanya@promotableyou.com.au' },
  { name: 'Tanaz', slug: 'tanaz', email: 'tanaz@promotableyou.com.au' },
]

export function coachBySlug(slug) {
  return COACHES.find(c => c.slug === slug.toLowerCase()) || null
}
