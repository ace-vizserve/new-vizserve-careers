import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const formData = await req.formData();

    const rawData = formData.get("application_data");
    if (!rawData) {
      return NextResponse.json({ error: "Missing application_data" }, { status: 400 });
    }

    const appData = JSON.parse(String(rawData));
    const jobId = Number(formData.get("jobId"));

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // ── Duplicate check ──────────────────────────────────────
    const { data: alreadyApplied } = await supabase.rpc("has_already_applied", {
      p_job_id: jobId,
      p_email: appData.email ?? "",
    });

    if (alreadyApplied) {
      return NextResponse.json(
        { error: "You have already applied for this job." },
        { status: 409 }
      );
    }

    // ── Insert main application row ──────────────────────────
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        job_id: jobId,
        status: "new_candidates",

        // Section 01
        expected_salary:          appData.expected_salary         ?? "",
        expected_salary_currency: appData.expected_salary_currency ?? "PHP",
        linkedin:                 appData.linkedin                 ?? "",
        industries:               appData.industries               ?? [],
        years_of_experience:      appData.years_of_experience      ?? "",
        resume_url:               appData.resume                   ?? "",
        is_referred:              Boolean(appData.is_referred),
        referrer_name:            appData.referrer_name            ?? "",
        referrer_email:           appData.referrer_email           ?? "",
        is_applying_for_teacher:  Boolean(appData.is_applying_for_teacher),
        preferred_subjects_levels: appData.preferredsubjectsandlevels ?? "",

        // Section 02
        full_name:           appData.full_name          ?? "",
        preferred_name:      appData.preferredname       ?? "",
        residential_status:  appData.residentialstatus   ?? "",
        nationalities:       appData.nationalities        ?? "",
        birth_date:          appData.birth_date           ?? "",
        place_of_birth:      appData.placeofbirth         ?? "",
        gender:              appData.gender               ?? "",
        religion:            appData.religion             ?? "",
        nric_fin:            appData.nricfin              ?? "",
        latest_degree:       appData.latest_degree        ?? "",
        passport_no:         appData.passportno           ?? "",
        place_date_of_issue: appData.placedateofissue     ?? "",
        work_permit_pass:    appData.workpermitpass        ?? "",
        overseas_address:    appData.overseasaddress       ?? "",

        // Section 03
        phone_number: appData.phone_number ?? "",
        email:        appData.email        ?? "",
        city:         appData.city         ?? "",
        address:      appData.address      ?? "",
        postal_code:  appData.postalcode   ?? "",

        // Section 04
        emergency_name:         appData.name                   ?? "",
        emergency_relationship: appData.relationship            ?? "",
        emergency_address:      appData.address_b               ?? "",
        emergency_mobile:       appData.mobilenumber            ?? "",
        emergency_home_phone:   appData.hometelephonenumber     ?? "",
        emergency_office_phone: appData.officetelephonenumber   ?? "",
        emergency_email:        appData.emailaddress            ?? "",

        // Section 09
        memberships_associations: appData.membershipsassociations ?? "",
        description:              appData.description             ?? "",

        // Section 10 declarations
        declarations: appData.declarations ?? [],

        // Flags
        skip_background_check: Boolean(appData.skipbackgroundcheck),
        rcbc_request_issued:   Boolean(appData.rcbcrequestissued),
        bc_request_issued:     Boolean(appData.bcrequestissued),
        job_portal:            appData.job_portal ?? "",
      })
      .select("id")
      .single();

    if (appError || !application) {
      console.error("[POST /api/applications] insert error:", appError);
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
    }

    const applicationId = application.id;

    // ── Insert family members ────────────────────────────────
    const familyMembers: any[] = appData.family_members ?? [];
    const validFamily = familyMembers.filter((m: any) => m?.name?.trim());
    if (validFamily.length > 0) {
      await supabase.from("application_family_members").insert(
        validFamily.map((m: any, i: number) => ({
          application_id: applicationId,
          name:           m.name         ?? "",
          relationship:   m.relationship ?? "",
          nationality:    m.nationality  ?? "",
          age:            m.age          ?? "",
          occupation:     m.occupation   ?? "",
          company:        m.company      ?? "",
          sort_order:     i,
        }))
      );
    }

    // ── Insert educations ────────────────────────────────────
    const educations: any[] = appData.educations ?? [];
    const validEducations = educations.filter((e: any) => e?.school?.trim());
    if (validEducations.length > 0) {
      await supabase.from("application_educations").insert(
        validEducations.map((e: any, i: number) => ({
          application_id: applicationId,
          school:         e.school         ?? "",
          degree_name:    e.degree_name    ?? "",
          specialization: e.specialization ?? "",
          started_at:     e.started_at     ?? null,
          ended_at:       e.ended_at       ?? null,
          location:       e.location       ?? "",
          description:    e.description    ?? "",
          sort_order:     i,
        }))
      );
    }

    // ── Insert experiences ───────────────────────────────────
    const experiences: any[] = appData.experiences ?? [];
    const validExperiences = experiences.filter((e: any) => e?.employer?.trim());
    if (validExperiences.length > 0) {
      await supabase.from("application_experiences").insert(
        validExperiences.map((e: any, i: number) => ({
          application_id:      applicationId,
          title:               e.title              ?? "",
          employer:            e.employer            ?? "",
          salary:              e.salary              ?? "",
          other_allowances:    e.other_allowances    ?? "",
          reason_for_leaving:  e.reason_for_leaving  ?? "",
          started_at:          e.started_at          ?? null,
          ended_at:            e.ended_at            ?? null,
          is_current_employer: Boolean(e.is_current_employer),
          description:         e.description         ?? "",
          sort_order:          i,
        }))
      );
    }

    // ── Insert references ────────────────────────────────────
    const references: any[] = appData.references ?? [];
    const validRefs = references.filter((r: any) => r?.name?.trim());
    if (validRefs.length > 0) {
      await supabase.from("application_references").insert(
        validRefs.map((r: any, i: number) => ({
          application_id:    applicationId,
          name:              r.name               ?? "",
          email:             r.email              ?? "",
          contact_no:        r.contact_no         ?? "",
          company_occupation:r.company_occupation ?? "",
          relationship:      r.relationship       ?? "",
          is_work_related:   r.is_work_related    ?? "No",
          years_known:       r.years_known        ?? "",
          consent_to_contact:r.consent_to_contact ?? "I agree",
          sort_order:        i,
        }))
      );
    }

    return NextResponse.json({ success: true, applicationId }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/applications]", err);
    return NextResponse.json({ error: "Failed to submit application", details: err.message }, { status: 500 });
  }
}

// ── GET — admin only: list all applications ──────────────────
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    const pooled = searchParams.get("pooled");

    let query = supabase
      .from("applications")
      .select(`
        *,
        jobs ( position_name, org_name )
      `)
      .order("created_at", { ascending: false });

    if (jobId) query = query.eq("job_id", jobId);
    if (pooled === "true") query = query.eq("is_pooled", true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error("[GET /api/applications]", err);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}