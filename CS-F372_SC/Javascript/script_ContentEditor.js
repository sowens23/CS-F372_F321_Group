document.addEventListener("DOMContentLoaded", async () => {
  const bannerEmail = document.getElementById("banner-email");

  try {
    // === Fetch Session Data ===
    console.log("Fetching session data...");
    const response = await fetch("http://localhost:3000/api/account/session", {
      credentials: "include", // Ensure cookies are sent with the request
    });
    const data = await response.json();
    console.log("Session data:", data);

    if (data.success) {
      bannerEmail.textContent = `Logged in as: ${data.email}`;

      // Check if the user has "Content Editor" privileges
      if (!data.roles || !data.roles.includes("Content Editor")) {
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
  } catch (error) {
    console.error("❌ Error fetching session data:", error);
    bannerEmail.textContent = "Error fetching session";
    alert("❌ Unable to verify your permissions. Please try again later.");
    window.location.href = "../html/index_Home.html"; // Redirect to Home page
    return;
  }

  const movieGrid = document.querySelector(".movie-grid");
  const modal = document.getElementById("editModal");
  const overlay = document.getElementById("modalOverlay");
  const titleInput = document.getElementById("editTitle");
  const genreInput = document.getElementById("editGenre");
  const posterInput = document.getElementById("editPoster");
  const filepathInput = document.getElementById("editFilepath");
  const saveBtn = document.getElementById("saveEdit");
  let currentCard = null;

  // === Load Movie Cards ===
  try {
    const response = await fetch("../Assets/MovieList.json");
    const movies = await response.json();

    // Iterate through the movies and create cards
    for (const [key, movie] of Object.entries(movies)) {
      const movieCard = document.createElement("div");
      movieCard.classList.add("movie-card");
      movieCard.setAttribute("data-movie", key);
      movieCard.setAttribute("data-filepath", movie.filepath || ""); // Set the filepath attribute
    
      // Use the `poster` field from the movie object
      movieCard.innerHTML = `
        <img src="${movie.poster}" alt="Movie Poster" />
        <h3>${movie.title}</h3>
        <p>Genre: ${movie.genre || "Unknown"}</p>
        <div class="controls">
          <button class="edit-btn">Edit</button>
          <button class="remove-btn">Remove</button>
        </div>
      `;
    
      // Append the card to the movie grid
      movieGrid.appendChild(movieCard);
    }

    // Attach event listeners to dynamically created buttons
    setupEditButtons();
    setupPosterButtons();
    setupRemoveButtons();
  } catch (error) {
    console.error("❌ Error loading movies:", error);
  }

    // === Edit Movie Modal ===
  function setupEditButtons() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        currentCard = e.target.closest(".movie-card");
        const title = currentCard.querySelector("h3").textContent;
        const genre = currentCard.querySelector("p").textContent.replace("Genre: ", "");
        const poster = decodeURIComponent(currentCard.querySelector("img").src.split("/").pop()); // Decode URL
        const filepath = decodeURIComponent(currentCard.getAttribute("data-filepath")?.split("/").pop() || ""); // Decode URL

        titleInput.value = title;
        genreInput.value = genre;
        posterInput.value = poster;
        filepathInput.value = filepath;

        modal.style.display = "block";
        overlay.style.display = "block";
      });
    });
  }

  saveBtn.addEventListener("click", async () => {
    if (currentCard) {
      const originalTitle = currentCard.getAttribute("data-movie"); // Get the original title
      const updatedTitle = titleInput.value;
      const updatedGenre = genreInput.value;
  
      // Get the current values from the card
      const currentPoster = currentCard.querySelector("img").src.split("/").pop().split("?")[0]; // Get current poster file name
      const currentFilepath = currentCard.getAttribute("data-filepath").split("/").pop(); // Get current filepath
  
      // Check if the fields have been modified
      const updatedPoster = posterInput.value !== currentPoster
        ? posterInput.value.split("?")[0].replace(/\s+/g, "-")
        : currentPoster;
      const updatedFilepath = filepathInput.value !== currentFilepath
        ? filepathInput.value.split("?")[0]
        : currentFilepath;
  
      // Only proceed if at least one field has changed
      if (
        updatedTitle === originalTitle &&
        updatedGenre === currentCard.querySelector("p").textContent.replace("Genre: ", "") &&
        updatedPoster === currentPoster &&
        updatedFilepath === currentFilepath
      ) {
        console.log("⚠️ No changes detected. Update aborted.");
        modal.style.display = "none";
        overlay.style.display = "none";
        return;
      }
  
    // Update the card in the UI
    const timestamp = new Date().getTime(); // Generate a unique timestamp for cache-busting
    currentCard.querySelector("h3").textContent = updatedTitle;
    currentCard.querySelector("p").textContent = `Genre: ${updatedGenre}`;
    currentCard.querySelector("img").src = `../Assets/posters/${updatedPoster}`;
    currentCard.setAttribute("data-movie", updatedTitle); // Update the data-movie attribute
    currentCard.setAttribute("data-filepath", `../Assets/videos/${updatedFilepath}`);
  
      // Update the database and MovieList.json
      try {
        const response = await fetch("http://localhost:3000/api/editor/update-movie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalTitle,
            updatedTitle,
            updatedGenre,
            updatedPoster,
            updatedFilepath,
          }),
        });
  
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Movie "${updatedTitle}" updated successfully.`);
        } else {
          console.error("❌ Error updating movie:", result.message);
        }
      } catch (error) {
        console.error("❌ Error updating movie:", error);
      }
    }
  
    modal.style.display = "none";
    overlay.style.display = "none";
  });

  overlay.addEventListener("click", () => {
    modal.style.display = "none";
    overlay.style.display = "none";
  });

  // === Upload Poster ===
  function setupPosterButtons() {
    document.querySelectorAll(".poster-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".movie-card");
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.addEventListener("change", () => {
          const file = fileInput.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
              card.querySelector("img").src = e.target.result;
            };
            reader.readAsDataURL(file);
          }
        });
        fileInput.click();
      });
    });
  }

  // === Remove Movie ===
  function setupRemoveButtons() {
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".movie-card");
        const title = card.querySelector("h3").textContent;
        if (confirm(`❗ Are you sure you want to delete "${title}"?`)) {
          card.remove();
        }
      });
    });
  }
});