import { NextResponse } from "next/server";

export async function POST() {
  // Options for the cookie must match the options used when setting it
  const options = {
    name: "session",
    value: "",
    maxAge: -1,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // Clear session cookie to log out user
  const response = NextResponse.json({ status: "success" }, { status: 200 });
  response.cookies.set(options);
  
  // Also clear the user_role cookie
  response.cookies.set({
    name: "user_role",
    value: "",
    maxAge: -1,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
