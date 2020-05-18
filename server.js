const http = require('http')
const https = require('https')
const fs = require('fs')
const express = require('express')

const app = express()
const sport = 4443
const port = 8000

const passphrase = "passphrase"
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  passphrase
}

app.use(express.static("./"))

http.createServer(options, app).listen(port)
https.createServer(options, app).listen(sport)

