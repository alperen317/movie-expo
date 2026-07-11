import { Text, View } from 'react-native';

import type { ListMember } from '../../lib/supabase/sharedLists';
import { getInitials } from '../../lib/utils/initials';

const MAX_VISIBLE = 4;

export function MemberAvatarRow({ members, size = 28 }: { members: ListMember[]; size?: number }) {
  const accepted = members.filter((member) => member.status === 'accepted');
  const visible = accepted.slice(0, MAX_VISIBLE);
  const overflow = accepted.length - visible.length;

  return (
    <View className="flex-row items-center">
      {visible.map((member, index) => (
        <View
          key={member.membershipId}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: index === 0 ? 0 : -size * 0.3,
          }}
          className="items-center justify-center border border-surface bg-surface-container-high"
        >
          <Text className="font-sans-bold text-[10px] text-primary-container">
            {getInitials(member.email)}
          </Text>
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size * 0.3,
          }}
          className="items-center justify-center border border-surface bg-background-blur"
        >
          <Text className="font-sans-semibold text-[10px] text-text-secondary">+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
