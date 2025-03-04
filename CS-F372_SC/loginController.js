/*
  Filename: loginController.js
  Purpose: Contains functions to handle user login logic with MongoDB

  Todo: create db.js that contains the connection logic, and reuses client
*/

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const mongoUri = process.env.MONGO_URI || 'mongodb://docker_mongo:27017/myProjectDB';

// Function to check password complexity
function isPasswordComplex(password) {
  const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{}\\|\/?,<.>;:'"`~])[A-Za-z\d!@#$%^&*()\-_=+\[\]{}\\|\/?,<.>;:'"`~]{8,}$/;
  return complexityRegex.test(password);
}

// Function to hash password with salt
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Function to generate a random salt
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

async function handleLoginRequest(req, res) {
  const userName = req.body.usernameField;
  const userPassword = req.body.passwordField;
  
  // Basic checks
  if (!userName || !userPassword) {
    return res.json({ success: false, message: 'Login failed. Missing username or password.' });
  }

  // Connect to Mongo
  let dbClient;

  try {
    dbClient = new MongoClient(mongoUri);
    await dbClient.connect();

    const db = dbClient.db('myProjectDB');
    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ userName });

    // Check if user already exists
    if (existingUser) {
      const hashedPassword = hashPassword(userPassword, existingUser.salt);
      
      // If account exists and password matches, log in
      if (existingUser.userPassword === hashedPassword) {
        req.session.user = userName; // Set session variable
        return res.json({ success: true, message: 'Login successful. Redirecting to landing page...' });

      // If account exists but password doesn't match, increment failed attempts
      } else {
        const failedAttempts = existingUser.failedAttempts || [];
        const now = new Date();
        const recentAttempts = failedAttempts.filter(attempt => now - new Date(attempt) < 24 * 60 * 60 * 1000);
        recentAttempts.push(now);
        await usersCollection.updateOne({ userName }, { $set: { failedAttempts: recentAttempts } });
        const attemptsRemaining = 3 - recentAttempts.length;
        if (attemptsRemaining > 0) {
          const attemptsMessage = attemptsRemaining === 2 ? 'two attempts remaining.' : 'one attempt remaining. Account will then be deleted';
          return res.json({ success: false, message: `Login failed. ${attemptsMessage}` });
        } else {
          await usersCollection.deleteOne({ userName });
          return res.json({ success: false, message: 'All attempts exhausted, account deleted.' });
        }
      }
      
    // Create new user if doesn't exist
    } else {
      if (!isPasswordComplex(userPassword)) {
        return res.json({ success: false, message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character, and be at least 8 characters long.' });
      }
      const salt = generateSalt();
      const hashedPassword = hashPassword(userPassword, salt);
      await usersCollection.insertOne({ userName, userPassword: hashedPassword, salt });
      req.session.user = userName; // Set session variable
      return res.json({ success: true, message: 'Account created. Redirecting to landing page...' });
    }
  } catch (error) {
    console.error('Error in handleLoginRequest:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    // Make sure to close the client
    if (dbClient) {
      await dbClient.close();
    }
  }
}

module.exports = { handleLoginRequest };
