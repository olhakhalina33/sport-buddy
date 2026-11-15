import { avatarTone, initials } from '../../lib/seats';
import type { MiniUser } from '../../types';

const sizes = { sm: 'h-8 w-8 text-ps', md: 'h-10 w-10 text-p', lg: 'h-12 w-12 text-[15px]' };

interface Props {
  user: MiniUser;
  size?: keyof typeof sizes;
  animate?: boolean;
}

export function Avatar({ user, size = 'md', animate }: Props) {
  const tone = avatarTone(user.name) === 'teal' ? 'bg-accent text-accent-fg' : 'bg-brand text-onbtn';
  const cls = `${sizes[size]} shrink-0 rounded-full ring-2 ring-page ${animate ? 'animate-pop' : ''}`;
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} title={user.name} className={`${cls} object-cover`} />;
  }
  return (
    <span role="img" aria-label={user.name} title={user.name} className={`${cls} ${tone} inline-flex items-center justify-center`}>
      {initials(user.name)}
    </span>
  );
}

interface StackProps {
  users: MiniUser[];
  max?: number;
  size?: keyof typeof sizes;
  extra?: number;
}

/** Ряд аватарок з «+N» для решти. */
export function AvatarStack({ users, max = 5, size = 'md', extra = 0 }: StackProps) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length + extra;
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((u, i) => (
        <Avatar key={`${u.name}-${i}`} user={u} size={size} animate />
      ))}
      {rest > 0 && <span className="ml-1 text-p text-muted" aria-label={`і ще ${rest}`}>+{rest}</span>}
    </div>
  );
}
