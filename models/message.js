var mongoose = require('mongoose');

var MessageSchema = new mongoose.Schema({
    message: {type: String, required: true},
    sender: {type: String, required: true},
    time: {type: Date, required: true}
});


module.exports = mongoose.model("Message", MessageSchema);