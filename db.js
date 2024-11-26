/**
 * 
 * This file connects to the PostgreSQL instane specified by config.json,
 * and returns a library object as a module.
 * 
 */

import postgres from 'postgres';
import d from './config.json' assert { type: "json" };

const sql = postgres(`postgres://${d.username}:${d.password}@${d.host}:${d.port}/${d.database}`, {});

export default sql;