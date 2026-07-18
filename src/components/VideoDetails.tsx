'use client';

import React, { useState, useOptimistic, startTransition } from 'react';
import CustomPlayer from '@/components/CustomPlayer';
import { Heart, Send, MessageSquare, Eye } from 'lucide-react';
import { notoSans } from '@/lib/fonts';

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
  grade: string | null;
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
    <div className="space-y-4 p-4 sm:space-y-5">
      {/* Secure Video Player */}
      <CustomPlayer videoId={video.id} />

      {/* Video Info Section */}
      <div className="space-y-4 rounded-2xl bg-white p-4 sm:p-5 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
        {/* Responsive Header: Stacks on mobile, inline on sm+ screens */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 w-full sm:flex-1 sm:pr-4">
            {video.grade && (
              <span className="inline-block rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1a73e8]">
                {video.grade.replace('GRADE_', 'Grade ')}
              </span>
            )}
            <h1 className={`text-lg sm:text-xl font-medium leading-tight tracking-tight text-[#202124] wrap-break-word ${notoSans.className}`}>
              {video.title}
            </h1>
          </div>

          {/* Stats & Actions: Uses flex-wrap for very narrow screens (like iPhone SE) */}
          <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0 sm:shrink-0">
            {/* View Counter */}
            <span className="flex items-center space-x-1.5 rounded-full bg-[#f1f3f4] px-3 py-1.5 text-xs text-[#5f6368]">
              <Eye size={14} />
              <span>{video.viewsCount} views</span>
            </span>

            {/* Like Button */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 ${
                hasLiked
                  ? 'border-[#fad2cf] bg-[#fce8e6] text-[#d93025] hover:bg-[#fadad7]'
                  : 'border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
              aria-label={hasLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} />
              <span>{likesCount} Likes</span>
            </button>
          </div>
        </div>

        {video.description && (
          <p className={`rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-3 sm:p-3.5 text-xs leading-relaxed text-[#3c4043] ${notoSans.className}`}>
            {video.description}
          </p>
        )}
      </div>

      {/* Engagement / Comments Section */}
      <div className="space-y-4 sm:space-y-5 rounded-2xl bg-white p-4 sm:p-5 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
        <h2 className="flex items-center space-x-2 text-[14px] sm:text-[15px] font-medium text-[#202124]">
          <MessageSquare size={17} className="text-[#5f6368]" />
          <span>Comments ({optimisticComments.length})</span>
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 sm:gap-2.5">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            disabled={commentLoading}
            className="flex-1 w-full min-w-0 rounded-full border border-[#dadce0] bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-[13px] sm:text-sm text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc]  focus:ring-2 focus:ring-[#1a73e8]/20  disabled:opacity-70"
            aria-label="Add comment input"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || commentLoading}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-white shadow-sm outline-none transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 disabled:cursor-not-allowed "
            aria-label="Submit comment"
          >
            <Send size={14} className="sm:w-4 sm:h-4" />
          </button>
        </form>

        {/* Comments Feed */}
        <div className="divide-y divide-[#f1f3f4]">
          {optimisticComments.length === 0 ? (
            <p className="select-none py-3 text-center text-xs text-[#5f6368]">
              No comments yet. Start the conversation!
            </p>
          ) : (
            optimisticComments.map((c) => (
              <div key={c.id} className="space-y-1 py-3.5 first:pt-0">
                <div className="flex items-center gap-2 text-[10px] text-[#5f6368]">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[10px] font-medium text-[#1a73e8]">
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-[#3c4043] truncate">{c.username}</span>
                  <span>·</span>
                  <span className="shrink-0">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="pl-8 text-xs leading-normal text-[#202124] wrap-break-word">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
