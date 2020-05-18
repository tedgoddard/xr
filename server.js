const https = require('https')
const fs = require('fs')
const express = require('express')

const app = express()
const port = 4443

const passphrase = "passphrase"
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  passphrase
}

app.use(express.static("./"))

https.createServer(options, app).listen(port)

