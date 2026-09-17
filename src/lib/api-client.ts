import axios from 'axios'
import { env } from './env'
import { toApiError } from './api-error'
import { notifySessionExpired } from './session-events'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.startsWith('/auth/')
    )
      notifySessionExpired()
    return Promise.reject(axios.isCancel(error) ? error : toApiError(error))
  },
)
