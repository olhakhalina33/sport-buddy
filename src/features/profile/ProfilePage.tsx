import { useEffect, useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { updateMyLevel } from '../../api/auth';
import { useAuth, useUser } from '../../hooks/useAuth';
import { LEVELS, LEVEL_LABEL } from '../../lib/labels';
import type { SkillLevel } from '../../types';

/** Профіль: ім'я та зміна рівня. */
export function ProfilePage() {
  const { id, profile } = useUser();
  const { refreshProfile } = useAuth();
  const [level, setLevel] = useState<SkillLevel>(profile?.level ?? 'beginner');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile) setLevel(profile.level);
  }, [profile]);

  if (!profile) return <p className="text-p text-muted">Профіль не знайдено.</p>;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await updateMyLevel(id, level);
      await refreshProfile();
      setMsg({ ok: true, text: 'Рівень збережено.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="text-h4 mb-6">Профіль</h1>
      <div className="mb-6 flex items-center gap-3">
        <Avatar user={profile} size="lg" />
        <p className="text-[16px] font-bold">{profile.name}</p>
      </div>
      <div className="flex flex-col gap-4">
        <Select
          label="Рівень"
          value={level}
          onChange={(e) => setLevel(e.target.value as SkillLevel)}
          options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
        />
        <Button onClick={save} loading={busy} disabled={level === profile.level}>
          Зберегти
        </Button>
        {msg && (
          <p role={msg.ok ? 'status' : 'alert'} className={`text-p ${msg.ok ? 'text-accent' : 'text-danger'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </>
  );
}
