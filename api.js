const express = require('express')
const PDFDocument = require('pdfkit')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { ParkingSchema, PriceSchema, AdminSchema } = require('./model')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  const admin = await AdminSchema.findOne({ username })
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found' })
  }
  const checkPassword = await bcrypt.compare(password, admin.password)
  if (!checkPassword) {
    return res.status(404).json({ error: "Passwords don't match" })
  }

  const token = jwt.sign(
    { id: admin._id, username: admin.username },
    'secret',
    { expiresIn: '7D' }
  )
  return res.status(200).json({ token })
})

router.get('/price', async (req, res) => {
  const pricing = await PriceSchema.find()
  return res.status(200).json(pricing[0])
})

router.get('/history', async (req, res) => {
  const parkingHistory = await ParkingSchema.find()
    .sort({ endTime: -1 })
    .limit(20)
  return res.status(200).json(parkingHistory)
})

router.put('/price-update/:id', async (req, res) => {
  const { id } = req.params
  const { weekdayPrice, weekendPrice } = req.body

  const existingPricing = await PriceSchema.findById(id)
  if (!existingPricing) {
    return res.status(404).json({ error: 'Price not found' })
  }
  const updatedPricing = await PriceSchema.findByIdAndUpdate(
    id,
    {
      weekdayPrice,
      weekendPrice,
    },
    { new: true }
  )
  return res.status(200).json(updatedPricing)
})

router.get('/today-price', async (req, res) => {
  const pricing = await PriceSchema.findOne()
  if (!pricing) {
    return res.status(404).json({ error: 'Price not available' })
  }
  const today = new Date().getDay()
  if (today === 0 || today === 6) {
    return res.status(200).json({ price: pricing.weekendPrice })
  }
  return res.status(200).json({ price: pricing.weekdayPrice })
})

router.get('/generate-receipt/:id', async (req, res) => {
  try {
    const { id } = req.params

    //Fetch the parking session and pricing data
    const parkingSession = await ParkingSchema.findById(id)
    const pricing = await PriceSchema.findOne()

    if (!parkingSession || !pricing) {
      return res.status(404).send('Data not found')
    }

    const startDay = new Date(parkingSession.startTime).getDay() // 0 = Sunday, 6 = Saturday
    const pricePerHour =
      startDay === 0 || startDay === 6
        ? pricing.weekendPrice
        : pricing.weekdayPrice

    //Calculate price based on the duration
    const durationInMinutes = parkingSession.duration
    const pricePerMinute = pricePerHour / 60
    const totalPrice = durationInMinutes * pricePerMinute

    //Create PDF
    const doc = new PDFDocument()
    const receiptFileName = `receipt-${parkingSession._id}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; fileName=${receiptFileName}`
    )
    doc.pipe(res)

    doc.fontSize(20).text('Parking Receipt', { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).text(`Receipt ID: ${parkingSession._id}`)
    doc.text(`Slot: ${parkingSession.slot}`)
    doc.text(
      `Start Time ${new Date(parkingSession.startTime).toLocaleDateString()}`
    )
    doc.text(
      `End Time ${new Date(parkingSession.endTime).toLocaleDateString()}`
    )
    doc.text(`Duration: ${parkingSession.duration} minutes`)
    doc.text(`Price: Rs. ${totalPrice.toFixed(2)}`)
    doc.moveDown()
    doc
      .fontSize(16)
      .text('Thank you for using our parking service!', { align: 'center' })
    doc.end()
  } catch (error) {
    console.log('Error generating receipt', error)
    res.status(500).send('Error generating receipt')
  }
})

module.exports = router
