const table = document.getElementById("orders-table");
const emptyState = document.getElementById("orders-empty");
const logoutBtn = document.getElementById("logout");
const userEmail = document.getElementById("user-email");
const userBalance = document.getElementById("user-balance");

const TOKEN_KEY = "dcf_token";
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

const loadOrders = async () => {
  try {
    const me = await request("/api/me");
    const rows = await request("/api/transactions");
    userEmail.textContent = me.email || "-";
    userBalance.textContent = formatMoney(me.balance || 0);

    table.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const time = new Date(row.created_at).toLocaleString("zh-CN", { hour12: false });
      tr.innerHTML = `
        <td>${time}</td>
        <td>${row.type}</td>
        <td>${formatMoney(row.amount)}</td>
        <td>${formatMoney(row.balance)}</td>
      `;
      table.appendChild(tr);
    });
    emptyState.classList.toggle("hidden", rows.length > 0);
  } catch (error) {
    setToken("");
    window.location.href = "/";
  }
};

logoutBtn.addEventListener("click", async () => {
  try {
    await request("/api/logout", { method: "POST" });
  } catch (error) {
    // ignore
  }
  setToken("");
  window.location.href = "/";
});

loadOrders();
