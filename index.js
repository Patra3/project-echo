//sudo -u postgres psql <- Personal reference only, this gets a SQL console session

///// APP IMPORTS /////
import express from 'express';
import path from 'path';
import chalk from 'chalk';
import sql from './db.js';
import crypto, { createCipheriv } from 'crypto';
import util from 'util';
import {nanoid} from 'nanoid';
import fs from 'fs';
import * as archiver from 'archiver';
import { get } from 'http';
//////////////////////

// Host our web app and define our APIs
const app = express();
app.use(express.json({limit: '1gb'})); // Set max attachment file size here.
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

let serve = {};

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
        console.log(await sql`DROP TABLE TagsTables CASCADE;`);
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
        fs.rmSync(path.resolve('attachments'), {recursive: true, force: true});
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
        fs.mkdirSync(path.resolve('attachments'));
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
                ON DELETE SET NULL
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
    // Create Groups table
    try {
        await sql`CREATE TABLE Groups(
            GroupID SERIAL NOT NULL PRIMARY KEY,
            GroupName VARCHAR(100) NOT NULL,
            AdminID INT NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES Users(UserID)
                ON DELETE CASCADE
                ON UPDATE CASCADE
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
    // Create TaskViews (TaskQueries) table
    try {
        await sql`CREATE TABLE TaskViews(
            TaskViewID SERIAL PRIMARY KEY,
            FilterName TEXT,
            TagQuery TEXT,
            VaultID INT NOT NULL,
            SortBy TEXT,
            GroupBy TEXT,
            DescIncludes TEXT,
            TitleIncludes TEXT,
            TagIncludes TEXT,
            IsDone BOOLEAN,
            IsNotDone BOOLEAN,
            StartDate TIMESTAMP,
            EndDate TIMESTAMP,
            FOREIGN KEY (VaultID) REFERENCES Groups(GroupID)
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
    // Create Tasks table
    try {
        await sql`CREATE TABLE Tasks(
            TaskID SERIAL NOT NULL PRIMARY KEY,
            TaskName TEXT,
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
                ON DELETE SET NULL
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
    // Create Tags table
    try {
        await sql`CREATE TABLE Tags(
            TagID SERIAL NOT NULL PRIMARY KEY,
            TagName TEXT NOT NULL,
            TagColor VARCHAR(7) NOT NULL,
            GroupID INT NOT NULL,
            FOREIGN KEY (GroupID) REFERENCES Groups(GroupID)
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
    
    // Create TagsTables table
    try {
        await sql`CREATE TABLE TagsTables(
            TagID INT NOT NULL,
            TaskID INT NOT NULL,
            PRIMARY KEY (TagID, TaskID),
            FOREIGN KEY (TagID) REFERENCES Tags(TagID)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
            FOREIGN KEY (TaskID) REFERENCES Tasks(TaskID)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        );`
        c.white('* TagsTable table created.');
    }
    catch(e){
        if (e.message.includes('already exists')){
            c.notice(`* Tags table already exists, skipping...`);
        }
        else{
            c.error('* ' + e);
        }
    }
    /*
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
    }*/

        /*
    c.runBigProcess('\n' + ' Running Task attachment integrity checks...');
    // Check for task-attachment integrity.
    const test1 = await sql`
        SELECT AttachmentID, TaskID, TaskName FROM Tasks;
    `;
    let caught = 0;
    for (let i = 0; i < test1.length; i++){
        let id = test1[i].attachmentid;
        if (id != null){
            let getTest = await getAttachment(id, true);
            if (getTest == -1){
                await sql`
                    UPDATE Tasks
                    SET AttachmentID = NULL
                    WHERE TaskID = ${test1[i].taskid};
                `;
                caught++;
            }
            else{
                // TO-DO: Check every array pair in txt file if it is 
                /*
                getTest maybe is = 
                {
                hexData: '5b32322c32332c32342c32355d',
                fileName: 'attachments.txt',
                lastModified: 2024-12-06T17:41:23.074Z,
                dateAdded: 2024-12-06T17:41:23.074Z
                }
                *//*
               if (getTest.fileName.split('.')[1] == 'txt'){
                    try {
                        let t = JSON.parse(Buffer.from(getTest.hexData, 'hex').toString('utf-8'));
                        for (let j = 0; j < t.length; j++){
                            let getTest2 = await getAttachment(t[j], true);
                            if (getTest2 == -1){
                                await sql`
                                    DELETE FROM Attachments WHERE AttachmentID = ${t.splice(j, 1)[0]};
                                `;
                                caught++;
                            }
                        }
                        // Rewrite back to the file.
                        deleteAttachment(id);
                        let dx = writeAttachment('txt', JSON.stringify(t));
                        const nid = (await sql`
                            INSERT INTO Attachments(FileName, DateAdded, DateModified, FilePath)
                            VALUES (${nanoid()}, ${Date.now()}, ${Date.now()}, ${dx}) RETURNING AttachmentID;
                        `)[0].attachmentid;
                        await sql`
                            UPDATE Tasks
                            SET AttachmentID = ${nid}
                            WHERE TaskID = ${test1[i].taskid};
                        `;
                    }
                    catch(e){
                        // Corrupt file, remove it.
                        await sql`
                            UPDATE Tasks
                            SET AttachmentID = NULL
                            WHERE TaskID = ${test1[i].taskid};
                        `;
                        caught++;
                    }
               }
            }
        }
    }
    c.notice(`# files caught: ${caught}`);*/
    // Test for junk attachments (TO-DO);
    
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
        VALUES (${userID}, 'Personal Vault') RETURNING GroupID;`;
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
    //console.log(res);
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
async function getAttachment(attachmentID, special = false){
    const res = await sql`
        SELECT * FROM Attachments WHERE AttachmentID = ${attachmentID}
    `;
    if (res.length === 0){
        return -1;
    }
    const fpath = res[0].filepath;
    // Read file data.
    if ((!fs.existsSync(fpath)) && special){
        return -1;
    }
    if ((!fs.existsSync(fpath))){
        // No file exist but entry is in table...
        await sql`
            DELETE FROM Attachments WHERE AttachmentID = ${attachmentID};
        `;
        return -1;
    }
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
        return -1;
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

async function getFilters(groupID){
    const filters = await sql`
        SELECT * FROM TaskViews WHERE VaultID = ${groupID} ORDER BY FilterName;
    `;
    return filters;
}

/**
 * Basicaly fs.writeFileSync wrapper.
 * @param {string} file extension 
 * @param {*} data binary data or string
 * @returns {string} random file name as needed.
 */
function writeAttachment(ext, data){
    let rndFilename = nanoid() + `.${ext}`;
    let fullPath = path.resolve(`attachments/${rndFilename}`);
    fs.writeFileSync(fullPath, data);
    return fullPath;
}

/**
 * Deletes an attachment from Attachments table.
 * @param {int} attachmentid 
 * @returns 
 */
async function deleteAttachment(attachmentid){
    try {
        await sql`
            DELETE From Attachments WHERE 
            AttachmentID = ${attachmentid};
        `;
        return true;
    }
    catch(e){
        c.error(e);
        return false;
    }
}

///// WEB APIs /////
// Format: route: (req, res) => ()
let webApiListeners = {
    '/' : (req, res) => {
        res.sendFile(path.resolve('public/index.html'));
    },
    '/bundle.js' : (req, res) => {
        res.sendFile(path.resolve('public/bundle.js'));
    },
    '/favicon.ico' : (req, res) => {
        res.sendFile(path.resolve('favicon.ico'));
    },
    '/api/:request' : async (req, res) => {
        const p = req.params;
        try {
            res.sendError = () => {
                res.send(str({
                    status: 'ERROR'
                }));
            }
            res.sendOK = () => {
                res.send(str({
                    status: 'OK'
                }));
            }
            res.sendInvalid = () => {
                res.send(str({
                    status: 'INVALID'
                }));
            }
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
                    res.sendInvalid();
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
                        res.sendInvalid();
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
                    let bigGroups = await sql`
                        SELECT * FROM UserGroups INNER JOIN Groups ON 
                        Groups.GroupID = UserGroups.GroupID
                         WHERE UserGroups.UserID = ${uid};
                    `;
                    for (let i = 0; i < bigGroups.length; i++){
                        bigGroups[i].tags = await sql`
                            SELECT * FROM Tags WHERE GroupID = ${bigGroups[i].groupid} ORDER BY TagName;
                        `;
                    }
                    for (let i = 0; i < bigGroups.length; i++){
                        bigGroups[i].filters = await getFilters(bigGroups[i].groupid);
                    }
                    res.send(str({
                        status: 'OK',
                        me: selfUser,
                        tasks: tasks,
                        groups: bigGroups
                    }));
                }
                else{
                    // Invalid API session key response.
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'createNewTag'){
                if (uid != -1){
                    let groupId = request[2], tagName = request[3], tagColor = request[4];
                    try {
                        await sql`
                            INSERT INTO Tags (TagName, TagColor, GroupID) VALUES
                            (${tagName}, ${tagColor}, ${groupId});
                        `;
                        res.sendOK();
                    }
                    catch(e){
                        c.error(e);
                        res.sendError();
                    }
                }
                else{
                    // Invalid API session key response.
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'updateTag'){
                if (uid != -1){
                    let tagId = request[2], tagName = request[3], tagColor = request[4];
                    try {
                        await sql`
                            UPDATE Tags
                            SET TagName = ${tagName}, TagColor = ${tagColor}
                            WHERE TagID = ${tagId};
                        `;
                        res.sendOK();
                    }
                    catch(e) {
                        c.error(e);
                        res.sendError();
                    }
                }
                else{
                    // Invalid API session key response.
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'deleteTag'){
                if (uid != -1){
                    let tagId = request[2], deleteAll = request[3];
                    if (deleteAll === true){
                        try {
                            await sql`
                                DELETE FROM Tags;
                            `;
                            res.sendOK();
                        }
                        catch(e){
                            c.error(e);
                            res.sendError();
                        }
                    }
                    else{
                        try {
                            await sql`
                                DELETE FROM Tags WHERE TagID = ${tagId}
                            `;
                            res.sendOK();
                        }
                        catch(e){
                            c.error(e);
                            res.sendError();
                        }
                    }
                }
                else{
                    // Invalid API session key response.
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'fetchTasksWithView'){
                if (uid != -1){
                    try {
                        let groupid = request[2], filterid = request[3];
                        // First we fetch from the TaskView table the entry we want.
                        const res1 = (await sql`
                            SELECT * FROM TaskViews WHERE TaskViewID = ${filterid}
                        `)[0];
                        // Create SQL syntax maps which we will interpolate with the query later.
                        let sortByMap = {
                            'duedate': 'Tasks.DueDate ASC',
                            'priority': 'Tasks.Priority ASC',
                            'title': 'Tasks.TaskName'
                        };
                        let groupByMap = {
                            'day' : 'DATEPART(day, DueDate), DATEPART(day, CreatedDate)',
                            'month': 'DATEPART(month, DueDate), DATEPART(day, CreatedDate)',
                            'week': 'DATEPART(week, DueDate), DATEPART(week, CreatedDate)',
                            'year': 'DATEPART(year, DueDate), DATEPART(year, CreatedDate)'
                        };
                        //console.log(res1);
                        let sortBy = sortByMap[res1.sortby], groupBy = groupByMap[res1.groupby];
                        
                        const res2 = await sql`
                            SELECT * FROM Tasks INNER JOIN TagsTables ON TagsTables.TaskID = Tasks.TaskID
                            WHERE Tasks.GroupID = ${groupid}
                            GROUP BY TagsTables.TagID, TagsTables.TaskID, Tasks.TaskID, ${groupBy}
                            ORDER BY ${sortBy};
                        `;
                        res.send(str({
                            status: 'OK',
                            data: res2
                        }));
                    }
                    catch(e){
                        c.error(e);
                        res.sendError();
                    }
                    /*
                    await sql`CREATE TABLE TaskViews(
                        TaskViewID SERIAL PRIMARY KEY,
                        FilterName TEXT,
                        TagQuery TEXT,
                        VaultID INT NOT NULL,
                        SortBy TEXT,
                        GroupBy TEXT,
                        DescIncludes TEXT,
                        TitleIncludes TEXT,
                        TagIncludes TEXT,
                        IsDone BOOLEAN,
                        IsNotDone BOOLEAN,
                        StartDate TIMESTAMP,
                        EndDate TIMESTAMP,
                        FOREIGN KEY (VaultID) REFERENCES Groups(GroupID)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE
                    );`
                    */
                   /*
                    await sql`CREATE TABLE Tasks(
                        TaskID SERIAL NOT NULL PRIMARY KEY,
                        TaskName TEXT,
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
                   */
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'createNewTask'){
                if (uid != -1){
                    let taskName = request[2], dueDate = request[3], taskPrio = request[4];
                    // Here we put the attachment and tags data in the request body.
                    let tags = req.body.tags, attachments = req.body.attachments, desc = req.body.desc;
                    if (!desc){
                        desc = '';
                    }
                    //console.log(desc);
                    try {
                        // Try to insert into the Tasks table.
                        /**
                         * 
                                CREATE TABLE Attachments(
                                    AttachmentID SERIAL PRIMARY KEY,
                                    FileName TEXT NOT NULL,
                                    DateAdded TIMESTAMP NOT NULL,
                                    ModifiedDate TIMESTAMP NOT NULL,
                                    FilePath TEXT NOT NULL
                                );
                         */
                        let ultimateFileId = null;
                        let attachmentIdArray = [];
                        for (let fileName in attachments){
                            // Write file to attachments folder under a random name.
                            let fpath = writeAttachment(fileName.split('.')[1], Buffer.from(attachments[fileName].hexData, 'hex'));
                            // Let's enter it into the attachments table.
                            const fid = (await sql`
                                INSERT INTO Attachments(FileName, DateAdded, ModifiedDate, FilePath) 
                                VALUES (${fileName}, ${Date.now()}, ${new Date(attachments[fileName].lastModified)}, ${fpath})
                                RETURNING AttachmentID;
                            `)[0].attachmentid;
                            // Get the attachmentid serial
                            attachmentIdArray.push(fid);
                        }
                        if (attachmentIdArray.length > 1){
                            // More than 1 file was inserted, we need to make another file with the ids.
                            let fpath = writeAttachment('txt', str(attachmentIdArray));
                            const fid = (await sql`
                                INSERT INTO Attachments(FileName, DateAdded, ModifiedDate, FilePath) 
                                VALUES (${'attachments.txt'}, ${Date.now()}, ${Date.now()}, ${fpath})
                                RETURNING AttachmentID;
                                `)[0].attachmentid;
                            ultimateFileId = fid;
                        }
                        else if (attachmentIdArray.length == 1){
                            // Only 1 file was uploaded, we can proceed with task.
                            ultimateFileId = attachmentIdArray[0];
                        }
                        /**
                         * Tasks(
                            TaskID SERIAL NOT NULL PRIMARY KEY,
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
                            )
                         */
                        // We can make the Task entry now.
                        const taskid = (await sql`
                            INSERT INTO Tasks(GroupID, TaskName, AttachmentID, Description, Priority, DueDate, CreatedDate)
                            VALUES (${req.body.groupid}, ${taskName}, ${ultimateFileId}, ${desc}, ${taskPrio}, ${dueDate}, ${Date.now()})
                            RETURNING TaskID;
                        `)[0].taskid;
                        // Let's add to the TaskTags table.
                        for (let i = 0; i < tags.length; i++){
                            await sql`
                                INSERT INTO TagsTables(TaskID, TagID) VALUES (${taskid}, ${tags[i]});
                            `;
                        }
                        res.sendOK();
                    }
                    catch(e) {
                        c.error(e);
                        res.sendError();
                    }
                }
                else{
                    // Invalid API session key response.
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'updateFilter'){
                if (uid != -1){
                   let data = req.body;
                   try {
                       if (data.filterId === -1){
                        // INSERT
                        await sql`
                            INSERT INTO TaskViews
                            (FilterName, VaultID, SortBy, GroupBy, DescIncludes, TitleIncludes, TagIncludes, IsDone, IsNotDone, StartDate, EndDate)
                            VALUES
                            (${data.filterName}, ${data.vaultid}, ${data.sortBy}, ${data.groupBy}, ${data.descincludes}, ${data.titleincludes}, ${data.tagincludes}, ${data.isdone}, ${data.isnotdone}, ${data.startdate}, ${data.enddate});
                        `;
                        res.sendOK();
                       }
                       else{
                        // UPDATE
                        await sql`
                            UPDATE TaskViews
                            SET FilterName = ${data.filterName}, SortBy = ${data.sortBy}, GroupBy = ${data.groupBy}, 
                            DescIncludes = ${data.descincludes}, TitleIncludes = ${data.titleincludes}, TagIncludes = ${data.tagincludes},
                            IsDone = ${data.isdone}, IsNotDone = ${data.isnotdone}, StartDate = ${data.startdate}, EndDate = ${data.enddate}
                            WHERE VaultID = ${data.vaultid} AND TaskViewID = ${data.filterId};
                        `;
                        res.sendOK();
                       }
                   }
                   catch (e){
                    c.error(e);
                    res.sendError();
                   }
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'deleteFilter'){
                if (uid != -1){
                    let deleteId = request[2];
                    try {
                        await sql`
                            DELETE FROM TaskViews WHERE TaskViewID = ${deleteId};
                        `;
                        res.sendOK();
                    }
                    catch(e){
                        c.error(e);
                        res.sendError();
                    }
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'mark'){
                if (uid != -1){
                    let isCompleted = Boolean(request[2]), taskId = request[3];
                    try {
                        if (isCompleted){
                            await sql`
                                UPDATE Tasks
                                SET CompletedDate = ${Date.now()}
                                WHERE TaskID = ${taskId};
                            `;
                        }
                        else{
                            // remove completeness status
                            await sql`
                                UPDATE Tasks
                                SET CompletedDate = NULL
                                WHERE TaskID = ${taskId};
                            `;
                        }
                        res.sendOK();
                    }
                    catch (e){
                        c.error(e);
                        res.sendError();
                    }
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'updateTask'){
                if (uid != -1){
                    let taskName = request[2], dueDate = request[3], taskPrio = request[4], taskid = request[5];
                    // Here we put the attachment and tags data in the request body.
                    let tags = req.body.tags, attachments = req.body.attachments, desc = req.body.desc;
                    
                    //console.log(taskid);
                    try {
                        let newAttachmentId = -1;
                        if (Object.keys(attachments).length > 0){
                            // Get attachment id
                            const attachmentId = (await sql`
                                    SELECT AttachmentID FROM Tasks WHERE TaskID = ${taskid};
                                `)[0].attachmentid;
                            deleteAttachment(attachmentId);
                            let fdata;
                            fdata = [];
                            for (let fname in attachments){
                                let path = writeAttachment(fname.split('.')[1], Buffer.from(attachments[fname].hexData, 'hex'));
                                // Put this in the attachments table.
                                const insertion = (await sql`
                                    INSERT INTO Attachments(FileName, DateAdded, ModifiedDate, FilePath) VALUES
                                    (${fname}, ${Date.now()}, ${attachments[fname].lastModified}, ${path})
                                    RETURNING AttachmentID;
                                `)[0].attachmentid;
                                fdata.push(insertion); //insert our new id into the array.
                            }
                            let n1 = writeAttachment(nanoid() + '.txt', JSON.stringify(fdata));
                            newAttachmentId = (await sql`
                                INSERT INTO Attachments(FileName, DateAdded, ModifiedDate, FilePath) VALUES
                                (${nanoid() + '.txt'}, ${Date.now()}, ${Date.now()}, ${n1}) RETURNING AttachmentID;
                                `)[0].attachmentid;
                        }
                        if (newAttachmentId != -1){
                            await sql`
                                UPDATE Tasks
                                SET TaskName = ${taskName}, DueDate = ${dueDate}, Priority = ${taskPrio}, 
                                Description = ${desc}, AttachmentID = ${newAttachmentId}, TaskID = ${taskid}
                                WHERE TaskID = ${taskid};
                            `
                        }
                        else{
                            await sql`
                                UPDATE Tasks
                                SET TaskName = ${taskName}, DueDate = ${dueDate}, Priority = ${taskPrio}, 
                                Description = ${desc}, TaskID = ${taskid}
                                WHERE TaskID = ${taskid};
                            `
                        }
                        // Check for any new tags as well.
                        for (let zz = 0; zz < tags.length; zz++){
                            let tagid = tags[zz];
                            const test = await sql`
                                SELECT TagID, TaskID FROM TagsTables
                                WHERE TagID = ${tagid} AND TaskID = ${taskid};
                            `;
                            if (test.length === 0){
                                await sql`
                                    INSERT INTO TagsTables (TagID, TaskID)
                                    VALUES (${tagid}, ${taskid});
                                `
                            }
                        }
                        res.send(str({
                            status: 'OK'
                        }));
                    }
                    catch(e){
                        console.error(e);
                        res.sendError();
                    }
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'dl'){
                let attachmentid = request[2];
                if (uid != -1){
                    // First we should get the entry from the table.
                    let data = await getAttachment(attachmentid);
                    if (data != -1){
                        if (data.fileName.split('.')[1] == 'txt'){
                            // Multi file
                            try {
                                let fdata = JSON.parse(Buffer.from(data.hexData, 'hex').toString('utf-8'));
                                if (fdata.length == 1){
                                    let serveId = nanoid();
                                    serve[serveId] = (await sql`SELECT FilePath FROM Attachments WHERE AttachmentID = ${fdata[0]}`)[0].filepath;
                                    res.send(str({
                                        status: 'OK',
                                        serveId: serveId
                                    }));
                                    return;
                                }
                                let zippath = path.resolve(`attachments/${nanoid()}.zip`);
                                const output = fs.createWriteStream(zippath);
                                const archive = new archiver.default('zip',
                                    {zlib: {level: 9}}
                                );
                                output.on('close', () => {
                                    // Should be finished
                                    let serveId = nanoid();
                                    serve[serveId] = zippath;
                                    res.send(str({
                                        status: 'OK',
                                        serveId: serveId
                                    }));
                                });
                                archive.on('error', e => {
                                    console.error(e);
                                    res.sendError();
                                });
                                archive.on('warning', e => {
                                    if (e.code === 'ENOENT'){
                                        console.warn(e);
                                    }
                                    else{
                                        console.error(e);
                                    }
                                    res.sendError();
                                });
                                archive.pipe(output);
                                for (let i = 0; i < fdata.length; i++){
                                    let aid = fdata[i];
                                    let ddata = await getAttachment(aid);
                                    archive.append(Buffer.from(ddata.hexData, 'hex'), {name: ddata.fileName});
                                }
                                archive.finalize();
                            }
                            catch(e){
                                console.error(e);
                                res.sendError();
                            }
                        }
                        else{
                            // Single file.
                            try {
                                const attk = (await sql`
                                    SELECT FilePath FROM Attachments WHERE 
                                    AttachmentID = ${attachmentid};
                                `)[0].filepath;
                                let serveId = nanoid();
                                serve[serveId] = attk;
                                res.send(str({
                                    status: 'OK',
                                    serveId: serveId
                                }));
                            }
                            catch(e){
                                c.error(e);
                                res.sendError();
                            }
                        }
                    }
                    else{
                        console.log(data);
                        res.send(str({
                            status: 'NOFILE'
                        }));
                    }
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'serv'){
                let serveId = request[2];
                if (uid != -1){
                    if (Object.hasOwn(serve, serveId)){
                        res.sendFile(serve[serveId]);
                    }
                    else{
                        res.sendError();
                    }
                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'sendMessage'){
                if (uid != -1){

                }
                else{
                    res.sendInvalid();
                }
            }
            else if (endpoint === 'deleteTask'){
                let taskid = request[2];
                if (uid != -1){
                    try {
                        await sql`
                            DELETE FROM Tasks
                            WHERE TaskID = ${taskid};
                        `;
                        res.sendOK();
                    }
                    catch(e){
                        c.error(e);
                        res.sendError();
                    }
                }
                else{
                    res.sendInvalid();
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
    if (key == `/api/:request`){
        app.post(key, webApiListeners[key]);
    }
    else{
        app.get(key, webApiListeners[key]);
    }
}

process.on('SIGINT', () => {
    c.boldDanger('\n\nExiting..');
    process.exit();
});

dbCheck().then(() => {
    app.listen(port, () => {
        c.success(` App listening on port ${port} `);
        c.white(`Local URL: http://localhost:${port}`);
    });
});
/*
reset().then(() => dbCheck().then(() => {
    app.listen(port, () => {
        c.success(` App listening on port ${port} `);
        c.white(`Local URL: http://localhost:${port}`);
    });
}));*/