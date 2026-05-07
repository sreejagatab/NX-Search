const BOOST_KEY = 'nx-boosted-domains'
const BLOCK_KEY = 'nx-blocked-domains'

function getSet(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as string[] } catch { return [] }
}
function setSet(key: string, domains: string[]): void {
  localStorage.setItem(key, JSON.stringify([...new Set(domains)]))
}

export function getBoostedDomains(): string[] { return getSet(BOOST_KEY) }
export function getBlockedDomains(): string[] { return getSet(BLOCK_KEY) }

export function boostDomain(domain: string): void {
  const d = domain.toLowerCase()
  setSet(BOOST_KEY, [...getBoostedDomains().filter(x => x !== d), d])
  setSet(BLOCK_KEY, getBlockedDomains().filter(x => x !== d))
}

export function blockDomain(domain: string): void {
  const d = domain.toLowerCase()
  setSet(BLOCK_KEY, [...getBlockedDomains().filter(x => x !== d), d])
  setSet(BOOST_KEY, getBoostedDomains().filter(x => x !== d))
}

export function clearDomainPref(domain: string): void {
  const d = domain.toLowerCase()
  setSet(BOOST_KEY, getBoostedDomains().filter(x => x !== d))
  setSet(BLOCK_KEY, getBlockedDomains().filter(x => x !== d))
}
