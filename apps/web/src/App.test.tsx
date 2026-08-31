import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { getApiHealthMock } = vi.hoisted(() => ({ getApiHealthMock: vi.fn() }));

vi.mock('./api-health.js', () => ({
  apiBaseUrl: 'http://api.example.test',
  getApiHealth: getApiHealthMock,
}));

import { App } from './App.js';

beforeEach(() => {
  getApiHealthMock.mockResolvedValue({ service: 'api', status: 'ok' });
});

test('renders the scaffold and reports a stubbed healthy API', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Nexus v2' })).toBeDefined();
  expect(screen.getByText('Checking')).toBeDefined();
  expect(await screen.findByText('Healthy')).toBeDefined();
  expect(screen.getByText('API endpoint: http://api.example.test')).toBeDefined();
  expect(getApiHealthMock).toHaveBeenCalledTimes(1);
});
