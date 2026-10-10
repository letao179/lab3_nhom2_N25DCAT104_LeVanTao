const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ─── Helpers: read / write data.json (Bonus – file-based) ───
async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { posts: [] };
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── GET /api/posts ──────────────────────────────────────────
app.get('/api/posts', async (req, res) => {
  try {
    const { posts } = await readData();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi đọc dữ liệu' });
  }
});

// ─── POST /api/posts ─────────────────────────────────────────
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, author } = req.body;

    // Validate
    if (!title || !content || !author) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ title, content và author' });
    }

    const data = await readData();
    const newPost = {
      id: Date.now(),
      title,
      content,
      author,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    data.posts.push(newPost);
    await writeData(data);
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi tạo bài viết' });
  }
});

// ─── PUT /api/posts/:id  (Bonus – Update) ───────────────────
app.put('/api/posts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, content, author } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ title, content và author' });
    }

    const data = await readData();
    const index = data.posts.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Không tìm thấy bài viết' });

    data.posts[index] = { ...data.posts[index], title, content, author };
    await writeData(data);
    res.json(data.posts[index]);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật bài viết' });
  }
});

// ─── DELETE /api/posts/:id ───────────────────────────────────
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readData();
    const index = data.posts.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Không tìm thấy bài viết' });

    data.posts.splice(index, 1);
    await writeData(data);
    res.json({ message: 'Xoá bài viết thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá bài viết' });
  }
});

// ─── Bonus: Comments Module ─────────────────────────────────
// POST /api/posts/:id/comments
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { author, content } = req.body;

    if (!author || !content) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ author và content' });
    }

    const data = await readData();
    const post = data.posts.find((p) => p.id === postId);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài viết' });

    const newComment = {
      id: Date.now(),
      postId,
      author,
      content,
      createdAt: new Date().toISOString(),
    };

    if (!post.comments) post.comments = [];
    post.comments.push(newComment);
    await writeData(data);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi tạo bình luận' });
  }
});

// GET /api/posts/:id/comments
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const data = await readData();
    const post = data.posts.find((p) => p.id === postId);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    res.json(post.comments || []);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi đọc bình luận' });
  }
});

// DELETE /api/comments/:commentId
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const data = await readData();

    let found = false;
    for (const post of data.posts) {
      if (!post.comments) continue;
      const idx = post.comments.findIndex((c) => c.id === commentId);
      if (idx !== -1) {
        post.comments.splice(idx, 1);
        found = true;
        break;
      }
    }

    if (!found) return res.status(404).json({ error: 'Không tìm thấy bình luận' });

    await writeData(data);
    res.json({ message: 'Xoá bình luận thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá bình luận' });
  }
});

// ─── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});
