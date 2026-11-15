export function toUserPublic(user) {
  if (!user) return null;
  return {
    _id: user._id ? user._id.toString() : user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl || '',
    bio: user.bio || '',
    socials: {
      website: user.socials?.website || '',
      twitter: user.socials?.twitter || '',
      itchio: user.socials?.itchio || '',
      github: user.socials?.github || ''
    },
    role: user.role,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt
  };
}

export function toUserMe(user) {
  if (!user) return null;
  const base = toUserPublic(user);
  const wishlist = Array.isArray(user.wishlist)
    ? user.wishlist.map((id) => (id?._id ? id._id.toString() : id?.toString()))
    : [];

  return {
    ...base,
    email: user.email,
    wishlist,
    lastLoginAt: user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : (user.lastLoginAt || null)
  };
}
