//sudo -u postgres psql <- Personal reference only, this gets a SQL console session

///// APP IMPORTS /////
import express from 'express';
import path from 'path';
import chalk from 'chalk';
import sql from './db.js';
import crypto from 'crypto';
import util from 'util';
import {nanoid} from 'nanoid';
import fs from 'fs';
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
        const p = path.resolve('default-pfp.jpeg');
        const attachmentID = await sql`
            INSERT INTO Attachments(FileName, DateAdded, ModifiedDate, FilePath) VALUES
            (${path.basename(p)}, ${Date.now()}, ${Date.now()}, ${p}) RETURNING AttachmentID;
        `;
        if (attachmentID[0].attachmentid != 1){
            c.boldDanger(' This app requires SERIAL type to start at 1, please adjust your table settings and try again. ');
            process.exit();
        }
        c.white('* Attachments table created.');
        c.white('   * Default attachments loaded.');
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
            INSERT INTO Users(Username, Admin, PasswordHash, PasswordSalt, PfpAttachmentID)
            VALUES ('admin', TRUE, ${adminCreds.hash}, ${adminCreds.salt}, ${1});
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
            DueDate TIMESTAMP,
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
        ExpireDate <= ${Date.now()};
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
 * Get all groups that the user is in.
 * @param {int} userID 
 */
async function getAllUserGroups(userID){
    // First let's query for all the groups we are in.
    let res = await sql`SELECT * FROM UserGroups WHERE 
    UserID = ${userID}`;
    // Check if there is no groups.
    if (res.length == 0){
        // We need to create a default group, and also add to UserGroups this relation.
        const t = await sql`INSERT INTO Groups(AdminID, GroupName) 
        VALUES (${userID}, 'Personal') RETURNING GroupID;`;
        const groupID = t[0].groupid;
        await sql`INSERT INTO UserGroups(UserID, GroupID)
        VALUES (${userID}, ${groupID})`
        res = await sql`SELECT * FROM UserGroups WHERE UserID = ${userID}`;
    }
    return res;
}

/**
 * Get a group.
 * @param {int} groupID 
 */
async function getGroup(groupID){
    const res = await sql`
        SELECT * FROM Groups WHERE GroupID = ${groupID}
    `;
    if (res.length === 0){
        return -1;
    }
    return res[0];
}

async function getUserGroups(userID){
    let res = await getAllUserGroups(userID);   
    console.log(res);
    res = res.map(entry => getGroup(entry.groupid));
    res = await Promise.all(res);
    return res;
}

/**
 * Get all tasks across all groups, sorted by due date.
 * @param {*} userID 
 */
async function getAllTasks(userID){
    // First let's query for all the groups we are in.
    let res = await getAllUserGroups(userID);
    // Now let's find the tasks under every group.
    let transform = res.map(entry => entry.groupid);
    // This query does WHERE GroupID IN [ array of group ids ... ],
    // The equivalent SQL syntax may be WHERE GroupID IN ('elem1', 'elem2', etc..)
    // except that this library lets me do this dynamically
    // Otherwise, with a different SQL library we just need to append elements to
    // the query string in this format, so it's not so different anyways.
    let tasks = await sql`
        SELECT * FROM Tasks WHERE GroupID IN ${sql(transform)}
        ORDER BY DueDate ASC, Priority ASC;
    `;
    return tasks;
}

/**
 * Get attachment data from the DB
 * (including binary file data).
 * @param {*} attachmentID 
 */
async function getAttachment(attachmentID){
    const res = await sql`
        SELECT * FROM Attachments WHERE AttachmentID = ${attachmentID}
    `;
    if (res.length === 0){
        return -1;
    }
    const fpath = res[0].filepath;
    // Read file data.
    const rd = util.promisify(fs.readFile);
    try {
        const hexData = await rd(fpath, 'hex');
        // Let's return this data as a package.
        return {
            hexData: hexData,
            fileName: res[0].filename,
            lastModified: res[0].modifieddate,
            dateAdded: res[0].dateadded
        };
    }
    catch(e){
        c.error(`Error reading attachment ${fpath}`);
        c.error(e);
    }
}

/**
 * Get the details of a specific user (manually also encode the profile picture info).
 * sessionToken is needed to ensure scope privileges.
 * @param {int} userID 
 * @param {string} sessionToken
 */
async function getUser(userID, sessionToken){
    let res;
    // Are we fetching ourself? If so, we can get every column.
    if ((await verifySessionToken(sessionToken)) === userID){
        res = await sql`
            SELECT UserID, Username, Email, PhoneNumber, Admin, PfpAttachmentID
             FROM Users WHERE UserID = ${userID};
        `
    }
    else{
        // We are fetching other user, so limit the scope.
        res = await sql`
            SELECT UserID, Username, PfpAttachmentID FROM Users WHERE
            UserID = ${userID};
        `
    }
    // Now we need to resolve the pfp situation.
    const pfpData = await getAttachment(res[0].pfpattachmentid);
    let b = res[0];
    delete b.pfpattachmentid;
    b.pfp = pfpData;
    return b;
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
            const token = request[1];
            const uid = await verifySessionToken(token); // Should be the UserID from session token if valid, except for login endpoint.
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
                        const exp = Date.now() + 3.6e+6;
                        await sql`
                        INSERT INTO UserSessionToken(Token, IssuedDate, ExpireDate, UserID) VALUES
                        (${sessionToken}, ${Date.now()}, ${exp}, ${d[0].userid});
                        `;
                        //console.log(await sql`SELECT * FROM UserSessionToken;`);
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
            else if (endpoint === 'getClientPackageUpdate'){
                // Update all general information for the app client.
                // This includes tasks, groups, profile picture, attachments, etc.
                // This is a very expensive API call, but easier to implement.
                if (uid != -1){
                    const tasks = await getAllTasks(uid);
                    const selfUser = await getUser(uid, token);
                    const groups = await getUserGroups(uid);
                    res.send(str({
                        tasks: tasks,
                        groups: groups,
                        me: selfUser
                    }));
                }
                else{
                    // Invalid API session key response.
                    res.send(str({
                        status: 'INVALID'
                    }));
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
        c.success(` App listening on port ${port} `);
        c.white(`Local URL: http://localhost:${port}`);
    });
}));