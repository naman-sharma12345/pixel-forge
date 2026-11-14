export function toReview(reviewDoc) {
  if (!reviewDoc) return null;
  const doc = typeof reviewDoc.toObject === 'function' ? reviewDoc.toObject() : reviewDoc;

  let userObj = {
    _id: '',
    username: '',
    name: '',
    avatarUrl: '',
  };

  if (doc.user) {
    if (typeof doc.user === 'object' && doc.user !== null) {
      userObj = {
        _id: doc.user._id ? doc.user._id.toString() : doc.user.toString(),
        username: doc.user.username || '',
        name: doc.user.name || '',
        avatarUrl: doc.user.avatarUrl || '',
      };
    } else {
      userObj = {
        _id: doc.user.toString(),
        username: '',
        name: '',
        avatarUrl: '',
      };
    }
  }

  return {
    _id: doc._id ? doc._id.toString() : '',
    rating: doc.rating,
    comment: doc.comment || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    user: userObj,
  };
}
