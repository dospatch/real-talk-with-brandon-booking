import './styles.css';

export const metadata = {
  title: 'Real Talk with Brandon | Guest Booking',
  description: 'Every person has a story. Every story deserves a conversation. Apply to be a guest on Real Talk with Brandon.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
