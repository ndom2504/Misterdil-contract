import { Redirect } from 'expo-router';

// The centre tab button opens /nouveau directly; this route only exists to hold its slot.
export default function Create() {
  return <Redirect href="/nouveau" />;
}
