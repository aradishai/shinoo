const sharp = require('sharp')
const path = require('path')

const input = "C:\\Users\\Aradi\\OneDrive\\Desktop\\הכל\\אנטי גרביטי\\אפליקציה\\חדשים\\סרגל\\אחרון ודי.png"
const output = path.join(__dirname, '../public/icons/chat.png')

sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    const { width, height } = info
    const buf = Buffer.from(data)

    for (let i = 0; i < buf.length; i += 4) {
      const r = buf[i], g = buf[i + 1], b = buf[i + 2]
      // Keep only clearly gold/yellow pixels — everything else becomes pure black
      const isGold = r > 80 && g > 50 && b < 60 && r > b + 40
      if (isGold) {
        buf[i + 3] = 255 // fully opaque gold
      } else {
        buf[i] = 0
        buf[i + 1] = 0
        buf[i + 2] = 0
        buf[i + 3] = 255 // fully opaque black (lighten will remove it)
      }
    }

    return sharp(buf, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(output)
  })
  .then(() => console.log('Done!'))
  .catch(console.error)
