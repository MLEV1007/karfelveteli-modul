"use client"

import { useState } from "react"
import DateField, { DateTimeField } from "@/components/ui/DateField"

export default function DateFieldDemo() {
  const [date, setDate] = useState("")
  const [dateTime, setDateTime] = useState("")
  const [accident, setAccident] = useState("")

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <DateField label="Dátum" id="demo-date" name="demoDate" value={date} onChange={setDate} />
      <output data-testid="date-value">{date}</output>

      <DateTimeField
        label="Időpont"
        id="demo-datetime"
        name="demoDateTime"
        value={dateTime}
        onChange={setDateTime}
      />
      <output data-testid="datetime-value">{dateTime}</output>

      <DateTimeField
        label="Baleset időpontja"
        id="demo-accident"
        name="demoAccident"
        value={accident}
        onChange={setAccident}
        required
        disallowFuture
      />
      <output data-testid="accident-value">{accident}</output>
    </main>
  )
}
