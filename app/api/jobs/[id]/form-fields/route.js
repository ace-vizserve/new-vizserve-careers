export async function GET() {
  return Response.json({
    fields: [
      // ── Section 01 — Application Info ───────────────────────
      { id: "expected_salary",         slug: "expected_salary",         name: "expected_salary",         label: "Expected Salary",                                                    type: "char",     required: false },
      { id: "linkedin",                slug: "linkedin",                name: "linkedin",                label: "LinkedIn Profile URL",                                               type: "url",      required: false, field_category: "social_media" },
      { id: "industries",              slug: "industries",              name: "industries",              label: "Work Industry",                                                      type: "select",   required: false },
      { id: "years_of_experience",     slug: "years_of_experience",     name: "years_of_experience",     label: "Years of Experience",                                                type: "char",     required: false },
      { id: "resume",                  slug: "resume",                  name: "resume",                  label: "Resume",                                                             type: "file",     required: true,  field_category: "resume" },

      // ── Section 02 — Personal Information ───────────────────
      { id: "full_name",               slug: "full_name",               name: "full_name",               label: "Full Name",                                                          type: "char",     required: true  },
      { id: "preferredname",           slug: "preferredname",           name: "preferredname",           label: "Preferred Name",                                                     type: "char",     required: false },
      { id: "residentialstatus",       slug: "residentialstatus",       name: "residentialstatus",       label: "Residential Status",                                                 type: "select",   required: false, options: ["Filipino Citizen", "Permanent Resident", "OFW", "Work Visa Holder", "Dependent Pass Holder", "Foreigner"] },
      { id: "nationalities",           slug: "nationalities",           name: "nationalities",           label: "Nationality",                                                        type: "char",     required: false },
      { id: "birth_date",              slug: "birth_date",              name: "birth_date",              label: "Date of Birth",                                                      type: "date",     required: false },
      { id: "gender",                  slug: "gender",                  name: "gender",                  label: "Gender",                                                             type: "select",   required: false, options: ["Male", "Female", "Prefer not to say"] },
      { id: "religion",                slug: "religion",                name: "religion",                label: "Religion",                                                           type: "char",     required: false },
      { id: "nricfin",                 slug: "nricfin",                 name: "nricfin",                 label: "National ID",                                                        type: "char",     required: false },
      { id: "latest_degree",           slug: "latest_degree",           name: "latest_degree",           label: "Highest Qualification",                                              type: "char",     required: false },
      { id: "city",                    slug: "city",                    name: "city",                    label: "City / District",                                            type: "char",     required: false },
      { id: "passportno",              slug: "passportno",              name: "passportno",              label: "Passport Number",                                                    type: "char",     required: false },
      { id: "placedateofissue",        slug: "placedateofissue",        name: "placedateofissue",        label: "Place & Date of Issue",                                              type: "char",     required: false },

      // ── Section 03 — Contact Information ────────────────────
      { id: "phone_number",            slug: "phone_number",            name: "phone_number",            label: "WhatsApp Number",                                                    type: "tel",      required: true,  placeholder: "+65 9123 4567" },
      { id: "email",                   slug: "email",                   name: "email",                   label: "Email",                                                              type: "email",    required: true,  placeholder: "you@email.com" },
      { id: "address",                 slug: "address",                 name: "address",                 label: "Complete Address",                                                   type: "char",     required: false },
      { id: "postalcode",              slug: "postalcode",              name: "postalcode",              label: "Postal Code",                                                        type: "char",     required: false },

      // ── Section 04 — Emergency Contact ──────────────────────
      { id: "name",                    slug: "name",                    name: "name",                    label: "Emergency Contact Name",                                             type: "char",     required: true  },
      { id: "relationship",            slug: "relationship",            name: "relationship",            label: "Emergency Contact Relationship",                                     type: "char",     required: true  },
      { id: "address_b",               slug: "address_b",               name: "address_b",               label: "Emergency Contact Address",                                          type: "char",     required: true  },
      { id: "mobilenumber",            slug: "mobilenumber",            name: "mobilenumber",            label: "Emergency Contact Mobile Number",                                    type: "tel",      required: true,  placeholder: "+65 9123 4567" },
      { id: "hometelephonenumber",     slug: "hometelephonenumber",     name: "hometelephonenumber",     label: "Emergency Contact Home Telephone Number",                            type: "tel",      required: false, placeholder: "+65 9123 4567" },
      { id: "officetelephonenumber",   slug: "officetelephonenumber",   name: "officetelephonenumber",   label: "Emergency Contact Office Telephone Number",                          type: "tel",      required: false, placeholder: "+65 9123 4567" },
      { id: "emailaddress",            slug: "emailaddress",            name: "emailaddress",            label: "Emergency Contact Email Address",                                    type: "email",    required: true,  placeholder: "you@email.com" },

      // ── Section 07 — Other Courses Currently Pursuing ───────
      { id: "coursename",              slug: "coursename",              name: "coursename",              label: "Course Name",                                                        type: "char",     required: false },
      { id: "coursestartdate",         slug: "coursestartdate",         name: "coursestartdate",         label: "Course Start Date",                                                  type: "date",     required: false },
      { id: "expectedyearofcompletion",slug: "expectedyearofcompletion",name: "expectedyearofcompletion",label: "Expected Year of Completion",                                        type: "char",     required: false, placeholder: "e.g. 2025" },

      // ── Section 09 — Additional Information ─────────────────
      { id: "membershipsassociations", slug: "membershipsassociations", name: "membershipsassociations", label: "Memberships & Associations",                                         type: "char",     required: false },
      { id: "description",             slug: "description",             name: "description",             label: "Briefly share your skills, experiences, and achievements beyond your resume", type: "textarea", required: false },
    ],
  });
}
