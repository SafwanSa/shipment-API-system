const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Shipment = require('./models/shipment');
const TrackingStatus = require('./models/trackingStatus');

const { shipmentSchema } = require('./schemas/shipmentSchemas');
const label = require('./utilities/label');
const upload = require('./utilities/upload_attachments.js');

const port = process.env.PORT || 30000;
const app = express();
app.use(express.json());
app.use(cors());

function validateShipment(shipment) {
  return shipmentSchema.validate(shipment);
}

function generateRandomId() {
  return Math.round(Math.random() * Math.pow(10, 6));
}

const dbURL = "mongodb+srv://safwanoz:safwanoz@shipments-cluster.tapab.mongodb.net/shipmentsDB?retryWrites=true&w=majority";

mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  app.listen(port, () => {
    console.log(`Server is listening to port: ${port}`)
  });
  console.log("Database connection established");
})
.catch((error) => {
  console.log(error);
});

app.get('/v1', (_, res) => {
  res.send({"message": "Hello World"});
});

// List all shipments
app.get('/v1/shipments', async (_, res) => {
 Shipment.find()
  .then((result) => {
    res.send(result);
  })
  .catch((error) => {
    res.status(404).send(error);
  })
});

app.get('/v1/statuses', async (_, res) => {
  TrackingStatus.find()
  .then((result) => {
    res.send(result);
  }).catch((err) => {
    console.log(err);
    res.send(err);
  });
});

// Add Shipment
app.post('/v1/create-shipment', async (req, res) => {
  const { error } = validateShipment(req.body);
  if(error) return res.status(400).send(error.details[0].message);
  const freshShipment = req.body.shipment;
  freshShipment.tracking_number = generateRandomId();
  freshShipment.tracking_status = "60449851d69928531b6ecf46";
  freshShipment.carrier = "60447ad3acb03a1502419517";

  const shipment = new Shipment({...freshShipment});

  shipment.save()
  .then((result) => {
    res.send(result);
  })
  .catch((error) => {
    console.log(error);
  });
});

// Track Shipment
app.get('/v1/track-shipment', async (req, res) => {
  const tracking_number = parseInt(req.query.tracking_number);
  if(!tracking_number) return res.send(400).send("Enter the tracking number correctly!");
  Shipment.findOne({ "tracking_number":  tracking_number}, {
    "_id": 0,
    "ship_from": 0,
    "ship_to": 0,
    "createdAt": 0,
    "updatedAt": 0
  })
  .populate('tracking_status carrier')
  .exec((err, shipment) => {
    if(err) return res.send(err);
    if(!shipment) return res.status(404).send("Shipment not found!");
    res.send(shipment);
  });
});

// Get Label of shipment/s
app.post('/v1/get-label', async (req, res) => {
  // There is a value in the body called trackingNumbers
  if(!req.body.trackingNumbers) return res.status(400)
  .send('Tracking numbers are missing!');

  const trackingNumbers = req.body.trackingNumbers;
  const shipments = await Shipment.find({ "tracking_number": {"$in": trackingNumbers}}, {
    "_id": 0,
  })
  
  if(!shipments) return res.status(404).send("Shipments not found!");

  // res.send(shipments);
  label(res, requestedShipment);
});

// Hook
app.get('/v1/hook', (req, res) => {

});

app.post('/v1/upload', upload.array('image', 1), (req, res) => {
  // Take as a request from the client two things: 
  // file and the shipment id. Force the user to add attachments after adding a shipment.
  console.log(req.files[0].location);
  // console.log(req.shipmentId);
  res.send({ file: req.file });
 });

