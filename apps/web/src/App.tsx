import { useEffect, useState } from 'react';

import { apiBaseUrl, getApiHealth } from './api-health.js';

type HealthViewState = 'checking' | 'healthy' | 'unavailable';

export const App = () => {
  const [healthState, setHealthState] = useState<HealthViewState>('checking');

  useEffect(() => {
    const controller = new AbortController();

    void getApiHealth(controller.signal)
      .then(() => setHealthState('healthy'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setHealthState('unavailable');
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <section className="panel" aria-labelledby="page-title">
        <p className="eyebrow">Phase 0 engineering harness</p>
        <h1 id="page-title">Nexus v2</h1>
        <p className="summary">
          The application scaffolds are running. No Nexus business features have been introduced.
        </p>
        <dl className="health-card">
          <div>
            <dt>Web</dt>
            <dd className="healthy">Running</dd>
          </div>
          <div>
            <dt>API</dt>
            <dd className={healthState === 'healthy' ? 'healthy' : healthState}>
              {healthState === 'checking'
                ? 'Checking'
                : healthState === 'healthy'
                  ? 'Healthy'
                  : 'Unavailable'}
            </dd>
          </div>
        </dl>
        <p className="endpoint">API endpoint: {apiBaseUrl}</p>
      </section>
    </main>
  );
};
