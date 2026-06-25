import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import './styles/global.css';
import AuthModal from './components/AuthModal';

const COLORS = ['#00C49F', '#FF8042', '#0088FE', '#FFBB28', '#A28BFE', '#FF5C8A'];

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const transactionTypeOptions = [
  { value: 'expense', label: 'Chi' },
  { value: 'income', label: 'Thu' }
];

function App() {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, byUser: [], byCategory: [] });
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authUser, setAuthUser] = useState(null);
  const [form, setForm] = useState({ userId: '', categoryId: '', amount: '', type: 'expense', note: '', date: '' });
  const [editId, setEditId] = useState(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '', name: '' });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const fetchData = async () => {
    try {
      // categories are public
      const categoriesRes = await axios.get('/api/categories');
      setCategories(categoriesRes.data);

      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        try {
          const usersRes = await axios.get('/api/users', { headers });
          setUsers(usersRes.data);
        } catch (err) {
          if (err.response?.status === 401) {
            // invalid/expired token — clear and fallback to anonymous
            setToken('');
            setAuthUser(null);
            setUsers([]);
          } else {
            console.error('Users fetch failed', err);
          }
        }

        try {
          const transactionsRes = await axios.get('/api/transactions', { headers });
          setTransactions(transactionsRes.data);
        } catch (err) {
          if (err.response?.status === 401) { setToken(''); setAuthUser(null); setTransactions([]); }
          else { console.error('Transactions fetch failed', err); }
        }

        try {
          const statsRes = await axios.get('/api/stats', { headers });
          setStats(statsRes.data);
        } catch (err) {
          if (err.response?.status === 401) { setToken(''); setAuthUser(null); setStats({ totalIncome: 0, totalExpense: 0, byUser: [], byCategory: [] }); }
          else { console.error('Stats fetch failed', err); }
        }
      } else {
        // anonymous view
        setUsers([]);
        setTransactions([]);
        setStats({ totalIncome: 0, totalExpense: 0, byUser: [], byCategory: [] });
      }
    } catch (err) {
      console.error('fetchData error', err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  const resetForm = () => {
    setForm({ userId: '', categoryId: '', amount: '', type: 'expense', note: '', date: '' });
    setEditId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount) };
    if (editId) {
      await axios.put(`/api/transactions/${editId}`, payload);
    } else {
      await axios.post('/api/transactions', payload);
    }
    resetForm();
    fetchData();
  };

  const handleEdit = (transaction) => {
    setEditId(transaction.id);
    setForm({
      userId: transaction.userId,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      type: transaction.type,
      note: transaction.note || '',
      date: transaction.date
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Xóa giao dịch này?')) {
      await axios.delete(`/api/transactions/${id}`);
      fetchData();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { username: authForm.username, password: authForm.password });
      setToken(res.data.token);
      setAuthUser(res.data.user);
      setAuthForm({ username: '', password: '', name: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/register', { name: authForm.name, username: authForm.username, password: authForm.password });
      setToken(res.data.token);
      setAuthUser(res.data.user);
      setAuthForm({ username: '', password: '', name: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Register failed');
    }
  };

  const handleLogout = () => { setToken(''); setAuthUser(null); };

  const exportExcel = async () => {
    try {
      const res = await axios.get('/api/export/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Export failed');
    }
  };

  const exportPDF = async () => {
    try {
      const res = await axios.get('/api/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Export failed');
    }
  };

  const balance = stats.totalIncome - stats.totalExpense;

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Quản lý thu chi gia đình</p>
          <h1>Gia đình phát triển cùng ngân sách thông minh</h1>
          <p className="hero-desc">Theo dõi thu, chi và thống kê chi tiêu riêng của bố, mẹ, chị và cháu.</p>
        </div>
          <div className="hero-card">
          <p>Tổng thu:</p>
          <h2>{formatCurrency(stats.totalIncome)}</h2>
          <p>Tổng chi:</p>
          <h2>{formatCurrency(stats.totalExpense)}</h2>
          <p>Số dư:</p>
          <h2>{formatCurrency(balance)}</h2>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {token ? (
                <>
                  <button className="secondary-button" onClick={exportExcel}>Xuất Excel</button>
                  <button className="secondary-button" onClick={exportPDF}>Xuất PDF</button>
                  <button className="danger-button" onClick={handleLogout}>Đăng xuất</button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="primary-button" onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}>Đăng nhập</button>
                  <button className="secondary-button" onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }}>Đăng ký</button>
                </div>
              )}
            </div>
        </div>
      </header>

      <AuthModal
        visible={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async ({ username, password }) => {
          try {
            const res = await axios.post('/api/auth/login', { username, password });
            setToken(res.data.token);
            setAuthUser(res.data.user);
            setAuthModalOpen(false);
            fetchData();
          } catch (err) {
            alert(err.response?.data?.error || 'Invalid credentials');
          }
        }}
        onRegister={async ({ name, username, password }) => {
          try {
            const res = await axios.post('/api/auth/register', { name, username, password });
            setToken(res.data.token);
            setAuthUser(res.data.user);
            setAuthModalOpen(false);
            fetchData();
          } catch (err) {
            alert(err.response?.data?.error || 'Register failed');
          }
        }}
      />

      <main className="content-grid">
        <section className="panel analytics-panel">
          <div className="panel-header">
            <h2>Thống kê chung</h2>
          </div>
          <div className="cards-row">
            <div className="stat-card">
              <p>Thu nhập</p>
              <strong>{formatCurrency(stats.totalIncome)}</strong>
            </div>
            <div className="stat-card">
              <p>Chi tiêu</p>
              <strong>{formatCurrency(stats.totalExpense)}</strong>
            </div>
            <div className="stat-card">
              <p>Hiệu số</p>
              <strong>{formatCurrency(balance)}</strong>
            </div>
          </div>

          <div className="chart-area">
            <div className="chart-card">
              <h3>Thu/Chi theo người</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.byUser} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" stackId="a" fill="#00C49F" />
                  <Bar dataKey="expense" stackId="a" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>Chi tiết theo loại</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.byCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                    {stats.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="panel transactions-panel">
          <div className="panel-header">
            <h2>Giao dịch</h2>
            <button className="primary-button" onClick={resetForm}>Tạo mới</button>
          </div>

          <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                Người dùng
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
                  <option value="">Chọn người dùng</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Loại
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {transactionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Danh mục
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Chọn danh mục</option>
                  {categories
                    .filter((category) => category.type === form.type)
                    .map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
              </label>

              <label>
                Số tiền
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </label>
            </div>

            <div className="form-row">
              <label>
                Ngày
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </label>
              <label>
                Ghi chú
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button">{editId ? 'Cập nhật' : 'Lưu giao dịch'}</button>
              <button type="button" className="secondary-button" onClick={resetForm}>Hủy</button>
            </div>
          </form>

          <div className="transaction-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div>
                  <strong>{transaction.userName}</strong>
                  <p>{transaction.categoryName} • {transaction.type === 'income' ? 'Thu' : 'Chi'} • {transaction.date}</p>
                </div>
                <div className="transaction-meta">
                  <span className={`amount ${transaction.type}`}>{formatCurrency(transaction.amount)}</span>
                  <div className="actions">
                    <button onClick={() => handleEdit(transaction)}>Sửa</button>
                    <button className="danger-button" onClick={() => handleDelete(transaction.id)}>Xóa</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
