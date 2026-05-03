import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Trash2, Clock, Send } from 'lucide-react';
import API_BASE from '../api';

export default function DiscussionBoard({ electionId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/elections/${electionId}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [electionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const res = await fetch(`${API_BASE}/api/elections/${electionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('votesphere_token')}`
        },
        body: JSON.stringify({ text: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('votesphere_token')}`
        }
      });
      if (res.ok) {
        fetchComments();
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-card" style={{ marginTop: '3rem', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <MessageCircle size={28} color="var(--navy)" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'var(--navy)' }}>Voter Discussion</h2>
      </div>

      {/* Input Area */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
        {user ? (
          <form onSubmit={handleSubmit}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts on this election..."
              className="form-input"
              aria-label="New comment input"
              style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', resize: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minHeight: '100px', borderRadius: '0.75rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={!newComment.trim()} 
                className="btn btn-primary"
                aria-label="Post Comment"
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
              >
                <Send size={16} aria-hidden="true" /> Post Comment
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p className="text-muted" style={{ marginBottom: '1rem', fontWeight: 500 }}>Please login to participate in the discussion.</p>
            <a href="/login" className="btn btn-outline" style={{ display: 'inline-flex' }}>Login to Comment</a>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && comments.length === 0 ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>Loading discussions...</div>
        ) : comments.length === 0 ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: '2rem 0', background: 'var(--bg-primary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', transition: 'all 0.2s', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.875rem', background: 'linear-gradient(135deg, var(--saffron), var(--navy))' }}>
                    {comment.userName?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{comment.userName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                      <Clock size={12} /> {formatTime(comment.timestamp)}
                    </div>
                  </div>
                </div>
                {user && user.id === comment.userId && (
                  <button 
                    onClick={() => handleDelete(comment.id)}
                    title="Delete comment"
                    style={{ padding: '0.5rem', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginLeft: '3.25rem' }}>
                {comment.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
