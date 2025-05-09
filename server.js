require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const ConnectToMongo = require("./config/Mongo");
const app = express();
var cookies = require("cookie-parser");
const Router = require("./routes/user");
app.use(cookies());
// app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads'))
app.use(Router);
ConnectToMongo();
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`SERVER IS RUNNING ON PORT ${PORT}`));


