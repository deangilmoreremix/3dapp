import { LumaSplatsThree } from '@lumaai/luma-web'

let isBinaryLoaded = false
let loadPromise: Promise<void> | null = null
export const BINARY_URL = 'https://cdn.jsdelivr.net/npm/@lumaai/luma-web@0.2.1/dist/core/luma-web-core.wasm'
let wasmBinaryCache: ArrayBuffer | null = null

export async function loadLumaCoreBinary(): Promise<ArrayBuffer | null> {
  if (isBinaryLoaded && wasmBinaryCache) return wasmBinaryCache
  if (loadPromise) return loadPromise

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(BINARY_URL, {
        cache: 'no-store',
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch Luma core binary')
      }
      
      const wasmBinary = await response.arrayBuffer()
      wasmBinaryCache = wasmBinary
      
      isBinaryLoaded = true
      resolve(wasmBinaryCache)
    } catch (error) {
      console.error('Failed to load Luma core binary:', error)
      resolve(null)
    }
  })

  return loadPromise
}