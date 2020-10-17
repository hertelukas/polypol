var mongoose = require('mongoose');

var LocationSchema = new mongoose.Schema({
    country: String,
    city: String,
    value: Number,
    visitors: Number,
    branches: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch'
        }
    ],
    beds: Number ,
    latitude: Number,
    longitude: Number,
    region: String
});


module.exports = mongoose.model("Location", LocationSchema);