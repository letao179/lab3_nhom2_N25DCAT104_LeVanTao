'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────
interface Comment {
  id: number;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  comments: Comment[];
}

// ─── Posts Page Component ────────────────────────────────────
export default function PostsPage() {
  const queryClient = useQueryClient();

  // Form state for creating a new post
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');

  // Edit modal state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAuthor, setEditAuthor] = useState('');

  // Comment state
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');

  // ─── Fetch posts with useQuery ─────────────────────────────
  const {
    data: posts = [],
    isLoading,
    isError,
  } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await api.get('/api/posts');
      return res.data;
    },
  });

  // ─── Create post mutation ──────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (newPost: { title: string; content: string; author: string }) => {
      const res = await api.post('/api/posts', newPost);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Tạo bài viết thành công!');
      setTitle('');
      setContent('');
      setAuthor('');
    },
    onError: () => {
      toast.error('Lỗi khi tạo bài viết');
    },
  });

  // ─── Delete post mutation (optimistic) ─────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/posts/${id}`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData<Post[]>(['posts']);
      // Optimistic update: remove the item immediately
      queryClient.setQueryData<Post[]>(['posts'], (old) =>
        old ? old.filter((p) => p.id !== id) : []
      );
      return { previousPosts };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      toast.error('Lỗi khi xoá bài viết');
    },
    onSuccess: () => {
      toast.success('Xoá bài viết thành công!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // ─── Update post mutation ─────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; author: string }) => {
      const res = await api.put(`/api/posts/${data.id}`, {
        title: data.title,
        content: data.content,
        author: data.author,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Cập nhật bài viết thành công!');
      setEditingPost(null);
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật bài viết');
    },
  });

  // ─── Add comment mutation ─────────────────────────────────
  const addCommentMutation = useMutation({
    mutationFn: async (data: { postId: number; author: string; content: string }) => {
      const res = await api.post(`/api/posts/${data.postId}/comments`, {
        author: data.author,
        content: data.content,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Thêm bình luận thành công!');
      setCommentAuthor('');
      setCommentContent('');
      setCommentPostId(null);
    },
    onError: () => {
      toast.error('Lỗi khi thêm bình luận');
    },
  });

  // ─── Delete comment mutation ───────────────────────────────
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await api.delete(`/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Xoá bình luận thành công!');
    },
    onError: () => {
      toast.error('Lỗi khi xoá bình luận');
    },
  });

  // ─── Handlers ──────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !author.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    createMutation.mutate({ title, content, author });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xoá bài viết này?')) return;
    deleteMutation.mutate(id);
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditAuthor(post.author);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    if (!editTitle.trim() || !editContent.trim() || !editAuthor.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    updateMutation.mutate({
      id: editingPost.id,
      title: editTitle,
      content: editContent,
      author: editAuthor,
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentPostId) return;
    if (!commentAuthor.trim() || !commentContent.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin bình luận');
      return;
    }
    addCommentMutation.mutate({
      postId: commentPostId,
      author: commentAuthor,
      content: commentContent,
    });
  };

  const handleDeleteComment = (commentId: number) => {
    if (!window.confirm('Bạn có chắc muốn xoá bình luận này?')) return;
    deleteCommentMutation.mutate(commentId);
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <h1 className="text-3xl font-bold text-center mb-8">📝 Quản lý Bài viết</h1>

      {/* ── Create Post Form ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-10">
        <h2 className="text-xl font-semibold mb-4">Tạo bài viết mới</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tiêu đề</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Nhập tiêu đề..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nội dung</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              rows={4}
              placeholder="Nhập nội dung..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tác giả</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Nhập tên tác giả..."
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50"
          >
            {createMutation.isPending ? 'Đang tạo...' : '➕ Tạo bài viết'}
          </button>
        </form>
      </div>

      {/* ── Posts List ───────────────────────────────────────── */}
      <h2 className="text-xl font-semibold mb-4">Danh sách bài viết</h2>

      {isLoading && <p className="text-gray-500">Đang tải dữ liệu...</p>}
      {isError && <p className="text-red-500">Lỗi khi tải dữ liệu. Kiểm tra backend đã chạy chưa.</p>}

      {!isLoading && !isError && posts.length === 0 && (
        <p className="text-gray-400 text-center py-8">Chưa có bài viết nào.</p>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold">{post.title}</h3>
                <p className="text-sm text-gray-500">
                  Bởi <span className="font-medium">{post.author}</span> •{' '}
                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(post)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium px-3 py-1 rounded-lg transition"
                >
                  ✏️ Sửa
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1 rounded-lg transition"
                >
                  🗑️ Xoá
                </button>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>

            {/* ── Comments Section ────────────────────────── */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-600">
                  💬 Bình luận ({post.comments?.length || 0})
                </h4>
                <button
                  onClick={() =>
                    setCommentPostId(commentPostId === post.id ? null : post.id)
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  {commentPostId === post.id ? 'Đóng' : 'Thêm bình luận'}
                </button>
              </div>

              {/* Comment list */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {post.comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-gray-50 rounded-lg p-3 flex justify-between items-start"
                    >
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{c.author}:</span> {c.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(c.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0"
                      >
                        Xoá
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment form */}
              {commentPostId === post.id && (
                <form onSubmit={handleAddComment} className="flex flex-col gap-2 mt-2">
                  <input
                    type="text"
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên của bạn..."
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nội dung bình luận..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={addCommentMutation.isPending}
                    className="self-start bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {addCommentMutation.isPending ? 'Đang gửi...' : 'Gửi bình luận'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit Modal ──────────────────────────────────────── */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">✏️ Chỉnh sửa bài viết</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nội dung</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tác giả</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium px-6 py-2 rounded-lg transition"
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
