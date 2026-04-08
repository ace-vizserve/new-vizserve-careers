import { industry_list } from "@/app/constants";
import { createClient } from "@/lib/server";
import { ArrowLeft, FileText, Linkedin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const DECLARATION_QUESTIONS = [
  "Have you been or are you suffering from any disease/major medical condition/mental illness or physical impairment?",
  "Have you been discharged or dismissed from the service of your previous employers?",
  "Have you been convicted in a Court of law in any country or any ongoing legal proceedings?",
  "Have you been served with a Garnishee Order by any organisation or been declared a bankrupt?",
  "Have you any relatives and/or friends who have worked or are working in Vizserve?",
];

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  reviewed:    "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-rose-50 text-rose-600 border-rose-200",
  hired:       "bg-purple-50 text-purple-700 border-purple-200",
};

const Field = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  ) : null;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{title}</p>
    {children}
  </div>
);

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: app, error } = await supabase
    .from("applications")
    .select(`
      *,
      jobs ( position_name, org_name ),
      application_family_members ( * ),
      application_educations ( * ),
      application_experiences ( * ),
      application_references ( * )
    `)
    .eq("id", id)
    .single();

  if (error || !app) notFound();

  const appliedAt = new Date(app.created_at).toLocaleDateString("en-PH", {
    day: "numeric", month: "long", year: "numeric",
  });

  const industryNames = Array.isArray(app.industries)
    ? app.industries
        .map((idOrName: string) => {
          const found = industry_list.find(
            (i) => String(i.id) === String(idOrName) || i.name === idOrName
          );
          return found ? found.name : idOrName;
        })
        .join(", ")
    : app.industries;

  const backHref = app.job_id
    ? `/admin/applications/job/${app.job_id}`
    : "/admin/applications";

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left: scrollable details ── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Link
            href={backHref}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{app.full_name}</h1>
              <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${STATUS_STYLES[app.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                {app.status}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Applied for <span className="font-medium text-slate-600">{app.jobs?.position_name ?? "—"}</span> · {appliedAt}
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            {app.linkedin && (
              <a href={app.linkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all">
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
            {app.resume_url && (
              <a href={app.resume_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] transition-all">
                <FileText className="w-3.5 h-3.5" /> Open Resume New tab
              </a>
            )}
          </div>
        </div>

        {/* Contact */}
        <Section title="Contact Information">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Email"       value={app.email} />
            <Field label="Phone"       value={app.phone_number} />
            <Field label="City"        value={app.city} />
            <Field label="Address"     value={app.address} />
            <Field label="Postal Code" value={app.postal_code} />
          </div>
        </Section>

        {/* Personal */}
        <Section title="Personal Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Preferred Name"     value={app.preferred_name} />
            <Field label="Date of Birth"      value={app.birth_date} />
            <Field label="Gender"             value={app.gender} />
            <Field label="Nationality"        value={app.nationalities} />
            <Field label="Residential Status" value={app.residential_status} />
            <Field label="Religion"           value={app.religion} />
            <Field label="Latest Degree"      value={app.latest_degree} />
            <Field label="National ID"        value={app.nric_fin} />
            <Field label="Passport No."       value={app.passport_no} />
            <Field label="Work Permit / Pass" value={app.work_permit_pass} />
          </div>
        </Section>

        {/* Application Details */}
        <Section title="Application Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Expected Salary"     value={app.expected_salary ? `${app.expected_salary_currency} ${app.expected_salary}` : null} />
            <Field label="Years of Experience" value={app.years_of_experience} />
            <Field label="Industries"          value={industryNames} />
            <Field label="Job Portal"          value={app.job_portal} />
            {app.is_referred && <>
              <Field label="Referrer Name"  value={app.referrer_name} />
              <Field label="Referrer Email" value={app.referrer_email} />
            </>}
            {app.is_applying_for_teacher && (
              <Field label="Preferred Subjects / Levels" value={app.preferred_subjects_levels} />
            )}
          </div>
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Name"         value={app.emergency_name} />
            <Field label="Relationship" value={app.emergency_relationship} />
            <Field label="Mobile"       value={app.emergency_mobile} />
            <Field label="Home Phone"   value={app.emergency_home_phone} />
            <Field label="Office Phone" value={app.emergency_office_phone} />
            <Field label="Email"        value={app.emergency_email} />
            <Field label="Address"      value={app.emergency_address} />
          </div>
        </Section>

        {/* Education */}
        {app.application_educations?.length > 0 && (
          <Section title="Education">
            <div className="space-y-4">
              {app.application_educations.map((edu: any) => (
                <div key={edu.id} className="pl-3 border-l-2 border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{edu.school}</p>
                  <p className="text-xs text-slate-500">{edu.degree_name}{edu.specialization ? ` · ${edu.specialization}` : ""}</p>
                  {(edu.started_at || edu.ended_at) && (
                    <p className="text-xs text-slate-400">{edu.started_at ?? "?"} – {edu.ended_at ?? "Present"}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Experience */}
        {app.application_experiences?.length > 0 && (
          <Section title="Work Experience">
            <div className="space-y-4">
              {app.application_experiences.map((exp: any) => (
                <div key={exp.id} className="pl-3 border-l-2 border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{exp.title} — {exp.employer}</p>
                  {exp.salary && <p className="text-xs text-slate-500">Salary: {exp.salary}</p>}
                  {(exp.started_at || exp.ended_at) && (
                    <p className="text-xs text-slate-400">{exp.started_at ?? "?"} – {exp.is_current_employer ? "Present" : (exp.ended_at ?? "?")}</p>
                  )}
                  {exp.description && <p className="text-xs text-slate-500 mt-1">{exp.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Family */}
        {app.application_family_members?.length > 0 && (
          <Section title="Family Particulars">
            <div className="space-y-3">
              {app.application_family_members.map((m: any) => (
                <div key={m.id} className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs text-slate-700 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div><span className="block text-slate-400">Name</span>{m.name}</div>
                  <div><span className="block text-slate-400">Relationship</span>{m.relationship}</div>
                  <div><span className="block text-slate-400">Nationality</span>{m.nationality}</div>
                  <div><span className="block text-slate-400">Age</span>{m.age}</div>
                  <div><span className="block text-slate-400">Occupation</span>{m.occupation}</div>
                  <div><span className="block text-slate-400">Company</span>{m.company}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* References */}
        {app.application_references?.length > 0 && (
          <Section title="Character References">
            <div className="space-y-4">
              {app.application_references.map((ref: any) => (
                <div key={ref.id} className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-3 border-l-2 border-slate-100">
                  <Field label="Name"           value={ref.name} />
                  <Field label="Email"          value={ref.email} />
                  <Field label="Contact No."    value={ref.contact_no} />
                  <Field label="Company / Role" value={ref.company_occupation} />
                  <Field label="Relationship"   value={ref.relationship} />
                  <Field label="Years Known"    value={ref.years_known} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Declarations */}
        {Array.isArray(app.declarations) && app.declarations.length > 0 && (
          <Section title="Declarations">
            <div className="space-y-4">
              {app.declarations.map((decl: any, i: number) => (
                <div key={i} className="pl-3 border-l-2 border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">{DECLARATION_QUESTIONS[i] ?? `Declaration ${i + 1}`}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${decl.answer === "Yes" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                    {decl.answer}
                  </span>
                  {decl.details && <p className="text-xs text-slate-500 mt-1 italic">{decl.details}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Additional */}
        {(app.memberships_associations || app.description) && (
          <Section title="Additional Information">
            <Field label="Memberships / Associations" value={app.memberships_associations} />
            <Field label="Additional Description"     value={app.description} />
          </Section>
        )}
      </div>

      {/* ── Right: sticky PDF viewer ── */}
      <div className="w-[45%] flex-shrink-0 border-l border-slate-200 bg-slate-100 flex flex-col">
        {app.resume_url ? (
          <iframe
            src={app.resume_url}
            className="w-full flex-1"
            title="Resume"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <FileText className="w-10 h-10" />
            <p className="text-sm font-medium">No resume uploaded</p>
          </div>
        )}
      </div>

    </div>
  );
}
