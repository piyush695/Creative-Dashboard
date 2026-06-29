import { NextResponse } from 'next/server';
import clientPromise from '@/server/mongodb-client';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creativeId = searchParams.get('id');

    if (!creativeId) {
      return NextResponse.json({ error: 'Missing Id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const historyCollection = db.collection('history');
    
    // Fetch specifically the base64 variants without projecting everything else
    const item = await historyCollection.findOne(
      { creativeId },
      { projection: { imageUrl: 1, 'result.imageUrl': 1 } }
    );

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // Fallback chain for image
    const finalImageUrl = item.result?.imageUrl || item.imageUrl || null;

    return NextResponse.json({ imageUrl: finalImageUrl });
  } catch (err: any) {
    console.error('API History Image Fetch Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
