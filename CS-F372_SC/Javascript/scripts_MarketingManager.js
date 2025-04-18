document.addEventListener("DOMContentLoaded", async () => {
  const bannerEmail = document.getElementById("banner-email");
  const movieTableBody = document.getElementById("movie-table").querySelector("tbody");

  try {
    // === Fetch Session Data ===
    console.log("Fetching session data...");
    const sessionResponse = await fetch("http://localhost:3000/api/account/session", {
      credentials: "include",
    });
    const sessionData = await sessionResponse.json();
    console.log("Session data:", sessionData);

    if (sessionData.success) {
      const { email, roles } = sessionData; // Extract email and roles
      bannerEmail.textContent = `Logged in as: ${email}`;
    
      // Check if the user has "Marketing Manager" privileges
      if (!roles || !roles.includes("Marketing Manager")) {
        alert("❌ You do not have permission to access this page.");
        window.location.href = "../html/index_Home.html"; // Redirect to Home page
        return;
      }
    } else {
      bannerEmail.textContent = "Not logged in";
      alert("❌ You must be logged in to access this page.");
      window.location.href = "../html/index_Login.html"; // Redirect to Login page
      return;
    }

    // === Fetch Movie Data ===
    console.log("Fetching movie data...");
    const movieResponse = await fetch("http://localhost:3000/api/movies");

    if (!movieResponse.ok) {
      throw new Error(`HTTP error! status: ${movieResponse.status}`);
    }

    const movies = await movieResponse.json();
    console.log("Movie data:", movies);

    if (!movies.success) {
      console.error("❌ Failed to fetch movies:", movies.message);
      movieTableBody.innerHTML = "<tr><td colspan='3'>Failed to load movies</td></tr>";
      return;
    }

    // === Populate Table ===
    console.log("Populating table...");
    movies.data.forEach((movie) => {
      const row = document.createElement("tr");

      // Movie Title
      const titleCell = document.createElement("td");
      titleCell.textContent = movie.title;
      row.appendChild(titleCell);

      // Play Count
      const playsCell = document.createElement("td");
      playsCell.textContent = movie.plays || 0; // Default to 0 if no play count
      row.appendChild(playsCell);

      // Feedback Comments
      const feedbackCell = document.createElement("td");
      if (movie.feedback && movie.feedback.length > 0) {
        const feedbackList = document.createElement("ul");
        movie.feedback.forEach((comment) => {
          const listItem = document.createElement("li");
          listItem.textContent = `${comment.email}: ${comment.comment}`;
          feedbackList.appendChild(listItem);
        });
        feedbackCell.appendChild(feedbackList);
      } else {
        feedbackCell.textContent = "No feedback";
      }
      row.appendChild(feedbackCell);

      movieTableBody.appendChild(row);
    });

    console.log("✅ Movie data loaded successfully.");
  } catch (error) {
    console.error("❌ Error loading data:", error);
    movieTableBody.innerHTML = "<tr><td colspan='3'>Error loading data</td></tr>";
  }
});