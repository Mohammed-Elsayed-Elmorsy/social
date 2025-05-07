const bcrypt = require("bcryptjs");
const multer = require('multer');
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;
const Router = require("express").Router();
const User = require("../models/user");
const path = require('path');

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files in 'uploads' folder
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Create the folder if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Register Route
Router.post("/register", upload.single('avatar'), async (req, res) => {
    const { username, email, pass } = req.body;
    const avatar = req.file ? req.file.path : ''; // 👈 avatar filename
    const foundEmail = await User.findOne({ email });
    if (foundEmail) {
        res.json("Email already Registered");
        return;
    } else {
        await User.create({
            username,
            email,
            pass: bcrypt.hashSync(pass, bcrypt.genSaltSync(10)),
            avatar

        });
        res.json("Registration successful");
        return;
    }
});
Router.post("/login", async (req, res) => {
    const { email, pass } = req.body;

    const foundEmail = await User.findOne({ email });
    if (foundEmail) {
        const passOk = await bcrypt.compareSync(pass, foundEmail.pass);
        if (passOk) {
            jwt.sign(
                {
                    email: foundEmail.email,
                    username: foundEmail.username,
                    id: foundEmail._id,
                },
                secret,
                {
                    expiresIn: "1h",

                },
                (err, token) => {
                    if (err) throw err;
                    res.cookie("token", token).json(foundEmail);
                }
            );
        } else {
            res.json("invalid Password");
        }
        return;
    } else {
        res.json("account not here");
        return;
    }
});
Router.get("/verify", async (req, res) => {
    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ error: "No token provided log in please" });
    }

    jwt.verify(token, secret, {}, async (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: "Token expired" });
            } else {
                return res.status(401).json({ error: "Invalid token" });
            }
        }

        try {
            const foundEmail = await User.findOne({ email: user.email });
            if (foundEmail) {
                return res.json(foundEmail);
            } else {
                return res.status(404).json({ error: "User not found" });
            }
        } catch (dbErr) {
            return res.status(500).json({ error: "Database error" });
        }
    });
});


Router.get("/logout", async (req, res) => {
    res.clearCookie('token');
    res.json("Logged out successfully");
});

const Post = require('../models/post'); // Import it
const { log } = require("console");

Router.post('/post', async (req, res) => {
    const { content } = req.body;
    const token = req.cookies.token;
    console.log(content, token);

    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, user) => {
        if (err) throw err;

        const postDoc = await Post.create({
            content,
            author: user.id,
        });

        res.json(postDoc);
    });
});

Router.get('/posts', async (req, res) => {
    const posts = await Post.find()
        .populate('author', ['username', 'avatar'])
        .populate('comments.author', ['username', 'avatar'])
        .populate('likes', ['username', 'avatar'])
        .sort({ createdAt: -1 }); // newest first
    res.json(posts);
});

Router.post('/like/:id', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, userData) => {
        if (err) throw err;

        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json('Post not found');

        const userId = userData.id;

        // Like or Unlike
        const index = post.likes.indexOf(userId);
        if (index === -1) {
            post.likes.push(userId);
        } else {
            post.likes.splice(index, 1);
        }

        await post.save();
        console.log(post.likes, userId);

        // Populate the updated post's likes before sending response
        const updatedPost = await Post.findById(postId).populate('likes', ['_id']);

        res.json({ post: updatedPost });
    });
});

// Delete comment by commentId and postId
Router.delete('/comment/:postId/:commentId', async (req, res) => {
    const { postId, commentId } = req.params;
    const token = req.cookies.token;

    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, userData) => {
        if (err) throw err;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json('Post not found');

        // Find the comment in the comments array
        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json('Comment not found');

        // Check if the comment belongs to the user trying to delete it
        if (comment.author.toString() !== userData.id) {
            return res.status(403).json('Forbidden');
        }

        // Remove the comment using pull
        post.comments.pull(commentId);
        await post.save();

        res.json('Comment deleted successfully');
    });
});


Router.post('/comment/:postId', async (req, res) => {
    const { content } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, userData) => {
        if (err) return res.status(401).json('Invalid token');

        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json('Post not found');

        const newComment = {
            author: userData.id,
            content,
            createdAt: new Date(),
        };

        post.comments.push(newComment);
        await post.save();
        await post.populate('comments.author');

        // ➕ Create notification if commenter is not the post owner
        if (post.author.toString() !== userData.id) {
            const postAuthor = await User.findById(post.author);
            postAuthor.notifications.push({
                type: 'comment',
                message: 'Someone commented on your post.',
                from: userData.id,
                postId: post._id,
            });
            await postAuthor.save();
        }

        const populatedComment = post.comments[post.comments.length - 1];
        res.json(populatedComment);
    });
});


Router.get('/notifications', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, userData) => {
        if (err) return res.status(401).json('Invalid token');

        const user = await User.findById(userData.id)
            .populate('notifications.from', ['username', 'avatar'])
            .populate('notifications.postId', ['_id']);
        res.json(user.notifications.reverse()); // Newest first
    });
});
// Add this to your routes file
Router.post('/notifications/mark-read', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, userData) => {
        if (err) return res.status(401).json('Invalid token');

        const user = await User.findById(userData.id);
        if (!user) return res.status(404).json('User not found');

        user.notifications.forEach(n => {
            n.read = true;
        });

        await user.save();
        res.json({ success: true });
    });
});

Router.delete('/post/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id);

    const token = req.cookies.token;

    if (!token) return res.status(401).json('Unauthorized');

    jwt.verify(token, secret, {}, async (err, userData) => {
        if (err) throw err;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json('Post not found');

        if (String(post.author) !== String(userData.id)) {
            return res.status(403).json('You can only delete your own posts');
        }

        await post.deleteOne();
        res.json('Post deleted');
    });
});

module.exports = Router;