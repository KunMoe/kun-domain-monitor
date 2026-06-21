import { APP_REDIS_PREFIX } from '~~/shared/app'

export const setKv = async (key: string, value: string, ttl: number) => {
  await useStorage('redis').setItem(`${APP_REDIS_PREFIX}:${key}`, value, { ttl })
}

export const getKv = async (key: string) => {
  return useStorage('redis').getItem<string>(`${APP_REDIS_PREFIX}:${key}`)
}

export const delKv = async (key: string) => {
  await useStorage('redis').removeItem(`${APP_REDIS_PREFIX}:${key}`)
}
