import sharp from 'sharp'

async function removeDarkBackground(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const pixels = new Uint8Array(data)

  const idx = (x, y) => (y * width + x) * channels
  const isBg = (x, y) => {
    const i = idx(x, y)
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    return (r + g + b) / 3 < 60
  }

  // BFS flood fill from all border pixels
  const visited = new Uint8Array(width * height)
  const queue = []

  for (let x = 0; x < width; x++) {
    if (isBg(x, 0)) queue.push(x + 0 * width)
    if (isBg(x, height - 1)) queue.push(x + (height - 1) * width)
  }
  for (let y = 0; y < height; y++) {
    if (isBg(0, y)) queue.push(0 + y * width)
    if (isBg(width - 1, y)) queue.push((width - 1) + y * width)
  }

  while (queue.length > 0) {
    const pos = queue.pop()
    if (visited[pos]) continue
    visited[pos] = 1
    const x = pos % width
    const y = Math.floor(pos / width)
    pixels[idx(x, y) + 3] = 0  // make transparent

    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
    ]
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const npos = nx + ny * width
        if (!visited[npos] && isBg(nx, ny)) {
          queue.push(npos)
        }
      }
    }
  }

  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath)

  console.log(`✅ Saved ${outputPath}`)
}

await removeDarkBackground('public/btn-x2.png', 'public/btn-x2.png')
await removeDarkBackground('public/btn-shinoo.png', 'public/btn-shinoo.png')
