
// Multer to get files
const Multer = require('multer')
const photoMiddleWare = Multer({ dest: 'uploads/' })
Multer({
    limits: { fieldSize: 2 * 1024 * 1024 }
})
const GetFile = photoMiddleWare.single('file')

module.exports = GetFile