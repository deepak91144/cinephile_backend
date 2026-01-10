import mongoose, { Schema, Document } from 'mongoose';

// --- Interfaces ---
export interface IUser extends Document {
  username: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  preferences?: {
    favoriteActors: string[];
    favoriteMovies: string[];
    favoriteActresses: string[];
    favoriteGenres: string[];
  };
}

export interface IMovie extends Document {
  tmdbId: number;
  title: string;
  year: string;
  posterUrl: string;
  rating: number;
  director?: string;
}

export interface IPost extends Document {
  user: IUser['_id'];
  movie: IMovie['_id'];
  rating: number;
  content: string;
  sceneHighlight?: string;
  likes: number;
  createdAt: Date;
}

export interface IComment extends Document {
  post: IPost['_id'];
  user: IUser['_id'];
  content: string;
  createdAt: Date;
}

export interface IFollowRequest extends Document {
  from: IUser['_id'];
  to: IUser['_id'];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface IMessage extends Document {
  from: IUser['_id'];
  to: IUser['_id'];
  content: string;
  attachment?: {
    type: 'image' | 'video';
    url: string;
    filename: string;
  };
  read: boolean;
  createdAt: Date;
}

// --- Schemas ---

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, required: true },
  bio: { type: String, default: '' },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  preferences: {
    favoriteActors: { type: [String], default: [] },
    favoriteMovies: { type: [String], default: [] },
    favoriteActresses: { type: [String], default: [] },
    favoriteGenres: { type: [String], default: [] },
  },
});

const MovieSchema = new Schema({
  tmdbId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  year: { type: String, required: true },
  posterUrl: { type: String, required: true },
  rating: { type: Number, required: true },
  director: { type: String },
});

const PostSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  rating: { type: Number, required: true },
  content: { type: String, required: true },
  sceneHighlight: { type: String },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const CommentSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const FollowRequestSchema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const MessageSchema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: false },
  attachment: {
    type: {
      type: String,
      enum: ['image', 'video']
    },
    url: String,
    filename: String
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// --- Models ---
export const User = mongoose.model<IUser>('User', UserSchema);
export const Movie = mongoose.model<IMovie>('Movie', MovieSchema);
export const Post = mongoose.model<IPost>('Post', PostSchema);
export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
export const FollowRequest = mongoose.model<IFollowRequest>('FollowRequest', FollowRequestSchema);
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
