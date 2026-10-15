const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs/promises");
const cors = require("cors");

dotenv.config({ path: "./config.env" });

const server = express();

// Allow the Vite dev server to call this API
server.use(cors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"] }));
server.use(express.urlencoded({ extended: true }));

const ARTISTS_DATA = path.join(__dirname, "stores", "artists.json");

server.get("/artists-matchmaking", async (req, res) => {
    const returnCount = 5;

    try {
        let data = await fs.readFile(ARTISTS_DATA, "utf-8");
        data = JSON.parse(data);
        let randomizedArtists = [];

        for (let i=0; i<returnCount; i++) {
            randomizedArtists.push(data.splice(Math.floor(Math.random() * data.length), 1)[0]);
        }

        return res.json(randomizedArtists);
    } catch (err) {
        console.error("Failed to read artists.json", err);
        return res.status(500).json({ error: "Could not load artists" });
    }
});


const hostname = "localhost";
const port = 8000;

server.listen(port, hostname, () => {
console.log(`Server running at http://${hostname}:${port}/`);
});
