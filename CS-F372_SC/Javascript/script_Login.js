// DEBUG AUTO LOGIN
async function autoLogin() {
  const email = "power1@power.com";
  const password = "!111Aaaa";

  try {
    const response = await fetch("http://localhost:3000/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.success) {
      console.log(`✅ Auto-login successful for ${email}`);
      localStorage.setItem("currentUserEmail", email); // Store the email for session tracking
    } else {
      console.error(`❌ Auto-login failed: ${data.message}`);
    }
  } catch (error) {
    console.error("❌ Error during auto-login:", error);
  }
}

// Fetch the session data to check if the user is logged in
document.addEventListener("DOMContentLoaded", async () => {
  // await autoLogin(); // Call the auto-login function

  const bannerEmail = document.getElementById("banner-email");

  try {
    const response = await fetch("http://localhost:3000/api/account/session", {
      credentials: "include" // Ensure cookies are sent with the request
    });
    const data = await response.json();

    if (data.success) {
      bannerEmail.textContent = `Logged in as: ${data.email}`;
    } else {
      bannerEmail.textContent = "Not logged in";
    }
  } catch (error) {
    console.error("❌ Error fetching session data:", error);
    bannerEmail.textContent = "Error fetching session";
  }
});

// ===== Login Section =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('login-button').addEventListener('click', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      localStorage.setItem("currentUserEmail", email);
      localStorage.setItem("username", email.split("@")[0]);

      // clean like/dislike 
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("liked_") || key.startsWith("disliked_")) {
          localStorage.removeItem(key);
        }
      });

      window.location.href = '../html/index_Home.html';
    }
  });

  // ===== Register Section =====
  document.getElementById('register-button').addEventListener('click', async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    // Get selected roles
    const roles = [];
    if (document.getElementById("content-editor").checked) {
      roles.push("Content Editor");
    }
    if (document.getElementById("marketing-manager").checked) {
      roles.push("Marketing Manager");
    }

    const res = await fetch('/api/account/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, roles }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      localStorage.setItem("currentUserEmail", email);
      localStorage.setItem("username", email.split("@")[0]);

      // clean like/dislike 
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("liked_") || key.startsWith("disliked_")) {
          localStorage.removeItem(key);
        }
      });

      window.location.href = '../html/index_Home.html';
    }
  });

});