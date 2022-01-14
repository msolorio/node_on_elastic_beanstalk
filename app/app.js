const express = require('express')
const app = express()
const fs = require('fs')
const PORT = 8080

app.get('/', (req, res) => {
  html = fs.readFileSync('templates/index.html')
  res.writeHead(200)
  res.write(html)
  res.end()
})

app.get('/test', (req, res) => {
  res.send('the REST test endpoint')
})

app.listen(PORT, () => {
  console.log('Server running on port:', PORT)
})
