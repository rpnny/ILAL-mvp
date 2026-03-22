import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SessionStatusCard from '../../components/SessionStatusCard';

const mockGetSessionStatus = vi.fn();
const mockRenewSession = vi.fn();

vi.mock('../../lib/api', () => ({
  getSessionStatus: (...args: any[]) => mockGetSessionStatus(...args),
  renewSession: (...args: any[]) => mockRenewSession(...args),
}));

vi.mock('../../lib/auth', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, disabled, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('SessionStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "No Wallet Linked" when no walletAddress', () => {
    render(<SessionStatusCard />);
    expect(screen.getByText('No Wallet Linked')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    mockGetSessionStatus.mockReturnValue(new Promise(() => {}));
    const { container } = render(<SessionStatusCard walletAddress="0x1234" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows active session status', async () => {
    mockGetSessionStatus.mockResolvedValue({
      active: true,
      remainingSeconds: 72000,
      expiresAt: Date.now() / 1000 + 72000,
    });

    render(<SessionStatusCard walletAddress="0x1234" />);

    await waitFor(() => {
      expect(screen.getByText('Session Active')).toBeInTheDocument();
    });
    expect(screen.getByText('Compliance Session')).toBeInTheDocument();
  });

  it('shows expired session and renew button', async () => {
    mockGetSessionStatus.mockResolvedValue({
      active: false,
      remainingSeconds: 0,
      expiresAt: null,
    });

    render(<SessionStatusCard walletAddress="0x1234" />);

    await waitFor(() => {
      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });
    expect(screen.getByText('Renew Session')).toBeInTheDocument();
  });

  it('shows expiring session warning', async () => {
    mockGetSessionStatus.mockResolvedValue({
      active: true,
      remainingSeconds: 3600,
      expiresAt: Date.now() / 1000 + 3600,
    });

    render(<SessionStatusCard walletAddress="0x1234" />);

    await waitFor(() => {
      expect(screen.getByText('Session Expiring')).toBeInTheDocument();
    });
    expect(screen.getByText('Renew Session')).toBeInTheDocument();
  });

  it('shows unknown state on API error', async () => {
    mockGetSessionStatus.mockRejectedValue(new Error('network'));

    render(<SessionStatusCard walletAddress="0x1234" />);

    await waitFor(() => {
      expect(screen.getByText('Session Unknown')).toBeInTheDocument();
    });
  });
});
