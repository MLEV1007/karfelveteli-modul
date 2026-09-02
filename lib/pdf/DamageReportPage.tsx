import { Page, View, Text } from "@react-pdf/renderer"
import { s, BORDER, PageHeader, PageFooter, SectionHeader, Cell, CheckCell, SignatureBlock, DamageDiagram, formatDate } from "./shared"
import type { FullPdfData } from "./types"

function formatAccidentDate(raw: string): string {
  return raw.replace("T", " ")
}

function formatLiableParty(party: string): string {
  const map: Record<string, string> = {
    own: "Én / saját gépjárművem vezetője",
    other: "A másik fél",
    both: "Mindkét résztvevő",
  }
  return map[party] || party
}

// 1. oldal — Gépjármű kárbejelentő lap
export default function DamageReportPage({ data }: { data: FullPdfData }) {
  const hasDriver = !!(data.driverName || data.driverAddress || data.driverPhone)
  const hasOtherVehicle = !!(data.otherVehiclePlate || data.otherVehicleType || data.otherVehicleColor)
  const hasLocationDetails = !!(data.roadNumber || data.kilometerMark)
  const hasDamagePoints = !!(data.damagePoints && data.damagePoints.length > 0)

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title="GÉPJÁRMŰ KÁRBEJELENTŐ LAP"
        subtitle={`Azonosító: ${data.referenceNumber} • Kitöltés időpontja: ${formatDate(data.createdAt)}`}
      />

      {/* 1. SZEMÉLYES ADATOK + JÁRMŰ ÉS BIZTOSÍTÁS */}
      <View style={[s.outerBorder, { marginTop: 4 }]}>
        <View style={s.row}>
          <View style={{ flex: 1, borderRight: BORDER }}>
            <SectionHeader title="SZEMÉLYES ADATOK" />
            <View style={s.row}>
              <Cell label="Tulajdonos (üzembentartó) neve" value={data.ownerName} flex={1} />
            </View>
            <View style={s.row}>
              <Cell label="Tulajdonos címe" value={data.ownerAddress} flex={1} />
            </View>
            {hasDriver && (
              <>
                <View style={s.row}>
                  <Cell label="Vezető neve" value={data.driverName} flex={1} />
                </View>
                {data.driverAddress && (
                  <View style={s.row}>
                    <Cell label="Vezető címe" value={data.driverAddress} flex={1} />
                  </View>
                )}
              </>
            )}
            <View style={s.row}>
              <Cell label="E-mail cím" value={data.customerEmail} flex={1} />
              <Cell label="Telefonszám" value={data.customerPhone || data.driverPhone} flex={1} noBorderRight />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <SectionHeader title="JÁRMŰ ÉS BIZTOSÍTÁSI ADATOK" />
            <View style={s.row}>
              <Cell label="Rendszám" value={data.vehiclePlate.toUpperCase()} width={80} />
              <Cell label="Gyártmány / Típus" value={`${data.vehicleMake} ${data.vehicleModel}`} flex={1} />
              {data.vehicleYear && (
                <Cell label="Évjárat" value={String(data.vehicleYear)} width={50} noBorderRight />
              )}
            </View>
            <View style={s.row}>
              <Cell label="Alvázszám (VIN)" value={data.vehicleVin} flex={1} />
            </View>
            <View style={s.row}>
              <CheckCell label="Casco biztosítás" checked={data.hasCasco} flex={1} />
              {data.cascoInsurer && (
                <Cell label="Casco biztosító" value={data.cascoInsurer} flex={1} noBorderRight />
              )}
            </View>
            {(data.liabilityInsurer || data.relevantInsurer) && (
              <View style={s.row}>
                {data.liabilityInsurer && (
                  <Cell label="Saját kötelező biztosító" value={data.liabilityInsurer} flex={1} />
                )}
                {data.relevantInsurer && (
                  <Cell
                    label="Károkozó / másik fél biztosítója"
                    value={data.relevantInsurer}
                    flex={1}
                    noBorderRight={!data.liabilityInsurer}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 2. BALESET KÖRÜLMÉNYEI */}
      <View style={s.outerBorder}>
        <SectionHeader title="A BALESET (KÁRESEMÉNY) KÖRÜLMÉNYEI" />
        <View style={s.row}>
          {data.accidentDate && (
            <Cell label="A baleset időpontja" value={formatAccidentDate(data.accidentDate)} width={120} />
          )}
          <Cell label="Ország" value={data.accidentCountry} width={90} />
          <Cell label="Város / Település" value={data.accidentCity} flex={1} />
          {data.accidentStreet && (
            <Cell label="Utca / Helyszín" value={data.accidentStreet} flex={1} noBorderRight />
          )}
        </View>
        {(data.outsideSettlement || hasLocationDetails) && (
          <View style={s.row}>
            <CheckCell label="Lakott területen kívül" checked={data.outsideSettlement} width={130} />
            {data.roadNumber && <Cell label="Út száma" value={data.roadNumber} width={80} />}
            {data.kilometerMark && (
              <Cell label="Km-szelvény" value={data.kilometerMark} flex={1} noBorderRight />
            )}
          </View>
        )}
      </View>

      {/* 3. SZEMLE HELYSZÍNE + RENDŐRSÉG */}
      <View style={s.outerBorder}>
        <View style={s.row}>
          <View style={{ flex: 1, borderRight: BORDER }}>
            <SectionHeader title="HOL TEKINTHETŐ MEG A GÉPJÁRMŰ?" />
            <View style={s.row}>
              <Cell
                label="Helyszíni szemle helyszíne"
                value={data.vehicleInspectionLocation || "M1 SZERVIZ TATA Kft. – 2890 Tata, Kalapács u. 1."}
                flex={1}
                noBorderRight
                tall
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <SectionHeader title="RENDŐRI INTÉZKEDÉS" />
            <View style={s.row}>
              <CheckCell label="Rendőrség intézkedett" checked={data.policeInvolved} flex={1} noBorderRight />
            </View>
            {data.policeStation && (
              <View style={s.row}>
                <Cell label="Intézkedő kapitányság / rendőrőrs" value={data.policeStation} flex={1} noBorderRight />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 4. MÁSIK JÁRMŰ (csak ha van adat) */}
      {hasOtherVehicle && (
        <View style={s.outerBorder}>
          <SectionHeader title="MÁSIK JÁRMŰ ADATAI" />
          <View style={s.row}>
            <Cell label="Rendszám" value={data.otherVehiclePlate} flex={1} />
            <Cell label="Típus / Gyártmány" value={data.otherVehicleType} flex={1} />
            <Cell label="Szín" value={data.otherVehicleColor} flex={1} noBorderRight />
          </View>
          {data.additionalParties && (
            <View style={s.row}>
              <Cell label="További résztvevők" value={data.additionalParties} flex={1} noBorderRight />
            </View>
          )}
        </View>
      )}

      {/* 5. KÁR LEÍRÁSA + SÉRÜLÉSI ÁBRA */}
      <View style={s.outerBorder}>
        <SectionHeader title="KÁR LEÍRÁSA ÉS SÉRÜLÉS HELYE" />
        <View style={s.row}>
          <View style={{ flex: 3, borderRight: hasDamagePoints ? BORDER : undefined }}>
            <View style={[s.cell, { minHeight: hasDamagePoints ? 130 : 60 }]}>
              <Text style={s.label}>A káresemény leírása</Text>
              <Text style={[s.value, { lineHeight: 1.5, fontWeight: "normal" }]}>
                {data.damageDescription}
              </Text>
            </View>
            {data.photoUrls && data.photoUrls.length > 0 && (
              <View style={s.row}>
                <Cell label="Csatolt fényképek száma" value={`${data.photoUrls.length} db`} flex={1} noBorderRight />
              </View>
            )}
          </View>

          {hasDamagePoints && (
            <View style={{ flex: 2, padding: 6 }}>
              <Text style={[s.label, { marginBottom: 4, textAlign: "center" }]}>
                Rajzolja be a gépjármű sérüléseit:
              </Text>
              <DamageDiagram points={data.damagePoints!} />
              <Text style={[s.label, { textAlign: "center", marginTop: 2 }]}>
                {data.damagePoints!.length} jelölt sérülési pont
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 6. NYILATKOZATOK */}
      <View style={s.outerBorder}>
        <SectionHeader title="NYILATKOZATOK" />
        <View style={s.row}>
          <View style={{ flex: 1, borderRight: BORDER }}>
            <View style={s.row}>
              <Cell label="Felelős fél megjelölése" value={formatLiableParty(data.liableParty)} flex={1} noBorderRight />
            </View>
            {data.taxNumber && (
              <View style={s.row}>
                <Cell label="Adószám (ÁFA visszaigénylés esetén)" value={data.taxNumber} flex={1} noBorderRight />
              </View>
            )}
          </View>
          <View style={{ flex: 2 }}>
            <View style={s.row}>
              <CheckCell label="Kábítószer / alkohol befolyás" checked={data.underInfluence} flex={1} />
              <CheckCell label="Érvényes jogosítvány" checked={data.licenseValid} flex={1} />
              <CheckCell label="Tulajdonjogi terhelés" checked={data.vehicleEncumbrance} flex={1} noBorderRight />
            </View>
            <View style={s.row}>
              <CheckCell label="DEKRA fotómásolási engedély" checked={data.consentToPhotocopy} flex={1} />
              <CheckCell label="CASCO alapú kárrendezés igénylése" checked={data.cascoClaimRequest} flex={2} noBorderRight />
            </View>
            {data.vehicleEncumbrance && data.encumbranceFinancier && (
              <View style={s.row}>
                <Cell label="Finanszírozó neve" value={data.encumbranceFinancier} flex={1} noBorderRight />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 7. ALÁÍRÁSOK — wrap={false}: az egész blokk (fejléc + mindkét aláírás) egyben marad,
          nem hasad ketté oldaltörésnél (különben az egyik aláírás levágva / üresen jelenne meg). */}
      <View style={s.outerBorder} wrap={false}>
        <SectionHeader title="ALÁÍRÁSOK" />
        <View style={s.row}>
          <View style={[s.cell, { flex: 1, borderRight: BORDER }]}>
            <SignatureBlock label="Tulajdonos aláírása" signatureDataUrl={data.ownerSignatureUrl} />
          </View>
          <View style={[s.cell, { flex: 1 }]}>
            {data.driverSignatureUrl ? (
              <SignatureBlock label="Vezető aláírása" signatureDataUrl={data.driverSignatureUrl} />
            ) : (
              <>
                <Text style={s.label}>Kelt:</Text>
                <Text style={[s.value, { marginTop: 8 }]}>{formatDate(data.createdAt)}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <PageFooter
        referenceNumber={data.referenceNumber}
        note="Jelen dokumentum az Ön által megadott adatok alapján digitálisan rögzítésre került. Az adatokat a GDPR előírásainak megfelelően kezeljük. A bejelentett adatok valódiságáért az ügyfél felelős."
      />
    </Page>
  )
}
