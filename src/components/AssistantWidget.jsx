import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE from '../api';

export default function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your built-in VoteSphere Assistant. Ask me anything about the voting process or elections.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Election Assistant"
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              zIndex: 9999,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--saffron), var(--navy))',
              boxShadow: 'var(--shadow-glow)',
              border: 'none',
            }}
          >
            <Bot size={32} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-card-panel"
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              width: '350px',
              height: '500px',
              maxWidth: 'calc(100vw - 2rem)',
              borderRadius: '1rem',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 9999,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'linear-gradient(135deg, var(--saffron), var(--navy))',
              color: 'white',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={24} />
                <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.125rem', color: 'white' }}>Election Assistant</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', padding: 0, display: 'flex' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--bg-primary)'
            }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    maxWidth: '85%',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                  }}>
                    <div style={{
                      flexShrink: 0,
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      marginTop: '0.25rem',
                      background: msg.role === 'user' ? 'var(--navy)' : 'var(--saffron)'
                    }}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '1rem',
                      borderTopRightRadius: msg.role === 'user' ? '0.125rem' : '1rem',
                      borderTopLeftRadius: msg.role === 'user' ? '1rem' : '0.125rem',
                      fontSize: '0.95rem',
                      lineHeight: '1.4',
                      background: msg.role === 'user' ? 'var(--navy)' : 'var(--bg-tertiary)',
                      color: msg.role === 'user' ? 'white' : 'var(--text-primary)'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '85%', flexDirection: 'row' }}>
                    <div style={{ flexShrink: 0, width: '2rem', height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginTop: '0.25rem', background: 'var(--saffron)' }}>
                      <Bot size={16} />
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '1rem', borderTopLeftRadius: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-tertiary)' }}>
                      <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9ca3af', animation: 'bounce 1s infinite' }} />
                      <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9ca3af', animation: 'bounce 1s infinite 150ms' }} />
                      <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9ca3af', animation: 'bounce 1s infinite 300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length === 1 && (
              <div style={{
                padding: '0.5rem 1rem',
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                background: 'var(--bg-primary)'
              }}>
                {['How to vote?', 'Who is winning?', 'Explain EVM'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} style={{
              padding: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  background: 'var(--navy)',
                  border: 'none',
                  cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && !isTyping ? 1 : 0.6,
                  transition: 'transform 0.1s'
                }}
              >
                <Send size={18} style={{ marginLeft: '2px' }} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
