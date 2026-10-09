import { useState } from 'react';
import type { CarCardData } from '../lib/cards';
import { useApp } from '../state/AppStore';
import { fullName } from '../data/cars';
import { renderStory, shareStory } from '../services/shareCard';

/** 📤 Car Card als Story-Bild teilen – für ALLE Nutzer kostenlos. */
export function ShareCardButton({ card, isNew, className = 'btn btn--outline grow' }: { card: CarCardData; isNew?: boolean; className?: string }) {
  const { me, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const place = card.firstSpot?.location.areaLabel.replace(/^Nähe /, '');
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const blob = await renderStory(card, { username: me.username, place, isNew });
          const r = await shareStory(blob, fullName(card.model));
          if (r === 'downloaded') showToast('📥 Story-Bild gespeichert – jetzt in Instagram/TikTok posten');
        } catch {
          showToast('Teilen nicht möglich');
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Bild wird erstellt…' : '📤 Teilen'}
    </button>
  );
}
