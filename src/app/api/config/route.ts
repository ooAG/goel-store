import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'details.json');

export async function GET() {
  try {
    if (!fs.existsSync(filePath)) return NextResponse.json({ upiAccounts: [] });
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(fileContents));
  } catch (error) {
    return NextResponse.json({ upiAccounts: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Settings save nahi ho paayi." }, { status: 500 });
  }
}
