const mongoose = require('mongoose')
require('dotenv').config()
const ConnectToMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log('CONNECTED TO MONGO');
    }
    catch (err) {
        console.log('Error Connection');
    }
}

module.exports = ConnectToMongo