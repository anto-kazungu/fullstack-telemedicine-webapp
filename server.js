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
app.use(express.urlencoded({ extended: true })); //access form data using req.body
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

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.loggedin) {
        next();  // User is authenticated, proceed to the next middleware/route
    } else {
        res.redirect('/login');  // If not authenticated, redirect to login
    }
}

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
    app.use((req, res, next) => {
        res.locals.username = req.session.username;  // Makes username available in all templates
        next();
    });

    // Routes
    //-----------------------------------------------------------
    //Authentication

    app.get('/', (req, res) => {
        res.render('index');
    });

    app.get('/main', (req, res) => {
        res.render('main');
    });

    app.get('/home', (req, res) => {
        res.render('home');
    });
    
    app.get('/login', (req, res) => {
        res.render('login');
    });
    
    app.get('/signup', (req, res) => {
        res.render('signup');
    });


    
    // Signup 
    app.post('/signup', async (req, res) => {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, result) => {
            if (err) throw err;
            res.redirect('/login');
        });
    });
    
    // Login
    app.post('/login', (req, res) => {
        const { username, password } = req.body;
        db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
                const comparison = await bcrypt.compare(password, results[0].password);
                if (comparison) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect('/home');
                } else {
                    res.send('Incorrect Username and/or Password!');
                }
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        });
    });

    //-------------------------------------------------------------------
    
    // Patients CRUD Operations

    app.get('/patients', isAuthenticated, (req, res) => {
        db.query(
            'SELECT * FROM patients', (err, results) => {
            if (err) throw err;
            res.render('patients', { results: results });
        });
    });
    
    //Patients
    app.get('/patients/add', (req, res) => {
        res.render('addPatient');
    });
    
    //Add Patient
    app.post('/patients', isAuthenticated, (req, res) => {
        const { 
            first_name, last_name, date_of_birth, gender, language } = req.body;
        db.query(
            'INSERT INTO patients (first_name, last_name, date_of_birth, gender, language) VALUES (?, ?, ?, ?, ?)', 
            [first_name, last_name, date_of_birth, gender, language], (err, result) => {
            if (err) throw err;
            res.redirect('/patients');
        });
    });
    
   // Route to display the Edit Patient form
   app.get('/patients/edit/:patient_id', (req, res) => {
    const { patient_id } = req.params;
    
    db.query(
        'SELECT * FROM patients WHERE patient_id = ?', 
        [patient_id], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            // Pass the specific patient's data to the edit form
            res.render('editPatient', { patient: results[0]});
        } else {
            // Handle case where patient isn't found
            res.status(404).send("Patient not found");
        }
    });
    });

    // Route to handle updating the patient information
    app.post('/patients/edit/:patient_id', (req, res) => {
        const { patient_id } = req.params;
        const { first_name, last_name, date_of_birth, gender, language } = req.body;

        db.query(
            'UPDATE patients SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, language = ? WHERE patient_id = ?',
            [first_name, last_name, date_of_birth, gender, language, patient_id],
            (err, result) => {
                if (err) throw err;
                
                // Redirect to the patient list page or a specific success page
                res.redirect('/patients');
        });
    });
    
    //Delete Patient
    app.post('/patients/delete/:patient_id', (req, res) => {
        const { patient_id } = req.params;
        db.query(
            'DELETE FROM patients WHERE patient_id = ?', [patient_id], (err, result) => {
            
                if (err) throw err;
            res.redirect('/patients');
        });
    });
    
    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/');
    });

    app.listen(process.env.PORT, () => {
        console.log(`Server listening on port ${process.env.PORT}`);

        //send message to the browser
        console.log('Sending message to browser...');
        app.get('/', (req, res) => {
            res.send('Server started successfully!')
        })
    });
});