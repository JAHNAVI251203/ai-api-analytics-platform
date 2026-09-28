import { pool } from '../config/database';

export interface User {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    is_active: boolean;
}

export class UserModel {
    static async findByEmail(email: string): Promise<User | undefined> {
        const result = await pool.query<User>(
            'SELECT id, name, email, password_hash, is_active FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    static async create(name: string, email: string, passwordHash: string): Promise<User> {
        const result = await pool.query<User>(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, password_hash, is_active`,
            [name, email, passwordHash]
        );
        return result.rows[0]!;
    }
}
