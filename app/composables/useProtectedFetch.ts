import type { FetchError } from 'ofetch'

/**
 * Lädt geschützte Daten nur, wenn der Betrachter sie sehen darf, und lädt neu,
 * sobald sich die Berechtigung ändert (z. B. Demo-Rolle gewechselt).
 * Liefert zusätzlich, ob der Server „nicht gefunden“ meldet.
 */
export async function useProtectedFetch<T>(key: string, url: string, allowed: Ref<boolean>) {
  const requestFetch = useRequestFetch()
  const result = await useAsyncData<T | null, FetchError>(
    key,
    () => (allowed.value ? (requestFetch(url) as Promise<T>) : Promise.resolve(null)),
    { watch: [allowed] },
  )
  const notFound = computed(() => result.error.value?.statusCode === 404)
  return { ...result, notFound }
}
