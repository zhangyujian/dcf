const loginCard = document.getElementById("admin-login");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form");
const logoutBtn = document.getElementById("admin-logout");
const refreshBtn = document.getElementById("refresh");
const exportBtn = document.getElementById("export");
const userTable = document.getElementById("user-table");
const txTable = document.getElementById("tx-table");

const TOKEN_KEY = "dcf_admin_token";

const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token || "");

const formatMoney = (value) => `¥${Number(value).toFixed(2)}`;

const request = async (url, options = {}) => {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "请求失败");
  }
  return data;
};

const showDashboard = () => {
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
};

const showLogin = () => {
  dashboard.classList.add("hidden");
  loginCard.classList.remove("hidden");
};

const renderUsers = (users) => {
  userTable.innerHTML = "";
  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.email}</td>
      <td>${formatMoney(user.balance)}</td>
      <td>${new Date(user.created_at).toLocaleString("zh-CN", { hour12: false })}</td>
    `;
    userTable.appendChild(tr);
  });
};

const renderTransactions = (transactions) => {
  txTable.innerHTML = "";
  transactions.forEach((tx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${tx.id}</td>
      <td>${tx.email}</td>
      <td>${tx.type}</td>
      <td>${formatMoney(tx.amount)}</td>
      <td>${formatMoney(tx.balance)}</td>
      <td>${new Date(tx.created_at).toLocaleString("zh-CN", { hour12: false })}</td>
    `;
    txTable.appendChild(tr);
  });
};

const loadData = async () => {
  const [users, transactions] = await Promise.all([
    request("/api/admin/users"),
    request("/api/admin/transactions"),
  ]);
  renderUsers(users);
  renderTransactions(transactions);
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username").trim();
  const password = formData.get("password");

  try {
    const data = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    loginForm.reset();
    showDashboard();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

refreshBtn.addEventListener("click", async () => {
  try {
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

exportBtn.addEventListener("click", async () => {
  try {
    const token = getToken();
    const res = await fetch("/api/admin/export", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("导出失败");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await request("/api/admin/logout", { method: "POST" });
  } catch (error) {
    // ignore
  }
  setToken("");
  showLogin();
});

const boot = async () => {
  if (!getToken()) {
    showLogin();
    return;
  }
  try {
    showDashboard();
    await loadData();
  } catch (error) {
    setToken("");
    showLogin();
  }
};

boot();
