var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    mail: {type: String, unique: true, required: true},
    mailConfirmed: {type: Boolean, default: false},
    currentCode: String,
    cash: {type: Number, default: 1000000},
    netWorth: {type: [Number], default: [1000000] },
    chainName: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    branches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    }], 
    labels: [String],
    profit: [String],
    dark: {type: Boolean, default: false},
    invitedby: {type: String},
    invitesRemaining: {type: Number, default: 3},
    date: {type: String, default: 'March 1953'},
    accountant: {type: Boolean, default: false},
    banker: {type: Boolean, default: false},
    salesperson: {type: Boolean, default: false},
    toPay: {type: Number, default: 0},
    loansRemaining: {type: Number, default: 0},
    autorenovate: {type: Boolean, default: false},
    sponsor: {type:Boolean, default: false},
    sponsorMessage: {type: String},
    bestNetWorth: {type: Number, default: 0}
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);