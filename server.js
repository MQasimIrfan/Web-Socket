const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"], // Allow frontend connections
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

let driverLocations = {}; // Store the latest coordinates for each driver

// WebSocket connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Listen for location updates from the driver
  socket.on("send-location", (data) => {
    console.log("Received Driver Location:", data);
    driverLocations[socket.id] = { id: socket.id, ...data };

    // Broadcast the location update to all connected clients
    io.emit("receive-location", driverLocations);
  });

  // Emit the latest locations every 1 second, even if the user is not moving
  const locationInterval = setInterval(() => {
    if (Object.keys(driverLocations).length > 0) {
      io.emit("receive-location", driverLocations);
    }
  }, 1000);

  // Handle user disconnecting
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove the disconnected user's location
    delete driverLocations[socket.id];

    // Clear interval when the user disconnects
    clearInterval(locationInterval);

    // Notify all clients that a user has disconnected
    io.emit("user-disconnected", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("WebSocket Server is Running!");
});

// Start Server
const PORT = process.env.PORT||5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
