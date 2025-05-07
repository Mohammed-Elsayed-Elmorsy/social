const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    content: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // <<< NEW
    comments: [{ // Add the comments array
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
module.exports = Post

