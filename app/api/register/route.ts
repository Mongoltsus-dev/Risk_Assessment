import { signUpSchema } from "@/app/schemas/auth";
import { pool } from "@/lib/db";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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
  } catch (error: unknown) /* eslint-disable-line @typescript-eslint/no-explicit-any */ {
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
