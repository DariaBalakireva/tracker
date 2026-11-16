import { useState } from 'react';
import type { Pocket } from '../logic/actions';
import type { Goal, ID } from '../logic/types';
import { useApp } from '../store';
import { BgSparkles, HeroSparkles, Photo, Progress, rub } from '../ui/bits';
import { ArchiveSheet, BuySheet, GoalDetail, GoalForm, TransferSheet } from '../ui/goalSheets';
import { IconArchive, IconChevronRight, IconPlus, Sparkle } from '../ui/icons';

export function Goals() {
  const s = useApp();
  const [form, setForm] = useState<{ goal: Goal | null } | null>(null);
  const [detail, setDetail] = useState<ID | null>(null);
  const [transfer, setTransfer] = useState<{ from?: Pocket; to?: Pocket } | null>(null);
  const [buy, setBuy] = useState<Goal | null>(null);
  const [archive, setArchive] = useState(false);

  const active = s.goals.filter((g) => !g.bought);
  const reached = active.filter((g) => g.saved >= g.price);
  const open = active.filter((g) => g.saved < g.price);
  const boughtCount = s.goals.length - active.length;
  const debt = s.wallet < 0;

  return (
    <div className="screen">
      <BgSparkles />
      <div className="head">
        <h1 className="h1">Цели</h1>
        <button className="btn-add" aria-label="Новая цель" onClick={() => setForm({ goal: null })}>
          <IconPlus size={24} />
        </button>
      </div>

      <div className="hero wallet-hero">
        <HeroSparkles />
        <div className="hero-text">
          <span className="hero-label">{debt ? 'Долг' : 'Кошелёк'}</span>
          <span className="hero-big" style={{ fontSize: 30 }}>
            {rub(Math.abs(s.wallet))}
          </span>
          <span className="hero-small">{debt ? 'следующие награды сначала пойдут на него' : 'не распределено'}</span>
        </div>
        {!debt && (
          <button className="btn white small" style={{ flexShrink: 0 }} onClick={() => setTransfer({ from: 'wallet' })}>
            Разложить
          </button>
        )}
      </div>

      {reached.map((g) => (
        <div key={g.id} className="goal-reached">
          <Sparkle size={18} color="#B9A8FF" style={{ position: 'absolute', top: 12, right: 14 }} />
          <Sparkle size={10} color="#FFD66B" style={{ position: 'absolute', top: 36, right: 38 }} />
          <Sparkle size={8} color="#8EC3F5" style={{ position: 'absolute', top: 14, right: 50 }} />
          <button className="row" style={{ gap: 14, border: 'none', background: 'none', padding: 0, textAlign: 'left' }} onClick={() => setDetail(g.id)}>
            <div className="thumb">
              <Photo id={g.photoId} iconSize={26} />
            </div>
            <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
              <span className="badge violet">Накоплено</span>
              <span className="goal-name">{g.name}</span>
              <span className="goal-sum">
                {rub(g.saved)} / {rub(g.price)}
              </span>
            </div>
          </button>
          <button className="btn block" onClick={() => setBuy(g)}>
            Куплено!
          </button>
        </div>
      ))}

      {open.length > 0 && (
        <div className="goal-grid">
          {open.map((g) => {
            const frac = g.saved / g.price;
            return (
              <button key={g.id} className="goal-card" onClick={() => setDetail(g.id)}>
                <div className="goal-photo">
                  <Photo id={g.photoId} iconSize={30} />
                  <span className="badge">{Math.floor(frac * 100)}%</span>
                </div>
                <div className="goal-body">
                  <span className="goal-name">{g.name}</span>
                  {g.comment && <span className="goal-comment">{g.comment}</span>}
                  <Progress value={frac} />
                  <span className="goal-sum">
                    {rub(g.saved)} / {rub(g.price)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {active.length === 0 && (
        <div className="empty">
          <Sparkle size={34} color="#B9A8FF" />
          <span className="empty-title">О чём мечтаешь?</span>
          <span className="hint">Добавь цель с ценой и фото — например, купальник за 7 000 ₽. Награды за задания будут копиться на неё.</span>
          <button className="btn" onClick={() => setForm({ goal: null })}>
            <IconPlus size={20} /> Добавить цель
          </button>
        </div>
      )}

      {boughtCount > 0 && (
        <button className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setArchive(true)}>
          <IconArchive size={18} /> Архив · {boughtCount}
          <IconChevronRight size={16} />
        </button>
      )}

      {form && <GoalForm goal={form.goal} onClose={() => setForm(null)} />}
      {archive && <ArchiveSheet onClose={() => setArchive(false)} onOpen={(id) => setDetail(id)} />}
      {detail && (
        <GoalDetail
          id={detail}
          onClose={() => setDetail(null)}
          onEdit={(g) => {
            setDetail(null);
            setForm({ goal: g });
          }}
          onTransfer={(g) => setTransfer(g.saved > 0 ? { from: g.id, to: 'wallet' } : { from: 'wallet', to: g.id })}
          onBuy={(g) => {
            setDetail(null);
            setBuy(g);
          }}
        />
      )}
      {transfer && <TransferSheet from={transfer.from} to={transfer.to} onClose={() => setTransfer(null)} />}
      {buy && <BuySheet goal={buy} onClose={() => setBuy(null)} />}
    </div>
  );
}
