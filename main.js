//import express, jwt, mysql
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const path = require('path');

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
        const { newEmail, first_name, last_name, birthdate, gender, address, city, state, pincode, phone_number } = req.body;

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

//manage get homeData request
app.get('/getHomeData', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        const email = authData.email;
        //get the place data from 'place' table
        db.query('SELECT * FROM place WHERE is_listed = 1', (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back results
            res.status(200).json(results);
        });
    });
});

//manage get hostPlaceData request
app.get('/getHostPlaceData', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        const email = authData.email;

        //get host_id from 'users' table where email = email
        db.query('SELECT user_id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            console.log(results[0].user_id);

            //return all places where host_id = results[0].user_id
            db.query('SELECT * FROM place WHERE host_id = ?', [results[0].user_id], (err, results) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }

                //send back results
                res.status(200).json(results);
            });
        });
    });
});

//manage get request which returns provided services by place
app.get('/getProvidedServices', verifyToken, (req, res) => {
    //get place_id from query params
    const place_id = req.query.place_id;

    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        var query = "SELECT * FROM service WHERE service_id IN (SELECT service_id FROM service_provided WHERE place_id = ?)";
        db.query(query, [place_id], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }


            db.query("SELECT * FROM service_provided WHERE place_id = ?", [place_id], (err, results2) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }

                //send back results
                res.status(200).json({
                    services: results,
                    service_provided: results2
                });
            })
        });
    });
});

app.get('/getHostData', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get host_id from query params
        const host_id = req.query.host_id;

        //query database
        db.query('SELECT * FROM users WHERE user_id = ?', [host_id], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back user data
            res.status(200).json({
                first_name: results[0].first_name,
                last_name: results[0].last_name,
                phone_number: results[0].phone_number,
                email: results[0].email,
            });
        });
    });
});

app.get("/getPlaceImage", verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get filename from query params
        const filename = req.query.filename;

        //send back file named 'place_id.jpg'
        res.sendFile(path.join(__dirname, './place/' + filename + '.jpg'));
    });
})

app.get("/getUserProfileImage", (req, res) => {
    //get the email from query params
    const email = req.query.email;

    //send back file named 'place_id.jpg'
    res.sendFile(path.join(__dirname, './profile/' + email + '.png'));
})

//manage post request that manages the booking request
app.post('/bookingRequest', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get email from authData
        const email = authData.email;

        //get user_id from email
        db.query('SELECT user_id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //get user_id from results
            const traveler_id = results[0].user_id;

            //get place_id, guest_count, check_in, check_out, total_bill from request body
            const { place_id, guest_count, check_in, check_out, booking_date, total_bill } = req.body;

            //check if the place is already booked
            db.query('SELECT * FROM booking WHERE place_id = ? AND check_in = ? AND check_out = ?', [place_id, check_in, check_out], (err, results) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }

                //if the place is already booked
                if (results.length > 0) {
                    //send back 400 bad request
                    return res.status(400).send('place is already booked');
                }

                //insert the booking request into 'booking' table
                db.query("INSERT INTO booking (traveler_id, place_id, guest_count, check_in, check_out, booking_date, total_bill, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'p')", [traveler_id, place_id, guest_count, check_in, check_out, booking_date, total_bill], (err, results) => {
                    if (err) {
                        //log error and send back 500 server error
                        console.log(err);
                        return res.status(500).send('Internal Server Error');
                    }


                    //send back booking id and 200 okay request
                    res.status(200).json({
                        booking_id: results['insertId']
                    });
                });
            });
        });
    });
});

//mangage post request that manages chosen_services
app.post('/chosenServices', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }


        //get booking_id and serivce_ids from request body
        const { booking_id, service_ids } = req.body;

        var arr_str = "";
        for (var i = 1; i < service_ids.length - 1; i++) {
            arr_str += service_ids[i];
        }

        console.log(arr_str);

        //convert arr_str to array
        var arr = arr_str.split(',');

        //loop through the service_ids and insert into 'chosen_services' table
        for (var i = 0; i < arr.length; i++) {
            db.query("INSERT INTO service_chosen (booking_id, service_id) VALUES (?, ?)", [booking_id, arr[i]], (err, results) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }
            });
        }

        //send back 200 okay request
        res.status(200).send();
    });
});

//manage get request that returns booking data
app.get('/getBookingData', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get email from authData
        const email = authData.email;

        //get user_id from email
        db.query('SELECT user_id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //return booking data where traveler_id = user_id
            db.query('SELECT * FROM booking WHERE traveler_id = ?', [results[0].user_id], (err, results) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }

                //send back booking data and 200 okay request
                res.status(200).json(results);
            });
        });
    });
});

//manage get place data
app.get('/getPlaceData', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get place_id from query params
        const place_id = req.query.place_id;

        //get place data where place_id = place_id
        db.query('SELECT * FROM place WHERE place_id = ?', [place_id], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back place data and 200 okay request
            res.status(200).json(results[0]);
        });
    });
});

//manage change is_listed status
app.post('/changeIsListed', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get place_id and status from request body
        const { place_id } = req.body;
        const { status } = req.body;

        console.log(status);

        //update is_listed status where place_id = place_id
        db.query('UPDATE place SET is_listed = ? WHERE place_id = ?', [status, place_id], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back 200 okay request
            res.status(200).send();
        });
    });
});

//manage get request that send back all services from 'service' table
app.get('/getServices', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get all services from 'service' table
        db.query('SELECT * FROM service', (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //send back all services and 200 okay request
            res.status(200).json(results);
        });
    });
});

//listen at port 5000
app.listen(5000, () => console.log('Server started at port 5000'));