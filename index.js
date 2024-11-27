//sudo -u postgres psql <- Personal reference only, this gets a SQL console session

///// APP IMPORTS /////
import express from 'express';
import path from 'path';
import sql from './db.js';
//////////////////////

// Host our web app and define our APIs
const app = express();
const port = 8080;



/**
 * Checks the postgres database to ensure tables are of correct specifications.
 * If not, we can initialize or create what's missing.
 * 
 * @param forceClear bool - Whether to reset the DB
 */
async function dbCheck(forceClear = false){
    let test = {
        'Users' : `(
            UserID SERIAL NOT NULL PRIMARY KEY,
            Username    VARCHAR(100) NOT NULL,
            Email VARCHAR(320) NOT NULL,
            PhoneNumber INT,
            PasswordHash VARCHAR(128),
            PasswordSalt VARCHAR(16)
        )`,
        'UserSessionToken' : `(
            Token 
        )`
    }
}

///// WEB APIs /////
// Format: route: (req, res) => ()
let webApiListeners = {
    '/' : (req, res) => {
        res.sendFile(path.resolve('public/index.html'));
    },
    '/api/:request' : (req, res) => {
        let p = req.params;
        try {
            let request = JSON.parse(p.request);
            let endpoint = request[0];
            if (endpoint === 'login'){
                // Params
                let username = request[1];
                let password = request[2];
                // Let's try it against the known DB entries.
                
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

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});