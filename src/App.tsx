import { useEffect, useState } from 'react';
import { Goals } from './screens/Goals';
import { Stats } from './screens/Stats';
import { Tasks } from './screens/Tasks';
import { Today } from './screens/Today';
import { useToday } from './store';
import { FlowProvider } from './ui/flows';
import { IconBag, IconChart, IconList, IconToday } from './ui/icons';
import { Praise } from './ui/Praise';
import { Settings } from './ui/Settings';

type Tab = 'today' | 'tasks' | 'goals' | 'stats';

const TABS: { id: Tab; label: string; Icon: typeof IconToday }[] = [
  { id: 'today', label: 'Сегодня', Icon: IconToday },
  { id: 'tasks', label: 'Задания', Icon: IconList },
  { id: 'goals', label: 'Цели', Icon: IconBag },
  { id: 'stats', label: 'Статистика', Icon: IconChart },
];

export function App() {
  const today = useToday();
  const [tab, setTab] = useState<Tab>('today');
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <FlowProvider today={today}>
      <div className="app">
        <main>
          {tab === 'today' && <Today onSettings={() => setSettings(true)} />}
          {tab === 'tasks' && <Tasks />}
          {tab === 'goals' && <Goals />}
          {tab === 'stats' && <Stats />}
        </main>
        <nav className="tabbar" aria-label="Разделы">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      {settings && <Settings onClose={() => setSettings(false)} />}
      <Praise />
    </FlowProvider>
  );
}
