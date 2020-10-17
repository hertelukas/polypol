var mongoose = require('mongoose');

var BranchSchema = new mongoose.Schema({
    city: String,
    beds: Number, 
    stars: Number,
    priceFactor: Number,
    lables: [String],
    profit: [Number],
    staff: [Number],
    interior: [Number],
    taxes: [Number],
    renovation: {type: Number, default: 240},
    onSale: Boolean,
    salePrice: Number,
    autorenovate: {type: Boolean, default: false},
    salesperson: {type: Boolean, default: false}
});

module.exports = mongoose.model("Branch", BranchSchema);