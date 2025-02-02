import Color from "color"
import { GenerationParams } from "./generation-params"
import { BufferedImageData } from "./image-data"
import { ColorKey, detectPalette, keyToRgb, rgbToKey } from "./palette"
import {
  makeRandomGenerator,
  RandomGenerator,
  randomRanged,
  randomRangedInt,
} from "./random"
import { makeCurveFunction } from "./curve"

export async function generateAlteredImages(
  imageData: BufferedImageData,
  params: GenerationParams,
): Promise<readonly BufferedImageData[]> {
  const random = makeRandomGenerator(params.seed)
  const originalPalette = detectPalette(imageData)

  const results: BufferedImageData[] = []

  for (let i = 0; i < params.howMany; i++) {
    results.push(
      generateAlteredImage(imageData, originalPalette, random, params),
    )
  }

  return results
}

function generateAlteredImage(
  imageData: BufferedImageData,
  originalPalette: Set<ColorKey>,
  random: RandomGenerator,
  params: GenerationParams,
) {
  const hueCurve = makeCurveFunction(params.howHueShift)
  const hueRandom = () => hueCurve(random())
  function transformColor(
    r: number,
    g: number,
    b: number,
  ): [number, number, number] {
    let c = Color({ r, g, b })
    if (params.minHueShift === params.maxHueShift) {
      c = c.rotate(params.minHueShift * 360)
    } else {
      c = c.rotate(
        randomRanged(
          params.minHueShift * 360,
          params.maxHueShift * 360,
          hueRandom,
        ),
      )
    }
    return [c.red(), c.green(), c.blue()]
    // return [255, 0, 255]
    // return [
    //   Math.floor(Math.random() * 256),
    //   Math.floor(Math.random() * 256),
    //   Math.floor(Math.random() * 256),
    // ]
  }

  const mappedPalette = new Map<ColorKey, ColorKey>()
  for (const key of originalPalette) {
    const [r, g, b] = keyToRgb(key)
    const [r2, g2, b2] = transformColor(r, g, b)
    mappedPalette.set(key, rgbToKey(r2, g2, b2))
  }
  // Create a new ImageData instance
  const data = new Uint8ClampedArray(imageData.buffer)

  for (let i = 0; i < data.length; i += 4) {
    // const [r, g, b] = transformColor(data[i], data[i + 1], data[i + 2]);
    const [r0, g0, b0] = [data[i], data[i + 1], data[i + 2]]
    const [r, g, b] = keyToRgb(mappedPalette.get(rgbToKey(r0, g0, b0))!)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    // Alpha channel remains unchanged
  }

  return {
    width: imageData.width,
    height: imageData.height,
    buffer: data,
  }
}
