import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [view, setView] = useState('products');
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState([]);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Error fetching products:', err));
  }, []);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

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
        showToast('Registered successfully! Now log in.');
        setView('login');
      } else {
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
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
        setUserId(data.userId || null);
        localStorage.setItem('token', data.token);
        showToast(`Welcome, ${data.name}!`);
        setView('products');
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`${product.name} added to cart 🛒`);
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!loggedInUser) {
      showToast('Please log in before checkout', 'error');
      setView('login');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, items: cart, total: cartTotal }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Order placed! Order ID: ${data.orderId}`);
        setCart([]);
      } else {
        showToast(data.error || 'Checkout failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    }
  };

  const categories = ['All', ...new Set(products.map((p) => p.category || 'Other'))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.text}
        </div>
      )}

      <div className="navbar">
        <h1 onClick={() => setView('products')}>CartHub</h1>
        <div className="nav-actions">
          <button className="btn btn-outline" onClick={() => setView('cart')}>
            Cart ({cart.length})
          </button>
          {loggedInUser ? (
            <span className="user-badge">Logged in as {loggedInUser}</span>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setView('register')}>Register</button>
              <button className="btn" onClick={() => setView('login')}>Login</button>
            </>
          )}
        </div>
      </div>

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

      {view === 'products' && (
        <div className="container">
          <div className="products-header">
            <h2>Our Products</h2>
            <input
              type="text"
              className="search-bar"
              placeholder="🔍 Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="category-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <p className="empty-cart">No products found</p>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <span className="category-tag">{product.category || 'Other'}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <p className="product-price">₹{product.price}</p>
                  <button className="btn btn-cart" onClick={() => addToCart(product)}>
                    🛒 Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'cart' && (
        <div className="container">
          <h2>Your Cart</h2>
          {cart.length === 0 ? (
            <p className="empty-cart">Cart is empty</p>
          ) : (
            <div className="form-box" style={{ maxWidth: '500px' }}>
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <span>{item.name}</span>
                  <div className="qty-controls">
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>−</button>
                    <span className="qty-count">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="cart-total">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <button className="btn" onClick={handleCheckout}>Checkout</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;