// Declare dependencies & Variables
const express = require ('express');
const app = express();
const mysql = require ('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');

const dotenv = require ('dotenv');
const cors = require ('cors');

app.use(express.json());
app.use(cors());
dotenv.config();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

// connect to db
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

//check if db connection works
db.connect((err) => {
    //if there is error
    if(err) return console.log("Error connecting to db");
    
    //if no error
    console.log("Connection successful: ", db.threadId);

    //---------------------------------------------------------
    app.use(express.static('public'));
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');

    // Routes
    app.get('/', (req, res) => {
        res.render('index');
    });
    
    app.get('/login', (req, res) => {
        res.render('login');
    });
    
    app.get('/signup', (req, res) => {
        res.render('signup');
    });
    
    app.post('/signup', async (req, res) => {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, result) => {
            if (err) throw err;
            res.redirect('/login');
        });
    });
    
    app.post('/login', (req, res) => {
        const { username, password } = req.body;
        db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
                const comparison = await bcrypt.compare(password, results[0].password);
                if (comparison) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect('/');
                } else {
                    res.send('Incorrect Username and/or Password!');
                }
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    });
    
    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/');
    });

    // //Question 1
    // //Patients Data
    // app.get('/patients', (req, res) => {
    //     db.query('SELECT * FROM patients', (err, results) => {
    //         if(err){
    //             console.log(err);
    //             res.statusMessage(500).send('Error retriving data');
    //         } else {
    //             //send the data to browser --- patients is name of view
    //             res.render('patients', {results: results});
    //         }
    //     })
    // })

    // //Question 2
    // //Provider Data
    // app.get('/providers', (req, res) => {
    //     db.query('SELECT * FROM providers', (err, results) => {
    //         if(err){
    //             console.log(err);
    //             res.statusMessage(500).send('Error retriving data');
    //         } else {
    //             //send the data to browser --- patients is name of view
    //             res.render('providers', {results: results});
    //         }
    //     })
    // })

    // //Question 3
    // //Patients by first name
    // app.get('/patientsfilter', (req, res) => {
    //     db.query('SELECT * FROM patients WHERE first_name = "Mike"', (err, results) => {
    //         if(err){
    //             console.log(err);
    //             res.statusMessage(500).send('Error retriving data');
    //         } else {
    //             //send the data to browser --- patients is name of view
    //             res.render('patientsfilter', {results: results});
    //         }
    //     })
    // })

    // //Question 4
    // //Providers by speciality
    // app.get('/providersfilter', (req, res) => {
    //     db.query('SELECT * FROM providers WHERE provider_specialty = "Surgery"', (err, results) => {
    //         if(err){
    //             console.log(err);
    //             res.statusMessage(500).send('Error retriving data');
    //         } else {
    //             //send the data to browser --- patients is name of view
    //             res.render('providersfilter', {results: results});
    //         }
    //     })
    // })


    app.listen(process.env.PORT, () => {
        console.log(`Server listening on port ${process.env.PORT}`);

        //send message to the browser
        console.log('Sending message to browser...');
        app.get('/', (req, res) => {
            res.send('Server started successfully!')
        })
    });
});