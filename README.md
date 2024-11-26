# CMPSC 431 FINAL PROJECT  

This is the final project of Chen Zheng and Jason Zheng. The purpose of this app is a fully featured 
To-Do list app with various functionalities specified in the project Stage 1 document.  

Some of the app functionalities:  
- Generate tasks, and add metadata to the tasks (such as custom labels for a class,  priority status - urgent, etc.)
- Variety of query options (searching tasks) based on that metadata
- Add file attachments, description (markdown), to tasks
- Edit tasks
- Delete (or keep) tasks after completion, this is user-account configurable or per-task configurable
- Repeat tasks (recurring daily, weekly, etc.)
- Sort tasks by various views (groups)
- Secure user-permission authentication for accessing their own lists, or others lists.
- Create different/separate lists
- String query for tasks (search by text pattern)
- Multi-user system, assign users to tasks, discussion like messaging system.
- Summary views, and configurable views.

Furthermore, this app's backend meets the criteria set by the announcement post awhile back. postgres library which is used here allows for (and I use) complete sql queries with JS string based substitution. That being said, I still manually craft the queries so it's okay. Additionally, this app is built on PostgreSQL backend.

### Requirements/Instructions

- Node.js v18.19.1 (newer/older versions untested, may/may not work)  
- PostgreSQL v17.0 (project tested on stock out-of-box on Ubuntu 18)  

*Deviations from the requirements may/may not work, we only tested the 
project on these bounds.*  

**IMPORTANT:**  
*Configuration of this project is required.* Please follow the setup instructions here. A template `config-template.json` is provided. Please copy and paste it in the same directory, renamed to `config.json`. Then, modify the values of `config.json` according to the credentials/address of the local PostgreSQL installation.   

`username`: Username of the PSQL account  
`password`: Password of the PSQL account  
`host`: Hostname/IP address  
`port`: Port that PSQL is listening on  
`database`: The database name (must be pre-made)  

Please run `npm install` in this directory as well, to install the proper libraries needed.  

To start the server, run `node index.js`. You may then visit `localhost:8080`.  

By default the project listens on port 8080, you can modify this value in `index.js` line 11 if you need to.

**The default admin account is username `admin` and password `admin`.**
Please log into the web interface with this credential.