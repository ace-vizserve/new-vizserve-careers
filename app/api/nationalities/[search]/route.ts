import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ search: string }> }) {
  const MANATAL_API_KEY = process.env.MANATAL_API_KEY;

  const { search } = await params;

  try {
    const res = await fetch(`https://api.manatal.com/open/v3/nationalities/?search=${search}`, {
      headers: {
        accept: "application/json",
        Authorization: `Token ${MANATAL_API_KEY}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch nationalities");
    }

    const nationalities = await res.json();

    return Response.json({
      nationalities,
    });
  } catch (error) {
    console.error(error);
    const err = error as Error;
    return Response.json(
      {
        error: "Failed to fetch nationalities",
        message: err.message,
      },
      { status: 500 }
    );
  }
}
