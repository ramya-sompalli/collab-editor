let isLogin = true;

const toggleLink = document.getElementById("toggle-link");
const authTitle = document.getElementById("auth-title");
const emailField = document.getElementById("email-field");
const authBtn = document.getElementById("auth-btn");
const errorEl = document.getElementById("auth-error");

// Redirect if already logged in
if (localStorage.getItem("token")) {
  window.location.href = "dashboard.html";
}

toggleLink.addEventListener("click", () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? "Login" : "Register";
  authBtn.textContent = isLogin ? "Login" : "Register";
  toggleLink.textContent = isLogin ? "No account? Register" : "Have account? Login";
  emailField.style.display = isLogin ? "none" : "block";
  errorEl.textContent = "";
});

authBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();
  errorEl.textContent = "";

  try {
    let res;
    if (isLogin) {
      res = await API.login(username, password);
    } else {
      res = await API.register({ username, email, password });
    }
    localStorage.setItem("token", res.access_token);
    localStorage.setItem("username", res.username);
    window.location.href = "dashboard.html";
  } catch (e) {
    errorEl.textContent = e.message;
  }
});