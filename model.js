const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
  username: { type: String, lowercase: true, required: true },
  password: { type: String, required: true },
})

const parkingSchema = new mongoose.Schema({
  slot: String,
  startTime: Date,
  endTime: Date,
  duration: Number,
})

const priceSchema = new mongoose.Schema({
  weekdayPrice: {
    type: Number,
    required: true,
    default: 50, // Default weekday price
  },
  weekendPrice: {
    type: Number,
    required: true,
    default: 70, // Default weekend price
  },
})

const AdminSchema = mongoose.model('Admin', adminSchema)
const ParkingSchema = mongoose.model('Parking', parkingSchema)
const PriceSchema = mongoose.model('Price', priceSchema)

module.exports = {
  AdminSchema,
  ParkingSchema,
  PriceSchema,
}
