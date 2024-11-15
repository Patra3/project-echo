//sudo -u postgres psql <- Personal reference only, this gets a SQL console session

///// APP IMPORTS /////
import express from 'express';
import path from 'path';
import sql from './db.js';
//////////////////////


/*
await sql`
CREATE TABLE Persons (
    PersonID int,
    LastName varchar(255),
    FirstName varchar(255),
    Address varchar(255),
    City varchar(255)
);
`;*/

// Host our web app and define our APIs
const app = express();
const port = 8080;

app.get('/', (req, res) => {
    res.sendFile(path.resolve('public/index.html'));
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});