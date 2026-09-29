import { NextResponse } from "next/server";

export function GET() {
  const applicationId = process.env.MICROSOFT_CLIENT_ID;
  if (!applicationId) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ associatedApplications: [{ applicationId }] });
}
