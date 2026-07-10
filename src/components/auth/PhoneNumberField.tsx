import PhoneInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import "react-phone-number-input/style.css"

type PhoneNumberFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function PhoneNumberField({ id, value, onChange, required }: PhoneNumberFieldProps) {
  return (
    <PhoneInput
      id={id}
      flags={flags}
      defaultCountry="GH"
      international
      countryCallingCodeEditable={false}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      placeholder="Enter your phone number here"
      required={required}
      className="care-phone-input"
    />
  )
}
