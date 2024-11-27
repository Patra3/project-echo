//sudo -u postgres psql <- Personal reference only, this gets a SQL console session

///// APP IMPORTS /////
import express from 'express';
import path from 'path';
import sql from './db.js';
import chalk from 'chalk';
import crypto from 'crypto';
import util from 'util';
//////////////////////

// Host our web app and define our APIs
const app = express();
const port = 8080;

console.clear();

const c = {
    white: msg => {
        console.log(msg);
    },
    notice: msg => {
        console.log(chalk.yellow(msg));
    },
    boldDanger: msg => {
        console.log(chalk.bgRed(msg));
    },
    error: msg => {
        console.log(chalk.red(msg))
    },
    runBigProcess: msg => {
        console.log(chalk.bgMagenta(msg))
    },
    success: msg => {
        console.log(chalk.bgGreen(msg));
    }
};

/**
 * Generates a password hash and salt for storing in the DB.
 * @param {string} password User inputted password
 * @param {string} salt Salt, generates a random salt if length < 16, default = random
 * @return Object
 */
async function generatePasswordHash(password, salt = ''){
    try{
        const randomBytes = util.promisify(crypto.randomBytes);
        if (salt.length < 16){
            salt = (await randomBytes(8)).toString('hex');
        }
        const pbkdf2 = util.promisify(crypto.pbkdf2);
        const hash = (await pbkdf2(password, salt, 100000, 64, 'sha512')).toString('hex');
        return {hash: hash, salt: salt};
    }
    catch(e){
        console.error(e);
    }
}

/**
 * Resets the DB entirely. DANGEROUS.
 */
async function reset(){
    c.boldDanger('\n Deleting and resetting DB.. ');
    try {
        console.log(await sql`DROP TABLE UserSessionToken`);
        console.log(await sql`DROP TABLE Users`);
    }
    catch(e){
        console.log(e);
    }
}



/**
 * Checks the postgres database to ensure tables are of correct specifications.
 * If not, we can initialize or create what's missing.
 */
async function dbCheck(){
    c.runBigProcess('\n' + ' Running DB initialization.. ');
    // Create users table
    try {
        await sql`CREATE TABLE Users(
            UserID SERIAL NOT NULL PRIMARY KEY,
            Username VARCHAR(100) NOT NULL,
            Email VARCHAR(320),
            PhoneNumber INT,
            Admin BOOLEAN NOT NULL,
            PasswordHash VARCHAR(128) NOT NULL,
            PasswordSalt VARCHAR(16) NOT NULL
        );`
        // Add the default admin user
        const adminCreds = await generatePasswordHash('admin');
        await sql`
            INSERT INTO Users(Username, Admin, PasswordHash, PasswordSalt)
            VALUES ('admin', TRUE, ${adminCreds.hash}, ${adminCreds.salt});
        `;
        c.white('* Users table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* Users table already exists, skipping...`);
        }
        else{
            c.error('* PostgreSQL Error:' + e.messasge);
        }
    }
    // Create UserSessionToken table
    try {
        await sql`CREATE TABLE UserSessionToken(
            Token VARCHAR(21) NOT NULL PRIMARY KEY,
            IssuedDate TIMESTAMP NOT NULL,
            ExpireDate TIMESTAMP NOT NULL,
            UserID SERIAL NOT NULL,
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* UserSessionToken table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* UserSessionToken table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    c.white('\n\n');
}

///// WEB APIs /////
// Format: route: (req, res) => ()
let webApiListeners = {
    '/' : (req, res) => {
        res.sendFile(path.resolve('public/index.html'));
    },
    '/api/:request' : async (req, res) => {
        let p = req.params;
        try {
            let request = JSON.parse(p.request);
            let endpoint = request[0];
            if (endpoint === 'login'){
                // Params
                let username = request[1];
                let password = request[2];
                // Let's try it against the known DB entries.
                const d = await sql`SELECT PasswordHash, PasswordSalt from Users where Username = ${username}`;
                const realpwd = d[0].passwordhash;
                const realsalt = d[0].passwordsalt;
                if (d.length == 0){
                    // No user exists in the DB.
                    res.send(JSON.stringify({
                        status: 'NOUSEREXISTS'
                    }));
                }
                else{
                    // Check password hash.
                    const attemptedHash = (await generatePasswordHash(password, realsalt)).hash;
                    if (attemptedHash === realpwd){
                        // Let's generate a user session token and hand it to them.
                    }
                    else{
                        res.send(JSON.stringify({
                            status: 'PSWDINCORRECT'
                        }));
                    }
                }
            }
            else{
                res.send('Invalid API request format.');
            }
        }
        catch (e){
            console.error(e);
            res.send('Invalid API request format.');
        }
    }
};
// Register each route => callback to Express
for (let key in webApiListeners){
    app.get(key, webApiListeners[key]);
}

process.on('SIGINT', () => {
    c.boldDanger('\n\nExiting..');
    process.exit();
});

reset().then(() => dbCheck().then(() => {
    app.listen(port, () => {
        c.success(' App listening on port ' + port + ' ');
        c.white('Local URL: http://localhost:' + port);
    });
}));