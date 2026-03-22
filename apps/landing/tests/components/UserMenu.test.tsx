import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserMenu from '../../components/UserMenu';

const mockLogout = vi.fn();
let mockUser: any = null;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  it('renders nothing when user is null', () => {
    mockUser = null;
    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('renders user avatar and email when logged in', () => {
    mockUser = { id: '1', email: 'test@ilal.io', name: 'Test User', plan: 'PRO' };
    render(<UserMenu />);
    expect(screen.getByText('test@ilal.io')).toBeInTheDocument();
  });

  it('opens dropdown menu on click', () => {
    mockUser = { id: '1', email: 'test@ilal.io', name: 'Test User', plan: 'PRO' };
    render(<UserMenu />);

    const button = screen.getByText('test@ilal.io').closest('button')!;
    fireEvent.click(button);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('PRO Plan')).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Usage Dashboard')).toBeInTheDocument();
  });

  it('shows email as name fallback when name is missing', () => {
    mockUser = { id: '1', email: 'noname@ilal.io', plan: 'FREE' };
    render(<UserMenu />);

    const button = screen.getByText('noname@ilal.io').closest('button')!;
    fireEvent.click(button);

    const emailElements = screen.getAllByText('noname@ilal.io');
    expect(emailElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('FREE Plan')).toBeInTheDocument();
  });

  it('links to correct dashboard routes', () => {
    mockUser = { id: '1', email: 'test@ilal.io', plan: 'FREE' };
    render(<UserMenu />);

    const button = screen.getByText('test@ilal.io').closest('button')!;
    fireEvent.click(button);

    const apiKeysLink = screen.getByText('API Keys').closest('a');
    const usageLink = screen.getByText('Usage Dashboard').closest('a');

    expect(apiKeysLink?.getAttribute('href')).toBe('/dashboard/api-keys');
    expect(usageLink?.getAttribute('href')).toBe('/dashboard');
  });
});
