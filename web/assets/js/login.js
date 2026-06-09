const { token, user } = await apiLogin(email, pass);
setToken(token);

if (user.role === "admin") location.href = "./admin.html";
else location.href = "./aluno.html";



document
  .getElementById("loginForm")
  ?.addEventListener("submit", async (e) => {

    e.preventDefault();

    await doLogin();

  });
