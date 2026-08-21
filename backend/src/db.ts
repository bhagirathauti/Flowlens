import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
if (dbUrl.startsWith('file:')) {
  const rawPath = dbUrl.replace(/^file:\/*/, '');
  const absPath = path.resolve(process.cwd(), rawPath).replace(/\\/g, '/');
  dbUrl = `file:${absPath}`;
}

const adapter = new PrismaLibSql({ url: dbUrl });
export const prisma = new PrismaClient({ adapter });


