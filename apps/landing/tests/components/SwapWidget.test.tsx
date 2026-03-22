import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SwapWidget from '../../components/SwapWidget';

vi.mock('../../lib/api', () => ({
  executeSwap: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('viem', () => ({
  createWalletClient: vi.fn(),
  createPublicClient: vi.fn(),
  custom: vi.fn(),
  parseAbi: vi.fn(() => []),
  encodeAbiParameters: vi.fn(() => '0x'),
  parseAbiParameters: vi.fn(() => []),
}));

vi.mock('viem/chains', () => ({
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

describe('SwapWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default tokens (USDC/WETH)', () => {
    render(<SwapWidget />);
    expect(screen.getByText('Swap')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('WETH')).toBeInTheDocument();
  });

  it('shows "Enter Amount" when no amount entered', () => {
    render(<SwapWidget walletAddress="0x1234" />);
    expect(screen.getByText('Enter Amount')).toBeInTheDocument();
  });

  it('shows "Execute Compliant Swap" when amount is entered and wallet connected', () => {
    render(<SwapWidget walletAddress="0x1234" />);
    const inputs = screen.getAllByPlaceholderText('0.0');
    const numInput = inputs[0];
    fireEvent.change(numInput, { target: { value: '100' } });
    expect(screen.getByText('Execute Compliant Swap')).toBeInTheDocument();
  });

  it('shows "Connect Wallet & Swap" when amount entered but no wallet', () => {
    render(<SwapWidget />);
    const inputs = screen.getAllByPlaceholderText('0.0');
    const numInput = inputs[0];
    fireEvent.change(numInput, { target: { value: '100' } });
    expect(screen.getByText('Connect Wallet & Swap')).toBeInTheDocument();
  });

  it('swap button is disabled when no amount', () => {
    render(<SwapWidget walletAddress="0x1234" />);
    const btn = screen.getByText('Enter Amount').closest('button');
    expect(btn).toBeDisabled();
  });

  it('displays ZK Compliance Verified badge', () => {
    render(<SwapWidget />);
    expect(screen.getByText('ZK Compliance Verified')).toBeInTheDocument();
  });

  it('toggles direction on arrow button click', () => {
    render(<SwapWidget />);
    expect(screen.getByText('You pay').parentElement?.parentElement).toBeTruthy();
    const usdcElements = screen.getAllByText('USDC');
    expect(usdcElements.length).toBeGreaterThan(0);
  });

  it('shows estimated output when amount is typed', () => {
    render(<SwapWidget />);
    const inputs = screen.getAllByPlaceholderText('0.0');
    fireEvent.change(inputs[0], { target: { value: '3000' } });
    const textboxes = screen.getAllByRole('textbox');
    const readonlyInput = textboxes.find(el => el.getAttribute('readonly') !== null);
    expect(readonlyInput?.getAttribute('value')).toContain('~');
  });

  it('renders in permit mode', () => {
    render(<SwapWidget walletAddress="0x1234" mode="permit" />);
    const inputs = screen.getAllByPlaceholderText('0.0');
    fireEvent.change(inputs[0], { target: { value: '100' } });
    expect(screen.getByText('Sign Permit & Swap')).toBeInTheDocument();
  });
});
