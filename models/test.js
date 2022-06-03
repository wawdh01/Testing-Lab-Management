const mongoose = require('mongoose');
const testSchema = new mongoose.Schema({
    name: {type: String, required: true},
    image: {type: String, default: "https://media.istockphoto.com/photos/blood-test-results-in-a-medical-lab-picture-id1300036735?b=1&k=20&m=1300036735&s=170667a&w=0&h=7mGgSpIOJv5ZxK5E6cgFvzXTv2dhMp2iMW_wbpBBfSs="},
    price: {type: Number, required: true},
    discount: {type: Number, default: 0},
    description: {type: String, required: true}
})

module.exports = mongoose.model("Test", testSchema);