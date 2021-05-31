import http from 'http'
import https from 'https'
import fs from 'fs'
import express from 'express'
import WebSocket from 'ws'

// openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -nodes -days 365

const app = express()
const sport = 4443
const port = 8000
const rooms = { }

const passphrase = "passphrase"
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  passphrase
}

function setupSocketServer(server) {
  const wsServer = new WebSocket.Server({ server })
  wsServer.on('connection', (wsConnection, request) => {
    const url = request.url
    console.log('WebSocket Connections:', wsServer.clients.size, url)
    const [inputMatch, inputRoom] = url.match(/^\/input\/([^/]*)/) || []
    if (inputMatch) {
      wsConnection.on('message', message => {
        const clients = rooms[inputRoom] || []
        for (const client of clients) {
          client.send(message)
        }
      })
    }
    const [streamMatch, room] = url.match(/^\/([^/]*)/) || []
    if (streamMatch) {
      const clients = rooms[room] || []
      clients.push(wsConnection)
      rooms[room] = clients
    }
  })
}

app.use(express.static("./"))

const httpServer = http.createServer(options, app).listen(port)
const httpsServer = https.createServer(options, app).listen(sport)

setupSocketServer(httpServer)
setupSocketServer(httpsServer)
