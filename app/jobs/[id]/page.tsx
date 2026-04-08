import { createClient } from "@/lib/server";
import { ArrowLeft, Briefcase, Building2, CheckCircle2, Clock, MapPin, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = {
  params: Promise<{ id: string }>;
};

interface JobDetail {
  id: number;
  position_name: string;
  location: string;
  employment_type: string;
  contract_details?: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  frequency?: string;
  company?: { name: string };
  date_posted?: string;
  valid_through?: string;
  updated_at?: string;
}

async function getJob(id: string): Promise<JobDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data;
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEmploymentType(contractDetails?: string, employmentType?: string) {
  if (contractDetails) {
    const formatted = contractDetails.replace(/_/g, "-");
    return formatted
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-");
  }

  return employmentType || "Full-time";
}

function mapEmploymentType(value?: string) {
  const raw = (value || "").toUpperCase();

  if (raw.includes("FULL")) return "FULL_TIME";
  if (raw.includes("PART")) return "PART_TIME";
  if (raw.includes("CONTRACT")) return "CONTRACTOR";
  if (raw.includes("TEMP")) return "TEMPORARY";
  if (raw.includes("INTERN")) return "INTERN";

  return "OTHER";
}

function salaryUnit(freq?: string) {
  if (freq === "hour") return "HOUR";
  if (freq === "day") return "DAY";
  if (freq === "week") return "WEEK";
  if (freq === "year") return "YEAR";
  return "MONTH";
}

function formatSalary(min?: number, max?: number, currency?: string, frequency?: string) {
  if (!min && !max) return null;

  const currencyCode = currency || "SGD";
  const formatter = new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const freqText =
    frequency === "hour"
      ? " / hour"
      : frequency === "day"
        ? " / day"
        : frequency === "week"
          ? " / week"
          : frequency === "year"
            ? " / year"
            : " / month";

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}${freqText}`;
  }

  return `${formatter.format(min || max!)}${freqText}`;
}

function renderJobDescription(description: string) {
  const text = description.replace(/<[^>]*>/g, "");
  const sections = text.split(/(?=JOB QUALIFICATIONS:|JOB DETAILS:)/);

  return sections.map((section, sectionIdx) => {
    if (!section.trim()) return null;

    if (section.startsWith("JOB QUALIFICATIONS:") || section.startsWith("JOB DETAILS:")) {
      const headerMatch = section.match(/^(JOB QUALIFICATIONS:|JOB DETAILS:)/);
      const header = headerMatch ? headerMatch[0] : "";
      const content = section.replace(header, "").trim();

      const items = content
        .split(/(?=[A-Z][a-z]{2,})/)
        .map((item) => item.trim())
        .filter((item) => item.split(/\s+/).length >= 5);

      return (
        <section key={sectionIdx} className="mb-6">
          <h2 className="font-bold mb-2 text-gray-900">{header}</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            {items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>
      );
    }

    return (
      <p key={sectionIdx} className="text-gray-700 mb-3 leading-7">
        {section}
      </p>
    );
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return {
      title: "Job Not Found | Vizserve Careers",
      description: "This job posting is no longer available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${job.position_name} | Vizserve Careers`;
  const description = stripHtml(job.description).slice(0, 155);
  const canonicalPath = `/jobs/${job.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: "Vizserve",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/assets/career-opportunities.jpg",
          width: 1200,
          height: 630,
          alt: `${job.position_name} - Vizserve Careers`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/assets/career-opportunities.jpg"],
    },
  };
}

export default async function JobDetailPage({ params }: Params) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) notFound();

  const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.position_name,
    description: job.description,
    identifier: {
      "@type": "PropertyValue",
      name: job.company?.name || "Vizserve",
      value: String(job.id),
    },
    datePosted: job.date_posted || job.updated_at || new Date().toISOString().split("T")[0],
    ...(job.valid_through ? { validThrough: job.valid_through } : {}),
    employmentType: mapEmploymentType(job.contract_details || job.employment_type),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company?.name || "Vizserve",
      sameAs: "https://hfse.edu.sg/",
      logo: "/assets/logo.png",
    },
    ...(job.location
      ? {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location,
              addressCountry: "SG",
            },
          },
        }
      : {}),
    ...(job.salary_min || job.salary_max
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.currency || "SGD",
            value: {
              "@type": "QuantitativeValue",
              ...(job.salary_min ? { minValue: job.salary_min } : {}),
              ...(job.salary_max ? { maxValue: job.salary_max } : {}),
              unitText: salaryUnit(job.frequency),
            },
          },
        }
      : {}),
    directApply: true,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }} />

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="py-16 md:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #4258A5, #354683)' }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <Link
              href="/"
              className="text-white/80 hover:text-white mb-8 inline-flex items-center gap-2 text-base font-medium transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to all jobs
            </Link>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
              {job.position_name}
            </h1>

            <div className="flex flex-wrap gap-4 md:gap-6">
              {job.location && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg text-white border border-white/20">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{job.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg text-white border border-white/20">
                <Briefcase className="w-5 h-5" />
                <span className="font-medium">{formatEmploymentType(job.contract_details, job.employment_type)}</span>
              </div>

              {job.company?.name && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg text-white border border-white/20">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium">{job.company.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-6">
            <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10 mb-8">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8EEF7' }}>
                  <Briefcase className="w-5 h-5" style={{ color: '#4258A5' }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Job Description</h2>
              </div>

              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: job.description || "" }}
              />
            </article>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8EEF7' }}>
                    <Clock className="w-6 h-6" style={{ color: '#4258A5' }} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 mb-1">Application Process</h2>
                    <p className="text-gray-600 text-sm">
                      We review applications on a rolling basis and will contact qualified candidates within 5-7
                      business days.
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8EEF7' }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: '#4258A5' }} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 mb-1">What to Expect</h2>
                    <p className="text-gray-600 text-sm">
                      Our hiring process includes an initial screening, technical interview, and final conversation with
                      the team.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="text-center rounded-2xl shadow-lg p-10 md:p-12 text-white relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #4258A5, #354683)' }}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Send className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Apply?</h2>
                <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
                  Take the next step in your career. We&apos;re excited to learn more about you!
                </p>

                <Link
                  href={`/jobs/${job.id}/apply`}
                  className="inline-flex items-center gap-2 px-10 py-4 bg-white font-semibold text-lg rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  style={{ color: '#4258A5' }}>
                  Apply for this position
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}