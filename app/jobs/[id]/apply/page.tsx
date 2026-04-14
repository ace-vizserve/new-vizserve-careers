"use client";

import { IndustryCombobox } from "@/app/components/ui/industry-combo-box";
import { NationalityCombobox } from "@/app/components/ui/nationality-combo-box";
import { entity_list } from "@/app/constants";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { ApplicationNote } from "@/components/ui/application-note";
import { ConsentDeclarations } from "@/components/ui/consent-declarations";
import { ErrorSummary, type ErrorSummaryItem } from "@/components/ui/error-summary";
import { ScrollToSubmitButton } from "@/components/ui/scroll-to-submit-button";
import { SubmittingOverlay } from "@/components/ui/submitting-overlay";
import { usePreventRefresh } from "@/hooks/use-prevent-refresh";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import {
  formatEducations,
  formatExperiences,
  formatFamilyParticularsToHTML,
  formatReferencesToHTML,
  generateDeclarationList,
  hasAlreadyAppliedToJob,
} from "@/lib/utils";
import { JobApplicationFormValues, jobApplicationSchema } from "@/lib/validators/job-application";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Controller, FieldErrors, useFieldArray, useForm } from "react-hook-form";
import { sileo } from "sileo";

interface JobDetail {
  id: number;
  position_name: string;
  location: string;
  employment_type: string;
  description: string;
  currency?: string;
  org_name?: string;
  org_logo?: string;
  org_website?: string;
}

interface FormField {
  id: string | number;
  slug?: string;
  name?: string;
  label: string;
  type: string;
  is_required?: boolean;
  isrequired?: boolean;
  required?: boolean;
  field_category?: string;
  fieldcategory?: string;
  display_type?: string;
  displaytype?: string;
  choices?: string[];
  options?: string[];
  placeholder?: string;
}

type FormValues = JobApplicationFormValues & Record<string, any>;

const declarationQuestions = [
  "Have you been or are you suffering from any disease/major medical condition/mental illness or physical impairment?",
  "Have you been discharged or dismissed from the service of your previous employers?",
  "Have you been convicted in a Court of law in any country or any ongoing legal proceedings?",
  "Have you been served with a Garnishee Order by any organisation or been declared a bankrupt?",
  "Have you any relatives and/or friends who have worked or are working in Vizserve?",
] as const;

const normalize = (value?: string | number | null) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getFieldKey = (field: FormField) => String(field.slug || field.name || field.id);
const getRequired = (field: FormField) => Boolean(field.required ?? field.isrequired ?? field.is_required);
const getCategory = (field: FormField) => field.fieldcategory || field.field_category || "";
const getDisplayType = (field: FormField) => field.displaytype || field.display_type || "";
const getChoices = (field: FormField) => field.choices || field.options || [];

const matches = (field: FormField, ...values: string[]) => {
  const pool = [
    normalize(field.slug),
    normalize(field.name),
    normalize(field.label),
    normalize(getCategory(field)),
    normalize(getDisplayType(field)),
    normalize(field.type),
    normalize(field.id),
  ];

  return values.some((value) => {
    const target = normalize(value);
    return pool.some((item) => item === target);
  });
};

const isNricFinField = (field: FormField) =>
  matches(field, "nricfin", "nric", "fin", "singapore id", "pink ic", "identification");

const workPassOptions = [
  "Dependant's Pass (DP)",
  "Employment Pass (EP)",
  "EntrePass",
  "Long-Term Visit Pass (LTVP)",
  "Permanent Residency (PR)",
  "S Pass",
  "Short-Term Visit Pass (STVP)/Visit Pass",
  "Training Employment Pass",
  "Work Holiday Pass",
  "Work Permit (WP)",
  "Student Pass",
  "No Permit/Pass",
] as const;

const buildDefaultValues = (): FormValues => ({
  expected_salary: "",
  expected_salary_currency: "SGD",
  linkedin: "",
  industries: [],
  years_of_experience: "",
  resume: "",

  is_referred: false,
  referrer_details: {
    referrer_name: "",
    referrer_email: "",
  },

  is_applying_for_teacher: false,
  preferredsubjectsandlevels: "",

  full_name: "",
  preferredname: "",
  residentialstatus: "" as never,
  nationalities: "",
  birth_date: "",
  placeofbirth: "",
  gender: "",
  religion: "",
  nricfin: "",
  latest_degree: "",
  passportno: "",
  placedateofissue: "",

  phone_number: "",
  email: "",
  city: "",
  address: "",
  postalcode: "",
  overseasaddress: "",
  workpermitpass: "",

  name: "",
  relationship: "",
  address_b: "",
  mobilenumber: "",
  hometelephonenumber: "",
  officetelephonenumber: "",
  emailaddress: "",

  family_members: [
    {
      name: "",
      relationship: "",
      nationality: "",
      age: "",
      occupation: "",
      company: "",
    },
  ],

  educations: [
    {
      school: "",
      degree_name: "",
      specialization: "",
      started_at: "",
      ended_at: null,
      location: "",
      description: "",
    },
  ],

  coursename: "",
  coursestartdate: "",
  expectedyearofcompletion: "",

  experiences: [
    {
      title: "",
      employer: "",
      salary: "",
      started_at: "",
      ended_at: null,
      is_current_employer: false,
      other_allowances: "",
      description: "",
      reason_for_leaving: "",
    },
  ],

  membershipsassociations: "",
  description: "",

  declarations: declarationQuestions.map(() => ({
    answer: "No" as const,
    details: "",
  })),

  references: [
    {
      name: "",
      email: "",
      contact_no: "",
      company_occupation: "",
      relationship: "",
      is_work_related: "No",
      years_known: "",
      consent_to_contact: "I agree",
    },
  ],

  skipbackgroundcheck: false,
  rcbcrequestissued: false,
  bcrequestissued: false,
});

export default function JobApplicationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const jobId = params.id as string;
  const jobPortal = searchParams.get("job-portal");

  // Each applicant gets their own folder inside candidate-resume so two
  // applicants both uploading "Resume.pdf" don't collide on the same key
  // (which surfaces as a misleading RLS violation on INSERT-only policies).
  const resumeUploadPath = useRef(
    `uploads/${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }`
  ).current;

  const resumeProps = useSupabaseUpload({
    bucketName: "candidate-resume",
    path: resumeUploadPath,
    allowedMimeTypes: ["application/pdf"],
    maxFiles: 1,
    maxFileSize: 1000 * 1000 * 5,
    // The hook defaults upsert to true, which makes Supabase Storage check
    // both INSERT and UPDATE policies. This bucket only has INSERT policies
    // for anon, so upsert triggers a spurious RLS violation. The UUID path
    // above guarantees no collision, so plain INSERT is correct here.
    upsert: false,
  });

  const [declareTruth, setDeclareTruth] = useState<boolean>(false);
  const [declareConsent, setDeclareConsent] = useState<boolean>(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<{ error: string; details?: string } | null>(null);

  const defaultFields: FormField[] = [
    { id: "full_name", slug: "full_name", label: "Full Name", type: "char", required: true },
    { id: "email", slug: "email", label: "Email", type: "char", required: true },
    { id: "phone_number", slug: "phone_number", label: "WhatsApp Number", type: "char", required: true },
    { id: "nationalities", slug: "nationalities", label: "Nationality", type: "char", required: false },
    { id: "placeofbirth", slug: "placeofbirth", label: "Place of Birth", type: "char", required: true },
    {
      id: "linkedin",
      slug: "linkedin",
      label: "LinkedIn Profile URL",
      type: "char",
      required: false,
      field_category: "social_media",
    },
    { id: "resume", slug: "resume", label: "Resume", type: "file", required: true, field_category: "resume" },
  ];

  const inputBase =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 transition-all duration-200 " +
    "hover:border-slate-300 text-sm";

  const cardBase = "bg-white border border-slate-100 rounded-2xl shadow-sm";

  const selectCls =
    inputBase +
    " appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0_0_24_24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6_9l6_6_6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_14px_center]";

  const getCurrencyId = (code: string) => {
    const map: Record<string, string> = { SGD: "11", USD: "1", EUR: "2", GBP: "3", PHP: "13" };
    return map[code] || "11";
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: buildDefaultValues(),
    mode: "onBlur",
  });

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  const pathToFieldId = (path: string) => `field-${path.replace(/\./g, "-")}`;

  const flattenErrors = (obj: FieldErrors<any>, parent = ""): ErrorSummaryItem[] => {
    const result: ErrorSummaryItem[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const path = parent ? `${parent}.${key}` : key;

      if (!value) return;

      if (typeof value === "object" && "message" in value && value.message) {
        result.push({ path, message: String(value.message) });
        return;
      }

      if (typeof value === "object") {
        result.push(...flattenErrors(value as FieldErrors<any>, path));
      }
    });

    return result;
  };

  const errorList = useMemo(() => flattenErrors(errors), [errors]);

  const scrollToField = (path: string) => {
    const el = document.getElementById(pathToFieldId(path));

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus?.();
    }
  };

  const onInvalid = () => {
    requestAnimationFrame(() => {
      errorSummaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const {
    fields: familyFields,
    append: appendFamily,
    remove: removeFamily,
  } = useFieldArray({
    control,
    name: "family_members",
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: "educations",
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: "experiences",
  });

  const {
    fields: referenceFields,
    append: appendReference,
    remove: removeReference,
  } = useFieldArray({
    control,
    name: "references",
  });

  const watchedResidentialStatus = watch("residentialstatus");
  const watchedNationalities = watch("nationalities");
  const watchedIsReferred = watch("is_referred");
  const watchedIsApplyingForTeacher = watch("is_applying_for_teacher");
  const watchedDeclarations = watch("declarations");
  const watchedReferences = watch("references");

  const today = new Date().toISOString().split("T")[0];

  usePreventRefresh(true);

  useEffect(() => {
    if (resumeProps.successes.length > 0) {
      setValue("resume", String(resumeProps.successes[0]), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [resumeProps.successes, setValue]);

  useEffect(() => {
    if (!watchedIsReferred) {
      setValue(
        "referrer_details",
        { referrer_name: "", referrer_email: "" },
        { shouldDirty: true, shouldValidate: false },
      );
    }
  }, [watchedIsReferred, setValue]);

  useEffect(() => {
    if (!watchedIsApplyingForTeacher) {
      setValue("preferredsubjectsandlevels", "", {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [watchedIsApplyingForTeacher, setValue]);

  useEffect(() => {
    if (watchedResidentialStatus !== "Foreigner") {
      setValue("workpermitpass", "", { shouldDirty: true, shouldValidate: false });
      setValue("overseasaddress", "", { shouldDirty: true, shouldValidate: false });
    }
  }, [watchedResidentialStatus, setValue]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (!jobRes.ok) throw new Error("Failed to fetch job");
        const jobData = await jobRes.json();

        const organization = entity_list.find((org) => org.id === jobData.organization);
        if (organization) {
          jobData.org_name = organization.name;
          jobData.org_logo = organization.logo;
          jobData.org_website = organization.website;
        }
        setJob(jobData);

        const fieldsRes = await fetch(`/api/jobs/${jobId}/form-fields`);
        let fields = defaultFields;

        if (fieldsRes.ok) {
          const data = await fieldsRes.json();
          if (data.fields?.length > 0) fields = data.fields;
        }

        setFormFields(fields);

        const nextDefaults = buildDefaultValues();

        if (jobData.currency) {
          nextDefaults.expected_salary_currency = jobData.currency;
        }

        fields.forEach((field) => {
          const key = getFieldKey(field);
          if (normalize(field.type) !== "file" && !(key in nextDefaults)) {
            nextDefaults[key] = "";
          }
        });

        reset(nextDefaults);
      } catch {
        setError({
          error: "Unable to load the application form.",
          details: "Please refresh the page. If the problem continues, try again later.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, reset]);

  const getField = (...values: string[]) => formFields.find((field) => matches(field, ...values));
  const getFields = (...values: string[]) => formFields.filter((field) => matches(field, ...values));

  const getNestedError = (path: string) => {
    return path.split(".").reduce<any>((acc, part) => {
      if (!acc) return undefined;
      return /^\d+$/.test(part) ? acc[Number(part)] : acc[part];
    }, errors);
  };

  const ErrorText = ({ path }: { path: string }) => {
    const fieldError = getNestedError(path);
    if (!fieldError?.message) return null;
    return <p className="mt-1.5 text-xs text-rose-500 font-medium">{String(fieldError.message)}</p>;
  };

  const SectionHeader = ({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) => (
    <div className="flex items-start gap-4 mb-7">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
        <span className="text-white text-xs font-bold tracking-wider">{number}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  const Label = ({ children, required }: { children: ReactNode; required?: boolean }) => (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
      {children}
      {required && <span className="text-rose-400 ml-1">*</span>}
    </label>
  );

  const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50">
      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base leading-none">
        +
      </span>
      {label}
    </button>
  );

  const RemoveButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors py-1.5 px-2 rounded-lg hover:bg-rose-50">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      Remove
    </button>
  );

  const renderField = (field: FormField) => {
    const key = getFieldKey(field);
    const inputId = pathToFieldId(key);

    const isResumeField = matches(field, "resume");
    const isSocialField = matches(field, "social_media", "LinkedIn Profile URL");
    const isDateField =
      normalize(field.type) === "datetime" ||
      normalize(getDisplayType(field)) === "date" ||
      matches(field, "birthdate", "date of birth", "coursestartdate", "course start date");
    const isLongTextField = normalize(field.type) === "longtext" || matches(field, "longtext");
    const isIntegerField = normalize(field.type) === "integer" || matches(field, "expectedyearofcompletion");
    const isBooleanField = normalize(field.type) === "boolean" || matches(field, "boolean");
    const isDropdownField = matches(field, "dropdown") && getChoices(field).length > 0;
    const isEmailField = matches(field, "email", "emailaddress");
    const isPhoneField = matches(
      field,
      "phonenumber",
      "mobilenumber",
      "hometelephonenumber",
      "officetelephonenumber",
      "whatsapp number",
      "mobile number",
      "telephone number",
    );
    const isPostalCodeField = matches(field, "postalcode", "postal code");
    const isGenderField = matches(field, "gender");
    const isResidentialStatusField = matches(field, "residentialstatus", "residential status");
    const isNationalityField = matches(field, "nationalities", "nationality");
    const isIndustryField = matches(field, "industries", "work industry");
    const isHighestQualificationField = matches(field, "latestdegree", "highest qualification");
    const isExpectedSalaryField = matches(field, "expectedsalary", "expected salary");
    const isStrictNumericField =
      normalize(field.type) === "integer" ||
      normalize(field.slug) === "postalcode" ||
      normalize(field.slug) === "yearsofexperience";

    if (field.label === "Briefly share your skills, experiences, and achievements beyond your resume") {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <textarea
                id={inputId}
                rows={5}
                value={field.value}
                onChange={field.onChange}
                className={`${inputBase} resize-none`}
              />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isDateField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <input id={inputId} type="date" value={field.value} onChange={field.onChange} className={inputBase} />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isExpectedSalaryField) {
      return (
        <>
          <Controller
            control={control}
            name={"expected_salary" as any}
            render={({ field }) => (
              <input
                id={pathToFieldId("expected_salary")}
                type="text"
                inputMode="text"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value.replace(/[^0-9,]/g, ""))}
                placeholder="e.g. 3,500"
                className={inputBase}
              />
            )}
          />

          <ErrorText path="expected_salary" />
        </>
      );
    }

    if (isResumeField) {
      return (
        <>
          <div id={pathToFieldId("resume")} tabIndex={-1} className="mt-1">
            <Dropzone {...resumeProps}>
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
          </div>
          <ErrorText path="resume" />
        </>
      );
    }

    if (isResidentialStatusField) {
      const isForeigner = watchedResidentialStatus === "Foreigner";

      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <select id={inputId} {...field} className={selectCls}>
                <option value="">Select residential status</option>
                <option value="Filipino Citizen">Filipino Citizen</option>
                <option value="Permanent Resident">Permanent Resident</option>
                <option value="OFW">OFW</option>
                <option value="Work Visa Holder">Work Visa Holder</option>
                <option value="Foreigner">Foreigner</option>
              </select>
            )}
          />
          <ErrorText path={key} />

          {isForeigner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-blue-50/50 border border-blue-100 rounded-xl mt-5">
              <div className="flex items-start gap-2.5 md:col-span-2 mb-1">
                <svg
                  className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-xs text-blue-600 font-medium">
                  Additional information required for foreign applicants
                </p>
              </div>

              <div>
                <Label required>Work Pass</Label>
                <select id={pathToFieldId("workpermitpass")} {...register("workpermitpass")} className={selectCls}>
                  <option value="">Select work pass type</option>
                  {workPassOptions.map((pass) => (
                    <option key={pass} value={pass}>
                      {pass}
                    </option>
                  ))}
                </select>
                <ErrorText path="workpermitpass" />
              </div>

              <div>
                <Label required>Overseas Address</Label>
                <input
                  id={pathToFieldId("overseasaddress")}
                  type="text"
                  {...register("overseasaddress")}
                  placeholder="Street, City, Country"
                  className={inputBase}
                />
                <ErrorText path="overseasaddress" />
              </div>
            </div>
          )}
        </>
      );
    }

    if (isNationalityField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => <NationalityCombobox id={inputId} {...field} />}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isIndustryField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <IndustryCombobox
                id={inputId}
                value={Array.isArray(field.value) ? field.value : field.value ? [field.value] : []}
                onChange={field.onChange}
              />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isHighestQualificationField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <select id={inputId} {...field} className={selectCls}>
                <option value="">Select qualification</option>
                <option value="High School Diploma">High School Diploma</option>
                <option value="Associates Degree">Associate&apos;s Degree</option>
                <option value="Bachelors Degree">Bachelor&apos;s Degree</option>
                <option value="Masters Degree">Master&apos;s Degree</option>
                <option value="Doctorate">Doctorate</option>
              </select>
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isDropdownField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <select id={inputId} {...field} className={selectCls}>
                <option value="">Select an option</option>
                {getChoices(field as any).map((choice: string) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isGenderField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <select id={inputId} {...field} className={selectCls}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isLongTextField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <textarea
                id={inputId}
                rows={4}
                value={field.value}
                onChange={field.onChange}
                className={`${inputBase} resize-none`}
              />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isBooleanField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <select
                id={inputId}
                value={String(field.value ?? "")}
                onChange={(e) => field.onChange(e.target.value === "true")}
                className={selectCls}>
                <option value="">Select option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isSocialField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <input
                id={inputId}
                type="url"
                value={field.value}
                onChange={field.onChange}
                placeholder="https://linkedin.com/in/yourprofile"
                className={inputBase}
              />
            )}
          />

          <ErrorText path={key} />
        </>
      );
    }

    if (isNricFinField(field)) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <div className="relative">
                <input
                  id={inputId}
                  type="text"
                  inputMode="text"
                  pattern="[STFGMstfgm][0-9]{7}[A-Za-z]"
                  value={field.value?.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    if (/^[STFGM]?[0-9]{0,7}[A-Za-z]?$/i.test(v)) field.onChange(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key.length === 1 && !/[STFGM0-9A-Za-z]/i.test(e.key)) e.preventDefault();
                  }}
                  placeholder="e.g. S1234567A"
                  className={`${inputBase} uppercase tracking-widest font-mono`}
                  maxLength={9}
                />
                <p className="mt-1.5 text-xs text-slate-400">National Id</p>
              </div>
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isStrictNumericField || isIntegerField || isPostalCodeField) {
      const maxLength = isPostalCodeField ? 6 : undefined;

      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={field.value}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, "");
                  field.onChange(maxLength ? numericValue.slice(0, maxLength) : numericValue);
                }}
                placeholder={
                  isPostalCodeField
                    ? "e.g. 123456"
                    : field.name?.toLowerCase().includes("salary")
                      ? "e.g. 3500"
                      : field.name?.toLowerCase().includes("expectedyearofcompletion")
                        ? "e.g. 2025"
                        : "e.g. 5"
                }
                className={inputBase}
                maxLength={maxLength}
              />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isEmailField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <input
                id={inputId}
                type="email"
                value={field.value}
                onChange={field.onChange}
                placeholder="you@email.com"
                className={inputBase}
              />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    if (isPhoneField) {
      return (
        <>
          <Controller
            control={control}
            name={key as any}
            render={({ field }) => (
              <input
                id={inputId}
                type="tel"
                inputMode="tel"
                pattern="[0-9+\- ]*"
                value={field.value}
                onChange={field.onChange}
                onKeyDown={(e) => {
                  if (e.key.length === 1 && !/[0-9+\- ]/.test(e.key)) e.preventDefault();
                }}
                placeholder="+65 9123 4567"
                className={inputBase}
                maxLength={20}
              />
            )}
          />
          <ErrorText path={key} />
        </>
      );
    }

    return (
      <>
        <Controller
          control={control}
          name={key as any}
          render={({ field }) => (
            <input id={inputId} type="text" value={field.value} onChange={field.onChange} className={inputBase} />
          )}
        />
        <ErrorText path={key} />
      </>
    );
  };

  const renderFieldBlock = (field?: FormField, className = "") => {
    if (!field) return null;

    return (
      <div key={String(field.id)} className={className}>
        <Label required={getRequired(field)}>{field.label}</Label>
        {renderField(field)}
      </div>
    );
  };

  const referenceCompletedCount = useMemo(() => {
    return (watchedReferences || []).filter(
      (r) => r?.name?.trim() && r?.email?.trim() && r?.contact_no?.trim() && r?.relationship?.trim(),
    ).length;
  }, [watchedReferences]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);

    try {
      const existingMatch = await hasAlreadyAppliedToJob({
        jobPk: Number(jobId),
        email: values.email,
        fullName: values.full_name,
      });

      if (existingMatch.alreadyApplied) {
        sileo.error({
          title: "You have already applied for this job.",
          description: "Please wait for the employer to review your application.",
        });
        setSubmitting(false);
        return;
      }

      const normalizedValues: FormValues = {
        ...values,
        experiences: values.experiences.map((exp) => ({
          ...exp,
          ended_at: exp.is_current_employer ? today : exp.ended_at,
        })),
      };

      const validReferences = normalizedValues.references.filter(
        (ref) => ref.name.trim() || ref.email.trim() || ref.contact_no.trim(),
      );

      if (validReferences.length < 3) {
        setError({
          error: "Please provide at least 3 character references.",
          details: "Add at least 3 references before submitting your application.",
        });
        setSubmitting(false);
        return;
      }

      const applicationData: Record<string, any> = {
        // Section 01
        expected_salary:            normalizedValues.expected_salary,
        expected_salary_currency:   normalizedValues.expected_salary_currency,
        linkedin:                   normalizedValues.linkedin,
        industries:                 normalizedValues.industries,
        years_of_experience:        normalizedValues.years_of_experience,
        resume:                     normalizedValues.resume,
        is_referred:                normalizedValues.is_referred,
        referrer_name:              normalizedValues.is_referred ? (normalizedValues.referrer_details?.referrer_name  ?? "") : "",
        referrer_email:             normalizedValues.is_referred ? (normalizedValues.referrer_details?.referrer_email ?? "") : "",
        is_applying_for_teacher:    normalizedValues.is_applying_for_teacher,
        preferredsubjectsandlevels: normalizedValues.preferredsubjectsandlevels,

        // Section 02
        full_name:         normalizedValues.full_name,
        preferredname:     normalizedValues.preferredname,
        residentialstatus: normalizedValues.residentialstatus,
        nationalities:     normalizedValues.nationalities,
        birth_date:        normalizedValues.birth_date,
        placeofbirth:      normalizedValues.placeofbirth,
        gender:            normalizedValues.gender,
        religion:          normalizedValues.religion,
        nricfin:           normalizedValues.nricfin,
        latest_degree:     normalizedValues.latest_degree,
        passportno:        normalizedValues.passportno,
        placedateofissue:  normalizedValues.placedateofissue,
        workpermitpass:    normalizedValues.workpermitpass,
        overseasaddress:   normalizedValues.overseasaddress,

        // Section 03
        phone_number: normalizedValues.phone_number,
        email:        normalizedValues.email,
        city:         normalizedValues.city,
        address:      normalizedValues.address,
        postalcode:   normalizedValues.postalcode,

        // Section 04 — Emergency Contact
        name:                  normalizedValues.name,
        relationship:          normalizedValues.relationship,
        address_b:             normalizedValues.address_b,
        mobilenumber:          normalizedValues.mobilenumber,
        hometelephonenumber:   normalizedValues.hometelephonenumber,
        officetelephonenumber: normalizedValues.officetelephonenumber,
        emailaddress:          normalizedValues.emailaddress,

        // Arrays
        family_members: normalizedValues.family_members,
        educations:     normalizedValues.educations,
        experiences:    normalizedValues.experiences,
        references:     validReferences,
        declarations:   normalizedValues.declarations,

        // Section 09
        membershipsassociations: normalizedValues.membershipsassociations,
        description:             normalizedValues.description,

        // Flags
        skipbackgroundcheck: normalizedValues.skipbackgroundcheck,
        rcbcrequestissued:   normalizedValues.rcbcrequestissued,
        bcrequestissued:     normalizedValues.bcrequestissued,

        // Meta
        job_portal: jobPortal ?? "",
      };

      const formDataToSend = new FormData();
      formDataToSend.append("application_data", JSON.stringify(applicationData));
      formDataToSend.append("jobId", jobId);

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        setError({
          error: result.error || result.message || "Failed to submit application",
          details: result.details,
        });
        return;
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      setError({
        error: err.message || "Failed to submit application",
        details: err.details || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-slate-400 tracking-wide">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {submitting && <SubmittingOverlay />}

      <ScrollToSubmitButton
        targetId="submit-application-action"
        threshold={900}
        disabled={submitting || submitSuccess}
        label="Scroll to submit"
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-mono { font-family: 'DM Mono', monospace; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-500 to-indigo-500" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 sm:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-md mb-4">
                  Job Application
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <Image
                    height={40}
                    width={40}
                    src="/assets/logo.png"
                    alt="VizServe"
                    className="h-14 w-14 sm:h-16 sm:w-20 rounded-xl object-contain border border-slate-100 shadow-sm bg-white p-1.5 shrink-0"
                  />

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {job?.position_name || "Open Position"}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">VizServe</span>

                  <span className="hidden sm:block text-slate-300">|</span>
                  <Link
                    href="https://vizserve.com"
                    target="_blank"
                    className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                    Visit Website
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>

                  {job?.location && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {job.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href={"/"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to listings
                </Link>
              </div>
            </div>
          </div>

          {submitSuccess ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100">
                <svg
                  className="w-10 h-10 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
              <p className="text-slate-500 mb-8 text-sm">
                Thank you for applying. We&apos;ll review your application and be in touch soon.
              </p>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-sm shadow-blue-200">
                Browse More Jobs
                <ArrowUpRight className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <ApplicationNote />
              <br />
              <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                <div ref={errorSummaryRef}>
                  <ErrorSummary errors={errorList} onItemClick={scrollToField} />
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex flex-col gap-1 text-sm">
                    <div>{error.error}</div>
                    {error.details && <div className="text-rose-600">{error.details}</div>}
                  </div>
                )}

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="01"
                    title="Application Information"
                    subtitle="Basic details about this application"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderFieldBlock(getField("expected_salary", "Expected Salary"))}
                    {renderFieldBlock(getField("social_media", "LinkedIn Profile URL"))}
                    {renderFieldBlock(getField("industries", "Work Industry"))}
                    {renderFieldBlock(getField("years_of_experience", "Years of Experience"))}
                    {formFields
                      .filter(
                        (f) =>
                          getCategory(f) === "resume" ||
                          normalize(f.slug) === "resume" ||
                          normalize(f.name) === "resume" ||
                          normalize(f.label) === "resume" ||
                          String(f.id) === "1741683",
                      )
                      .map((f) => renderFieldBlock(f, "md:col-span-2"))}

                    <div
                      className={`md:col-span-2 rounded-2xl border p-5 transition-all duration-200 ${
                        watchedIsReferred ? "border-blue-200 bg-blue-50/30" : "border-slate-200 bg-white"
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                              watchedIsReferred ? "bg-blue-600 shadow-sm shadow-blue-200" : "bg-slate-100"
                            }`}>
                            <svg
                              className={`w-4 h-4 ${watchedIsReferred ? "text-white" : "text-slate-400"}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Were you referred by an Vizserve employee?
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Let us know who referred you for this position
                            </p>
                          </div>
                        </div>

                        <Controller
                          control={control}
                          name="is_referred"
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(!field.value);
                                trigger("referrer_details");
                              }}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                field.value ? "bg-blue-600" : "bg-slate-200"
                              }`}>
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                                  field.value ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          )}
                        />
                      </div>

                      {watchedIsReferred && (
                        <div className="mt-5 pt-5 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label required>Referrer Name</Label>
                            <input
                              id={pathToFieldId("referrer_details.referrer_name")}
                              type="text"
                              {...register("referrer_details.referrer_name")}
                              placeholder="Full name of the person who referred you"
                              className={inputBase}
                            />
                            <ErrorText path="referrer_details.referrer_name" />
                          </div>

                          <div>
                            <Label required>Referrer Email</Label>
                            <input
                              id={pathToFieldId("referrer_details.referrer_email")}
                              type="email"
                              {...register("referrer_details.referrer_email")}
                              placeholder="email@example.com"
                              className={inputBase}
                            />
                            <ErrorText path="referrer_details.referrer_email" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-2xl border shadow-sm p-8 transition-all duration-200 ${
                    watchedIsApplyingForTeacher ? "bg-amber-50/30 border-amber-200" : "bg-white border-slate-100"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          watchedIsApplyingForTeacher ? "bg-amber-500 shadow-sm shadow-amber-200" : "bg-slate-100"
                        }`}>
                        <svg
                          className={`w-4 h-4 ${watchedIsApplyingForTeacher ? "text-white" : "text-slate-400"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 leading-tight">
                          For Teacher Position Only
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Toggle on if you are applying for a teaching role
                        </p>
                      </div>
                    </div>

                    <Controller
                      control={control}
                      name="is_applying_for_teacher"
                      render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(!field.value);
                            trigger("preferredsubjectsandlevels");
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            field.value ? "bg-amber-500" : "bg-slate-200"
                          }`}>
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                              field.value ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      )}
                    />
                  </div>

                  {watchedIsApplyingForTeacher && (
                    <div className="mt-6 pt-6 border-t border-amber-100">
                      {getField("preferredsubjectsandlevels", "Preferred Subjects and Levels") ? (
                        <div>
                          <Label
                            required={getRequired(
                              getField("preferredsubjectsandlevels", "Preferred Subjects and Levels")!,
                            )}>
                            {getField("preferredsubjectsandlevels", "Preferred Subjects and Levels")!.label}
                          </Label>
                          <textarea
                            id={pathToFieldId("preferredsubjectsandlevels")}
                            rows={4}
                            {...register("preferredsubjectsandlevels")}
                            placeholder="e.g. English - Primary / Secondary, Mathematics - Secondary"
                            className={`${inputBase} resize-none focus:ring-amber-400/60 focus:border-amber-400`}
                          />

                          <p className="mt-1.5 text-xs text-slate-400">
                            List each subject and its corresponding level(s), one per line if needed
                          </p>
                          <ErrorText path="preferredsubjectsandlevels" />
                        </div>
                      ) : (
                        <div>
                          <Label required>Preferred Subjects &amp; Levels</Label>
                          <textarea
                            rows={4}
                            {...register("preferredsubjectsandlevels")}
                            placeholder="e.g. English - Primary & Secondary, Mathematics - Secondary"
                            className={`${inputBase} resize-none focus:ring-amber-400/60 focus:border-amber-400`}
                          />
                          <p className="mt-1.5 text-xs text-slate-400">
                            List each subject and its corresponding level(s), one per line if needed
                          </p>
                          <ErrorText path="preferredsubjectsandlevels" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="02"
                    title="Personal Information"
                    subtitle="Your personal details and identification"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderFieldBlock(getField("full_name", "Full Name"))}
                    {renderFieldBlock(getField("preferredname", "Preferred Name"))}
                    {renderFieldBlock(getField("residentialstatus", "Residential Status"))}
                    {renderFieldBlock(getField("nationalities", "Nationality"))}
                    {renderFieldBlock(getField("birth_date", "Date of Birth"))}
                    {renderFieldBlock(getField("placeofbirth", "Place of Birth"))}
                    {renderFieldBlock(getField("gender", "Gender"))}
                    {renderFieldBlock(getField("religion", "Religion"))}
                    {renderFieldBlock(getField("latest_degree", "Highest Qualification"))}
                    {renderFieldBlock(getField("city", "Singapore Address"))}
                    {renderFieldBlock(getField("passportno", "Passport Number"))}
                    {formFields.filter((f) => getFieldKey(f) === "placedateofissue").map((f) => renderFieldBlock(f))}
                  </div>
                </div>

                <div className={`${cardBase} p-8`}>
                  <SectionHeader number="03" title="Contact Information" subtitle="How we can reach you" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderFieldBlock(getField("phone_number", "WhatsApp Number"))}
                    {renderFieldBlock(getField("email", "Email"))}
                    {renderFieldBlock(getField("address", "Complete Address"))}

                    {renderFieldBlock(getField("postalcode", "Postal Code"))}
                  </div>
                </div>

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="04"
                    title="Family Particulars"
                    subtitle="Details of immediate family members"
                  />
                  <div className="space-y-4">
                    {familyFields.map((member, i) => (
                      <div key={member.id} className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Member {i + 1}
                          </span>
                          {familyFields.length > 1 && <RemoveButton onClick={() => removeFamily(i)} />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <Label>Name</Label>
                            <input
                              id={pathToFieldId(`family_members.${i}.name`)}
                              type="text"
                              {...register(`family_members.${i}.name`)}
                              className={inputBase}
                              placeholder="Full name"
                            />
                            <ErrorText path={`family_members.${i}.name`} />
                          </div>

                          <div>
                            <Label>Relationship</Label>
                            <select
                              id={pathToFieldId(`family_members.${i}.relationship`)}
                              {...register(`family_members.${i}.relationship`)}
                              className={selectCls}>
                              <option value="">Select relationship</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Son">Son</option>
                              <option value="Daughter">Daughter</option>
                              <option value="Sibling">Sibling</option>
                              <option value="Relative">Relative</option>
                            </select>
                            <ErrorText path={`family_members.${i}.relationship`} />
                          </div>

                          <div>
                            <Label>Nationality</Label>
                            <input
                              id={pathToFieldId(`family_members.${i}.nationality`)}
                              type="text"
                              {...register(`family_members.${i}.nationality`)}
                              className={inputBase}
                              placeholder="e.g. Singaporean"
                            />
                            <ErrorText path={`family_members.${i}.nationality`} />
                          </div>

                          <div>
                            <Label>Age</Label>
                            <Controller
                              control={control}
                              name={`family_members.${i}.age`}
                              render={({ field }) => (
                                <input
                                  id={pathToFieldId(`family_members.${i}.age`)}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                                  className={inputBase}
                                  placeholder="e.g. 45"
                                />
                              )}
                            />
                            <ErrorText path={`family_members.${i}.age`} />
                          </div>

                          <div>
                            <Label>Occupation</Label>
                            <input
                              id={pathToFieldId(`family_members.${i}.occupation`)}
                              type="text"
                              {...register(`family_members.${i}.occupation`)}
                              className={inputBase}
                              placeholder="Job title or role"
                            />
                            <ErrorText path={`family_members.${i}.occupation`} />
                          </div>

                          <div>
                            <Label>Company</Label>
                            <input
                              id={pathToFieldId(`family_members.${i}.company`)}
                              type="text"
                              {...register(`family_members.${i}.company`)}
                              className={inputBase}
                              placeholder="Employer optional"
                            />
                            <ErrorText path={`family_members.${i}.company`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <AddButton
                      onClick={() =>
                        appendFamily({
                          name: "",
                          relationship: "",
                          nationality: "",
                          age: "",
                          occupation: "",
                          company: "",
                        })
                      }
                      label="Add Family Member"
                    />
                  </div>
                </div>

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="05"
                    title="Educational Profile"
                    subtitle="Your academic background and qualifications"
                  />
                  <div className="space-y-4">
                    {educationFields.map((edu, i) => (
                      <div key={edu.id} className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Education {i + 1}
                          </span>
                          {educationFields.length > 1 && <RemoveButton onClick={() => removeEducation(i)} />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label required>School / Institution</Label>
                            <input
                              id={pathToFieldId(`educations.${i}.school`)}
                              type="text"
                              {...register(`educations.${i}.school`)}
                              className={inputBase}
                              placeholder="e.g. National University of Singapore"
                            />
                            <ErrorText path={`educations.${i}.school`} />
                          </div>

                          <div>
                            <Label required>Highest Qualification</Label>
                            <select
                              id={pathToFieldId(`educations.${i}.degree_name`)}
                              {...register(`educations.${i}.degree_name`)}
                              className={selectCls}>
                              <option value="">Select qualification</option>
                              <option value="High School Diploma">High School Diploma</option>
                              <option value="Associates Degree">Associate&apos;s Degree</option>
                              <option value="Bachelors Degree">Bachelor&apos;s Degree</option>
                              <option value="Masters Degree">Master&apos;s Degree</option>
                              <option value="Doctorate">Doctorate</option>
                            </select>
                            <ErrorText path={`educations.${i}.degree_name`} />
                          </div>

                          <div>
                            <Label>Specialization / Major</Label>
                            <input
                              id={pathToFieldId(`educations.${i}.specialization`)}
                              type="text"
                              {...register(`educations.${i}.specialization`)}
                              className={inputBase}
                              placeholder="e.g. Computer Science"
                            />
                            <ErrorText path={`educations.${i}.specialization`} />
                          </div>

                          <div>
                            <Label>Location</Label>
                            <input
                              id={pathToFieldId(`educations.${i}.location`)}
                              type="text"
                              {...register(`educations.${i}.location`)}
                              className={inputBase}
                              placeholder="City, Country"
                            />
                            <ErrorText path={`educations.${i}.location`} />
                          </div>

                          <div>
                            <Label required>Start Date</Label>
                            <input
                              id={pathToFieldId(`educations.${i}.started_at`)}
                              type="date"
                              {...register(`educations.${i}.started_at`)}
                              className={inputBase}
                            />
                            <ErrorText path={`educations.${i}.started_at`} />
                          </div>

                          <div>
                            <Label>End Date</Label>
                            <Controller
                              control={control}
                              name={`educations.${i}.ended_at`}
                              render={({ field }) => (
                                <input
                                  id={pathToFieldId(`educations.${i}.ended_at`)}
                                  type="date"
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                  className={inputBase}
                                />
                              )}
                            />
                            <ErrorText path={`educations.${i}.ended_at`} />
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <AddButton
                      onClick={() =>
                        appendEducation({
                          school: "",
                          degree_name: "",
                          specialization: "",
                          started_at: "",
                          ended_at: null,
                          location: "",
                          description: "",
                        })
                      }
                      label="Add Education"
                    />
                  </div>
                </div>

                {getFields("coursename", "coursestartdate", "expectedyearofcompletion").length > 0 && (
                  <div className={`${cardBase} p-8`}>
                    <SectionHeader
                      number="06"
                      title="Other Courses Currently Pursuing"
                      subtitle="Any ongoing studies or certifications"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {renderFieldBlock(getField("coursename", "Course Name"), "md:col-span-2")}
                      {renderFieldBlock(getField("coursestartdate", "Course Start Date"))}
                      {renderFieldBlock(getField("expectedyearofcompletion", "Expected Year of Completion"))}
                    </div>
                  </div>
                )}

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="07"
                    title="Employment History"
                    subtitle="Your work experience, most recent first"
                  />
                  <div className="space-y-4">
                    {experienceFields.map((exp, i) => {
                      const isCurrent = watch(`experiences.${i}.is_current_employer`);

                      return (
                        <div key={exp.id} className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              Experience {i + 1}
                            </span>
                            {experienceFields.length > 1 && <RemoveButton onClick={() => removeExperience(i)} />}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label required>From</Label>
                              <input
                                id={pathToFieldId(`experiences.${i}.started_at`)}
                                type="date"
                                {...register(`experiences.${i}.started_at`)}
                                className={inputBase}
                              />
                              <ErrorText path={`experiences.${i}.started_at`} />
                            </div>

                            <div>
                              <Label>{isCurrent ? "To" : "To *"}</Label>
                              <Controller
                                control={control}
                                name={`experiences.${i}.ended_at`}
                                render={({ field }) => (
                                  <input
                                    id={pathToFieldId(`experiences.${i}.ended_at`)}
                                    type="date"
                                    value={isCurrent ? today : field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value || null)}
                                    disabled={!!isCurrent}
                                    className={`${inputBase}${isCurrent ? " opacity-40 cursor-not-allowed" : ""}`}
                                  />
                                )}
                              />
                              <ErrorText path={`experiences.${i}.ended_at`} />
                            </div>

                            <div>
                              <Label required>Company and Country</Label>
                              <input
                                id={pathToFieldId(`experiences.${i}.employer`)}
                                type="text"
                                {...register(`experiences.${i}.employer`)}
                                className={inputBase}
                                placeholder="e.g. ABC School, Singapore"
                              />
                              <ErrorText path={`experiences.${i}.employer`} />
                            </div>

                            <div>
                              <Label required>Position</Label>
                              <input
                                id={pathToFieldId(`experiences.${i}.title`)}
                                type="text"
                                {...register(`experiences.${i}.title`)}
                                className={inputBase}
                                placeholder="e.g. Senior Teacher"
                              />
                              <ErrorText path={`experiences.${i}.title`} />
                            </div>

                            <div>
                              <Label>Last Withdrawn Salary</Label>
                              <input
                                id={pathToFieldId(`experiences.${i}.salary`)}
                                type="text"
                                {...register(`experiences.${i}.salary`)}
                                className={inputBase}
                                placeholder="e.g. SGD 5,000 / month"
                              />
                              <ErrorText path={`experiences.${i}.salary`} />
                            </div>

                            <div>
                              <Label>Other Allowances</Label>
                              <input
                                id={pathToFieldId(`experiences.${i}.other_allowances`)}
                                type="text"
                                {...register(`experiences.${i}.other_allowances` as const)}
                                className={inputBase}
                                placeholder="e.g. Transport, housing"
                              />
                              <ErrorText path={`experiences.${i}.other_allowances`} />
                            </div>

                            <div className="md:col-span-2">
                              <Label>Reason for Leaving</Label>
                              <textarea
                                id={pathToFieldId(`experiences.${i}.reason_for_leaving`)}
                                {...register(`experiences.${i}.reason_for_leaving` as const)}
                                rows={3}
                                placeholder="Why you left this role"
                                className={`${inputBase} resize-none`}
                              />
                              <ErrorText path={`experiences.${i}.reason_for_leaving`} />
                            </div>

                            <div className="md:col-span-2">
                              <Controller
                                control={control}
                                name={`experiences.${i}.is_current_employer`}
                                render={({ field }) => (
                                  <label
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all select-none w-full ${
                                      field.value
                                        ? "border-blue-400 bg-blue-50 text-blue-700"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                    }`}>
                                    <input
                                      id={pathToFieldId(`experiences.${i}.is_current_employer`)}
                                      type="checkbox"
                                      checked={!!field.value}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        field.onChange(checked);
                                        if (checked) {
                                          setValue(`experiences.${i}.ended_at`, null, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          });
                                        }
                                      }}
                                      className="sr-only"
                                    />
                                    {field.value ? (
                                      <svg className="w-4 h-4 flex-shrink-0 fill-current" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          clipRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        />
                                      </svg>
                                    ) : (
                                      <span className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                                    )}
                                    I currently work here
                                  </label>
                                )}
                              />
                              <ErrorText path={`experiences.${i}.is_current_employer`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <AddButton
                      onClick={() =>
                        appendExperience({
                          title: "",
                          employer: "",
                          salary: "",
                          started_at: "",
                          ended_at: null,
                          is_current_employer: false,
                          description: "",
                        })
                      }
                      label="Add Experience"
                    />
                  </div>
                </div>

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="08"
                    title="Additional Information"
                    subtitle="Other details relevant to your application"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderFieldBlock(
                      getField("membershipsassociations", "Memberships & Associations"),
                      "md:col-span-2",
                    )}
                    {renderFieldBlock(
                      getField(
                        "description",
                        "Briefly share your skills, experiences, and achievements beyond your resume",
                      ),
                      "md:col-span-2",
                    )}
                  </div>
                </div>

                <div className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="09"
                    title="Declaration"
                    subtitle="Please answer all questions honestly. All information is kept confidential."
                  />
                  <div className="space-y-6">
                    {declarationQuestions.map((question, i) => {
                      const current = watchedDeclarations?.[i];

                      return (
                        <div key={i} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                          <p className="text-sm text-slate-700 mb-3 leading-relaxed font-medium">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mr-2.5">
                              {i + 1}
                            </span>
                            {question}
                            <span className="text-rose-400 ml-1">*</span>
                          </p>

                          <div id={pathToFieldId(`declarations.${i}.answer`)} tabIndex={-1} className="flex gap-3">
                            {(["Yes", "No"] as const).map((option) => (
                              <label
                                key={option}
                                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all select-none ${
                                  current?.answer === option
                                    ? option === "Yes"
                                      ? "border-amber-400 bg-amber-50 text-amber-700"
                                      : "border-emerald-400 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                }`}>
                                <input
                                  type="radio"
                                  value={option}
                                  checked={current?.answer === option}
                                  onChange={() => {
                                    setValue(`declarations.${i}.answer`, option, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });

                                    if (option === "No") {
                                      setValue(`declarations.${i}.details`, "", {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      });
                                    }
                                  }}
                                  className="sr-only"
                                />
                                {current?.answer === option && (
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    />
                                  </svg>
                                )}
                                {option}
                              </label>
                            ))}
                          </div>
                          <ErrorText path={`declarations.${i}.answer`} />

                          {current?.answer === "Yes" && (
                            <div className="mt-3">
                              <textarea
                                id={pathToFieldId(`declarations.${i}.details`)}
                                rows={3}
                                {...register(`declarations.${i}.details`)}
                                placeholder="Please provide details..."
                                className={`${inputBase} resize-none`}
                              />
                              <ErrorText path={`declarations.${i}.details`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div id={pathToFieldId("references.root")} className={`${cardBase} p-8`}>
                  <SectionHeader
                    number="10"
                    title="Character References"
                    subtitle="Please provide at least 3 references"
                  />

                  <div className="mb-5 -mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                    NOTE: Kindly provide the details of your character references, such as an HR representative, direct supervisor or a colleague/coworker.
                  </div>

                  <div className="flex items-center gap-2 mb-5">
                    {[0, 1, 2].map((i) => {
                      const filled =
                        watchedReferences?.[i] &&
                        watchedReferences[i].name.trim() &&
                        watchedReferences[i].email.trim() &&
                        watchedReferences[i].contact_no.trim() &&
                        watchedReferences[i].relationship.trim();

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            filled
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}>
                          {filled ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <span className="w-3 h-3 rounded-full border-2 border-current inline-block" />
                          )}
                          Reference {i + 1}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    {referenceFields.map((ref, i) => (
                      <div key={ref.id} className="relative p-6 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Reference {i + 1}
                          </span>
                          {referenceFields.length > 1 && <RemoveButton onClick={() => removeReference(i)} />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label required>Name</Label>
                            <input
                              id={pathToFieldId(`references.${i}.name`)}
                              type="text"
                              {...register(`references.${i}.name`)}
                              className={inputBase}
                              placeholder="Full name"
                            />
                            <ErrorText path={`references.${i}.name`} />
                          </div>

                          <div>
                            <Label required>Email</Label>
                            <input
                              id={pathToFieldId(`references.${i}.email`)}
                              type="email"
                              {...register(`references.${i}.email`)}
                              className={inputBase}
                              placeholder="email@example.com"
                            />
                            <ErrorText path={`references.${i}.email`} />
                          </div>

                          <div>
                            <Label required>Contact Number</Label>

                            <input
                              id={pathToFieldId(`references.${i}.contact_no`)}
                              type="tel"
                              {...register(`references.${i}.contact_no`)}
                              className={inputBase}
                              placeholder="+65 9123 4567"
                            />
                            <ErrorText path={`references.${i}.contact_no`} />
                          </div>

                          <div>
                            <Label required>Company &amp; Occupation</Label>
                            <input
                              id={pathToFieldId(`references.${i}.company_occupation`)}
                              type="text"
                              {...register(`references.${i}.company_occupation`)}
                              className={inputBase}
                              placeholder="e.g. Acme Corp, Senior Manager"
                            />
                            <ErrorText path={`references.${i}.company_occupation`} />
                          </div>

                          <div>
                            <Label required>Relationship to Applicant</Label>

                            <input
                              id={pathToFieldId(`references.${i}.relationship`)}
                              type="text"
                              {...register(`references.${i}.relationship`)}
                              className={inputBase}
                              placeholder="e.g. Former Supervisor, Colleague"
                            />
                            <ErrorText path={`references.${i}.relationship`} />
                          </div>

                          <div>
                            <Label required>Years Known</Label>
                            <input
                              id={pathToFieldId(`references.${i}.years_known`)}
                              type="text"
                              {...register(`references.${i}.years_known`)}
                              className={inputBase}
                              placeholder="e.g. 5"
                            />
                            <ErrorText path={`references.${i}.years_known`} />
                          </div>

                          <div className="mt-4 col-span-2">
                            <Label required>
                              Do you agree to send this reference the appropriate verification form based on your answer
                              above?
                            </Label>
                            <div
                              id={pathToFieldId(`references.${i}.consent_to_contact`)}
                              tabIndex={-1}
                              className="flex gap-3 pt-1">
                              {[
                                { value: "I agree", label: "I agree" },
                                { value: "I don't agree", label: "I don't agree" },
                              ].map(({ value, label }) => {
                                const current = watch(`references.${i}.consent_to_contact`);
                                const isSelected = String(current) === value;

                                return (
                                  <label
                                    key={value}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all select-none ${
                                      isSelected
                                        ? value === "I agree"
                                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                          : "border-rose-400 bg-rose-50 text-rose-700"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                    }`}>
                                    <input
                                      type="radio"
                                      value={value}
                                      {...register(`references.${i}.consent_to_contact`, {
                                        setValueAs: (v) => v,
                                      })}
                                      className="sr-only"
                                    />
                                    {isSelected && (
                                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          clipRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        />
                                      </svg>
                                    )}
                                    {label}
                                  </label>
                                );
                              })}
                            </div>
                            <ErrorText path={`references.${i}.consent_to_contact`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <AddButton
                      onClick={() =>
                        appendReference({
                          name: "",
                          email: "",
                          contact_no: "",
                          company_occupation: "",
                          relationship: "",
                          is_work_related: "No",
                          years_known: "",
                          consent_to_contact: "I agree",
                        })
                      }
                      label="Add Reference"
                    />
                    {referenceCompletedCount >= 3 && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Minimum references met
                      </span>
                    )}
                  </div>
                </div>

                <ConsentDeclarations
                  declareConsent={declareConsent}
                  declareTruth={declareTruth}
                  setDeclareConsent={setDeclareConsent}
                  setDeclareTruth={setDeclareTruth}
                />

                <ApplicationNote />

                <div
                  id="submit-application-action"
                  className="relative bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Trust + Info */}
                  <div className="flex items-start gap-3 text-sm text-slate-500">
                    <div className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>

                    <div className="leading-relaxed max-w-xl">
                      <p className="text-slate-500 text-balance">
                        By submitting, you confirm that all information provided is{" "}
                        <span className="font-medium text-slate-700">accurate</span> and complete. You won’t be able to
                        edit this after submission.
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      disabled={submitting}
                      className="cursor-pointer px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all">
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !declareTruth || !declareConsent}
                      className="cursor-pointer flex justify-center items-center gap-2 px-7 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200 active:scale-[0.98]">
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <ArrowUpRight className="size-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Optional subtle divider accent */}
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
