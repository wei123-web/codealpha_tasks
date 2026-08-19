import { useState, useEffect } from 'react';
import './App.css';

const AVATAR_COLORS = [
  ['#ff6ec4', '#7873f5'],
  ['#4ade80', '#22d3ee'],
  ['#facc15', '#f97316'],
  ['#a78bfa', '#f472b6'],
];

function getAvatarGradient(name) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  const [c1, c2] = AVATAR_COLORS[index];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

function Avatar({ name }) {
  return (
    <div className="avatar" style={{ background: getAvatarGradient(name) }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function App() {
  const [view, setView] = useState('feed');
  const [feedTab, setFeedTab] = useState('recent');
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ post_count: 0, followers: 0, following: 0 });

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userId, setUserId] = useState(null);

  const [newPost, setNewPost] = useState('');
  const [openComments, setOpenComments] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [newComment, setNewComment] = useState('');
  const [followedIds, setFollowedIds] = useState([]);

  const fetchPosts = () => {
    fetch('http://localhost:5000/api/posts')
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error('Error fetching posts:', err));
  };

  const fetchUsers = () => {
    fetch('http://localhost:5000/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error('Error fetching users:', err));
  };

  const fetchStats = (id) => {
    fetch(`http://localhost:5000/api/users/${id}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error('Error fetching stats:', err));
  };

  useEffect(() => {
    fetchPosts();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (userId) fetchStats(userId);
  }, [userId]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Registered successfully! Now log in.');
        setView('login');
      } else {
        setMessage(data.error || 'Registration failed');
      }
    } catch (err) {
      setMessage('Error connecting to server');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setLoggedInUser(data.name);
        setUserId(data.userId);
        setMessage(`Welcome, ${data.name}!`);
        setView('feed');
      } else {
        setMessage(data.error || 'Login failed');
      }
    } catch (err) {
      setMessage('Error connecting to server');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!loggedInUser) {
      setMessage('Please log in to post');
      setView('login');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: newPost }),
      });
      if (res.ok) {
        setNewPost('');
        fetchPosts();
        fetchStats(userId);
      }
    } catch (err) {
      setMessage('Error connecting to server');
    }
  };

  const handleLike = async (postId) => {
    if (!loggedInUser) {
      setMessage('Please log in to like posts');
      setView('login');
      return;
    }
    await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    fetchPosts();
  };

  const toggleComments = async (postId) => {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    const res = await fetch(`http://localhost:5000/api/posts/${postId}/comments`);
    const data = await res.json();
    setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
  };

  const handleAddComment = async (postId) => {
    if (!loggedInUser) {
      setMessage('Please log in to comment');
      setView('login');
      return;
    }
    if (!newComment.trim()) return;
    await fetch(`http://localhost:5000/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content: newComment }),
    });
    setNewComment('');
    const res = await fetch(`http://localhost:5000/api/posts/${postId}/comments`);
    const data = await res.json();
    setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
  };

  const handleFollow = async (targetId) => {
    if (!loggedInUser) {
      setMessage('Please log in to follow users');
      setView('login');
      return;
    }
    await fetch(`http://localhost:5000/api/users/${targetId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId: userId }),
    });
    setFollowedIds((prev) => [...prev, targetId]);
    setMessage('Followed!');
  };

  const suggestedUsers = users.filter((u) => u.id !== userId);

  const displayedPosts = feedTab === 'trending'
    ? [...posts].sort((a, b) => b.like_count - a.like_count)
    : posts;

  return (
    <div>
      <div className="navbar">
        <h1 onClick={() => setView('feed')}>SocialLoop</h1>
        <div className="nav-actions">
          {loggedInUser ? (
            <span className="user-badge">Hi, {loggedInUser}</span>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setView('register')}>Register</button>
              <button className="btn" onClick={() => setView('login')}>Login</button>
            </>
          )}
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      {view === 'register' && (
        <form onSubmit={handleRegister} className="form-box">
          <h2>Register</h2>
          <input placeholder="Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
          <input placeholder="Email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
          <button className="btn" type="submit">Register</button>
        </form>
      )}

      {view === 'login' && (
        <form onSubmit={handleLogin} className="form-box">
          <h2>Login</h2>
          <input placeholder="Email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
          <button className="btn" type="submit">Login</button>
        </form>
      )}

      {view === 'feed' && (
        <div className="page-layout">
          <div className="feed-column">
            {loggedInUser && (
              <form onSubmit={handleCreatePost} className="post-form">
                <textarea
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  required
                />
                <button className="btn" type="submit">Post</button>
              </form>
            )}

            <div className="feed-tabs">
              <button
                className={`tab-btn ${feedTab === 'recent' ? 'active' : ''}`}
                onClick={() => setFeedTab('recent')}
              >
                🕒 Recent
              </button>
              <button
                className={`tab-btn ${feedTab === 'trending' ? 'active' : ''}`}
                onClick={() => setFeedTab('trending')}
              >
                🔥 Trending
              </button>
            </div>

            {displayedPosts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No posts yet</h3>
                <p>Be the first to share something with the community.</p>
              </div>
            ) : (
              <div className="feed">
                {displayedPosts.map((post) => (
                  <div key={post.id} className="post-card">
                    <div className="post-header">
                      <div className="post-author-row">
                        <Avatar name={post.name} />
                        <span className="post-author">{post.name}</span>
                      </div>
                      <span className="post-time">{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                    <p className="post-content">{post.content}</p>
                    <div className="post-actions">
                      <button className="action-btn" onClick={() => handleLike(post.id)}>
                        ❤️ {post.like_count}
                      </button>
                      <button className="action-btn" onClick={() => toggleComments(post.id)}>
                        💬 Comments
                      </button>
                    </div>

                    {openComments === post.id && (
                      <div className="comments-section">
                        {(commentsByPost[post.id] || []).map((c) => (
                          <div key={c.id} className="comment">
                            <strong>{c.name}:</strong> {c.content}
                          </div>
                        ))}
                        {loggedInUser && (
                          <div className="comment-input">
                            <input
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button className="btn btn-small" onClick={() => handleAddComment(post.id)}>Send</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-column">
            {loggedInUser && (
              <div className="sidebar-card">
                <h3>Your Stats</h3>
                <div className="stat-row">
                  <span>Posts</span>
                  <span className="stat-value">{stats.post_count}</span>
                </div>
                <div className="stat-row">
                  <span>Followers</span>
                  <span className="stat-value">{stats.followers}</span>
                </div>
                <div className="stat-row">
                  <span>Following</span>
                  <span className="stat-value">{stats.following}</span>
                </div>
              </div>
            )}

            <div className="sidebar-card">
              <h3>Suggested Users</h3>
              {suggestedUsers.length === 0 ? (
                <p className="empty-sidebar">No other users yet</p>
              ) : (
                suggestedUsers.map((u) => (
                  <div key={u.id} className="suggested-user">
                    <div className="suggested-user-info">
                      <Avatar name={u.name} />
                      <div>
                        <div className="suggested-name">{u.name}</div>
                        {u.bio && <div className="suggested-bio">{u.bio}</div>}
                      </div>
                    </div>
                    {followedIds.includes(u.id) ? (
                      <span className="followed-tag">Following</span>
                    ) : (
                      <button className="btn btn-small" onClick={() => handleFollow(u.id)}>Follow</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;