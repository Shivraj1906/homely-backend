//import express, mysql, bcrypt and jsonwebtoken
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//create a new express app
const app = express();

app.use(express.json());

//create sql connection
const sql = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    // password: '',
    database: 'project'
});

//connect to database
sql.connect(err => {
    if (err) {
        console.log(err);
    }
    console.log('Connected to database');
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

//manage / get request and use verifyToken middleware
app.get('/', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            return res.sendStatus(403);
        }

        //send back the email from authData and 200 status
        res.status(200).json({
            "email": authData.email
        });
    });
});

//manage /register post route
app.post('/register', (req, res) => {
    //get first_name, last_name, email and password from request body
    const { first_name, last_name, email, password } = req.body;

    //check if email is already in use
    sql.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Internal server error');
        }
        //if email is already in use, return error
        if (result.length > 0) {
            res.status(400).send('Email already in use');
            return;
        }
        //hash password
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.log(err);
                res.status(500).send('Internal server error');
            }
            //insert user into database
            sql.query('INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)', [first_name, last_name, email, hash], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send('Internal server error');
                }
                //create jwt token with email as payload and no expiration
                const token = jwt.sign({ email }, 'secret');
                //send token to client wwith okay response
                res.status(200).send({ token });
            });
        });
    });
});

//manage /login post route
app.post('/login', (req, res) => {
    //get email and password from the body
    const { email, password } = req.body;

    //check if the email is in the database
    sql.query(`SELECT * FROM users WHERE email = '${email}'`, (err, result) => {
        if (err) {
            console.log(err);
            //send back bad request status
            return res.status(500).json({
                error: 'Internal server error'
            });
        }
        //if the email is not in the database, return an error
        if (result.length === 0) {
            return res.status(400).json({
                error: 'Email does not exist'
            });
        }
        //check if the password is correct
        bcrypt.compare(password, result[0].password, (err, isMatch) => {
            if (err) {
                console.log(err);
                //send back bad request status
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
            //if the password is incorrect, return an error
            if (!isMatch) {
                return res.status(400).json({
                    error: 'Incorrect password'
                });
            }
            //create a token with user email and no expiration date
            const token = jwt.sign({ email }, 'secret');
            //return the token with ok status
            res.status(200).json({
                token
            });
        });
    });
});


//listen at port 3000
app.listen(3000, () => {
    console.log('Server started at port 3000');
});
