import type { FetchError } from 'ofetch'

function protectedAsyncData<T>(key: string, url: string, allowed: Ref<boolean>) {
  const requestFetch = useRequestFetch()
  return useAsyncData<T | null, FetchError>(
    key,
    () => (allowed.value ? (requestFetch(url) as Promise<T>) : Promise.resolve(null)),
    { watch: [allowed] },
  )
}

/**
 * Lädt geschützte Daten nur, wenn der Betrachter sie sehen darf, und lädt neu,
 * sobald sich die Berechtigung ändert (z. B. Demo-Rolle gewechselt).
 * Liefert zusätzlich, ob der Server „nicht gefunden“ meldet.
 */
export async function useProtectedFetch<T>(key: string, url: string, allowed: Ref<boolean>) {
  const result = await protectedAsyncData<T>(key, url, allowed)
  const notFound = computed(() => result.error.value?.statusCode === 404)
  return { ...result, notFound }
}

/** Variante ohne `await` für Composables (SSR wartet trotzdem über onServerPrefetch). */
export function useProtectedFetchSync<T>(key: string, url: string, allowed: Ref<boolean>) {
  return protectedAsyncData<T>(key, url, allowed)
}
