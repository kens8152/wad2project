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
server.use(express.json());

const ARTISTS_DATA = path.join(__dirname, "stores", "artists.json");

server.get("/matchmaking", async (req, res) => {
    const returnCount = 7;

    try {
        let data = await fs.readFile(ARTISTS_DATA, "utf-8");
        data = JSON.parse(data);
        const ids = Object.keys(data);
        let randomizedArtists = [];

        for (let i=0; i<returnCount && ids.length; i++) {
            const id = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
            randomizedArtists.push({ id, ...data[id] });
        }

        return res.json(randomizedArtists);
    } catch (err) {
        console.error("Failed to read artists.json", err);
        return res.status(500).json({ error: "Could not load artists" });
    }
});

// server.post("/matchmaking", async (req, res) => {

// });

// server.post("/matchmaking/save", async (req, res) => {

// });

// server.post("/matchmaking/refresh", async (req, res) => {
//     const { artists } = req.body;

//     if (!Array.isArray(artists)) {
//         return res.status(400).json({ error: "artists must be an array" });
//     }

//     try {
//         let data = await fs.readFile(ARTISTS_DATA, "utf-8");
//         data = JSON.parse(data);

//         const updatedArtists = artists.map(artist => {
//             const latest = data.find(a => a.id === artist.id);
//             return latest ? { ...artist, ...latest } : artist;
//         });

//         return res.json(updatedArtists);
//     } catch (err) {
//         console.error("Failed to refresh artists", err);
//         return res.status(500).json({ error: "Could not refresh artists" });
//     }
// });


const hostname = "localhost";
const port = 8000;

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
