//sudo -u postgres psql <- Personal reference only, this gets a SQL console session

///// APP IMPORTS /////
import express from 'express';
import path from 'path';
import sql from './db.js';
import chalk from 'chalk';
import crypto from 'crypto';
import util from 'util';
import {nanoid} from 'nanoid';
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
    },
    inverse: msg => {
        console.log(chalk.inverse(msg));
    }
};

function str(data){
    return JSON.stringify(data);
}

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
 * Resets the DB entirely. DANGEROUS!!
 */
async function reset(){
    c.boldDanger('\n Deleting and resetting DB.. ');

    
    try {
        console.log(await sql`DROP TABLE TaskMessages CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE Tags CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }
    
    try {
        console.log(await sql`DROP TABLE TaskQueries CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE UserTasks CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE UserGroups CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE UserSessionToken CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE Tasks CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE TaskViews CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE Groups CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE Users CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

    try {
        console.log(await sql`DROP TABLE Attachments CASCADE;`);
    }
    catch(e){
        c.notice(e.message);
    }

}



/**
 * Checks the postgres database to ensure tables are of correct specifications.
 * If not, we can initialize or create what's missing.
 */
async function dbCheck(){
    c.runBigProcess('\n' + ' Running DB initialization.. ');
    // Create attachments table
    try {
        await sql`CREATE TABLE Attachments(
            AttachmentID SERIAL PRIMARY KEY,
            FileName TEXT NOT NULL,
            DateAdded TIMESTAMP NOT NULL,
            ModifiedDate TIMESTAMP NOT NULL,
            FilePath TEXT NOT NULL
        );`
        c.white('* Attachments table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* Attachments table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create users table
    try {
        await sql`CREATE TABLE Users(
            UserID SERIAL NOT NULL PRIMARY KEY,
            Username VARCHAR(100) NOT NULL,
            Email VARCHAR(320),
            PhoneNumber INT,
            Admin BOOLEAN NOT NULL,
            PfpAttachmentID INT,
            PasswordHash VARCHAR(128) NOT NULL,
            PasswordSalt VARCHAR(16) NOT NULL,
            FOREIGN KEY (PfpAttachmentID) REFERENCES Attachments(AttachmentID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
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
            ExpireDate TIMESTAMP,
            UserID INT NOT NULL,
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
    // Create TaskViews (TaskQueries) table
    try {
        await sql`CREATE TABLE TaskViews(
            TaskViewID SERIAL PRIMARY KEY,
            UserID INT NOT NULL,
            TaskQuery TEXT NOT NULL,
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* TaskViews table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* TaskViews table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create Groups table
    try {
        await sql`CREATE TABLE Groups(
            GroupID SERIAL NOT NULL PRIMARY KEY,
            GroupName VARCHAR(100) NOT NULL,
            AdminID INT NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES Users(UserID)
        );`
        c.white('* Groups table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* Groups table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create Tasks table
    try {
        await sql`CREATE TABLE Tasks(
            TaskID SERIAL NOT NULL PRIMARY KEY,
            TaskStatus VARCHAR(20),
            GroupID INT,
            AttachmentID INT,
            Description TEXT,
            Priority INT,
            StartDate TIMESTAMP,
            EndDate TIMESTAMP,
            ScheduledDate TIMESTAMP,
            CreatedDate TIMESTAMP,
            CompletedDate TIMESTAMP,
            ArchivedDate TIMESTAMP,
            FOREIGN KEY (GroupID) REFERENCES Groups(GroupID)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            FOREIGN KEY (AttachmentID) REFERENCES Attachments(AttachmentID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* Tasks table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* Tasks table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create user groups table (user in group)
    try {
        await sql`CREATE TABLE UserGroups(
            UserID INT NOT NULL,
            GroupID INT NOT NULL,
            PRIMARY KEY (UserID, GroupID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            FOREIGN KEY (GroupID) REFERENCES Groups(GroupID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* UserGroups table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* UserGroups table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create user tasks table
    try {
        await sql`CREATE TABLE UserTasks(
            UserID INT NOT NULL,
            TaskID INT NOT NULL,
            PRIMARY KEY (UserID, TaskID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            FOREIGN KEY (TaskID) REFERENCES Tasks(TaskID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* UserTasks table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* UserTasks table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create task queries table    
    try {
        await sql`CREATE TABLE TaskQueries(
            TaskQueryID SERIAL PRIMARY KEY,
            UserID INT NOT NULL,
            TaskQuery TEXT NOT NULL,
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* TaskQueries table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* TaskQueries table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create Tags table
    try {
        await sql`CREATE TABLE Tags(
            TaskID INT,
            TagName TEXT NOT NULL,
            PRIMARY KEY (TaskID, TagName),
            FOREIGN KEY (TaskID) REFERENCES Tasks(TaskID)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        );`
        c.white('* Tags table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* Tags table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    // Create Task message table
    try {
        await sql`CREATE TABLE TaskMessages(
            MessageID SERIAL PRIMARY KEY,
            TaskID INT NOT NULL,
            UserID INT NOT NULL,
            Message TEXT NOT NULL,
            Tstamp TIMESTAMP NOT NULL,
            FOREIGN KEY (TaskID) REFERENCES Tasks(TaskID)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );`
        c.white('* TaskMessages table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* TaskMessages table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    c.white('\n\n');
}

/**
 * Verify that the session token is not expired, real, and 
 * return the UserID if so.
 * @param {string} sessionToken 
 * @returns {int} UserID
 */
async function verifySessionToken(sessionToken){
    // Let's clean the session token table by wiping expired ones.
    await sql`
        DELETE FROM UserSessionToken WHERE
        ExpireDate <= ${Date.now()}
    `;
    // Let's query the session token table.
    const res = await sql`
        SELECT UserID FROM UserSessionToken WHERE 
        Token = ${sessionToken} AND IssuedDate <= ${Date.now()} AND 
        ExpireDate > ${Date.now()};
    `;
    if (res.length == 0 || res.length > 1){
        return -1;
    }
    else{
        return res[0].userid;
    }
}

/**
 * Get all tasks across all groups, sorted by due date.
 * @param {*} userID 
 */
async function getAllTasks(userID){
    // First let's query for all the groups we are in.
    const res = await sql`SELECT GroupID FROM UserGroups WHERE 
    UserID = ${userID}`;
    console.log(res);
}

///// WEB APIs /////
// Format: route: (req, res) => ()
let webApiListeners = {
    '/' : (req, res) => {
        res.sendFile(path.resolve('public/index.html'));
    },
    '/api/:request' : async (req, res) => {
        const p = req.params;
        try {
            const request = JSON.parse(p.request);
            const endpoint = request[0];
            const uid = await verifySessionToken(request[1]); // Should be the UserID from session token if valid, except for login endpoint.
            if (endpoint === 'login'){
                // Params
                const username = request[1];
                const password = request[2];
                // Let's try it against the known DB entries.
                const d = await sql`SELECT PasswordHash, PasswordSalt, UserID from Users where Username = ${username}`;
                if (d.length <= 0){
                    res.send(str({
                        status: 'INVALID'
                    }));
                    return;
                }
                else{
                    const realpwd = d[0].passwordhash;
                    const realsalt = d[0].passwordsalt;
                    // Check password hash.
                    const attemptedHash = (await generatePasswordHash(password, realsalt)).hash;
                    if (attemptedHash === realpwd){
                        // Let's generate a user session token and hand it to them.
                        const sessionToken = nanoid();
                        const exp = Date.now() + 300000;
                        await sql`
                        INSERT INTO UserSessionToken(Token, IssuedDate, ExpireDate, UserID) VALUES
                        (${sessionToken}, ${Date.now()}, ${exp}, ${d[0].userid});
                        `;
                        res.send(str({
                            status: 'OK',
                            token: sessionToken,
                            expires: exp
                        }));
                    }
                    else{
                        res.send(str({
                            status: 'INVALID'
                        }));
                    }
                }
            }
            else if (endpoint === 'getAllTasks'){
                // Get all tasks across all groups,
                // sort by due date.
                console.log('UserID: ' + uid);
                console.log(await getAllTasks(uid));
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
        c.success(` App listening on port ${port} `);
        c.white(`Local URL: http://localhost:${port}`);
    });
}));