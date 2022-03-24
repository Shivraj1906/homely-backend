//import express, jwt, mysql
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const path = require('path');
const pdf = require('pdf-creator-node');
const fs = require('fs');
const multer = require('multer');
const app = express();

totalInvoice = 0;
totalAmount = 0;

app.use(express.static('public'));
app.use('/docs', express.static('docs'))
app.use(express.json());
app.set('views', __dirname + '/views/');
app.set('view engine', 'handlebars');
var hbs = require('handlebars');

hbs.registerHelper("getIndex", function (value) {
    return parseInt(value) + 1;
});

hbs.registerHelper("totalInvoice", function (value) {
    if (parseInt(value) == -1) {
        return totalInvoice;
    } else {
        totalInvoice += parseInt(value)
    }
});

hbs.registerHelper("totalAmount", function (value) {
    if (parseInt(value) == -1) {
        return totalAmount;
    } else {
        totalAmount += parseInt(value)
    }
});


const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'place')
    },
    filename: (req, file, callback) => {
        // callback(null, file.originalname + path.extname(file.originalname));
        callback(null, file.originalname);
    }
})


const profileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'profile')
    },
    filename: (req, file, callback) => {
        // callback(null, file.originalname + path.extname(file.originalname));
        callback(null, file.originalname);
    }
})
const upload = multer({ storage: storage });
const profileUpload = multer({ storage: profileStorage });

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

//manage getUserDataWithId request
app.get('/getUserDataWithId', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get user_id from request
        const user_id = req.query.user_id;

        //query database
        db.query('SELECT * FROM users WHERE user_id = ?', [user_id], (err, results) => {
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

//manage get request that returns chosen service for given booking
app.get('/getChosenService', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get booking_id from query params
        const booking_id = req.query.booking_id;

        //get all services from 'service' table which is in service_provided table where booking_id = booking_id
        db.query('SELECT * FROM service WHERE service_id IN (SELECT service_id FROM service_chosen WHERE booking_id = ?)', [booking_id], (err, results) => {
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
                token: results[0].token
            });
        });
    });
});

app.get("/getPlaceImage", (req, res) => {

    //get filename from query params
    const filename = req.query.filename;

    //send back file named 'place_id.jpg'
    res.sendFile(path.join(__dirname, './place/' + filename + '.jpg'));
});

app.get("/getUserProfileImage", (req, res) => {
    //get the email from query params
    const email = req.query.email;

    //send back file named 'email.jpg'
    res.sendFile(path.join(__dirname, './profile/' + email + '.png'));
});

app.get("/getUserProfileImageWithId", (req, res) => {
    //get user_id from query params
    const user_id = req.query.user_id;

    //find email for this user_id
    db.query("SELECT email FROM users WHERE user_id = ?", [user_id], (err, results) => {
        if (err) {
            //log error and send back 500 server error
            console.log(err);
            return res.status(500).send('Internal Server Error');
        }

        //send back file named 'email.jpg'
        res.sendFile(path.join(__dirname, './profile/' + results[0]['email'] + '.png'));
    });
});

//manage uploadProfileImage post request
app.post('/uploadProfileImage', profileUpload.single("image"), (req, res) => {
    //send back 200 okay request
    res.status(200).send();
});

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
        console.log(place_id);

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





//generate invoice 
app.get('/invoice', verifyToken, (req, res) => {
    totalInvoice = 0;
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }
        const html = fs.readFileSync(path.join(__dirname, '../auth/views/invoiceTemplate.html'), 'utf-8');
        const filename = Math.random() + '.pdf';

        const document = {
            html: html,
            data: {
                in: "A001", tid: "s3435564534534", doi: "2020-30-30",
                placeName: "Van-vagdo", type: "Farm-House", cin: "2020-30-30", cout: "2020-30-30", nps: "6", iData: [{
                    desc: "Rent",
                    days: "5",
                    price: "5000"
                }, {
                    desc: "Bike",
                    days: "4",
                    price: "500"
                },], tname: "ds", tph: "6352411412", temail: "dx@gmail.com", fname: "ds", fph: "6352411412", femail: "dx@gmail.com"
            },
            path: './docs/' + filename
        }
        pdf.create(document, {
            formate: 'A4',
            orientation: 'portrait',
        })
            .then(respo => {
                res.status(200).send(filename);

            }).catch(error => {
                console.log(error);
                res.sendStatus(403);
            });
    });
});

//generate report 
app.get('/report', verifyToken, (req, res) => {

    totalAmount = 0;
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        const hostid = 5;
        const sDate = req.query.sDate;
        const eDate = req.query.eDate;
        const rating = req.query.rating;
        var userData;
        //const { selectPlace } = req.body;
        console.log(sDate);
        console.log(eDate);
        //   console.log(selectPlace);
        console.log(rating);


        const html = fs.readFileSync(path.join(__dirname, '../auth/views/reportTemplate.html'), 'utf-8');
        const filename = "kp@gmail.com" + '.pdf';

        const document = {
            html: html,
            data: {
                name: "Karma Patel", ph: "6352411412", email: "kp@gmail.com", date: new Date().toISOString().slice(0, 10), clients: [{
                    name: "fdsf",
                    booking_date: "2022-25-26",
                    place: "Anand",
                    service: [{ sname: "Gymm" }, { sname: "park" }],
                    ratting: "5.0",
                    price: "15000",

                }, {
                    name: "fdxcxcsf",
                    booking_date: "2022-25-26",
                    place: "Anand",
                    service: [{ sname: "Gym" }],
                    ratting: "5.0",
                    price: "15000",

                },]
            },
            path: './docs/' + filename
        }



        pdf.create(document, {
            formate: 'A4',
            orientation: 'portrait',
        })
            .then(respo => {
                res.status(200).send(filename);

            }).catch(error => {
                console.log(error);
                res.sendStatus(403);
            });
    });
});

//manage post request that inserts place data
app.post('/insertPlace', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get email from authData
        const email = authData.email;

        //get host_id from email
        db.query('SELECT user_id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //store host_id in host_id variable
            const host_id = results[0].user_id;

            //get place data from request body
            const { name, type, address, city, state, pincode, max_guest, bed_count, bathroom_count, price, starting_date, last_date, average_star, is_listed, description, image_count, bedroom_count } = req.body;

            //insert place data into 'place' table
            db.query('INSERT INTO place (host_id, name, type, address, city, state, pincode, max_guest, bed_count, bedroom_count, bathroom_count, price, starting_date, last_date, average_star, is_listed, description, image_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [host_id, name, type, address, city, state, pincode, max_guest, bed_count, bedroom_count, bathroom_count, price, starting_date, last_date, average_star, is_listed, description, image_count], (err, results) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }

                //send back insertId and 200 okay request
                res.status(200).json({ insertId: results.insertId });
            });
        });
    });
});

//manage insertProvidedService post request
app.post('/insertProvidedService', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get the place_id from request
        const { place_id } = req.body;

        //get selectedServices from request
        const { serviceIds, servicePrice } = req.body;
        const average_star = 0;

        //loop throught serviceIds and insert into 'provided_service' table
        for (let i = 0; i < serviceIds.length; i++) {
            db.query('INSERT INTO service_provided (place_id, service_id, price, average_star) VALUES (?, ?, ?, ? )', [place_id, serviceIds[i], servicePrice[i], average_star], (err, results) => {
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

//manage uploadPlaceImage post request
app.post('/uploadPlaceImage', upload.single("image"), (req, res) => {
    //send back 200 okay request
    res.status(200).send();
});

//manage post request to update place data
app.post('/updatePlace', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }


        //get place_id from request
        const { place_id } = req.body;

        //get place data from request body
        const { name, type, address, city, state, pincode, max_guest, bed_count, bathroom_count, price, starting_date, last_date, average_star, is_listed, description, image_count, bedroom_count } = req.body;

        console.log(place_id);
        //update place data into 'place' table where place_id = place_id
        db.query('UPDATE place SET name = ?, type = ?, address = ?, city = ?, state = ?, pincode = ?, max_guest = ?, bed_count = ?, bedroom_count = ?, bathroom_count = ?, price = ?, starting_date = ?, last_date = ?, average_star = ?, is_listed = ?, description = ?, image_count = ? WHERE place_id = ?', [name, type, address, city, state, pincode, max_guest, bed_count, bedroom_count, bathroom_count, price, starting_date, last_date, average_star, is_listed, description, image_count, place_id], (err, results) => {
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

//manage post request to update provided service data
app.post('/updateProvidedService', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get place_id from request
        const { place_id } = req.body;
        const { serviceIds, servicePrice } = req.body;
        const average_star = 0;

        //delete all services from 'provided_service' table where place_id = place_id
        db.query('DELETE FROM service_provided WHERE place_id = ?', [place_id], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            for (let i = 0; i < serviceIds.length; i++) {
                db.query('INSERT INTO service_provided (place_id, service_id, price, average_star) VALUES (?, ?, ?, ? )', [place_id, serviceIds[i], servicePrice[i], average_star], (err, results) => {
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
});

//manage get request to get booking data
app.get('/getPendingBooking', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get email from authData
        const { email } = authData;

        //find user_id from 'user' table where email = email
        db.query('SELECT user_id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                //log error and send back 500 server error
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            //return data from 'booking' table where user_id = user_id and status = 'p'
            db.query('SELECT * FROM booking WHERE traveler_id = ? AND status = ?', [results[0].user_id, 'p'], (err, results) => {
                if (err) {
                    //log error and send back 500 server error
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                }

                //send back results and 200 okay request
                res.status(200).json(results);
            });
        });
    });
});

//manage post request to update booking status
app.post('/updateBookingStatus', verifyToken, (req, res) => {
    //verify token
    jwt.verify(req.token, 'secret', (err, authData) => {
        if (err) {
            res.sendStatus(403);
        }

        //get booking_id and status from request
        const { booking_id, status } = req.body;

        //update status into 'booking' table where booking_id = booking_id
        db.query('UPDATE booking SET status = ? WHERE booking_id = ?', [status, booking_id], (err, results) => {
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

//listen at port 5000
app.listen(5000, () => console.log('Server started at port 5000'));