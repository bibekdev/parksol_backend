const { AdminSchema, PriceSchema } = require('./model')
const bcrypt = require('bcryptjs')

async function seed() {
  const password = await bcrypt.hash('admin123', 10)
  await AdminSchema.create({
    username: 'admin',
    password,
  })

  await PriceSchema.create({
    weekdayPrice: 50,
    weekendPrice: 70,
  })
}

module.exports = { seed }
