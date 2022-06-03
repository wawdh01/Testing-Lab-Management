const mongoose = require('mongoose');
const userdataSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    price: {type: Number, required: true},
    bookedDate: {type: Date, required: true}
})

module.exports = mongoose.model("userdata", userdataSchema);