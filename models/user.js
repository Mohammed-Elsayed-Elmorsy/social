const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const notificationSchema = new mongoose.Schema({
    type: String, // e.g., 'comment'
    message: String,
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
});

const userSchema = new Schema({

    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    pass: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    notifications: [notificationSchema],
}, { timestamps: true });


const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;