'use client';

import React, { useState, useOptimistic, startTransition } from 'react';
import CustomPlayer from '@/components/CustomPlayer';
import { Heart, Send, MessageSquare, Eye } from 'lucide-react';

interface CommentType {
  id: string;
  content: string;
  username: string;
  createdAt: string;
}

interface VideoType {
  id: string;
  title: string;
  description: string | null;
  grade: string;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
}

interface VideoDetailsProps {
  video: VideoType;
  initialComments: CommentType[];
  initialHasLiked: boolean;
  currentUsername: string;
}

export default function VideoDetails({
  video,
  initialComments,
  initialHasLiked,
  currentUsername,
}: VideoDetailsProps) {
  // Likes State
  const [likesCount, setLikesCount] = useState(video.likesCount);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comments State
  const [comments, setComments] = useState<CommentType[]>(initialComments);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Optimistic Comments Setup
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state, newComment: CommentType) => [newComment, ...state]
  );

  const handleLikeToggle = async () => {
    if (likeLoading) return;
    setLikeLoading(true);

    // Optimistic toggle
    const nextHasLiked = !hasLiked;
    const nextLikesCount = hasLiked ? likesCount - 1 : likesCount + 1;
    setHasLiked(nextHasLiked);
    setLikesCount(nextLikesCount);

    try {
      const res = await fetch(`/api/videos/${video.id}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLikesCount(data.likesCount);
        setHasLiked(data.hasLiked);
      } else {
        // Revert on error
        setHasLiked(!nextHasLiked);
        setLikesCount(hasLiked ? likesCount : likesCount - 1);
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setHasLiked(!nextHasLiked);
      setLikesCount(hasLiked ? likesCount : likesCount - 1);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentLoading) return;

    const newCommentContent = commentText.trim();
    setCommentText('');
    setCommentLoading(true);

    const tempComment: CommentType = {
      id: Math.random().toString(),
      content: newCommentContent,
      username: currentUsername,
      createdAt: new Date().toISOString(),
    };

    // Optimistically add the comment
    startTransition(() => {
      addOptimisticComment(tempComment);
    });

    try {
      const res = await fetch(`/api/videos/${video.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newCommentContent }),
      });

      const data = await res.json();

      if (res.ok && data.comment) {
        setComments((prev) => [
          {
            id: data.comment.id,
            content: data.comment.content,
            username: data.comment.user.username,
            createdAt: data.comment.createdAt,
          },
          ...prev,
        ]);
      } else {
        alert('Failed to post comment. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to post comment. Please check your connection.');
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div className="space-y-space-4">
      {/* Secure Video Player */}
      <CustomPlayer videoId={video.id} />

      {/* Video Info Section */}
      <div className="bg-white rounded-radius-md border border-surface-strong p-space-4 space-y-space-3">
        <div className="flex flex-wrap justify-between items-start gap-space-2">
          <div className="space-y-1">
            <span className="inline-block bg-[#141a20] text-white px-2 py-0.5 rounded text-[10px] uppercase font-semibold">
              {video.grade.replace('GRADE_', 'Grade ')}
            </span>
            <h1 className="text-xl font-bold tracking-tight leading-tight text-text-primary">
              {video.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Counter */}
            <span className="flex items-center space-x-1 text-xs text-text-tertiary px-space-2 py-space-1 bg-surface-muted rounded-radius-xs">
              <Eye size={14} />
              <span>{video.viewsCount} views</span>
            </span>

            {/* Like Button */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-space-3 py-space-1.5 rounded-radius-xs border transition-all duration-instant outline-none focus-visible:ring-2 focus-visible:ring-surface-raised ${
                hasLiked
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'bg-white border-surface-strong text-text-primary hover:bg-surface-muted'
              }`}
              aria-label={hasLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} />
              <span>{likesCount} Likes</span>
            </button>
          </div>
        </div>

        {video.description && (
          <p className="text-xs text-text-secondary leading-relaxed bg-surface-muted p-space-3 rounded-radius-xs border border-surface-strong/30">
            {video.description}
          </p>
        )}
      </div>

      {/* Engagement / Comments Section */}
      <div className="bg-white rounded-radius-md border border-surface-strong p-space-4 space-y-space-4">
        <h2 className="text-md font-semibold text-text-primary flex items-center space-x-1">
          <MessageSquare size={16} />
          <span>Comments ({optimisticComments.length})</span>
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="flex gap-space-2 items-start">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            disabled={commentLoading}
            className="flex-1 rounded-radius-xs border border-surface-strong bg-white px-space-3 py-space-2 text-xs placeholder-text-tertiary outline-none transition-all duration-instant focus:border-surface-base focus:ring-1 focus:ring-surface-base disabled:opacity-50"
            aria-label="Add comment input"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || commentLoading}
            className="bg-black hover:bg-surface-strong hover:text-black text-white p-space-2 rounded-radius-xs transition-all duration-instant focus-visible:ring-2 focus-visible:ring-black outline-none disabled:opacity-50"
            aria-label="Submit comment"
          >
            <Send size={16} />
          </button>
        </form>

        {/* Comments Feed */}
        <div className="space-y-space-3 divide-y divide-surface-muted">
          {optimisticComments.length === 0 ? (
            <p className="text-xs text-text-tertiary py-space-2 text-center select-none">
              No comments yet. Start the conversation!
            </p>
          ) : (
            optimisticComments.map((c) => (
              <div key={c.id} className="pt-space-3 first:pt-0 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-text-tertiary">
                  <span className="font-semibold text-text-secondary">{c.username}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-text-primary leading-normal">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
