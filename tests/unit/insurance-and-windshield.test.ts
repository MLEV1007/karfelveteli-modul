import test from "node:test"
import assert from "node:assert/strict"
import {
  INSURANCE_COMPANIES,
  INSURANCE_COMPANY_LABELS,
  sortedInsuranceOptions,
  sortedInsurerNameOptions,
  damageReportSchema,
  editReportSchema,
  editReportLegacyWindshieldSchema,
} from "../../lib/validation"
import {
  getPresetDescription,
  isPresetOrEmptyDescription,
  nextDescriptionOnChange,
  normalizeWindshieldCause,
  windshieldCauseIssues,
  DAMAGE_TYPE_PRESET_DESCRIPTIONS,
} from "../../lib/damageTypes"

test("biztosítók: ABC sorrend, Egyéb utolsó, CIG és Gránit benne van", () => {
  const labels = sortedInsuranceOptions().map((o) => o.label)
  assert.deepEqual(labels, [
    "Allianz Hungária",
    "CIG Biztosító",
    "Generali Biztosító",
    "Genertel Biztosító",
    "Gránit Biztosító",
    "Groupama Biztosító",
    "K&H Biztosító",
    "Magyar Posta Biztosító",
    "Signal Iduna Biztosító",
    "UNION Biztosító",
    "UNIQA Biztosító",
    "Wáberer Hungária Biztosító",
    "Egyéb biztosító",
  ])
  assert.equal(sortedInsuranceOptions().length, INSURANCE_COMPANIES.length)
  assert.ok(!sortedInsurerNameOptions().some((o) => o.label === INSURANCE_COMPANY_LABELS.EGYEB))
  assert.equal(sortedInsurerNameOptions().length, INSURANCE_COMPANIES.length - 1)
})

test("szélvédő sablonok: KAVICS a régi mondat, EGYEB / nem szélvédős üres", () => {
  assert.equal(
    getPresetDescription("SZELVEDO_JAVITAS", "KAVICS"),
    "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a sérülés javítható."
  )
  assert.equal(getPresetDescription("SZELVEDO_CSERE", "KAVICS"), DAMAGE_TYPE_PRESET_DESCRIPTIONS.SZELVEDO_CSERE)
  assert.notEqual(getPresetDescription("SZELVEDO_CSERE", "MADAR"), "")
  assert.notEqual(getPresetDescription("SZELVEDO_JAVITAS", "IDEGEN_TARGY"), "")
  assert.equal(getPresetDescription("SZELVEDO_CSERE", "EGYEB"), "")
  assert.equal(getPresetDescription("EGYEB", "KAVICS"), "")
  assert.equal(getPresetDescription("SZELVEDO_CSERE", ""), "")
})

test("saját szöveg nem vész el okváltáskor, minden sablon felülírható", () => {
  const own = "Saját, hosszabb leírás a káresemény körülményeiről."
  assert.equal(nextDescriptionOnChange(own, "SZELVEDO_JAVITAS", "MADAR"), own)
  const kavics = getPresetDescription("SZELVEDO_JAVITAS", "KAVICS")
  assert.ok(isPresetOrEmptyDescription(kavics))
  assert.equal(nextDescriptionOnChange(kavics, "SZELVEDO_JAVITAS", "MADAR"), getPresetDescription("SZELVEDO_JAVITAS", "MADAR"))
  const madar = getPresetDescription("SZELVEDO_CSERE", "MADAR")
  assert.ok(isPresetOrEmptyDescription(madar))
  assert.equal(nextDescriptionOnChange(madar, "SZELVEDO_CSERE", "EGYEB"), "")
  assert.equal(nextDescriptionOnChange("", "SZELVEDO_CSERE", "IDEGEN_TARGY"), getPresetDescription("SZELVEDO_CSERE", "IDEGEN_TARGY"))
})

test("windshieldCauseIssues és normalizálás", () => {
  assert.equal(windshieldCauseIssues({ damageType: "EGYEB" }).length, 0)
  assert.equal(windshieldCauseIssues({ damageType: undefined }).length, 0)
  assert.equal(windshieldCauseIssues({ damageType: "SZELVEDO_CSERE" })[0].path, "windshieldCause")
  assert.equal(windshieldCauseIssues({ damageType: "SZELVEDO_CSERE", windshieldCause: "EGYEB", windshieldCauseOther: "  " })[0].path, "windshieldCauseOther")
  assert.equal(windshieldCauseIssues({ damageType: "SZELVEDO_CSERE", windshieldCause: "EGYEB", windshieldCauseOther: "x" }).length, 0)
  assert.deepEqual(normalizeWindshieldCause({ damageType: "EGYEB", windshieldCause: "KAVICS", windshieldCauseOther: "x" }), { windshieldCause: null, windshieldCauseOther: null })
  assert.deepEqual(normalizeWindshieldCause({ damageType: "SZELVEDO_CSERE", windshieldCause: "KAVICS", windshieldCauseOther: "x" }), { windshieldCause: "KAVICS", windshieldCauseOther: null })
  assert.deepEqual(normalizeWindshieldCause({ damageType: "SZELVEDO_CSERE", windshieldCause: "EGYEB", windshieldCauseOther: " valami " }), { windshieldCause: "EGYEB", windshieldCauseOther: "valami" })
  assert.deepEqual(normalizeWindshieldCause({}), { windshieldCause: undefined, windshieldCauseOther: undefined })
})

// 1x1 px, érvényes PNG
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function validReport(over: Record<string, unknown> = {}) {
  return {
    ownerType: "MAGANSZEMELY",
    ownerName: "Teszt Elek",
    ownerAddress: "1111 Budapest, Teszt u. 1.",
    idOrTaxNumber: "123456AB",
    driverSameAsOwner: true,
    customerEmail: "teszt@example.invalid",
    customerPhone: "+36 30 123 4567",
    vehiclePlate: "ABC-123",
    vehicleMake: "Skoda",
    vehicleModel: "Octavia",
    vehicleVin: "TMBJJ7NE0K0123456",
    liableParty: "other",
    hasCasco: false,
    insuranceCompany: "GRANIT",
    accidentDate: "2026-09-18T14:30",
    outsideSettlement: false,
    policeInvolved: false,
    damageType: "SZELVEDO_JAVITAS",
    windshieldCause: "KAVICS",
    damageDescription: "Az előttem haladó járműről felpattanó kavics megsértette a szélvédőt.",
    underInfluence: false,
    licenseValid: true,
    vatReclaimEligible: false,
    consentToPhotocopy: true,
    cascoClaimRequest: false,
    vehicleEncumbrance: false,
    accept8DayPayment: true,
    knowsCascoTerms: true,
    ownerSignatureUrl: PNG_1PX,
    gdprConsent: true,
    ...over,
  }
}

test("damageReportSchema: szélvédő-ok szabályok", () => {
  assert.ok(damageReportSchema.safeParse(validReport()).success)
  assert.ok(damageReportSchema.safeParse(validReport({ insuranceCompany: "CIG" })).success)
  const missing = damageReportSchema.safeParse(validReport({ windshieldCause: "" }))
  assert.ok(!missing.success && missing.error.issues.some((i) => i.path[0] === "windshieldCause"))
  const missing2 = damageReportSchema.safeParse(validReport({ windshieldCause: undefined }))
  assert.ok(!missing2.success)
  const noText = damageReportSchema.safeParse(validReport({ windshieldCause: "EGYEB", windshieldCauseOther: "   " }))
  assert.ok(!noText.success && noText.error.issues.some((i) => i.path[0] === "windshieldCauseOther"))
  assert.ok(damageReportSchema.safeParse(validReport({ windshieldCause: "EGYEB", windshieldCauseOther: "Fűnyíróból kirepülő kő" })).success)
  assert.ok(!damageReportSchema.safeParse(validReport({ windshieldCause: "NEMLETEZO" })).success)
  // EGYEB kár: nem kell ok
  assert.ok(damageReportSchema.safeParse(validReport({ damageType: "EGYEB", windshieldCause: undefined })).success)
})

test("editReportSchema: kötelező szélvédős típusnál; legacy séma nem", () => {
  const edit = { ownerName: "Teszt Elek", customerEmail: "a@b.hu", vehiclePlate: "ABC-123", vehicleMake: "A", vehicleModel: "B",
    liableParty: "own", hasCasco: false, accidentDate: "2026-09-18T14:30", outsideSettlement: false, policeInvolved: false,
    damageType: "SZELVEDO_CSERE", damageDescription: "x".repeat(25), underInfluence: false, licenseValid: true,
    vatReclaimEligible: false, consentToPhotocopy: true, cascoClaimRequest: false, vehicleEncumbrance: false }
  assert.ok(!editReportSchema.safeParse(edit).success)
  assert.ok(editReportLegacyWindshieldSchema.safeParse(edit).success)
  assert.ok(editReportSchema.safeParse({ ...edit, windshieldCause: "MADAR" }).success)
  assert.ok(!editReportSchema.safeParse({ ...edit, windshieldCause: "EGYEB" }).success)
  assert.ok(editReportSchema.safeParse({ ...edit, damageType: "EGYEB" }).success)
})
