const express = require('express');
const bodyParser = require('body-parser');
const { AES, enc, format, mode, pad } = require('crypto-js');
const Base64 = require('crypto-js/enc-base64');
const mysql = require('mysql2');
const morgan = require('morgan');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Setup logging
app.use(morgan('dev'));  // Log HTTP requests

// Create a MySQL connection pool
const db = mysql.createPool({
  host: 'localhost',   // Replace with your MySQL host
  user: 'root',        // Replace with your MySQL usermid
  password: 'Manoj@123',        // Replace with your MySQL password
  database: 'callback'  // Replace with your database mid
});

// Decryption function
function decryptEas(data, key, iv) {
  const keys = Base64.parse(key);
  const ivs = Base64.parse(iv);
  // Decrypt data with AES
  return AES.decrypt(data, keys, {
    iv: ivs,
    mode: mode.CBC,
    padding: pad.Pkcs7,
    format: format.Hex
  }).toString(enc.Utf8);
}

// Callback handler
function handleCallback(req, res) {
  const result = req.body.response;
  
  if (!result) {
    console.log("No data received in request.");
    return res.status(400).json({ error: "No response data received." });
  }
  
  // Decrypt the data
  let dataItems;
  try {
    dataItems = decryptEas(
      result,
      "JoYPd+qso9s7T+Ebj8pi4Wl8i+AHLv+5UNJxA3JkDgY=",
      "hlnuyA9b4YxDq6oJSZFl8g=="
    );
  } catch (err) {
    console.error("Decryption failed: ", err);
    return res.status(500).json({ error: "Decryption failed." });
  }
  
  // Parse the decrypted data
  let parsedData;
  try {
    parsedData = JSON.parse(dataItems);
  } catch (err) {
    console.error("Failed to parse decrypted data:", err);
    return res.status(500).json({ error: "Failed to parse decrypted data." });
  }

  console.log("Decrypted and Parsed Data:", parsedData);

  // Save the data to MySQL database
  const { getepayTxnId, mid, txnAmount } = parsedData; // Assuming the decrypted data contains these fields.

  if (!getepayTxnId || !mid || !txnAmount) {
    console.log("Missing required fields in the data.");
    return res.status(400).json({ error: "Missing required fields in the decrypted data." });
  }

  const query = 'INSERT INTO users (getepayTxnId, mid, txnAmount) VALUES (?, ?, ?)';
  db.execute(query, [getepayTxnId, mid, txnAmount], (err, result) => {
    if (err) {
      console.error("Error inserting data into database: ", err);
      return res.status(500).json({ error: "Database insertion failed." });
    }

    console.log("Data successfully inserted into the database.");
    return res.status(200).json({ success: true, data: parsedData });
  });
}

// Example of handling a GET request
app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

// Handle the POST callback
app.post("/callback", handleCallback);


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});