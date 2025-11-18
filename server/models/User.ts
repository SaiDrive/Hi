import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true, index: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

const UserModel: Model<IUserDocument> = (mongoose.models.User as Model<IUserDocument>) || mongoose.model<IUserDocument>('User', userSchema);
export default UserModel;
