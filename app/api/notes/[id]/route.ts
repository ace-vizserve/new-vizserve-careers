import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

const NOTE_FIELDS =
  "id, author_id, author_name, author_role, body, created_at, updated_at";

// PATCH — edit a note. Only the note's own author may edit it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("hr", "guest");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = String(body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: note } = await admin
    .from("candidate_notes")
    .select("author_id")
    .eq("id", id)
    .maybeSingle();
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.author_id !== guard.session.userId) {
    return NextResponse.json(
      { error: "You can only edit your own notes" },
      { status: 403 },
    );
  }

  const { data, error } = await admin
    .from("candidate_notes")
    .update({ body: text, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(NOTE_FIELDS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

// DELETE — remove a note. Only the note's own author may delete it.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("hr", "guest");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: note } = await admin
    .from("candidate_notes")
    .select("author_id")
    .eq("id", id)
    .maybeSingle();
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.author_id !== guard.session.userId) {
    return NextResponse.json(
      { error: "You can only delete your own notes" },
      { status: 403 },
    );
  }

  const { error } = await admin.from("candidate_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
