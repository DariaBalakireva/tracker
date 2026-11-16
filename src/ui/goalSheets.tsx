import { useRef, useState } from 'react';
import {
  addGoal,
  available,
  buyGoal,
  capacity,
  deleteGoal,
  transfer,
  updateGoal,
  uid,
  type Pocket,
} from '../logic/actions';
import { formatShort } from '../logic/date';
import { BOUGHT_PHRASES, pick } from '../logic/phrases';
import { dayKey } from '../logic/date';
import type { Goal, ID } from '../logic/types';
import { commit, getState, showPraise, useApp } from '../store';
import { deletePhoto, savePhoto, shrinkImage } from '../storage';
import { Confirm, Linkify, MoneyInput, Photo, Progress, rub, Sheet, toInt } from './bits';
import { IconEdit, IconImage, IconSwap, IconTrash } from './icons';

/* ───── Новая цель / изменить ───── */

export function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? '');
  const [price, setPrice] = useState(goal ? String(goal.price) : '');
  const [comment, setComment] = useState(goal?.comment ?? '');
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const save = async () => {
    const p = toInt(price);
    if (!name.trim()) return setError('Как называется цель?');
    if (!Number.isFinite(p) || p <= 0) return setError('Укажи цену в рублях');
    setBusy(true);
    let photoId = removePhoto ? null : (goal?.photoId ?? null);
    if (file) {
      photoId = uid();
      await savePhoto(photoId, await shrinkImage(file));
    }
    if (goal?.photoId && goal.photoId !== photoId) await deletePhoto(goal.photoId);
    const st = getState();
    const data = { name: name.trim(), price: p, comment: comment.trim(), photoId };
    commit(goal ? updateGoal(st, goal.id, data) : addGoal(st, data, new Date().toISOString()));
    onClose();
  };

  const shownPhoto = preview ? <img src={preview} alt="" /> : !removePhoto && goal?.photoId ? <Photo id={goal.photoId} /> : <IconImage size={36} />;

  return (
    <Sheet title={goal ? 'Изменить цель' : 'Новая цель'} onClose={onClose}>
      <button type="button" className="photo-big" style={{ border: 'none', padding: 0 }} onClick={() => input.current?.click()} aria-label="Выбрать фото">
        {shownPhoto}
      </button>
      <div className="row">
        <button type="button" className="btn soft small" style={{ flex: 1 }} onClick={() => input.current?.click()}>
          <IconImage size={18} /> {preview || goal?.photoId ? 'Другое фото' : 'Добавить фото'}
        </button>
        {(preview || (goal?.photoId && !removePhoto)) && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              setFile(null);
              setPreview(null);
              setRemovePhoto(true);
            }}
          >
            Убрать
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          setPreview(URL.createObjectURL(f));
          setRemovePhoto(false);
        }}
      />
      <div className="field">
        <label className="label" htmlFor="g-name">
          Название
        </label>
        <input id="g-name" className="input" value={name} maxLength={60} placeholder="Например, купальник" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="g-price">
          Цена
        </label>
        <MoneyInput id="g-price" value={price} onChange={setPrice} />
      </div>
      <div className="field">
        <label className="label" htmlFor="g-comment">
          Комментарий
        </label>
        <textarea
          id="g-comment"
          className="input"
          value={comment}
          maxLength={500}
          placeholder="Ссылка на товар, заметка или дата"
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      {goal && goal.saved > 0 && <span className="hint">Если новая цена меньше накопленного, лишнее вернётся в кошелёк.</span>}
      {error && <div className="error" role="alert">{error}</div>}
      <button type="button" className="btn block" disabled={busy} onClick={save}>
        {goal ? 'Сохранить' : 'Добавить цель'}
      </button>
    </Sheet>
  );
}

/* ───── Переложить деньги ───── */

export function TransferSheet({ from: initFrom, to: initTo, onClose }: { from?: Pocket; to?: Pocket; onClose: () => void }) {
  const s = useApp();
  const active = s.goals.filter((g) => !g.bought);
  const [from, setFrom] = useState<Pocket>(initFrom ?? 'wallet');
  const [to, setTo] = useState<Pocket>(initTo ?? (from === 'wallet' ? (active.find((g) => g.saved < g.price)?.id ?? 'wallet') : 'wallet'));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const label = (p: Pocket) => (p === 'wallet' ? 'Кошелёк' : (s.goals.find((g) => g.id === p)?.name ?? ''));
  const av = available(s, from);
  const cap = capacity(s, to);
  const max = Math.min(av, cap);

  const go = () => {
    const r = transfer(getState(), from, to, toInt(amount));
    if (r.error) return setError(r.error);
    commit(r.state);
    onClose();
  };

  return (
    <Sheet title="Переложить деньги" onClose={onClose}>
      <div className="field">
        <label className="label" htmlFor="tr-from">
          Откуда
        </label>
        <select id="tr-from" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setError(''); }}>
          <option value="wallet">Кошелёк — {rub(Math.max(0, s.wallet))}</option>
          {active.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} — {rub(g.saved)}
            </option>
          ))}
        </select>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          className="icon-btn flat"
          aria-label="Поменять местами"
          onClick={() => {
            setFrom(to);
            setTo(from);
            setError('');
          }}
        >
          <IconSwap size={20} />
        </button>
      </div>
      <div className="field">
        <label className="label" htmlFor="tr-to">
          Куда
        </label>
        <select id="tr-to" className="input" value={to} onChange={(e) => { setTo(e.target.value); setError(''); }}>
          <option value="wallet">Кошелёк</option>
          {active.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} — ещё {rub(g.price - g.saved)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="tr-amount">
          Сумма
        </label>
        <div className="row">
          <div style={{ flex: 1 }}>
            <MoneyInput id="tr-amount" value={amount} onChange={(v) => { setAmount(v); setError(''); }} />
          </div>
          <button type="button" className="btn soft small" disabled={max <= 0 || !Number.isFinite(max)} onClick={() => setAmount(String(max))}>
            Всё{Number.isFinite(max) && max > 0 ? ` (${rub(max)})` : ''}
          </button>
        </div>
        <span className="hint">
          {label(from)} → {label(to)}
        </span>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="button" className="btn block" onClick={go}>
        Переложить
      </button>
    </Sheet>
  );
}

/* ───── Куплено! ───── */

export function BuySheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const s = useApp();
  const [price, setPrice] = useState(String(goal.price));
  const p = toInt(price);
  const valid = Number.isFinite(p) && p > 0;
  const diff = valid ? goal.saved - p : 0;
  const wallet = Math.max(0, s.wallet);
  const shortfall = diff < 0 ? Math.max(0, -diff - wallet) : 0;

  const buy = () => {
    const r = buyGoal(getState(), goal.id, p, new Date().toISOString());
    if (r.shortfall) return;
    commit(r.state);
    onClose();
    showPraise({
      title: goal.name,
      phrase: pick(BOUGHT_PHRASES),
      extra: diff > 0 ? [`${rub(diff)} вернулись в кошелёк`] : diff < 0 ? [`${rub(-diff)} взяли из кошелька`] : [],
      big: true,
    });
  };

  return (
    <Sheet title="Куплено!" onClose={onClose}>
      <div className="row" style={{ gap: 14 }}>
        <div className="thumb">
          <Photo id={goal.photoId} />
        </div>
        <div className="stack" style={{ gap: 2 }}>
          <span className="option-title">{goal.name}</span>
          <span className="option-sub">накоплено {rub(goal.saved)}</span>
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="buy-price">
          Куплено за
        </label>
        <MoneyInput id="buy-price" value={price} onChange={setPrice} />
      </div>
      {valid && diff > 0 && <div className="hint" style={{ fontSize: 15 }}>Разница {rub(diff)} вернётся в кошелёк ✨</div>}
      {valid && diff < 0 && shortfall === 0 && <div className="hint" style={{ fontSize: 15 }}>Не хватающие {rub(-diff)} возьмём из кошелька.</div>}
      {valid && shortfall > 0 && (
        <div className="error" role="alert">
          Не хватает {rub(shortfall)} — нужно довнести. В кошельке сейчас {rub(wallet)}.
        </div>
      )}
      <button type="button" className="btn block" disabled={!valid || shortfall > 0} onClick={buy}>
        Отметить покупку
      </button>
      {valid && shortfall > 0 && (
        <button
          type="button"
          className="btn block soft"
          onClick={() => {
            commit(updateGoal(getState(), goal.id, { price: p }));
            onClose();
          }}
        >
          Докопить: новая цена {rub(p)}
        </button>
      )}
    </Sheet>
  );
}

/* ───── Подробнее о цели ───── */

export function GoalDetail({
  id,
  onClose,
  onEdit,
  onTransfer,
  onBuy,
}: {
  id: ID;
  onClose: () => void;
  onEdit: (g: Goal) => void;
  onTransfer: (g: Goal) => void;
  onBuy: (g: Goal) => void;
}) {
  const s = useApp();
  const [confirm, setConfirm] = useState(false);
  const g = s.goals.find((x) => x.id === id);
  if (!g) return null;
  const frac = g.price > 0 ? g.saved / g.price : 0;
  return (
    <Sheet title={g.name} onClose={onClose}>
      <div className="photo-big">
        <Photo id={g.photoId} iconSize={40} />
      </div>
      {g.bought ? (
        <div className="notice">
          <span className="notice-title">Куплено {formatShort(dayKey(new Date(g.bought.at)))} за {rub(g.bought.price)}</span>
        </div>
      ) : (
        <div className="card pad stack">
          <div className="row between">
            <span style={{ fontWeight: 800 }}>
              {rub(g.saved)} из {rub(g.price)}
            </span>
            <span className="price">{Math.floor(frac * 100)}%</span>
          </div>
          <Progress value={frac} />
          <span className="hint">{g.saved >= g.price ? 'Накоплено! Можно покупать 🎉' : `Осталось ${rub(g.price - g.saved)}`}</span>
        </div>
      )}
      {g.comment && (
        <div className="card pad">
          <span className="label">Комментарий</span>
          <p style={{ margin: '6px 0 0', fontWeight: 600, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
            <Linkify text={g.comment} />
          </p>
        </div>
      )}
      <div className="stack">
        {!g.bought && g.saved >= g.price && (
          <button className="btn block" onClick={() => onBuy(g)}>
            Куплено!
          </button>
        )}
        {!g.bought && (
          <button className="btn block soft" onClick={() => onTransfer(g)}>
            <IconSwap size={18} /> Переложить деньги
          </button>
        )}
        <div className="row">
          {!g.bought && (
            <button className="btn soft small" style={{ flex: 1 }} onClick={() => onEdit(g)}>
              <IconEdit size={18} /> Изменить
            </button>
          )}
          <button className="btn danger small" style={{ flex: 1 }} onClick={() => setConfirm(true)}>
            <IconTrash size={18} /> Удалить
          </button>
        </div>
      </div>
      {confirm && (
        <Confirm
          title="Удалить цель?"
          text={g.bought ? 'Цель исчезнет из архива.' : g.saved > 0 ? `Накопленные ${rub(g.saved)} вернутся в кошелёк.` : undefined}
          yes="Удалить"
          danger
          onYes={() => {
            if (g.photoId) void deletePhoto(g.photoId);
            commit(deleteGoal(getState(), g.id));
            onClose();
          }}
          onClose={() => setConfirm(false)}
        />
      )}
    </Sheet>
  );
}

/* ───── Архив ───── */

export function ArchiveSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (id: ID) => void }) {
  const s = useApp();
  const bought = s.goals.filter((g) => g.bought).sort((a, b) => (a.bought!.at < b.bought!.at ? 1 : -1));
  const total = bought.reduce((a, g) => a + g.bought!.price, 0);
  return (
    <Sheet title="Архив покупок" onClose={onClose}>
      {bought.length > 0 && <span className="hint">Всего куплено на {rub(total)} — и всё заработано тобой ✨</span>}
      <div className="stack">
        {bought.map((g) => (
          <button key={g.id} className="option" onClick={() => onOpen(g.id)}>
            <div className="thumb sm">
              <Photo id={g.photoId} iconSize={22} />
            </div>
            <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <span className="option-title">{g.name}</span>
              <span className="option-sub">
                {formatShort(dayKey(new Date(g.bought!.at)))} · за {rub(g.bought!.price)}
              </span>
            </div>
          </button>
        ))}
        {bought.length === 0 && <span className="hint">Здесь будут твои покупки.</span>}
      </div>
    </Sheet>
  );
}
