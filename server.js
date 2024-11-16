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
        // Query to get counts for both patients and providers
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM patients) AS totalPatients,
                (SELECT COUNT(*) FROM providers) AS totalProviders,
                (SELECT COUNT(*) FROM visits) AS totalVisits,
                (SELECT COUNT(*) FROM ed_visits) AS totalEdvisits,
                (SELECT COUNT(*) FROM discharges) AS totalDischarges;
        `;
        
        db.query(query, (err, results) => {
            if (err) throw err;
    
            const totalPatients = results[0].totalPatients;
            const totalProviders = results[0].totalProviders;
            const totalVisits = results[0].totalVisits;
            const totalEdvisits = results[0].totalEdvisits;
            const totalDischarges = results[0].totalDischarges;
    
            res.render('home', { totalPatients: totalPatients, totalProviders: totalProviders, totalVisits: totalVisits, totalEdvisits: totalEdvisits, totalDischarges: totalDischarges });
        });
    });
    
    app.get('/login', (req, res) => {
        res.render('auth/login');
    });

    app.get('/signup', (req, res) => {
        res.render('auth/signup');
    });
    
    // Signup 
    app.post('/signup', async (req, res) => {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, result) => {
            if (err) throw err;
            res.redirect('auth/login');
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
    
    //-------------------------------------------------------------------
    // Patients CRUD Operations

    app.get('/patients', isAuthenticated, (req, res) => {
        db.query(
            'SELECT * FROM patients', (err, results) => {
            if (err) throw err;
            res.render('patients/patients', { results: results });
        });
    });
    
    //Patients
    app.get('/patients/add', (req, res) => {
        res.render('patients/addPatient');
    });
    
    //Add Patient
    app.post('/patients', isAuthenticated, (req, res) => {
        const { 
            first_name, 
            last_name, 
            date_of_birth, 
            gender, 
            language 
        } = req.body;
        db.query(
            'INSERT INTO patients (first_name, last_name, date_of_birth, gender, language) VALUES (?, ?, ?, ?, ?)', 
            [
                first_name, 
                last_name, 
                date_of_birth, 
                gender, 
                language
            ], (err, result) => {
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
            res.render('patients/editPatient', { patient: results[0]});
        } else {
            // Handle case where patient isn't found
            res.status(404).send("Patient not found");
        }
    });
    });

    // Route to handle updating the patient information
    app.post('/patients/edit/:patient_id', (req, res) => {
        const { patient_id } = req.params;
        const { 
            first_name, 
            last_name, 
            date_of_birth, 
            gender, 
            language 
        } = req.body;

        db.query(
            'UPDATE patients SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, language = ? WHERE patient_id = ?',
            [
                first_name, 
                last_name, 
                date_of_birth, 
                gender, 
                language, 
                patient_id
            ],
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

    //-----------------------------------------------------------------------------
    // Providers CRUD Operations

    app.get('/providers', isAuthenticated, (req, res) => {
        db.query(
            'SELECT * FROM providers', (err, results) => {
            if (err) throw err;
            res.render('providers/providers', { results: results });
        });
    });
    
    //Providers
    app.get('/providers/add', (req, res) => {
        res.render('providers/addProvider');
    });
    
    //Add Provider
    app.post('/providers', isAuthenticated, (req, res) => {
        const { 
            first_name, 
            last_name, 
            provider_specialty, 
            email_address, 
            phone_number, 
            date_joined 
        } = req.body;
        db.query(
            'INSERT INTO prviders (first_name, last_name, provider_specialty, email_address, phone_number, date_joined) VALUES (?, ?, ?, ?, ?, ?)', 
            [
                first_name, 
                last_name, 
                provider_specialty, 
                email_address, 
                phone_number, 
                date_joined
            ], (err, result) => {
            if (err) throw err;
            res.redirect('/providers');
        });
    });
    
   // Route to display the Edit Provider form
   app.get('/providers/edit/:provider_id', (req, res) => {
    const { provider_id } = req.params;
    
    db.query(
        'SELECT * FROM providers WHERE patient_id = ?', 
        [provider_id], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            // Pass the specific provider's data to the edit form
            res.render('/editProvider', { provider: results[0]});
        } else {
            // Handle case where pprovider isn't found
            res.status(404).send("Provider not found");
        }
    });
    });

    // Route to handle updating the proovider information
    app.post('/provider/edit/:provider_id', (req, res) => {
        const { provider_id } = req.params;
        const { 
            first_name, 
            last_name, 
            provider_specialty, 
            email_address, 
            phone_number, 
            date_joined 
        } = req.body;

        db.query(
            'UPDATE patients SET first_name = ?, last_name = ?, provider_specialty = ?, email_address = ?, phone_number = ?, date_joined = ? WHERE patient_id = ?',
            [
                first_name, 
                last_name, 
                provider_specialty, 
                email_address, 
                phone_number, 
                date_joined, 
                provider_id
            ],
            (err, result) => {
                if (err) throw err;
                
                // Redirect to the providers list page or a specific success page
                res.redirect('/providers');
        });
    });
    
    //Delete Provider
    app.post('/providers/delete/:provider_id', (req, res) => {
        const { provider_id } = req.params;
        db.query(
            'DELETE FROM providers WHERE provider_id = ?', [provider_id], (err, result) => {
            
                if (err) throw err;
            res.redirect('/providers');
        });
    });

    //-----------------------------------------------------------------------------
    // Visits CRUD Operations
    app.get('/visits', isAuthenticated, (req, res) => {
        db.query('SELECT * FROM visits', (err, results) => {
            if (err) throw err;
            res.render('visits/visits', { results: results });
        });
    });
    
    // Route: Display the Add Visit form
    app.get('/visits/add', isAuthenticated, (req, res) => {
        res.render('visits/addVisit');
    });
    
    // Route: Add a new visit
    app.post('/visits', isAuthenticated, (req, res) => {
        const {
            patient_id,
            provider_id,
            date_of_visit,
            date_scheduled,
            visit_department_id,
            visit_type,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            pulse,
            visit_status
        } = req.body;
    
        db.query(
            'INSERT INTO visits (patient_id, provider_id, date_of_visit, date_scheduled, visit_department_id, visit_type, blood_pressure_systolic, blood_pressure_diastolic, pulse, visit_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                patient_id,
                provider_id,
                date_of_visit,
                date_scheduled,
                visit_department_id,
                visit_type,
                blood_pressure_systolic,
                blood_pressure_diastolic,
                pulse,
                visit_status
            ],
            (err, result) => {
                if (err) throw err;
                res.redirect('/visits');
            }
        );
    });
    
    // Route: Display the Edit Visit form
    app.get('/visits/edit/:visit_id', isAuthenticated, (req, res) => {
        const { visit_id } = req.params;
    
        db.query('SELECT * FROM visits WHERE visit_id = ?', [visit_id], (err, results) => {
            if (err) throw err;
    
            if (results.length > 0) {
                res.render('visits/editVisit', { visit: results[0] });
            } else {
                res.status(404).send('Visit not found');
            }
        });
    });
    
    // Route: Update a visit
    app.post('/visits/edit/:visit_id', isAuthenticated, (req, res) => {
        const { visit_id } = req.params;
        const {
            patient_id,
            provider_id,
            date_of_visit,
            date_scheduled,
            visit_department_id,
            visit_type,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            pulse,
            visit_status
        } = req.body;
    
        db.query(
            'UPDATE visits SET patient_id = ?, provider_id = ?, date_of_visit = ?, date_scheduled = ?, visit_department_id = ?, visit_type = ?, blood_pressure_systolic = ?, blood_pressure_diastolic = ?, pulse = ?, visit_status = ? WHERE visit_id = ?',
            [
                patient_id,
                provider_id,
                date_of_visit,
                date_scheduled,
                visit_department_id,
                visit_type,
                blood_pressure_systolic,
                blood_pressure_diastolic,
                pulse,
                visit_status,
                visit_id
            ],
            (err, result) => {
                if (err) throw err;
                res.redirect('/visits');
            }
        );
    });
    
    // Route: Delete a visit
    app.post('/visits/delete/:visit_id', isAuthenticated, (req, res) => {
        const { visit_id } = req.params;
    
        db.query('DELETE FROM visits WHERE visit_id = ?', [visit_id], (err, result) => {
            if (err) throw err;
            res.redirect('/visits');
        });
    });
    //-----------------------------------------------------------------------------
    //Edvisits  CRUD Operations
    // Get all ED visits

    app.get('/edvisits', isAuthenticated, (req, res) => {
        db.query(
            'SELECT * FROM ed_visits', 
            (err, results) => {
                if (err) throw err;
                res.render('edvisits/edvisits', { results: results });
            });
    });

    // Add ED Visit Form
    app.get('/edvisits/add', (req, res) => {
        res.render('edvisits/addVisit');
    });

    // Add ED Visit
    app.post('/edvisits', isAuthenticated, (req, res) => {
        const { 
            visit_id, 
            patient_id, 
            acuity, 
            reason_for_visit, 
            ed_disposition 
        } = req.body;

        db.query(
            'INSERT INTO ed_visits (visit_id, patient_id, acuity, reason_for_visit, ed_disposition) VALUES (?, ?, ?, ?, ?)', 
            [
                visit_id, 
                patient_id, 
                acuity, 
                reason_for_visit, 
                ed_disposition
            ], 
            (err, result) => {
                if (err) throw err;
                res.redirect('/edvisits');
            });
    });

    // Edit ED Visit Form
    app.get('/edvisits/edit/:ed_visit_id', (req, res) => {
        const { ed_visit_id } = req.params;

        db.query(
            'SELECT * FROM ed_visits WHERE ed_visit_id = ?', 
            [ed_visit_id], 
            (err, results) => {
                if (err) throw err;

                if (results.length > 0) {
                    res.render('edvisits/editVisit', { edvisit: results[0] });
                } else {
                    res.status(404).send("ED Visit not found");
                }
            });
    });

    // Update ED Visit Information
    app.post('/edvisits/edit/:ed_visit_id', (req, res) => {
        const { ed_visit_id } = req.params;
        const { 
            visit_id, 
            patient_id, 
            acuity, 
            reason_for_visit, 
            ed_disposition 
        } = req.body;

        db.query(
            'UPDATE ed_visits SET visit_id = ?, patient_id = ?, acuity = ?, reason_for_visit = ?, ed_disposition = ? WHERE ed_visit_id = ?',
            [
                visit_id, 
                patient_id, 
                acuity, 
                reason_for_visit, 
                ed_disposition, 
                ed_visit_id
            ],

            (err, result) => {
                if (err) throw err;
                res.redirect('/edvisits');
            });
    });

    // Delete ED Visit
    app.post('/edvisits/delete/:ed_visit_id', (req, res) => {
        const { ed_visit_id } = req.params;

        db.query(
            'DELETE FROM ed_visits WHERE ed_visit_id = ?', 
            [ed_visit_id], 
            (err, result) => {
                if (err) throw err;
                res.redirect('/edvisits');
            });
    });


    //-----------------------------------------------------------------------------
    // Discharges CRUD Operations
    // Get all Discharges

    app.get('/discharges', isAuthenticated, (req, res) => {
        db.query(
            'SELECT * FROM discharges', 
            (err, results) => {
                if (err) throw err;
                res.render('discharges/discharges', { results: results });
            });
    });

    // Add Discharge Form
    app.get('/discharges/add', (req, res) => {
        res.render('discharges/addDischarge');
    });

    // Add Discharge
    app.post('/discharges', isAuthenticated, (req, res) => {
        const { 
            admission_id, 
            patient_id, 
            discharge_date, 
            discharge_disposition 
        } = req.body;

        db.query(
            'INSERT INTO discharges (admission_id, patient_id, discharge_date, discharge_disposition) VALUES (?, ?, ?, ?)', 
            [
                admission_id, 
                patient_id, 
                discharge_date, 
                discharge_disposition
            ], 
            (err, result) => {
                if (err) throw err;
                res.redirect('/discharges');
            });
    });

    // Edit Discharge Form
    app.get('/discharges/edit/:discharges_id', (req, res) => {
        const { discharges_id } = req.params;

        db.query(
            'SELECT * FROM discharges WHERE discharges_id = ?', 
            [discharges_id], 
            (err, results) => {
                if (err) throw err;

                if (results.length > 0) {
                    res.render('discharges/editDischarge', { discharge: results[0] });
                } else {
                    res.status(404).send("Discharge record not found");
                }
            });
    });

    // Update Discharge Information
    app.post('/discharges/edit/:discharges_id', (req, res) => {
        const { discharges_id } = req.params;
        const { 
            admission_id, 
            patient_id, 
            discharge_date, 
            discharge_disposition 
        } = req.body;

        db.query(
            'UPDATE discharges SET admission_id = ?, patient_id = ?, discharge_date = ?, discharge_disposition = ? WHERE discharges_id = ?',
            [
                admission_id, 
                patient_id, 
                discharge_date, 
                discharge_disposition, 
                discharges_id
            ],
            (err, result) => {
                if (err) throw err;
                res.redirect('/discharges');
            });
    });

    // Delete Discharge
    app.post('/discharges/delete/:discharges_id', (req, res) => {
        const { discharges_id } = req.params;

        db.query(
            'DELETE FROM discharges WHERE discharges_id = ?', 
            [discharges_id], 
            (err, result) => {
                if (err) throw err;
                res.redirect('/discharges');
            });
    });


    // Loging out logic
    
    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/');
    });

    //Server logic

    app.listen(process.env.PORT, () => {
        console.log(`Server listening on port ${process.env.PORT}`);

        //send message to the browser
        console.log('Sending message to browser...');
        app.get('/', (req, res) => {
            res.send('Server started successfully!')
        })
    });
});