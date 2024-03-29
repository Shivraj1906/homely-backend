//import express, mysql, bcrypt, nodemailer and jsonwebtoken
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const cors = require('cors');
const path = require('path')
const nodemailer = require('nodemailer');

//create a new express app
const app = express();

app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'profile')
    },
    filename: (req, file, callback) => {
        // callback(null, file.originalname + path.extname(file.originalname));
        callback(null, file.originalname);
    }
})

const upload = multer({ storage: storage });

//create sql connection
const sql = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
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
    const { first_name, last_name, email, password, notificationToken } = req.body;

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
            sql.query('INSERT INTO users (first_name, last_name, email, password, token) VALUES (?, ?, ?, ?, ?)', [first_name, last_name, email, hash, notificationToken], (err, result) => {
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

app.post("/profileUpload", upload.single("image"), (req, res) => {
    res.send("Uploaded");
})

//manage /login post route
app.post('/login', (req, res) => {
    //get email and password from the body
    const { email, password, notificationToken } = req.body;

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

            sql.query(`UPDATE users SET token = '${notificationToken}' WHERE email = '${email}'`, (err, result) => {
                if (err) {
                    return res.status(500).send("Server error")
                }
                res.status(200).json({ token });
            })

        });
    });
});

app.post("/changePassword", verifyToken, (req, res) => {
    const { password, newPassword } = req.body;

    jwt.verify(req.token, "secret", (err, authData) => {
        if (err) {
            return res.status(500).send(err);
        }

        const { email } = authData;

        sql.query(`SELECT * FROM users WHERE email = '${email}'`, (err, result) => {
            if (err) {
                return res.status(500).send("internal server error");
            }


            bcrypt.compare(password, result[0].password, (err, isMatch) => {
                if (err) {
                    return res.status(500).send("Server error");
                }

                if (!isMatch) {

                    return res.status(400).send("Incorrect current password")
                }




                bcrypt.hash(newPassword, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).send("Server error")
                    }

                    sql.query(`UPDATE users SET password = '${hash}' WHERE email = '${email}'`, (err, result) => {
                        if (err) {
                            return res.status(500).send("Server error")
                        }

                        return res.status(200).send("Password changed successfully");
                    })
                })
            })
        })

    });
})

//manage /forgot password post route
app.post('/forgotPassword', (req, res) => {
    //get email from request body
    const { email } = req.body;

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
            console.log(email);
            return res.status(400).json({
                error: 'Email does not exist'
            });
        }

        //generate OTP
        const OTP = Math.floor(Math.random() * 10000);

        //hash OTP and store it on hasedOTP
        const hashedOTP = bcrypt.hashSync(OTP.toString(), 10);

        //delete previous OTP from database
        sql.query(`DELETE FROM user_otp WHERE email = '${email}'`, (err, result) => {
            if (err) {
                console.log(err);
                //send back bad request status
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
        });

        //insert hasedOTP and email into user_otp table with 5 minutes expiration
        sql.query(`INSERT INTO user_otp (email, otp, time) VALUES ('${email}', '${hashedOTP}', DATE_ADD(NOW(), INTERVAL 5 MINUTE))`, (err, result) => {
            if (err) {
                console.log(err);
                //send back bad request status
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
            //send OTP to email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'homley2842@gmail.com',
                    pass: 'homely@2842'
                }
            });

            const mailOptions = {
                from: 'homley2842@gmail.com',
                to: email,
                subject: 'OTP for password reset',
                text: `Your OTP is ${OTP}`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                    //send back bad request status
                    return res.status(500).json({
                        error: 'Internal server error'
                    });
                }
                //send okay status
                res.status(200).send('Okay');
            });
        });
    });
});

//manage /verify OTP post route
app.post('/verifyOTP', (req, res) => {
    //get email and OTP from request body
    const { email, OTP } = req.body;

    //match email in user_otp table with email from request body
    sql.query(`SELECT * FROM user_otp WHERE email = '${email}'`, (err, result) => {
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

        //check if the OTP is correct and if it is not expired
        bcrypt.compare(OTP, result[0].otp, (err, isMatch) => {
            if (err) {
                console.log(err);
                //send back bad request status
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
            //if the OTP is incorrect, return an error
            if (!isMatch) {
                return res.status(400).json({
                    error: 'Incorrect OTP'
                });
            }
            //check if the OTP is expired
            if (result[0].time < new Date()) {
                return res.status(400).json({
                    error: 'OTP expired'
                });
            }
            //send okay status
            res.status(200).send('Okay');
        });
    });
});

//manage /newPassword post route
app.post('/newPassword', (req, res) => {
    //get email and newPassword from request body
    const { email, newPassword } = req.body;

    //hash newPassword
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    //update password in users table
    sql.query(`UPDATE users SET password = '${hashedPassword}' WHERE email = '${email}'`, (err, result) => {
        if (err) {
            console.log(err);
            //send back bad request status
            return res.status(500).json({
                error: 'Internal server error'
            });
        }
        //send okay status
        res.status(200).send('Okay');
    });
});

//listen at port 3000
app.listen(3000, () => {
    console.log('Server started at port 3000');
});
