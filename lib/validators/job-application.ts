import { z } from "zod";

const requiredText = (message: string) => z.string().trim().min(1, message);
const textField = z.string().trim();
const optionalText = z.string().trim().optional().default("");

const digitsOnly = /^\d+$/;
const postalCodeRegex = /^\d{4}$/;
const phoneRegex = /^[0-9+\-\s()]+$/;

const salaryCurrencyEnum = z.enum(["SGD", "USD", "EUR", "GBP", "PHP"]);
const residentialStatusEnum = z.enum(["Filipino Citizen", "Permanent Resident", "OFW", "Work Visa Holder", "Foreigner"]);
const declarationAnswerEnum = z.enum(["Yes", "No"]);

export const workPassOptions = [
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

export const workPassEnum = z.enum(workPassOptions);

export const declarationSchema = z
  .object({
    answer: declarationAnswerEnum,
    details: optionalText,
  })
  .superRefine((value, ctx) => {
    if (value.answer === "Yes" && !value.details?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["details"],
        message: "Please provide details",
      });
    }
  });

export const familyMemberSchema = z.object({
  name: requiredText("Family member name is required"),
  relationship: requiredText("Relationship is required"),
  nationality: requiredText("Nationality is required"),
  age: z.string().trim().regex(digitsOnly, "Age must contain numbers only"),
  occupation: requiredText("Occupation is required"),
  company: requiredText("Company is required"),
});

export const educationSchema = z.object({
  school: requiredText("School / institution is required"),
  degree_name: requiredText("Highest qualification is required"),
  specialization: optionalText,
  started_at: requiredText("Start date is required"),
  ended_at: z.string().trim().nullable().optional(),
  location: optionalText,
  description: optionalText,
});

export const experienceSchema = z
  .object({
    title: requiredText("Job title is required"),
    employer: requiredText("Employer is required"),
    salary: optionalText,
    other_allowances: optionalText,
    reason_for_leaving: optionalText,
    started_at: requiredText("Start date is required"),
    ended_at: z.string().trim().nullable().optional(),
    is_current_employer: z.boolean(),
    description: optionalText,
  })
  .superRefine((value, ctx) => {
    if (!value.is_current_employer && !value.ended_at?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ended_at"],
        message: "End date is required unless currently working here",
      });
    }
  });

export const characterReferenceSchema = z.object({
  name: requiredText("Name is required"),
  email: requiredText("Email is required").email("Invalid email"),
  contact_no: requiredText("Contact number is required").refine((v) => phoneRegex.test(v), "Contact number is invalid"),
  company_occupation: requiredText("Occupation & company is required"),
  relationship: requiredText("Relationship is required"),
  is_work_related: z.enum(["Yes", "No"]),
  years_known: z.string().trim().regex(digitsOnly, "Years known must contain numbers only"),
  consent_to_contact: z.enum(["I agree", "I don't agree"]),
});

export const jobApplicationSchema = z
  .object({
    expected_salary: z
      .string()
      .trim()
      .min(1, "Expected salary is required")
      .refine((v) => digitsOnly.test(v), "Expected salary must contain numbers only"),

    expected_salary_currency: salaryCurrencyEnum.default("SGD"),

    linkedin: z.url().optional().or(z.literal("")),

    industries: z.array(z.string()).nonempty("Work industry is required"),
    years_of_experience: z
      .string()
      .trim()
      .min(1, "Years of experience is required")
      .refine((v) => digitsOnly.test(v), "Years of experience must contain numbers only"),

    resume: requiredText("Please upload a resume file"),

    is_referred: z.boolean().default(false),
    referrer_details: z
      .object({
        referrer_name: optionalText,
        referrer_email: z.union([z.literal(""), z.string().trim().email("Referrer email is invalid")]),
      })
      .default({
        referrer_name: "",
        referrer_email: "",
      }),

    is_applying_for_teacher: z.boolean().default(false),
    preferredsubjectsandlevels: optionalText,

    full_name: requiredText("Full name is required"),
    preferredname: requiredText("Preferred name is required"),
    residentialstatus: residentialStatusEnum,
    nationalities: requiredText("Nationality is required"),
    birth_date: requiredText("Date of birth is required"),
    placeofbirth: requiredText("Place of birth is required"),
    gender: requiredText("Gender is required"),
    religion: requiredText("Religion is required"),
    nricfin: z.string().trim().optional().default(""),
    latest_degree: requiredText("Highest qualification is required"),
    passportno: requiredText("Passport number is required"),
    placedateofissue: requiredText("Place & date of issue is required"),

    phone_number: requiredText("WhatsApp number is required").refine(
      (v) => phoneRegex.test(v),
      "WhatsApp number is invalid",
    ),
    email: z.string().trim().min(1, "Email is required").email("Email is invalid"),
    city: requiredText("City / District is required"),
    address: requiredText("Complete address is required"),
    postalcode: z
      .string()
      .trim()
      .min(1, "Postal code is required")
      .refine((v) => postalCodeRegex.test(v), "Postal code must be 4 digits"),
    overseasaddress: optionalText,
    workpermitpass: z.union([z.literal(""), workPassEnum]).default(""),

    name: optionalText,
    relationship: optionalText,
    address_b: optionalText,
    mobilenumber: optionalText,
    hometelephonenumber: optionalText,
    officetelephonenumber: optionalText,
    emailaddress: optionalText,

    family_members: z.array(familyMemberSchema).min(1, "Please provide at least 1 family member"),

    educations: z.array(educationSchema).min(1, "Please provide at least 1 education entry"),

    coursename: optionalText,
    coursestartdate: optionalText,
    expectedyearofcompletion: z
      .string()
      .trim()
      .refine((v) => !v || /^\d{4}$/.test(v), "Expected year of completion must be a 4-digit year"),

    experiences: z.array(experienceSchema).min(1, "Please provide at least 1 experience entry"),

    membershipsassociations: optionalText,
    description: optionalText,

    declarations: z.array(declarationSchema).length(5, "Please answer all declaration questions"),

    references: z.array(characterReferenceSchema).min(3, "Please provide at least 3 character references"),

    skipbackgroundcheck: z.boolean().default(false),
    rcbcrequestissued: z.boolean().default(false),
    bcrequestissued: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.is_referred) {
      if (!value.referrer_details.referrer_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["referrer_details", "referrer_name"],
          message: "Referrer name is required",
        });
      }

      if (!value.referrer_details.referrer_email?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["referrer_details", "referrer_email"],
          message: "Referrer email is required",
        });
      }
    }

    if (value.is_applying_for_teacher && !value.preferredsubjectsandlevels?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredsubjectsandlevels"],
        message: "Preferred subjects and levels is required",
      });
    }

    if (value.residentialstatus === "Foreigner") {
      if (!value.workpermitpass?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["workpermitpass"],
          message: "Work pass is required",
        });
      }

      if (!value.overseasaddress?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overseasaddress"],
          message: "Overseas address is required",
        });
      }
    }
  });

export type JobApplicationFormValues = z.infer<typeof jobApplicationSchema>;
