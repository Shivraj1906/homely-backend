//import express, mysql, bcrypt, cors and jsonwebtoken
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

//create new express app
const app = express();

//use cors middleware and accepts options request
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

//user json middleware
app.use(express.json());

//create sql connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'p@ssword',
    database: 'project'
});

//connect to database
connection.connect(err => {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to database');
    }
});

//make a middleware to verify the token
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        //append the token to the request
        req.token = bearer[1];
        //next middleware
        next();
    } else {
        return res.sendStatus(403);
    }
};

app.get("/", (req, res) => {
    res.send("Hello World");
});

//manage /register post request
app.post('/register', (req, res) => {
    //get email and password from request body
    const { email, password } = req.body;

    //check if email already exists in admin table
    connection.query('SELECT * FROM admin WHERE email = ?', [email], (err, result) => {
        if (err) {
            return res.sendStatus(500);
        } else if (result.length > 0) {
            return res.sendStatus(409);
        } else {
            //hash the password
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    return res.sendStatus(500);
                } else {
                    //insert the email and hashed password into admin table
                    connection.query('INSERT INTO admin (email, password) VALUES (?, ?)', [email, hash], (err, result) => {
                        if (err) {
                            console.log(err);
                            return res.sendStatus(500);
                        } else {
                            //create a token with email as payload no expiry
                            const token = jwt.sign({ email }, 'secret');
                            //send the token to the client
                            return res.json({ token });
                        }
                    });
                }
            });
        }
    });
});

//magage port route to login
app.post('/login', (req, res) => {
    //get email and password from request body
    const { email, password } = req.body;

    //check if email exists in admin table
    connection.query('SELECT * FROM admin WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        } else if (result.length > 0) {
            //check if password matches
            bcrypt.compare(password, result[0].password, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else if (result) {
                    //create a token with email as payload no expiry
                    const token = jwt.sign({ email }, 'secret');
                    //send the token to the client
                    return res.json({ token });
                } else {
                    return res.sendStatus(401);
                }
            });
        } else {
            return res.sendStatus(401);
        }
    });
});

//manage /editService post request
app.post('/editService', verifyToken, (req, res) => {
    //get service id, service name, service price and service description from request body
    const { service_id, service_name, service_description } = req.body;

    //check if service id exists in service table
    connection.query('SELECT * FROM service WHERE service_id = ?', [service_id], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        } else if (result.length > 0) {
            //update service name, service price and service description in service table
            connection.query('UPDATE service SET service_name = ?, service_description = ? WHERE service_id = ?', [service_name, service_description, service_id], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else {
                    return res.sendStatus(200);
                }
            });
        } else {
            return res.sendStatus(404);
        }
    });
});

//manage post route to add service
app.post('/addService', verifyToken, (req, res) => {
    //get service_name, service_description from body
    const { service_name, service_description } = req.body;

    //insert service_name and service_description in service table
    connection.query('INSERT INTO service (service_name, service_description) VALUES (?, ?)', [service_name, service_description], (err, result) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        } else {
            return res.sendStatus(200);
        }
    });
});

//manage get request to get all places of host
app.get('/getPlaces', verifyToken, (req, res) => {
    //verify the token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        } else {
            //get host_id from the request
            const { host_id } = req.query;

            //get all places of host
            connection.query('SELECT * FROM place WHERE host_id = ?', [host_id], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else {
                    return res.json(result);
                }
            });
        }
    });
});

//manage get all booking requests of a host
app.get('/getBookingRequests', verifyToken, (req, res) => {
    //verify the token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        } else {
            //get host_id from the request
            const { host_id } = req.query;

            var query = "SELECT * FROM booking WHERE place_id IN (SELECT place_id FROM place WHERE host_id = ?)";
            connection.query(query, [host_id], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else {
                    return res.json(result);
                }
            });
        }
    });
});

app.get('/getPlaceBookingRequests', verifyToken, (req, res) => {
    //verify the token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        } else {
            //get host_id from the request
            const { place_id } = req.query;
            console.log(place_id);

            var query = "SELECT * FROM booking WHERE place_id = ?";
            connection.query(query, [place_id], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else {
                    return res.json(result);
                }
            });
        }
    });
});

//manage get request that returns the users who are host
app.get('/getHosts', verifyToken, (req, res) => {
    //verify the token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        } else {
            var query = "SELECT * FROM users WHERE user_id IN(SELECT host_id FROM host)";
            connection.query(query, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else {
                    return res.json(result);
                }
            });
        }
    });
});

//listen at port 1000
app.listen(5500, () => {
    console.log("Server is running at port 5500");
});