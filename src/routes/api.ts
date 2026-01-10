import { Router } from 'express';
import { User, Post, Movie, FollowRequest, Message, IPost, Comment } from '../models';
import { upload } from '../middleware/upload';
import path from 'path';

const router = Router();

// --- Seeds ---
router.post('/seed', async (req, res) => {
  try {
    await User.deleteMany({});
    await Movie.deleteMany({});
    await Post.deleteMany({});

    const user1 = await User.create({
      username: "cinephile_jane",
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
      bio: "Obsessed with French New Wave and neon landscapes.",
      followers: 1243,
      following: 450,
    });

    const user2 = await User.create({
      username: "film_buff_mike",
      name: "Mike Ross",
      email: "mike@example.com",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
      bio: "Horror enthusiast. Practical effects over CGI.",
      followers: 890,
      following: 210,
    });

    const movies = await Movie.create([
      { tmdbId: 1, title: "Dune: Part Two", year: "2024", rating: 8.8, posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", director: "Denis Villeneuve" },
      { tmdbId: 2, title: "Poor Things", year: "2023", rating: 8.1, posterUrl: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c6Mrqcn.jpg", director: "Yorgos Lanthimos" },
      { tmdbId: 3, title: "Oppenheimer", year: "2023", rating: 8.6, posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", director: "Christopher Nolan" },
      { tmdbId: 6, title: "Past Lives", year: "2023", rating: 7.9, posterUrl: "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZW5J9rQG98.jpg", director: "Celine Song" },
    ]);

    await Post.create([
      {
        user: user1._id,
        movie: movies[1]._id,
        rating: 5,
        content: "Poor Things is a visual feast. Emma Stone's performance is transcendent.",
        likes: 342,
      },
      {
        user: user2._id,
        movie: movies[2]._id,
        rating: 4.5,
        content: "Oppenheimer totally blew me away. The sound design alone deserves an Oscar.",
        likes: 892,
      },
       {
        user: user1._id,
        movie: movies[3]._id,
        rating: 4,
        content: "Past Lives is so subtle yet heartbreaking. A beautiful meditation on destiny.",
        likes: 156,
      },
    ]);

    res.json({ message: "Database seeded successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/seed', async (req, res) => {
      res.status(500).json({ message: "Database seeded successfully"   });

});

// --- Posts ---
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user')
      .populate('movie')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { userId, movieId, rating, content } = req.body;
    
    // Simple check - in real app auth middleware handles this
    const user = await User.findById(userId);
    let movie = await Movie.findOne({ tmdbId: movieId });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!movie) {
        // If movie doesn't exist in our DB but is selected from UI (assuming UI sends full movie data if new)
        // For this demo, we assume the UI sends the tmdbId. 
        // We'll rely on the Seed data for now or need a way to create movies on the fly.
        // Let's allow creating movie if passed in body.
        if (req.body.movieData) {
            movie = await Movie.create(req.body.movieData);
        } else {
             return res.status(404).json({ error: "Movie not found" });
        }
    }

    const newPost = await Post.create({
      user: user._id,
      movie: movie._id,
      rating,
      content,
      sceneHighlight: req.body.sceneHighlight,
    });

    const populatedPost = await Post.findById(newPost._id).populate('user').populate('movie');
    res.json(populatedPost);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/posts/:id/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    
    // Toggle logic simplified: Client tells us if it's a like or unlike, or we just increment for demo
    // Better: generic toggle. Let's just increment/decrement based on a flag or state.
    // For simplicity: We will just increment. Real app needs 'Like' table to track unique user likes.
    // Re-reading requirements: just "Like" interaction.
    
    // Let's accept { increment: boolean }
    const { increment } = req.body;
    post.likes = increment ? post.likes + 1 : Math.max(0, post.likes - 1);
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Comments ---
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('user', 'username name avatar')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { userId, content } = req.body;
    const comment = await Comment.create({
      post: req.params.id,
      user: userId,
      content,
    });
    const populatedComment = await Comment.findById(comment._id).populate('user', 'username name avatar');
    res.json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Auth ---
router.post('/auth/signup', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user (in production, hash password!)
    const user = await User.create({
      username,
      name,
      email,
      password, // WARNING: In production, use bcrypt to hash this!
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      bio: '',
      followers: 0,
      following: 0,
    });

    // Don't send password back
    const { password: _, ...userResponse } = user.toObject();

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || user.password !== password) { // In production, use bcrypt.compare!
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...userResponse } = user.toObject();

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Users ---
// IMPORTANT: Specific routes must come before general routes
router.get('/users/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const posts = await Post.find({ user: user._id })
      .populate('user')
      .populate('movie')
      .sort({ createdAt: -1 });

    const { password: _, ...userResponse } = user.toObject();

    res.json({ user: userResponse, posts });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').limit(20).sort({ followers: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/users/:id/preferences', async (req, res) => {
  try {
    const { favoriteActors, favoriteMovies, favoriteActresses, favoriteGenres } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        preferences: {
          favoriteActors: favoriteActors || [],
          favoriteMovies: favoriteMovies || [],
          favoriteActresses: favoriteActresses || [],
          favoriteGenres: favoriteGenres || [],
        }
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    const { password: _, ...userResponse } = user.toObject();

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Follow System ---
// Send follow request
router.post('/users/:userId/follow', async (req, res) => {
  try {
    const { currentUserId } = req.body; // In production, get from auth token
    const targetUserId = req.params.userId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    // Check if request already exists
    const existingRequest = await FollowRequest.findOne({
      from: currentUserId,
      to: targetUserId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Request already exists" });
    }

    const request = await FollowRequest.create({
      from: currentUserId,
      to: targetUserId,
      status: 'pending'
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Unfollow user
router.delete('/users/:userId/unfollow', async (req, res) => {
  try {
    const { currentUserId } = req.body;
    const targetUserId = req.params.userId;

    const request = await FollowRequest.findOneAndDelete({
      from: currentUserId,
      to: targetUserId,
      status: 'accepted'
    });

    if (!request) {
      return res.status(404).json({ error: "Not following this user" });
    }

    // Update counts
    await User.findByIdAndUpdate(currentUserId, { $inc: { following: -1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followers: -1 } });

    res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get follow requests for current user
router.get('/follow-requests', async (req, res) => {
  try {
    const { userId } = req.query; // In production, get from auth token

    const requests = await FollowRequest.find({
      to: userId,
      status: 'pending'
    }).populate('from', '-password').sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Accept follow request
router.put('/follow-requests/:id/accept', async (req, res) => {
  try {
    const request = await FollowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'accepted';
    await request.save();

    // Update follower counts
    await User.findByIdAndUpdate(request.to, { $inc: { followers: 1 } });
    await User.findByIdAndUpdate(request.from, { $inc: { following: 1 } });

    // Auto-follow back to create mutual follow relationship
    // Check if reverse follow request already exists
    const reverseRequest = await FollowRequest.findOne({
      from: request.to,
      to: request.from
    });

    if (!reverseRequest) {
      // Create and auto-accept reverse follow request for mutual follow
      await FollowRequest.create({
        from: request.to,
        to: request.from,
        status: 'accepted'
      });
      
      // Update counts for mutual follow
      await User.findByIdAndUpdate(request.to, { $inc: { following: 1 } });
      await User.findByIdAndUpdate(request.from, { $inc: { followers: 1 } });
    } else if (reverseRequest.status === 'pending') {
      // If there's a pending request, accept it
      reverseRequest.status = 'accepted';
      await reverseRequest.save();
      
      await User.findByIdAndUpdate(request.to, { $inc: { following: 1 } });
      await User.findByIdAndUpdate(request.from, { $inc: { followers: 1 } });
    }

    res.json({ message: 'Request accepted and mutual follow established' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Reject follow request
router.put('/follow-requests/:id/reject', async (req, res) => {
  try {
    const request = await FollowRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get follow status between two users
router.get('/users/:userId/follow-status', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    const targetUserId = req.params.userId;

    const request = await FollowRequest.findOne({
      from: currentUserId,
      to: targetUserId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (!request) {
      return res.json({ status: 'not_following' });
    }

    res.json({ status: request.status === 'accepted' ? 'following' : 'pending' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Chat System ---
// Get chat history with a specific user
router.get('/messages/:otherUserId', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: otherUserId },
        { from: otherUserId, to: currentUserId }
      ]
    })
    .populate('from', 'username name avatar')
    .populate('to', 'username name avatar')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const { userId } = req.query;

    // Get unique users the current user has messaged with
    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }]
    })
    .populate('from', 'username name avatar')
    .populate('to', 'username name avatar')
    .sort({ createdAt: -1 });

    // Extract unique conversation partners
    const conversationsMap = new Map();
    
    for (const msg of messages) {
      const partnerId = msg.from._id.toString() === userId ? msg.to._id.toString() : msg.from._id.toString();
      
      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          user: msg.from._id.toString() === userId ? msg.to : msg.from,
          lastMessage: msg,
          unreadCount: 0
        });
      }
    }

    // Count unread messages
    for (const [partnerId, conv] of conversationsMap.entries()) {
      const unreadCount = await Message.countDocuments({
        from: partnerId,
        to: userId,
        read: false
      });
      conv.unreadCount = unreadCount;
    }

    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Check if two users can chat (mutual followers)
router.get('/chat/can-chat/:otherUserId', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    const { otherUserId } = req.params;

    const follow1 = await FollowRequest.findOne({
      from: currentUserId,
      to: otherUserId,
      status: 'accepted'
    });
    
    const follow2 = await FollowRequest.findOne({
      from: otherUserId,
      to: currentUserId,
      status: 'accepted'
    });

    const canChat = !!(follow1 && follow2);
    res.json({ canChat });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Mark messages as read
router.put('/messages/mark-read', async (req, res) => {
  try {
    const { currentUserId, otherUserId } = req.body;

    await Message.updateMany(
      { from: otherUserId, to: currentUserId, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Media Upload ---
// Upload file endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      type: fileType,
      url: fileUrl,
      filename: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
