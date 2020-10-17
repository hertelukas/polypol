var mongoose = require('mongoose');

var NewsSchema = new mongoose.Schema({
    region: [String],
    city: String,
    title: String, 
    text: String,
    date: String,
    change: Number
});


module.exports = mongoose.model("News", NewsSchema);