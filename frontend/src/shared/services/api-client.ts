import type { ApiEnvelope } from '@/shared/services/api-mappers'
import { getSessionToken, logoutSession } from '@/shared/services/session.service'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')
const wait = async (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

function cloneData<T>(value: T): T {
  return structuredClone(value)
}

function createUrl(resource: string, query?: Record<string, string | number | undefined>) {
  const normalizedResource = resource.startsWith('/') ? resource : `/${resource}`
  const url = new URL(`${API_BASE_URL}${normalizedResource}`)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, String(value))
    })
  }

  return url
}

async function parseResponseBody(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as ApiEnvelope<unknown> | Record<string, unknown>
  } catch {
    return text
  }
}

function extractErrorMessage(payload: unknown, fallbackMessage: string) {
  if (!payload) return fallbackMessage
  if (typeof payload === 'string') return payload

  if (typeof payload === 'object') {
    const message = 'message' in payload && typeof payload.message === 'string' ? payload.message : null
    const data = 'data' in payload ? payload.data : null

    if (data && typeof data === 'object') {
      const firstValidationMessage = Object.values(data).find((value) => typeof value === 'string')
      if (typeof firstValidationMessage === 'string') return firstValidationMessage
    }

    if (message) return message
  }

  return fallbackMessage
}

interface RequestOptions<TFallback> {
  body?: unknown
  fallback?: () => TFallback | Promise<TFallback>
  query?: Record<string, string | number | undefined>
}

class ApiClient {
  isConfigured() {
    return Boolean(API_BASE_URL)
  }

  private async request<T, TFallback = T>(
    method: string,
    resource: string,
    options: RequestOptions<TFallback> = {},
  ): Promise<T | TFallback> {
    if (!this.isConfigured()) {
      if (!options.fallback) {
        throw new Error('Defina VITE_API_URL para habilitar a API real.')
      }

      await wait()
      return cloneData(await options.fallback())
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const token = getSessionToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(createUrl(resource, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    const payload = await parseResponseBody(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logoutSession()
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.replace('/login')
        }
      }

      throw new Error(extractErrorMessage(payload, 'Não foi possível concluir a operação.'))
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
      return cloneData((payload as ApiEnvelope<T>).data)
    }

    return cloneData(payload as T)
  }

  async get<T, TFallback = T>(
    resource: string,
    options?: Omit<RequestOptions<TFallback>, 'body'> | (() => TFallback | Promise<TFallback>),
  ) {
    const normalizedOptions =
      typeof options === 'function'
        ? { fallback: options }
        : options

    return this.request<T, TFallback>('GET', resource, normalizedOptions)
  }

  async post<T, TFallback = T>(
    resource: string,
    options?: RequestOptions<TFallback> | (() => TFallback | Promise<TFallback>),
  ) {
    const normalizedOptions =
      typeof options === 'function'
        ? { fallback: options }
        : options

    return this.request<T, TFallback>('POST', resource, normalizedOptions)
  }

  async patch<T, TFallback = T>(
    resource: string,
    options?: RequestOptions<TFallback> | (() => TFallback | Promise<TFallback>),
  ) {
    const normalizedOptions =
      typeof options === 'function'
        ? { fallback: options }
        : options

    return this.request<T, TFallback>('PATCH', resource, normalizedOptions)
  }

  async delete<T, TFallback = T>(
    resource: string,
    options?: Omit<RequestOptions<TFallback>, 'body'> | (() => TFallback | Promise<TFallback>),
  ) {
    const normalizedOptions =
      typeof options === 'function'
        ? { fallback: options }
        : options

    return this.request<T, TFallback>('DELETE', resource, normalizedOptions)
  }
}

export const apiClient = new ApiClient()
