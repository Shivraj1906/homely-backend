//import express, jwt, mysql
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');

//use json middleware
const app = express();

app.use(express.json());

//create connection to database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'p@ssword',
    database: 'project'
});

//connect to database
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySql Connected...');
});

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

//manage getUserData request
app.get('/getUserData', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get email from authData
        const email = authData.email;

        //query database
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back user data
            res.status(200).json({
                email: results[0].email,
                first_name: results[0].first_name,
                last_name: results[0].last_name,
                birthdate: results[0].birthdate,
                gender: results[0].gender,
                address: results[0].address,
                city: results[0].city,
                state: results[0].state,
                pincode: results[0].pincode,
                phone_number: results[0].phone_number,
            });
        });
    });
});

//manage updateUserDate post request
app.post('/updateUserData', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get email from authData
        const email = authData.email;

        //get newEmail, first_name, last_name, birthdate from request body
        const newEmail = req.body.email;
        const first_name = req.body.first_name;
        const last_name = req.body.last_name;
        const birthdate = req.body.birthdate;
        const gender = req.body.gender;
        const address = req.body.address;
        const city = req.body.city;
        const state = req.body.state;
        const pincode = req.body.pincode;
        const phone_number = req.body.phone_number;

        //update the user data
        db.query('UPDATE users SET email = ?, first_name = ?, last_name = ?, birthdate = ?, gender = ?, address = ?, city = ?, state = ?, pincode = ?, phone_number = ? WHERE email = ?', [newEmail, first_name, last_name, birthdate, gender, address, city, state, pincode, phone_number, email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back 200 okay request
            res.status(200).send('OK');
        });
    });
});


//listen at port 5000
app.listen(5000, () => console.log('Server started at port 5000'));