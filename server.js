const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const { SerialPort } = require('serialport')
const Readline = require('@serialport/parser-readline')
const moment = require('moment')
const { ParkingSchema } = require('./model')
const { seed } = require('./seed')
const appRoutes = require('./api')

const app = express()
app.use(express.json())
app.use(cors())

app.use('/', appRoutes)

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
  },
})

let slotData = {
  available_slots: 4,
  s1: { occupied: false, startTime: null },
  s2: { occupied: false, startTime: null },
  s3: { occupied: false, startTime: null },
  s4: { occupied: false, startTime: null },
}

const slots = ['s1', 's2', 's3', 's4']

//Setup Serial Port
const serialPort = new SerialPort({
  path: 'COM4',
  baudRate: 9600,
})
const parser = serialPort.pipe(new Readline.ReadlineParser({ delimiter: '\n' }))

parser.on('data', async data => {
  try {
    const parsedData = JSON.parse(data)

    slotData.available_slots = parsedData.available_slots

    for (const slot of slots) {
      const isOccupied = parsedData[slot] === 1

      if (isOccupied && !slotData[slot].occupied) {
        slotData[slot].occupied = true
        slotData[slot].startTime = new Date()
      } else if (!isOccupied && slotData[slot].occupied) {
        const startTime = slotData[slot].startTime
        const endTime = new Date()
        const duration = moment(endTime).diff(moment(startTime), 'minutes')

        await ParkingSchema.create({
          slot,
          startTime,
          endTime,
          duration,
        })

        slotData[slot].occupied = false
        slotData[slot].startTime = null
      }
    }

    io.emit('slot_update', slotData)
  } catch (error) {
    console.log('Error parsing data from Arduino:', error)
  }
})

io.on('connection', socket => {
  console.log('Client connected')
  socket.emit('slot_update', slotData)

  socket.on('disconnect', () => {
    console.log('Client disconnected')
  })
})

mongoose.connect('mongodb://127.0.0.1:27017/parksol')

server.listen(4000, () => {
  console.log('server running on http://localhost:4000')
  // seed()
})
