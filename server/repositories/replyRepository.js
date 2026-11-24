export function createReplyRepository(Reply) {
  return {
    listByLetter(letterId) {
      return Reply.find({ letterId }).sort({ createdAt: 1 }).lean().exec();
    },
    async create(data) {
      const doc = await Reply.create(data);
      return doc.toObject();
    },
    removeForLetter(id, letterId) {
      return Reply.findOneAndDelete({ _id: id, letterId }).lean().exec();
    },
    removeByLetter(letterId) {
      return Reply.deleteMany({ letterId }).exec();
    }
  };
}
