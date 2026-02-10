import { VerificationFlow } from '@/components/VerificationFlow';
import { SessionStatus } from '@/components/SessionStatus';

export default function Home() {
  return (
    <main>
      <SessionStatus />
      <VerificationFlow />
    </main>
  );
}
