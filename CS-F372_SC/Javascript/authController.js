// authController.js
const connectDB = require('./db');
const crypto = require('crypto');
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const path = require("path");
const fs = require("fs"); // Ensure the `fs` module is also imported for file operations

function hash(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Register.js
exports.register = async (req, res) => {
  console.log("Received request", req.body);
  const { username, email, password, roles } = req.body;
  const db = await connectDB();
  const users = db.collection('users');

  const existing = await users.findOne({ email });
  if (existing) {
    return res.json({ success: false, message: 'User already registered' });
  }

  if (!strongPasswordRegex.test(password)) {
    return res.json({
      success: false,
      message: "Password must include uppercase, lowercase, number, special character, and be at least 8 characters long."
    });
  }

  const salt = generateSalt();
  const hashed = hash(password, salt);

  await users.insertOne({ username, email, password: hashed, salt, roles});
  res.json({ success: true, message: 'Registration successful' });
};

// Login.js 
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const db = await connectDB();
  const users = db.collection("users");

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Missing email or password" });
  }

  // Email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return res.json({ success: false, message: '⚠️ Please enter a valid email address.' });
  }

  const user = await users.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: 'Email not found' });
  }

  const hashed = hash(password, user.salt);

  if (hashed === user.password) {
    // Store email, username, and roles in session
    req.session.user = { 
      email: email, 
      username: user.username, 
      roles: user.roles || ["viewer"] // Default to "viewer" if roles are not defined
    };
    res.json({ success: true, message: 'Login successful' });
    console.log("Session data:", req.session);
  } else {
    res.json({ success: false, message: 'Wrong password' });
  }
};

// API to retrieve the session information
exports.getSession = async (req, res) => {
  try {
    if (req.session && req.session.user) {
      res.json({
        success: true,
        email: req.session.user.email,
        username: req.session.user.username || "viewer", // Provide username or fallback to "Viewer",
        roles: req.session.user.roles || ["viewer"], // Provide roles or fallback to "viewer"
      });
    } else {
      res.json({ success: false, message: "No active session" });
    }
  } catch (error) {
    console.error("❌ Error fetching session:", error);
    res.status(500).json({ success: false, message: "Failed to fetch session" });
  }
};

// Update.js *NOT CURRENTLY IN USE*
// exports.update = async (req, res) => {
//   const { email, newEmail, newPassword } = req.body;
//   const db = await connectDB();
//   const users = db.collection('users');

//   const user = await users.findOne({ email });
//   if (!user) {
//     return res.json({ success: false, message: 'User not found' });
//   }

//   const updateFields = {};

//   if (newEmail && newEmail !== email) {
//     const existing = await users.findOne({ email: newEmail });
//     if (existing) {
//       return res.json({ success: false, message: 'New email already in use' });
//     }
//     updateFields.email = newEmail;
//   }

//   if (newPassword && newPassword.trim().length >= 6) {
//     const hashed = hash(newPassword, user.salt);
//     updateFields.password = hashed;
//   }

//   if (Object.keys(updateFields).length === 0) {
//     return res.json({ success: false, message: 'No update fields provided' });
//   }

//   await users.updateOne({ email }, { $set: updateFields });
//   res.json({ success: true, message: 'Update successful' });
// };


// ======================== ADDED FAVORITES API ========================
exports.addFavorites = async (req, res) => {
  console.log("Received request to add favorite:", req.body); // Debugging log

  const { email, movieTitle } = req.body;
  if (!email || !movieTitle) {
    return res.json({ success: false, message: 'Missing email or movie title' });
  }

  const db = await connectDB();
  const users = db.collection('users');

  const user = await users.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }

  const favorites = user.favorites || [];
  if (favorites.includes(movieTitle)) {
    return res.json({ success: false, message: 'Already in favorites' });
  }

  await users.updateOne({ email }, { $push: { favorites: movieTitle } });
  res.json({ success: true, message: 'Added to favorites!' });
};

// ======================== REMOVE FAVORITES API ========================
exports.removeFavorites = async (req, res) => {
  const { email, movieTitle } = req.body;

  console.log("Received request to remove favorite:", { email, movieTitle }); // Debugging log

  if (!email || !movieTitle) {
    return res.json({ success: false, message: 'Missing email or movie title' });
  }

  const db = await connectDB();
  const users = db.collection('users');

  const user = await users.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }

  const favorites = user.favorites || [];
  if (!favorites.includes(movieTitle)) {
    return res.json({ success: false, message: 'Movie not in favorites' });
  }

  await users.updateOne({ email }, { $pull: { favorites: movieTitle } });
  res.json({ success: true, message: 'Removed from favorites!' });
};


// ======================== GET FAVORITES API ========================
exports.getFavorites = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: "Missing email" });

  const db = await connectDB();
  const user = await db.collection("users").findOne({ email });
  if (!user) return res.json({ success: false, message: "User not found" });

  res.json({ success: true, favorites: user.favorites || [] });
};

// ======================== ADD LIKED API ========================

  exports.addLikedMovie = async (req, res) => {
  const { email, movieId } = req.body;

  if (!email || !movieId) {
    return res.json({ success: false, message: "Missing data" });
  }

  const db = await connectDB();
  const users = db.collection("users");

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.dislikedMovies && user.dislikedMovies.includes(movieId)) {
      return res.json({ success: false, message: "You already disliked this movie" });
    }
    

    const likedMovies = user.likedMovies || [];

    if (likedMovies.includes(movieId)) {
      return res.json({ success: false, message: "Already liked" });
    }

    await users.updateOne(
      { email },
      { $push: { likedMovies: movieId } }
    );

    res.json({ success: true, message: "Movie liked!" });
  } catch (err) {
    console.error("❌ Error in addLikedMovie:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== GET LIKED API ========================

exports.getLikedMovies = async (req, res) => {
  const { email } = req.body; 

  if (!email) return res.json({ success: false, message: "Missing email" });

  const db = await connectDB();
  const users = db.collection("users");

  const user = await users.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  res.json({ success: true, likedMovies: user.likedMovies || [] });
};

// ======================== ADD DISLIKED API ========================

exports.addDislikedMovie = async (req, res) => {
  const { email, movieId } = req.body;
  if (!email || !movieId) {
    return res.json({ success: false, message: "Missing data" });
  }

  const db = await connectDB();
  const users = db.collection("users");

  try {
    const user = await users.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const dislikedMovies = user.dislikedMovies || [];

    if (dislikedMovies.includes(movieId)) {
      return res.json({ success: false, message: "Already disliked" });
    }

    if (user.likedMovies && user.likedMovies.includes(movieId)) {
      return res.json({ success: false, message: "You already liked this movie" });
    }
    

    await users.updateOne(
      { email },
      { $push: { dislikedMovies: movieId } }
    );

    res.json({ success: true, message: "Movie disliked!" });
  } catch (err) {
    console.error("❌ Error in addDislikedMovie:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== GET DISLIKED API ========================

exports.getDislikedMovies = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: "Missing email" });

  const db = await connectDB();
  const users = db.collection("users");

  const user = await users.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  res.json({ success: true, dislikedMovies: user.dislikedMovies || []  });
};

// ======================== TOGGLE LIKE / DISLIKE API ========================
exports.likeDislikeMovie = async (req, res) => {
  const { email, movieTitle, action } = req.body;

  if (!email || !movieTitle || !action) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const db = await connectDB();
  const users = db.collection("users");

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const update = {};
    if (action === "like") {
      update.$addToSet = { likedMovies: movieTitle }; // Add to likedMovies array if not already present
      update.$pull = { dislikedMovies: movieTitle }; // Remove from dislikedMovies array if present
    } else if (action === "dislike") {
      update.$addToSet = { dislikedMovies: movieTitle }; // Add to dislikedMovies array if not already present
      update.$pull = { likedMovies: movieTitle }; // Remove from likedMovies array if present
    } else if (action === "clear") {
      update.$pull = { likedMovies: movieTitle, dislikedMovies: movieTitle }; // Remove from both arrays
    }

    await users.updateOne({ email }, update);

    res.json({ success: true, message: `Movie ${action}d successfully` });
  } catch (error) {
    console.error("❌ Error updating likes/dislikes:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ======================== Add new movie card ========================
exports.addMovie = async (req, res) => {
  const { title, genre, videoPath } = req.body;

  if (!title || !genre || !videoPath) {
    return res.json({ success: false, message: 'Missing required fields' });
  }

  const db = await connectDB();
  const movies = db.collection('movies');

  try {
    await movies.insertOne({
      title,
      genre,
      videoPath,
      createdAt: new Date() 
    });
    res.json({ success: true, message: 'Movie added successfully' });
  } catch (err) {
    console.error('❌ Error adding movie:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ======================== Update play count ========================
exports.updatePlayCount = async (req, res) => {
  console.log("Received request to update play count:", req.body);
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: "Missing movie title" });
  }

  const db = await connectDB();
  const movies = db.collection("movies");

  try {
    const result = await movies.updateOne(
      { title }, // Match the movie by title
      { $inc: { plays: 1 } }, // Increment the play count
      { upsert: false } // Do not insert a new document if it doesn't exist
    );

    if (result.matchedCount === 0) {
      console.warn(`⚠ Movie with title "${title}" not found.`);
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    console.log(`✅ Play count updated successfully for "${title}"`);
    res.json({ success: true, message: "Play count updated successfully" });
  } catch (err) {
    console.error("❌ Error updating play count:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== Update Watch History ========================
exports.updateWatchHistory = async (req, res) => {
  console.log("Received request to update watch history:", req.body);
  const { title, email } = req.body;

  // Validate the input
  if (!title || !email) {
    return res.status(400).json({ success: false, message: "Missing movie title or user email" });
  }

  const db = await connectDB();
  const users = db.collection("users");

  try {
    // Update the user's watch history
    const timestamp = new Date();
    const result = await users.updateOne(
      { email }, // Match the user by email
      { $push: { watchHistory: { title, watchedAt: timestamp } } }, // Add to watch history
      { upsert: false } // Do not insert a new document if it doesn't exist
    );

    if (result.matchedCount === 0) {
      console.warn(`⚠ User with email "${email}" not found.`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log(`✅ Watch history updated for "${email}" with movie "${title}"`);
    res.json({ success: true, message: "Watch history updated successfully" });
  } catch (err) {
    console.error("❌ Error updating watch history:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== Get Watch History ========================
exports.getWatchHistory = async (req, res) => {
  console.log("Received request to fetch watch history:", req.body);
  const { email } = req.body;

  // Validate the input
  if (!email) {
    return res.status(400).json({ success: false, message: "Missing user email" });
  }

  const db = await connectDB();
  const users = db.collection("users");

  try {
    // Fetch the user's watch history
    const user = await users.findOne({ email }, { projection: { watchHistory: 1 } });

    if (!user || !user.watchHistory) {
      console.warn(`⚠ User with email "${email}" not found or no watch history.`);
      return res.status(404).json({ success: false, message: "You have not watched any movies yet." });
    }

    console.log(`✅ Watch history fetched for "${email}"`);
    res.json({ success: true, watchHistory: user.watchHistory });
  } catch (err) {
    console.error("❌ Error fetching watch history:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== Add Feedback ========================
exports.addFeedback = async (req, res) => {
  console.log("Received feedback submission:", req.body);
  const { movie, comment, email } = req.body;

  if (!movie || !comment || !email) {
    return res.status(400).json({ success: false, message: "Missing movie, comment, or user email" });
  }

  const db = await connectDB();
  const movies = db.collection("movies");

  try {
    // Ensure the feedback field exists
    await movies.updateOne(
      { title: movie },
      { $setOnInsert: { feedback: [] } },
      { upsert: true }
    );

    // Add the feedback
    const result = await movies.updateOne(
      { title: movie },
      { $push: { feedback: { email, comment, submittedAt: new Date() } } }
    );

    if (result.matchedCount === 0) {
      console.warn(`⚠ Movie with title "${movie}" not found.`);
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    console.log(`✅ Feedback added for movie "${movie}" by user "${email}"`);
    res.json({ success: true, message: "Feedback added successfully" });
  } catch (err) {
    console.error("❌ Error adding feedback:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== Search Movies ========================
exports.searchMovies = async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ success: false, message: "Missing search query" });
  }
  
  const db = await connectDB();
  const movies = db.collection("movies");
  
  try {
    const results = await movies
    .find({ title: { $regex: query, $options: "i" } }) // Case-insensitive search
    .toArray();
    
    res.json({ success: true, movies: results });
  } catch (err) {
    console.error("❌ Error searching movies:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== Update Movies ========================
exports.updateMovie = async (req, res) => {
  const { originalTitle, updatedTitle, updatedGenre, updatedPoster, updatedFilepath } = req.body;

  if (!originalTitle) {
    return res.status(400).json({ success: false, message: "Original title is required" });
  }

  const db = await connectDB();
  const movies = db.collection("movies");

  try {
    // Fetch the current movie data
    const currentMovie = await movies.findOne({ title: originalTitle });
    if (!currentMovie) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    // Prepare the update object
    const updateFields = {};
    if (updatedTitle && updatedTitle !== currentMovie.title) updateFields.title = updatedTitle;
    if (updatedGenre && updatedGenre !== currentMovie.genre) updateFields.genre = updatedGenre;
    if (updatedPoster && updatedPoster !== currentMovie.poster) updateFields.poster = updatedPoster;
    if (updatedFilepath && updatedFilepath !== currentMovie.filepath) updateFields.filepath = updatedFilepath;

    // Only update if there are changes
    if (Object.keys(updateFields).length === 0) {
      return res.json({ success: true, message: "No changes detected" });
    }

    // Update the movie in the database
    await movies.updateOne({ title: originalTitle }, { $set: updateFields });

    // Update the MovieList.json file
    const movieListPath = path.join(__dirname, "../Assets", "MovieList.json");
    const movieList = JSON.parse(fs.readFileSync(movieListPath, "utf-8"));
    const movieKey = Object.keys(movieList).find((key) => movieList[key].title === originalTitle);

    if (movieKey) {
      delete movieList[movieKey];
      movieList[updatedTitle || originalTitle] = {
        ...currentMovie,
        ...updateFields,
      };

      fs.writeFileSync(movieListPath, JSON.stringify(movieList, null, 2));
    }

    res.json({ success: true, message: "Movie updated successfully" });
  } catch (error) {
    console.error("❌ Error updating movie:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// API to fetch all movies with play counts and feedback
exports.getMovies = async (req, res) => {
  const db = await connectDB();
  const movies = db.collection("movies");

  try {
    const movieList = await movies.find({}).toArray();

    const moviesWithDetails = movieList.map((movie) => ({
      title: movie.title,
      plays: movie.plays || 0,
      feedback: movie.feedback || [],
    }));

    res.json({ success: true, data: moviesWithDetails });
  } catch (error) {
    console.error("❌ Error fetching movies:", error);
    res.status(500).json({ success: false, message: "Failed to fetch movies" });
  }
};