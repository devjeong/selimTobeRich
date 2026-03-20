import type { Post, User, Comment, BuyCertification, SellCertification, Like } from "@prisma/client";

export type PostWithUser = Post & {
  user: Pick<User, "id" | "username" | "image">;
  _count: {
    comments: number;
    likes: number;
    buyCertifications: number;
    sellCertifications: number;
  };
  likes?: Like[];
};

export type PostWithDetails = Post & {
  user: Pick<User, "id" | "username" | "image">;
  comments: CommentWithUser[];
  buyCertifications: (BuyCertification & { user: Pick<User, "id" | "username" | "image"> })[];
  sellCertifications: (SellCertification & { user: Pick<User, "id" | "username" | "image"> })[];
  likes: Like[];
  _count: {
    comments: number;
    likes: number;
  };
};

export type CommentWithUser = Comment & {
  user: Pick<User, "id" | "username" | "image">;
  replies?: CommentWithUser[];
};
