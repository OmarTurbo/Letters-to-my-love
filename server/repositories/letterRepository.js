export function createLetterRepository(Letter) {
  return {
    list() {
      return Letter.find().sort({ date: 1, createdAt: 1 }).lean().exec();
    },
    get(id) {
      return Letter.findById(id).lean().exec();
    },
    async create(data) {
      const doc = await Letter.create(data);
      return doc.toObject();
    },
    update(id, data) {
      return Letter.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();
    },
    remove(id) {
      return Letter.findByIdAndDelete(id).lean().exec();
    }
  };
}
