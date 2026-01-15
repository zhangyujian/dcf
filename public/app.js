const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authCard = document.getElementById("auth-card");
const dashboard = document.getElementById("dashboard");
const balanceEl = document.getElementById("balance");
const currentUserEl = document.getElementById("current-user");
const logList = document.getElementById("log-list");
const logoutBtn = document.getElementById("logout");
const rechargeForm = document.getElementById("recharge-form");
const consumeForm = document.getElementById("consume-form");
const sendCodeBtn = document.getElementById("send-code");
const authActions = document.getElementById("auth-actions");
const topbarUser = document.getElementById("topbar-user");
const topbarEmail = document.getElementById("topbar-email");
const topbarPoints = document.getElementById("topbar-points");
const topbarLogout = document.getElementById("topbar-logout");
const systemToast = document.getElementById("system-toast");
const toastClose = document.getElementById("toast-close");
const loginCaptchaImg = document.getElementById("login-captcha-img");
const loginCaptchaRefresh = document.getElementById("login-captcha-refresh");
const loginModal = document.getElementById("login-modal");
const loginModalClose = document.getElementById("login-modal-close");
const loginModalOk = document.getElementById("login-modal-ok");
const lastLoginIp = document.getElementById("last-login-ip");
const lastLoginTime = document.getElementById("last-login-time");
let loginCaptchaId = "";
let loginModalLocked = true;
const homeSection = document.getElementById("home-section");
const authSection = document.getElementById("auth-section");
const categorySection = document.getElementById("category-section");
const navHome = document.querySelector(".nav a[data-view='home']");
const homeSearchForm = document.getElementById("home-search-form");
const homeSearchInput = document.getElementById("home-search-input");
const productRow = document.getElementById("product-row");
const searchEmpty = document.getElementById("search-empty");
const categoryBtn = document.getElementById("category-btn");
const categoryHome = document.getElementById("category-home");
const categoryAccount = document.getElementById("category-account");
const toastHome = document.getElementById("toast-home");
const toastOrderNow = document.getElementById("toast-order-now");
const toastOrders = document.getElementById("toast-orders");

const jumpToProducts = () => {
  showView("home");
  if (productRow) {
    productRow.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};


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

const showToast = () => {
  if (!systemToast) {
    return;
  }
  systemToast.classList.remove("hidden");
  setTimeout(() => {
    systemToast.classList.add("hidden");
  }, 5000);
};

const showView = (view) => {
  if (!homeSection || !authSection || !categorySection) {
    return;
  }
  if (view === "home") {
    homeSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    categorySection.classList.add("hidden");
    if (navHome) {
      navHome.classList.add("active");
    }
  } else if (view === "category") {
    homeSection.classList.add("hidden");
    authSection.classList.add("hidden");
    categorySection.classList.remove("hidden");
    if (navHome) {
      navHome.classList.remove("active");
    }
  } else {
    homeSection.classList.add("hidden");
    authSection.classList.remove("hidden");
    categorySection.classList.add("hidden");
    if (navHome) {
      navHome.classList.remove("active");
    }
  }
};

const runSearch = () => {
  if (!productRow || !homeSearchInput) {
    return;
  }
  const keyword = homeSearchInput.value.trim().toLowerCase();
  const cards = [...productRow.querySelectorAll(".product-card")];
  let visibleCount = 0;

  cards.forEach((card) => {
    const name = (card.dataset.name || card.textContent || "").toLowerCase();
    const match = !keyword || name.includes(keyword);
    card.style.display = match ? "" : "none";
    if (match) {
      visibleCount += 1;
    }
  });

  if (searchEmpty) {
    searchEmpty.classList.toggle("hidden", visibleCount > 0);
  }
};

const renderDashboard = async () => {
  try {
    const me = await request("/api/me");
    const logs = await request("/api/transactions");

    authCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
    if (authActions) {
      authActions.classList.add("hidden");
    }
    if (topbarUser) {
      topbarUser.classList.remove("hidden");
    }
    balanceEl.textContent = formatMoney(me.balance || 0);
    currentUserEl.textContent = me.email || "";
    if (topbarEmail) {
      topbarEmail.textContent = me.email || "";
    }
    if (topbarPoints) {
      topbarPoints.textContent = Number(me.balance || 0).toFixed(2);
    }

    logList.innerHTML = "";
    logs.forEach((entry) => {
      const li = document.createElement("li");
      const time = new Date(entry.created_at).toLocaleString("zh-CN", { hour12: false });
      li.textContent = `${time} - ${entry.type} ${formatMoney(entry.amount)}，余额 ${formatMoney(entry.balance)}`;
      logList.appendChild(li);
    });
  } catch (error) {
    authCard.classList.remove("hidden");
    dashboard.classList.add("hidden");
    if (authActions) {
      authActions.classList.remove("hidden");
    }
    if (topbarUser) {
      topbarUser.classList.add("hidden");
    }
  }
};

const switchForm = (target) => {
  showView("auth");
  if (target === "register") {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  } else {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  }
};

[...document.querySelectorAll("[data-show]")].forEach((btn) => {
  btn.addEventListener("click", () => switchForm(btn.dataset.show));
});

if (navHome) {
  navHome.addEventListener("click", (event) => {
    event.preventDefault();
    showView("home");
  });
}

if (categoryBtn) {
  categoryBtn.addEventListener("click", () => {
    showView("category");
  });
}

if (categoryHome) {
  categoryHome.addEventListener("click", () => {
    showView("home");
  });
}

if (categoryAccount) {
  categoryAccount.addEventListener("click", () => {
    showView("auth");
  });
}

if (toastHome) {
  toastHome.addEventListener("click", () => {
    showView("home");
  });
}

if (toastOrderNow) {
  toastOrderNow.addEventListener("click", () => {
    jumpToProducts();
  });
}


if (homeSearchForm) {
  homeSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = formData.get("email").trim();
  const password = formData.get("password");
  const captcha = formData.get("captcha");

  try {
    const data = await request("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password, captcha, captchaId: loginCaptchaId }),
    });
    setToken(data.token);
    loginForm.reset();
    showView("auth");
    await renderDashboard();
    showToast();
    if (loginModal) {
      lastLoginIp.textContent = data.lastLogin?.ip || "暂无";
      lastLoginTime.textContent = data.lastLogin?.time
        ? new Date(data.lastLogin.time).toLocaleString("zh-CN", { hour12: false })
        : "暂无";
      loginModalLocked = false;
      loginModal.classList.remove("hidden");
    }
    await loadLoginCaptcha();
  } catch (error) {
    alert(error.message);
    await loadLoginCaptcha();
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const email = formData.get("email").trim();
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  const code = formData.get("code");

  if (password !== confirm) {
    alert("两次密码不一致");
    return;
  }

  try {
    const data = await request("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password, code }),
    });
    setToken(data.token);
    registerForm.reset();
    showView("auth");
    await renderDashboard();
    showToast();
  } catch (error) {
    alert(error.message);
  }
});

let countdownTimer = null;

const startCountdown = (seconds) => {
  let remaining = seconds;
  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = `${remaining}s`;
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = "获取邮箱验证码";
      return;
    }
    sendCodeBtn.textContent = `${remaining}s`;
  }, 1000);
};

if (sendCodeBtn) {
  sendCodeBtn.addEventListener("click", async () => {
    const email = registerForm.querySelector("input[name='email']").value.trim();
    if (!email) {
      alert("请先输入邮箱");
      return;
    }
    try {
      await request("/api/send-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      startCountdown(60);
    } catch (error) {
      alert(error.message);
    }
  });
}

rechargeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(new FormData(rechargeForm).get("amount"));
  if (!amount || amount <= 0) {
    alert("请输入正确金额");
    return;
  }

  try {
    await request("/api/recharge", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    rechargeForm.reset();
    await renderDashboard();
  } catch (error) {
    alert(error.message);
  }
});

consumeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(new FormData(consumeForm).get("amount"));
  if (!amount || amount <= 0) {
    alert("请输入正确金额");
    return;
  }

  try {
    await request("/api/consume", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    consumeForm.reset();
    await renderDashboard();
  } catch (error) {
    alert(error.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await request("/api/logout", { method: "POST" });
  } catch (error) {
    // ignore
  }
  setToken("");
  renderDashboard();
});

if (topbarLogout) {
  topbarLogout.addEventListener("click", async () => {
    try {
      await request("/api/logout", { method: "POST" });
    } catch (error) {
      // ignore
    }
    setToken("");
    renderDashboard();
  });
}

if (toastClose) {
  toastClose.addEventListener("click", () => {
    systemToast.classList.add("hidden");
  });
}

const loadLoginCaptcha = async () => {
  if (!loginCaptchaImg) {
    return;
  }
  const res = await fetch("/api/login-captcha");
  const data = await res.json();
  loginCaptchaId = data.id;
  loginCaptchaImg.src = `data:image/svg+xml;base64,${btoa(data.svg)}`;
};

if (loginCaptchaRefresh) {
  loginCaptchaRefresh.addEventListener("click", () => {
    loadLoginCaptcha();
  });
}

if (loginModalClose) {
  loginModalClose.addEventListener("click", () => {
    if (loginModalLocked) {
      return;
    }
    loginModal.classList.add("hidden");
  });
}

if (loginModalOk) {
  loginModalOk.addEventListener("click", () => {
    if (loginModalLocked) {
      return;
    }
    loginModal.classList.add("hidden");
  });
}

renderDashboard();
showView("auth");
if (loginModal) {
  loginModal.classList.add("hidden");
}
loadLoginCaptcha();
