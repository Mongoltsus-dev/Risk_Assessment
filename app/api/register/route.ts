import { signUpSchema } from "@/app/schemas/auth";
import { pool } from "@/lib/db";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

async function ensureUsersSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL DEFAULT 2,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER NOT NULL DEFAULT 2`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active'`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email))`,
  );
}

export async function POST(req: NextRequest) {
  try {
    await ensureUsersSchema();
    const payload = await req.json();
    const parsed = signUpSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 },
      );
    }

    // Insert new user into database
    const result = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, status, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email",
      [name, email.toLowerCase(), hashedPassword, "active", 2],
    );

    const newUser = result.rows[0];

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser.id,
          name: newUser.full_name,
          email: newUser.email,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
