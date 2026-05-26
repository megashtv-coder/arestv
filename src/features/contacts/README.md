# Contact Picker Feature

Modern contact import system for adding customers using device contacts.

## Overview

This feature allows users to import contact information (name, phone) directly from their device's contact list when creating new customers. Perfect for mobile and PWA users.

## Features

✅ **Contact Picker API** - Modern browser Contact Picker API integration  
✅ **Mobile Optimized** - Touch-friendly, mobile-first design  
✅ **Graceful Fallback** - Disabled button with explanation for unsupported devices  
✅ **Error Handling** - Comprehensive error handling and user feedback  
✅ **Data Validation** - Validates imported contact data before use  
✅ **Privacy Focused** - Only imports selected contact, no background sync  
✅ **TypeScript** - Full type support  

## Browser Support

| Platform | Support | Notes |
|----------|---------|-------|
| Android Chrome | ✅ Yes | Full support for Contact Picker API |
| iPhone Safari | ⚠️ Partial | Via PWA (add to home screen) |
| Chrome Desktop | ⚠️ Partial | Limited contact access |
| Firefox | ❌ No | Contact Picker not supported |

## Usage

### Import Button in Form

```tsx
import { ContactImportButton } from '@/features/contacts'

export function CustomerForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  return (
    <>
      {/* Name fields */}
      <input value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input value={lastName} onChange={e => setLastName(e.target.value)} />
      
      {/* Contact Import Button */}
      <ContactImportButton
        onSelect={(contact) => {
          setFirstName(contact.firstName)
          setLastName(contact.lastName)
          setPhone(contact.phone)
        }}
        onError={(error) => console.error(error)}
      />
      
      {/* Phone field */}
      <input value={phone} onChange={e => setPhone(e.target.value)} />
    </>
  )
}
```

### Using the Hook

```tsx
import { useContactPicker } from '@/features/contacts'

export function MyComponent() {
  const { isSupported, loading, error, importContact } = useContactPicker()

  const handleImport = async () => {
    const contact = await importContact()
    if (contact) {
      console.log(`Imported: ${contact.firstName} ${contact.lastName}`)
    }
  }

  if (!isSupported) return <p>Not supported</p>
  
  return (
    <button onClick={handleImport} disabled={loading}>
      {loading ? 'Loading...' : 'Import Contact'}
    </button>
  )
}
```

### Using the Service

```tsx
import { selectContact, validateContact, mapContactData } from '@/features/contacts'

async function importContactManually() {
  try {
    const contact = await selectContact()
    if (contact) {
      const validation = validateContact(contact)
      if (validation.isValid) {
        // Use contact data
        console.log(contact)
      }
    }
  } catch (error) {
    console.error('Import failed:', error)
  }
}
```

## Component API

### ContactImportButton

```tsx
interface ContactImportButtonProps {
  // Callback when contact is selected
  onSelect: (contact: ImportedContact) => void
  
  // Optional error callback
  onError?: (error: string) => void
  
  // CSS class
  className?: string
  
  // Visual variant: 'primary' | 'secondary' | 'outline'
  variant?: 'primary' | 'secondary' | 'outline'
}
```

## Hook API

### useContactPicker

```tsx
const {
  isSupported,     // boolean - device supports Contact Picker
  loading,         // boolean - import in progress
  error,           // string | null - error message
  importContact,   // () => Promise<ImportedContact | null>
  clearError,      // () => void - clear error message
} = useContactPicker()
```

## Service API

### selectContact()

```ts
// Opens contact picker and returns selected contact
const contact = await selectContact()
// Returns: ImportedContact | null
```

### mapContactData()

```ts
// Maps Contact Picker API response to ImportedContact
const contact = mapContactData(pickerResponse)
```

### validateContact()

```ts
// Validates contact data
const { isValid, errors } = validateContact(contact)
```

### cleanPhoneNumber()

```ts
// Cleans phone number - removes spaces, dashes, parentheses
const clean = cleanPhoneNumber('(44) 123-4567') // '441234567'
```

## Types

```ts
interface ImportedContact {
  firstName: string
  lastName: string
  phone: string
}
```

## Error Handling

The component handles these error scenarios:

1. **Unsupported Device** - Button is disabled with tooltip
2. **Permission Denied** - User-friendly error message
3. **No Contact Selected** - Silently returns (user cancelled)
4. **Invalid Data** - Shows validation errors
5. **API Error** - Shows error details

## Privacy & Security

✅ **Only selected contact imported** - User chooses which contact  
✅ **No background sync** - No automatic data collection  
✅ **No data stored** - Contact only used to pre-fill form  
✅ **No tracking** - No analytics on imported contacts  
✅ **User control** - Can always clear imported data  

## Mobile Best Practices

- ✅ Touch-friendly button size (44x44px minimum)
- ✅ Responsive design for all screen sizes
- ✅ Clear loading states
- ✅ Proper error messages
- ✅ Works in PWA mode
- ✅ Accessible (keyboard navigation, ARIA labels)

## Example Integration

See `src/pages/Customers.jsx` for full integration example:

```jsx
<ContactImportButton
  variant="secondary"
  onSelect={(contact) => {
    setFirstName(contact.firstName)
    setLastName(contact.lastName)
    setPhone(contact.phone)
    showToast(`✓ Kontakti u importua: ${contact.firstName}`)
  }}
  onError={(error) => setErr(error)}
/>
```

## Testing

### Test Scenarios

1. **Supported Device** - Button works and imports contact
2. **Unsupported Device** - Button disabled with message
3. **User Cancellation** - No error, just returns null
4. **Invalid Contact** - Shows validation error
5. **Multiple Imports** - Can import multiple contacts in same form

### Test with Debug

```tsx
import { isContactPickerSupported } from '@/features/contacts'

useEffect(() => {
  console.log('Contact Picker Supported:', isContactPickerSupported())
}, [])
```

## Troubleshooting

### Button is disabled

1. Check if device/browser supports Contact Picker API
2. Check browser console for errors
3. Verify permission settings on device

### Contact not importing

1. Ensure contact has name and phone fields filled
2. Check if phone number is valid format
3. Check validation in browser console

### Permission errors

1. Grant contacts permission in device settings
2. Try in incognito/private mode
3. Refresh page and try again

## File Structure

```
src/features/contacts/
├── contactService.ts      # Core API wrapper
├── useContactPicker.ts    # React hook
├── ContactImportButton.tsx # Button component
├── index.ts               # Exports
└── README.md              # This file
```

## References

- [Contact Picker API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API)
- [Chrome Platform Status](https://chromestatus.com/feature/6511327140904960)
- [Can I use](https://caniuse.com/mdn-api_contactsmanager)

---

**Version**: 1.0.0  
**Status**: Production Ready ✅
