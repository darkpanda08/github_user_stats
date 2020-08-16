const express = require('express')
const fetch = require('node-fetch')
const redis = require('redis')
require('dotenv').config()

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || '192.168.0.5';

const client = redis.createClient(REDIS_PORT, REDIS_HOST);

const app = express();

function setResponse(username, repos) {
    return `<h2>${username} has ${repos} GitHub repos</h2>`
}

// Make request to GitHub for data
async function getRepos(req, res, next) {
    try {
        console.log('Fetching Data....');

        const { username } = req.params;

        const response = await fetch(`https://api.github.com/users/${username}`);

        const data = await response.json();

        const repos = data.public_repos;
        
        // Set to Redis
        client.setex(username, 3600, repos);
        
        res.send(setResponse(username, repos));
    } catch (err) {
        console.error(err);
        res.status(500);
    }
}

// Cache Middleware
function cache(req, res, next) {
    const { username } = req.params;

    client.get(username, (err, data) => {
        if(err) throw err;

        if(data != null) {
            res.send(setResponse(username, data));
        } else {
            next();
        }
    });
}

app.get('/repos/:username', cache, getRepos);

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`);
});